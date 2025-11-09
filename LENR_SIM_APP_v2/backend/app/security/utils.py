"""
Security Utilities

This module provides utility functions for security-related operations,
such as password hashing, token generation, and secure random values.
"""

import secrets
import uuid
import string
import hashlib
import base64
from typing import Optional
from datetime import datetime, timedelta

from app.core.config import settings


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a secure random token of specified length.
    
    Args:
        length: The length of the token (default: 32)
        
    Returns:
        A secure random token
    """
    return secrets.token_hex(length // 2)


def generate_secure_password(length: int = 16) -> str:
    """
    Generate a secure random password with letters, digits, and punctuation.
    
    Args:
        length: The length of the password (default: 16)
        
    Returns:
        A secure random password
    """
    alphabet = string.ascii_letters + string.digits + string.punctuation
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Check if password has at least one of each required character type
        if (any(c.islower() for c in password) and
                any(c.isupper() for c in password) and
                any(c.isdigit() for c in password) and
                any(c in string.punctuation for c in password)):
            return password


def generate_uuid() -> str:
    """
    Generate a random UUID.
    
    Returns:
        A random UUID string
    """
    return str(uuid.uuid4())


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """
    Hash a password with a salt using SHA-256.
    If salt is not provided, a new one will be generated.
    
    Args:
        password: The password to hash
        salt: Optional salt to use (if None, a new one will be generated)
        
    Returns:
        A tuple of (hashed_password, salt)
    """
    if salt is None:
        salt = secrets.token_hex(16)
    
    # Combine password and salt, then hash
    password_bytes = password.encode('utf-8')
    salt_bytes = salt.encode('utf-8')
    hash_obj = hashlib.sha256(password_bytes + salt_bytes)
    hashed_password = hash_obj.hexdigest()
    
    return hashed_password, salt


def verify_password(password: str, hashed_password: str, salt: str) -> bool:
    """
    Verify a password against a hashed password and salt.
    
    Args:
        password: The password to verify
        hashed_password: The hashed password to compare against
        salt: The salt used for hashing
        
    Returns:
        True if the password matches, False otherwise
    """
    calculated_hash, _ = hash_password(password, salt)
    return calculated_hash == hashed_password


def sanitize_input(input_str: str) -> str:
    """
    Sanitize input to prevent potential injection attacks.
    This is a basic implementation and should be expanded as needed.
    
    Args:
        input_str: The input string to sanitize
        
    Returns:
        A sanitized version of the input string
    """
    # Remove null bytes
    sanitized = input_str.replace('\0', '')
    
    # Replace potentially dangerous characters (this is a basic example)
    dangerous_chars = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '\\': '&#x5C;'
    }
    
    for char, replacement in dangerous_chars.items():
        sanitized = sanitized.replace(char, replacement)
    
    return sanitized


def generate_csrf_token() -> str:
    """
    Generate a CSRF token.
    
    Returns:
        A base64-encoded random token
    """
    return base64.b64encode(secrets.token_bytes(32)).decode('utf-8') 