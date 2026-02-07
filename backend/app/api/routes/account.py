"""
API routes for account management (registration, login, profile).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.services.account_service import AccountService
from app.services.auth_service import (
    create_access_token,
    decode_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/api/account", tags=["account"])
security = HTTPBearer()


# ============== Request/Response Models ==============

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    riot_id: Optional[str] = Field(None, description="Valorant Riot ID (e.g., PlayerName#TAG)")
    region: Optional[str] = Field(None, description="Region code (na, eu, ap, kr, etc.)")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    riot_id: Optional[str]
    region: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: str

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    riot_id: Optional[str] = None
    region: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class MessageResponse(BaseModel):
    message: str


# ============== Auth Dependency ==============

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Dependency to get the current authenticated user from JWT token.
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
    
    user = AccountService.get_user_by_id(db, int(user_id))
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


# ============== Routes ==============

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account.
    """
    user, error = AccountService.create_user(
        db=db,
        email=request.email,
        username=request.username,
        password=request.password,
        riot_id=request.riot_id,
        region=request.region
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        riot_id=user.riot_id,
        region=user.region,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at.isoformat()
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and return access token.
    """
    user = AccountService.authenticate_user(db, request.email, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return TokenResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user = Depends(get_current_user)):
    """
    Get current user's profile information.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        riot_id=current_user.riot_id,
        region=current_user.region,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at.isoformat()
    )


@router.put("/me", response_model=UserResponse)
async def update_profile(
    request: UpdateProfileRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile information.
    """
    user, error = AccountService.update_user(
        db=db,
        user_id=current_user.id,
        username=request.username,
        riot_id=request.riot_id,
        region=request.region
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        riot_id=user.riot_id,
        region=user.region,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at.isoformat()
    )


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    request: ChangePasswordRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change current user's password.
    """
    success, error = AccountService.change_password(
        db=db,
        user_id=current_user.id,
        current_password=request.current_password,
        new_password=request.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return MessageResponse(message="Password changed successfully")


@router.delete("/me", response_model=MessageResponse)
async def delete_account(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete current user's account.
    """
    success, error = AccountService.delete_user(db, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return MessageResponse(message="Account deleted successfully")
