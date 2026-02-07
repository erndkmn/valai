"""
Account service for user management operations.
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
from datetime import datetime

from app.models.user import User
from app.services.auth_service import get_password_hash, verify_password


class AccountService:
    """
    Service class for account-related operations.
    """
    
    @staticmethod
    def create_user(
        db: Session,
        email: str,
        username: str,
        password: str,
        riot_id: Optional[str] = None,
        region: Optional[str] = None
    ) -> tuple[Optional[User], Optional[str]]:
        """
        Create a new user account.
        
        Returns:
            Tuple of (User, None) on success or (None, error_message) on failure
        """
        # Check if email already exists
        if db.query(User).filter(User.email == email).first():
            return None, "Email already registered"
        
        # Check if username already exists
        if db.query(User).filter(User.username == username).first():
            return None, "Username already taken"
        
        # Create new user
        hashed_password = get_password_hash(password)
        user = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            riot_id=riot_id,
            region=region
        )
        
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
            return user, None
        except IntegrityError:
            db.rollback()
            return None, "Failed to create account"
    
    @staticmethod
    def authenticate_user(
        db: Session,
        email: str,
        password: str
    ) -> Optional[User]:
        """
        Authenticate a user by email and password.
        
        Returns:
            User if authentication successful, None otherwise
        """
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        return user
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """
        Get a user by their ID.
        """
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """
        Get a user by their email.
        """
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        """
        Get a user by their username.
        """
        return db.query(User).filter(User.username == username).first()
    
    @staticmethod
    def update_user(
        db: Session,
        user_id: int,
        username: Optional[str] = None,
        riot_id: Optional[str] = None,
        region: Optional[str] = None
    ) -> tuple[Optional[User], Optional[str]]:
        """
        Update user profile information.
        
        Returns:
            Tuple of (User, None) on success or (None, error_message) on failure
        """
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return None, "User not found"
        
        # Check username uniqueness if changing
        if username and username != user.username:
            if db.query(User).filter(User.username == username).first():
                return None, "Username already taken"
            user.username = username
        
        if riot_id is not None:
            user.riot_id = riot_id
        
        if region is not None:
            user.region = region
        
        try:
            db.commit()
            db.refresh(user)
            return user, None
        except IntegrityError:
            db.rollback()
            return None, "Failed to update profile"
    
    @staticmethod
    def change_password(
        db: Session,
        user_id: int,
        current_password: str,
        new_password: str
    ) -> tuple[bool, Optional[str]]:
        """
        Change a user's password.
        
        Returns:
            Tuple of (True, None) on success or (False, error_message) on failure
        """
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return False, "User not found"
        
        if not verify_password(current_password, user.hashed_password):
            return False, "Current password is incorrect"
        
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        
        return True, None
    
    @staticmethod
    def delete_user(db: Session, user_id: int) -> tuple[bool, Optional[str]]:
        """
        Delete a user account.
        
        Returns:
            Tuple of (True, None) on success or (False, error_message) on failure
        """
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return False, "User not found"
        
        db.delete(user)
        db.commit()
        
        return True, None
