"""
Configuration module for LENR Sim App

This module defines configuration settings for the application using Pydantic Settings.
It supports different environments (development, test, production) and loads environment 
variables from a .env file.
"""

import os
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import field_validator, AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class EnvironmentType(str, Enum):
    """Environment types supported by the application."""
    DEVELOPMENT = "development"
    TEST = "test"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Base configuration
    APP_NAME: str = "LENR_Sim_App"
    APP_VERSION: str = "0.2.1-beta"
    API_PREFIX: str = "/api"
    DEBUG: bool = False
    
    # Environment configuration
    ENVIRONMENT: EnvironmentType = EnvironmentType.DEVELOPMENT
    
    # CORS configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # Database configuration (placeholder for future use)
    DATABASE_URL: Optional[str] = None
    ASYNC_DATABASE_URL: Optional[str] = None
    
    # Logging configuration
    LOG_LEVEL: str = "INFO"
    LOG_TO_FILE: bool = True
    LOG_FILE_DIR: str = "logs"
    
    # Cache configuration
    CACHE_ENABLED: bool = True
    CACHE_TTL_SECONDS: int = 3600  # 1 hour
    
    # Performance configuration
    DEFAULT_TIMEOUT: float = 30.0  # Default API timeout in seconds
    MEMORY_WARNING_THRESHOLD: float = 75.0  # Percentage
    MEMORY_CRITICAL_THRESHOLD: float = 90.0  # Percentage
    MEMORY_CHECK_INTERVAL: float = 10.0  # Seconds
    ENABLE_TRACEMALLOC: bool = False  # Disable in production for performance
    ENABLE_AUTO_GC: bool = True  # Enable automatic garbage collection
    SLOW_REQUEST_THRESHOLD: float = 500.0  # Milliseconds
    
    # Middleware configuration
    ENABLE_REQUEST_ID_MIDDLEWARE: bool = True
    ENABLE_LOGGING_MIDDLEWARE: bool = True
    ENABLE_PERFORMANCE_MIDDLEWARE: bool = True
    REQUEST_ID_HEADER: str = "X-Request-ID"
    PROCESS_TIME_HEADER: str = "X-Process-Time"
    
    # Physics simulation configuration
    MAX_SIMULATION_POINTS: int = 1000
    DEFAULT_TEMPERATURE: float = 300.0  # Kelvin
    DEFAULT_PRESSURE: float = 101325.0  # Pascal (1 atm)
    
    # Security configuration
    SECRET_KEY: Optional[str] = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # New security settings
    ENABLE_RATE_LIMITING: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60  # 60 requests per minute per IP
    RATE_LIMIT_WHITELIST_IPS: List[str] = ["127.0.0.1", "::1"]
    
    ENABLE_SECURE_HEADERS: bool = True 
    ENABLE_CSP: bool = True
    ENABLE_HSTS: bool = True
    CSP_REPORT_ONLY: bool = False
    
    HTTPS_REDIRECT: bool = False  # Redirect HTTP to HTTPS
    # Will be enforced in production regardless of this setting
    
    # Security features for authentication (future implementation)
    JWT_ALGORITHM: str = "HS256"
    JWT_SECRET_KEY: Optional[str] = None  # Should be set in env for production
    
    # Content-type validation
    ENFORCE_CONTENT_TYPE: bool = True  # Validate Content-Type headers

    # Custom validation for CORS origins
    @field_validator("CORS_ORIGINS")
    @classmethod
    def validate_cors_origins(cls, v: Union[List[str], str]) -> List[str]:
        """Validate and normalize CORS origins."""
        if isinstance(v, str) and not v.startswith("["):
            return [origin.strip() for origin in v.split(",")]
        return v

    # Pydantic configuration - use environment variable prefix and .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="LENR_",
        case_sensitive=True,
        extra="ignore"
    )


# Create a global settings instance
settings = Settings()


def get_settings() -> Settings:
    """
    Return the application settings.
    
    Used as a FastAPI dependency for accessing settings.
    """
    return settings 