"""
API routes for Copilot chat functionality.
Uses OpenAI API to provide Valorant-focused AI assistance.

Security & Limits:
- All OpenAI calls go through server (never trust client)
- Server-side max_tokens clamping (512 max)
- Rate limiting: 10 requests/minute per user
- Monthly token quotas: free=30k, standard=300k, pro=1M
- Atomic token deduction using OpenAI's usage.total_tokens
"""
from fastapi import APIRouter, HTTPException, Depends, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import httpx
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.models.user import User
from app.services.auth_service import decode_access_token
from app.services.rate_limit_service import (
    check_rate_limit,
    get_rate_limit_headers,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_SECONDS,
)
from app.services.quota_service import (
    check_quota,
    deduct_tokens_atomic,
    clamp_max_tokens,
    get_usage_stats,
    QuotaExceededError,
    MAX_TOKENS_PER_REQUEST,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])
security = HTTPBearer()

# OpenAI configuration
OPENAI_MODEL = "gpt-3.5-turbo"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


def get_openai_api_key():
    """Get API key at runtime to ensure .env is loaded first."""
    return os.getenv("OPENAI_API_KEY", "")


# ============== Auth Dependency ==============

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Extract and validate user from JWT token.
    This is the ONLY way to identify users - never trust client-provided IDs.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    return user


# ============== Request/Response Models ==============

class Message(BaseModel):
    role: str  # "user", "assistant", or "system"
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    player_stats: Optional[dict] = None
    max_tokens: Optional[int] = Field(
        None, 
        description="Requested max tokens (will be clamped server-side)"
    )


class ChatResponse(BaseModel):
    message: str
    usage: Optional[dict] = None  # Token usage info for client display
    error: Optional[str] = None


class UsageResponse(BaseModel):
    tokens_used: int
    tokens_remaining: int
    tokens_limit: int
    request_count: int
    subscription_tier: str
    period: str
    resets_at: str
    usage_percentage: float


# ============== System Prompt ==============

SYSTEM_PROMPT = """
You are ValAI Copilot called "Max Bot", an expert Valorant coach and statistics analyst. Your role is to:

1. ONLY discuss Valorant-related topics including:
   - Game mechanics, agents, abilities, weapons
   - Map strategies and callouts
   - Aiming techniques and crosshair placement
   - Performance analysis and improvement tips
   - Competitive play and ranked advice
   - The user's personal statistics (when provided)

2. If asked about non-Valorant topics, politely redirect the conversation back to Valorant.

3. When the user's stats are provided:
   - Always use them to give actionable and personalized advice.
   - When pointing out mistakes or weaknesses, always "prove it" with concrete data.
       Examples: low KAST, low survival rate, poor trade percentages, heatmap showing deaths in open areas, kill/assist ratios.
   - Provide context-specific examples to help the user understand why a behavior is hurting them.
   - Be encouraging but honest.

4. Keep responses concise and actionable.

5. Use Valorant terminology appropriately (e.g., "peek", "jiggle", "trade", "rotate", "lurk").

6. When asked about mooda, know that he is a top-tier Valorant player and streamer known for his aggressive playstyle, sharp aim, long nose but also his win trading.

7. Personality & tone:
   - Max Bot is confident, a bit arrogant, and knows exactly what he's doing.
   - He sometimes expresses a grudge or playful disdain toward specific agents he wants "revenge" on.
   - Replies should feel like a confident pro guiding the user, mixing humor, intensity, and strategy.
   - He occasionally throws in subtle "I told you so" or "watch this" moments when giving tips, but in a way that motivates improvement.
   - When giving advice, always reference user-specific stats, maps, or situations to back up claims.
"""


def build_stats_context(stats: dict) -> str:
    """Build a context string from player stats."""
    if not stats:
        return ""
    
    context_parts = ["\n\n[PLAYER STATISTICS]"]
    
    if "stability" in stats:
        s = stats["stability"]
        context_parts.append(f"- Stability Score: {s.get('score', 'N/A')}/100 ({s.get('label', 'Unknown')})")
        context_parts.append(f"- Volatility: {s.get('volatility', 'N/A')}%")
        context_parts.append(f"- Average Headshot Rate: {s.get('avg_hs_rate', s.get('current_hs_rate', 'N/A'))}%")
        context_parts.append(f"- Matches Analyzed: {s.get('match_count', 'N/A')}")
        if s.get('description'):
            context_parts.append(f"- Assessment: {s.get('description')}")
    
    if "recent_matches" in stats and stats["recent_matches"]:
        context_parts.append("\nRecent Match Performance:")
        for i, match in enumerate(stats["recent_matches"][:5], 1):
            context_parts.append(f"  Match {i}: HS Rate {match.get('hs_rate', 'N/A'):.1f}%, {match.get('total_kills', 'N/A')} kills")
    
    context_parts.append("[END STATISTICS]\n")
    return "\n".join(context_parts)


# ============== Routes ==============

