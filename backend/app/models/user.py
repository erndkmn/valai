"""
User model for account management.
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum


class SubscriptionTier(str, enum.Enum):
    """
    Subscription tiers with associated monthly token limits.
    Using str enum for easy JSON serialization.
    """
    FREE = "free"
    STANDARD = "standard"
    PRO = "pro"


# Monthly token limits per tier - single source of truth
TIER_TOKEN_LIMITS = {
    SubscriptionTier.FREE: 30_000,
    SubscriptionTier.STANDARD: 300_000,
    SubscriptionTier.PRO: 1_000_000,
}


class User(Base):
    """
    User model representing registered accounts.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Valorant-specific fields
    riot_id = Column(String(100), nullable=True)  # e.g., "PlayerName#TAG"
    region = Column(String(10), nullable=True)  # e.g., "na", "eu", "ap"
    
    # Subscription tier - defaults to free
    subscription_tier = Column(
        String(20), 
        default=SubscriptionTier.FREE.value, 
        nullable=False
    )
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    @property
    def tier(self) -> SubscriptionTier:
        """Get the subscription tier as enum."""
        return SubscriptionTier(self.subscription_tier)
    
    @property
    def monthly_token_limit(self) -> int:
        """Get the monthly token limit for this user's tier."""
        return TIER_TOKEN_LIMITS.get(self.tier, TIER_TOKEN_LIMITS[SubscriptionTier.FREE])

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"
