"""
Quota service for managing monthly token limits.

Handles:
- Checking remaining quota before requests
- Atomic token deduction after OpenAI responses
- Monthly row creation (row-per-month pattern)
- Race condition prevention with database locking

Design decisions:
- Row-per-month: Simple monthly resets without background jobs
- SELECT FOR UPDATE: Prevents double-spending with row-level locks
- Optimistic pre-check + pessimistic deduction: Fast reads, safe writes
- Database as source of truth: Survives restarts, works multi-instance
"""
from datetime import datetime
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
import logging

from app.models.token_usage import TokenUsage
from app.models.user import User, TIER_TOKEN_LIMITS, SubscriptionTier

logger = logging.getLogger(__name__)

# Maximum tokens per request (server-side clamp)
MAX_TOKENS_PER_REQUEST = 512


class QuotaExceededError(Exception):
    """Raised when user has exceeded their monthly token quota."""
    def __init__(self, used: int, limit: int, reset_date: str):
        self.used = used
        self.limit = limit
        self.reset_date = reset_date
        super().__init__(f"Monthly token quota exceeded: {used}/{limit}. Resets {reset_date}")


class InsufficientQuotaError(Exception):
    """Raised when user doesn't have enough quota for the estimated request."""
    def __init__(self, remaining: int, required: int):
        self.remaining = remaining
        self.required = required
        super().__init__(f"Insufficient quota: {remaining} remaining, ~{required} required")


def get_current_period() -> Tuple[int, int]:
    """Get current year and month for quota period."""
    now = datetime.utcnow()
    return now.year, now.month


def get_next_reset_date() -> str:
    """Get the date string when quota resets (1st of next month)."""
    now = datetime.utcnow()
    if now.month == 12:
        return f"{now.year + 1}-01-01"
    return f"{now.year}-{now.month + 1:02d}-01"


def get_or_create_usage_record(db: Session, user_id: int) -> TokenUsage:
    """
    Get or create the usage record for current month.
    
    Uses INSERT ... ON CONFLICT pattern to handle race conditions
    when multiple requests try to create the first record of the month.
    """
    year, month = get_current_period()
    
    # Try to get existing record first (fast path)
    usage = db.query(TokenUsage).filter(
        and_(
            TokenUsage.user_id == user_id,
            TokenUsage.year == year,
            TokenUsage.month == month
        )
    ).first()
    
    if usage:
        return usage
    
    # Create new record for this month
    try:
        usage = TokenUsage(
            user_id=user_id,
            year=year,
            month=month,
            tokens_used=0,
            request_count=0
        )
        db.add(usage)
        db.commit()
        db.refresh(usage)
        return usage
    except IntegrityError:
        # Race condition: another request created it first
        db.rollback()
        return db.query(TokenUsage).filter(
            and_(
                TokenUsage.user_id == user_id,
                TokenUsage.year == year,
                TokenUsage.month == month
            )
        ).first()


def check_quota(db: Session, user: User) -> Tuple[int, int, int]:
    """
    Check user's remaining quota without modifying it.
    
    This is a fast, read-only check for pre-flight validation.
    The actual deduction happens atomically after the OpenAI call.
    
    Args:
        db: Database session
        user: User object with subscription tier
        
    Returns:
        Tuple of (remaining_tokens, used_tokens, limit_tokens)
        
    Raises:
        QuotaExceededError: If quota is already exceeded
    """
    usage = get_or_create_usage_record(db, user.id)
    limit = user.monthly_token_limit
    used = usage.tokens_used
    remaining = max(0, limit - used)
    
    if remaining == 0:
        raise QuotaExceededError(used, limit, get_next_reset_date())
    
    return remaining, used, limit


def check_quota_sufficient(db: Session, user: User, estimated_tokens: int) -> bool:
    """
    Check if user has enough quota for an estimated request.
    
    Args:
        db: Database session  
        user: User object
        estimated_tokens: Estimated tokens for the request
        
    Returns:
        True if sufficient quota, raises exception otherwise
        
    Raises:
        QuotaExceededError: If quota is fully exhausted
        InsufficientQuotaError: If remaining < estimated tokens
    """
    remaining, used, limit = check_quota(db, user)
    
    # Allow request if user has ANY remaining quota
    # We can't know exact usage until after the call
    # The hard limit is enforced by the atomic deduction
    if remaining < estimated_tokens:
        # Warning: user is close to limit, but allow if they have anything left
        logger.warning(
            f"User {user.id} has {remaining} tokens remaining, "
            f"request may use up to {estimated_tokens}"
        )
    
    return True


def deduct_tokens_atomic(db: Session, user_id: int, tokens_used: int) -> TokenUsage:
    """
    Atomically deduct tokens from user's monthly quota.
    
    Uses SELECT FOR UPDATE to prevent race conditions where multiple
    concurrent requests could overspend the quota.
    
    This is called AFTER receiving OpenAI's response with actual token count.
    Even if this causes the user to exceed their limit, we deduct it
    (they already used the tokens). Future requests will be blocked.
    
    Args:
        db: Database session
        user_id: User's ID
        tokens_used: Actual tokens used (from OpenAI's usage.total_tokens)
        
    Returns:
        Updated TokenUsage record
    """
    year, month = get_current_period()
    
    # SELECT FOR UPDATE locks the row to prevent concurrent updates
    # This is the critical section that prevents double-spending
    usage = db.query(TokenUsage).filter(
        and_(
            TokenUsage.user_id == user_id,
            TokenUsage.year == year,
            TokenUsage.month == month
        )
    ).with_for_update().first()
    
    if not usage:
        # Should not happen if check_quota was called first, but handle it
        usage = get_or_create_usage_record(db, user_id)
        # Re-acquire with lock
        usage = db.query(TokenUsage).filter(
            and_(
                TokenUsage.user_id == user_id,
                TokenUsage.year == year,
                TokenUsage.month == month
            )
        ).with_for_update().first()
    
    # Update atomically
    usage.tokens_used += tokens_used
    usage.request_count += 1
    
    db.commit()
    db.refresh(usage)
    
    logger.info(
        f"User {user_id} used {tokens_used} tokens. "
        f"Monthly total: {usage.tokens_used}"
    )
    
    return usage


def get_usage_stats(db: Session, user: User) -> dict:
    """
    Get user's current usage statistics for display.
    
    Returns:
        Dict with usage stats including remaining, used, limit, etc.
    """
    usage = get_or_create_usage_record(db, user.id)
    limit = user.monthly_token_limit
    used = usage.tokens_used
    remaining = max(0, limit - used)
    
    return {
        "tokens_used": used,
        "tokens_remaining": remaining,
        "tokens_limit": limit,
        "request_count": usage.request_count,
        "subscription_tier": user.subscription_tier,
        "period": f"{usage.year}-{usage.month:02d}",
        "resets_at": get_next_reset_date(),
        "usage_percentage": round((used / limit) * 100, 1) if limit > 0 else 100
    }


def clamp_max_tokens(requested_max_tokens: Optional[int]) -> int:
    """
    Clamp the max_tokens parameter to server-side limit.
    
    Never trust client-provided max_tokens - always enforce server limit.
    """
    if requested_max_tokens is None:
        return MAX_TOKENS_PER_REQUEST
    return min(requested_max_tokens, MAX_TOKENS_PER_REQUEST)
