"""
Token usage tracking model for monthly quota management.

Design decisions:
- Row-per-month pattern: Each user gets a new row each month, enabling:
  - Natural monthly resets without batch jobs
  - Historical usage analytics
  - Simple atomic updates with row-level locking
- Composite unique constraint on (user_id, year, month) prevents duplicates
- tokens_used is the ONLY source of truth for usage (never trust client)
"""
from sqlalchemy import Column, Integer, DateTime, UniqueConstraint, Index, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class TokenUsage(Base):
    """
    Tracks monthly token usage per user.
    
    Each row represents one user's usage for one calendar month.
    New rows are created lazily when a user makes their first request of the month.
    """
    __tablename__ = "token_usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Year and month for easy querying and partitioning
    # Using integers instead of date to simplify lookups
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    
    # Total tokens consumed this month (from OpenAI's usage.total_tokens)
    # This is the ONLY authoritative count - never computed from logs
    tokens_used = Column(Integer, default=0, nullable=False)
    
    # Request count for rate limiting analytics (separate from token count)
    request_count = Column(Integer, default=0, nullable=False)
    
    # Timestamps for auditing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Composite unique constraint ensures one row per user per month
    __table_args__ = (
        UniqueConstraint('user_id', 'year', 'month', name='uq_user_month'),
        # Index for fast lookups by user and time period
        Index('ix_token_usage_user_period', 'user_id', 'year', 'month'),
    )

    def __repr__(self):
        return f"<TokenUsage(user_id={self.user_id}, {self.year}-{self.month:02d}, tokens={self.tokens_used})>"
