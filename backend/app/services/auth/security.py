"""
Security service for JWT authentication and password hashing.

This module provides:
- JWT token creation and verification
- Password hashing with bcrypt (cost factor 12)
- Token expiry management (24-hour expiry)
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError

from app.core.config import settings


class SecurityService:
    """Service for handling authentication security operations."""
    
    # Bcrypt cost factor for password hashing (Requirements 1.5)
    BCRYPT_COST_FACTOR = 12
    
    # JWT token expiry duration (Requirements 1.10)
    @property
    def ACCESS_TOKEN_EXPIRE_HOURS(self):
        return settings.ACCESS_TOKEN_EXPIRE_HOURS
    
    def __init__(self):
        """Initialize security service with configuration."""
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM
    
    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt with cost factor 12.
        
        Args:
            password: Plain text password to hash
            
        Returns:
            Hashed password as string
            
        Requirements: 1.5
        """
        # Generate salt with cost factor 12
        salt = bcrypt.gensalt(rounds=self.BCRYPT_COST_FACTOR)
        
        # Hash the password
        password_bytes = password.encode('utf-8')
        hashed = bcrypt.hashpw(password_bytes, salt)
        
        # Return as string
        return hashed.decode('utf-8')
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.
        
        Args:
            plain_password: Plain text password to verify
            hashed_password: Hashed password to compare against
            
        Returns:
            True if password matches, False otherwise
            
        Requirements: 1.7
        """
        try:
            password_bytes = plain_password.encode('utf-8')
            hashed_bytes = hashed_password.encode('utf-8')
            return bcrypt.checkpw(password_bytes, hashed_bytes)
        except Exception:
            return False
    
    def create_access_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT access token.
        
        Args:
            data: Payload data to encode in token (typically user_id, email, role)
            expires_delta: Optional custom expiry duration
            
        Returns:
            Encoded JWT token as string
            
        Requirements: 1.10
        """
        to_encode = data.copy()
        
        # Set expiry time
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(hours=self.ACCESS_TOKEN_EXPIRE_HOURS)
        
        # Add standard JWT claims
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access"
        })
        
        # Encode token
        encoded_jwt = jwt.encode(
            to_encode,
            self.secret_key,
            algorithm=self.algorithm
        )
        
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode a JWT token.
        
        Args:
            token: JWT token to verify
            
        Returns:
            Decoded token payload if valid, None otherwise
            
        Requirements: 1.7, 1.10
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # Verify token type
            if payload.get("type") != "access":
                return None
            
            return payload
            
        except InvalidTokenError:
            return None
        except Exception:
            return None
    
    def create_refresh_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT refresh token with longer expiry.
        
        Args:
            data: Payload data to encode in token
            expires_delta: Optional custom expiry duration (default 7 days)
            
        Returns:
            Encoded JWT refresh token as string
        """
        to_encode = data.copy()
        
        # Set expiry time (30 days for refresh tokens to support "Remember Me")
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(days=30)
        
        # Add standard JWT claims
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "refresh"
        })
        
        # Encode token
        encoded_jwt = jwt.encode(
            to_encode,
            self.secret_key,
            algorithm=self.algorithm
        )
        
        return encoded_jwt
    
    def verify_refresh_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode a JWT refresh token.
        
        Args:
            token: JWT refresh token to verify
            
        Returns:
            Decoded token payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # Verify token type
            if payload.get("type") != "refresh":
                return None
            
            return payload
            
        except InvalidTokenError:
            return None
        except Exception:
            return None


# Global security service instance
security_service = SecurityService()