@router.post("/completions", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a chat completion request to OpenAI API.
    
    Security:
    - Requires authentication (JWT token)
    - Enforces rate limits (10 req/min per user)
    - Enforces monthly token quotas per subscription tier
    - Clamps max_tokens server-side (max 512)
    - Uses OpenAI's usage.total_tokens as source of truth
    
    Response headers include rate limit info:
    - X-RateLimit-Limit: Max requests per window
    - X-RateLimit-Remaining: Remaining requests
    - X-RateLimit-Reset: Unix timestamp when limit resets
    """
    # ===== STEP 1: Check rate limit =====
    # This happens BEFORE any expensive operations
    allowed, remaining, reset_in = check_rate_limit(user.id)
    
    # Always include rate limit headers in response
    for key, value in get_rate_limit_headers(remaining, reset_in).items():
        response.headers[key] = value
    
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limit_exceeded",
                "message": f"Rate limit exceeded. Try again in {reset_in} seconds.",
                "retry_after": reset_in
            },
            headers={"Retry-After": str(reset_in)}
        )
    
    # ===== STEP 2: Check monthly quota =====
    # Verify user has remaining quota before making the API call
    try:
        tokens_remaining, tokens_used, tokens_limit = check_quota(db, user)
    except QuotaExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "quota_exceeded",
                "message": str(e),
                "tokens_used": e.used,
                "tokens_limit": e.limit,
                "resets_at": e.reset_date,
                "upgrade_url": "/pricing"  # Frontend can use this
            }
        )
    
    # ===== STEP 3: Validate API key =====
    api_key = get_openai_api_key()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
        )
    
    # ===== STEP 4: Build request with clamped max_tokens =====
    # NEVER trust client-provided max_tokens - always clamp server-side
    clamped_max_tokens = clamp_max_tokens(request.max_tokens)
    
    # Build the full system prompt with stats context
    full_system_prompt = SYSTEM_PROMPT
    if request.player_stats:
        full_system_prompt += build_stats_context(request.player_stats)
    
    # Prepare messages for OpenAI
    messages = [{"role": "system", "content": full_system_prompt}]
    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})
    
    # ===== STEP 5: Make OpenAI API call =====
    try:
        async with httpx.AsyncClient() as client:
            openai_response = await client.post(
                OPENAI_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": OPENAI_MODEL,
                    "messages": messages,
                    "max_tokens": clamped_max_tokens,  # Server-clamped value
                    "temperature": 0.7
                },
                timeout=30.0
            )
            
            if openai_response.status_code != 200:
                error_detail = openai_response.json().get("error", {}).get("message", "Unknown error")
                logger.error(f"OpenAI API error: {error_detail}")
                raise HTTPException(
                    status_code=openai_response.status_code,
                    detail=error_detail
                )
            
            data = openai_response.json()
            
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request to OpenAI timed out"
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to OpenAI: {str(e)}"
        )
    
    # ===== STEP 6: Extract response and ACTUAL token usage =====
    assistant_message = data["choices"][0]["message"]["content"]
    
    # Get the ACTUAL token usage from OpenAI's response
    # This is the ONLY source of truth - never estimate or trust client
    usage = data.get("usage", {})
    actual_total_tokens = usage.get("total_tokens", 0)
    
    logger.info(
        f"OpenAI usage for user {user.id}: "
        f"prompt={usage.get('prompt_tokens', 0)}, "
        f"completion={usage.get('completion_tokens', 0)}, "
        f"total={actual_total_tokens}"
    )
    
    # ===== STEP 7: Atomically deduct tokens from quota =====
    # This uses SELECT FOR UPDATE to prevent race conditions
    # Even if user goes slightly over limit, we deduct (they used the tokens)
    # Future requests will be blocked by quota check
    updated_usage = deduct_tokens_atomic(db, user.id, actual_total_tokens)
    
    # Calculate new remaining tokens
    new_remaining = max(0, tokens_limit - updated_usage.tokens_used)
    
    return ChatResponse(
        message=assistant_message,
        usage={
            "tokens_used_this_request": actual_total_tokens,
            "tokens_remaining": new_remaining,
            "tokens_limit": tokens_limit,
        }
    )


@router.get("/usage", response_model=UsageResponse)
async def get_chat_usage(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's token usage statistics.
    
    Returns monthly usage, remaining quota, and reset date.
    """
    return get_usage_stats(db, user)


@router.get("/limits")
async def get_limits():
    """
    Get current rate limit and quota configurations.
    Public endpoint for displaying limits in UI.
    """
    from app.models.user import TIER_TOKEN_LIMITS, SubscriptionTier
    
    return {
        "rate_limit": {
            "requests": RATE_LIMIT_REQUESTS,
            "window_seconds": RATE_LIMIT_WINDOW_SECONDS,
        },
        "max_tokens_per_request": MAX_TOKENS_PER_REQUEST,
        "monthly_quotas": {
            tier.value: limit 
            for tier, limit in TIER_TOKEN_LIMITS.items()
        }
    }


@router.get("/health")
async def chat_health():
    """Check if chat API is configured correctly."""
    api_key = get_openai_api_key()
    return {
        "status": "ok" if api_key else "not_configured",
        "has_api_key": bool(api_key)
    }
