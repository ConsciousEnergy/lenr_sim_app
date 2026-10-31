"""
Configuration module for LENR Sim App

This module defines configuration settings for the application using Pydantic Settings.
It supports different environments (development, test, production) and loads environment 
variables from a .env file.
"""

import os
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import field_validator, model_validator, AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


def _read_secret_from_file(env_var: str) -> Optional[str]:
    """Read a secret from a file path stored in an environment variable (Docker secrets pattern)."""
    path = os.getenv(env_var) or os.getenv(f"LENR_{env_var}")
    if path and os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read().strip()
        except OSError:
            pass
    return None


class EnvironmentType(str, Enum):
    """Environment types supported by the application."""
    DEVELOPMENT = "development"
    TEST = "test"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Base configuration
    APP_NAME: str = "LENR_Sim_App"
    APP_VERSION: str = "0.3.9-beta"
    API_PREFIX: str = "/api"
    DEBUG: bool = False
    
    # Environment configuration
    ENVIRONMENT: EnvironmentType = EnvironmentType.DEVELOPMENT
    
    # CORS configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # Database configuration (v0.2.3-beta)
    DATABASE_URL: Optional[str] = None  # Will be built from DB_* vars if not set
    DB_HOST: Optional[str] = None
    DB_PORT: int = 5432
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_NAME: Optional[str] = None
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_ECHO_SQL: bool = False  # Log SQL statements (debug only)
    
    # Logging configuration
    # Staging (api-staging Swarm): LENR_LOG_LEVEL=INFO (DEBUG only for short
    # triage windows), LENR_LOG_JSON_FORMAT=true so request_id is a JSON field.
    # Never log Authorization, Cookie, SECRET_KEY, tokens, or DB passwords.
    LOG_LEVEL: str = "INFO"
    LOG_TO_FILE: bool = True
    LOG_FILE_DIR: str = "logs"
    LOG_JSON_FORMAT: bool = False  # Set True in staging/production for structured JSON logging
    
    # Cache configuration
    CACHE_ENABLED: bool = True
    CACHE_TTL_SECONDS: int = 3600  # 1 hour
    
    # Performance configuration
    DEFAULT_TIMEOUT: float = 30.0  # Default API timeout in seconds
    # System-wide virtual_memory().percent thresholds. Desktop machines often sit
    # above 75% with a browser/IDE open; 75/90 caused CRITICAL spam and competed
    # with `npm ci` during start_app.bat. Warn later; critical only when nearly full.
    MEMORY_WARNING_THRESHOLD: float = 90.0  # Percentage
    MEMORY_CRITICAL_THRESHOLD: float = 97.0  # Percentage
    MEMORY_CHECK_INTERVAL: float = 10.0  # Seconds
    ENABLE_TRACEMALLOC: bool = False  # Disable in production for performance
    ENABLE_AUTO_GC: bool = True  # Enable automatic garbage collection
    SLOW_REQUEST_THRESHOLD: float = 500.0  # Milliseconds
    ENABLE_LEGACY_HYDROTON: bool = False
    
    # Middleware configuration
    ENABLE_REQUEST_ID_MIDDLEWARE: bool = True
    ENABLE_LOGGING_MIDDLEWARE: bool = True
    ENABLE_PERFORMANCE_MIDDLEWARE: bool = True
    REQUEST_ID_HEADER: str = "X-Request-ID"
    # Inbound alias accepted by RequestIDMiddleware (same value echoed as X-Request-ID).
    CORRELATION_ID_HEADER: str = "X-Correlation-ID"
    PROCESS_TIME_HEADER: str = "X-Process-Time"
    
    # Physics simulation configuration
    MAX_SIMULATION_POINTS: int = 1000
    # Heavy-compute guard (see app/core/compute_guard.py). Sized for the 2 vCPU
    # public-beta VPS running a single uvicorn worker.
    MAX_CONCURRENT_HEAVY_SIMS: int = 2
    HEAVY_SLOT_WAIT_SECONDS: float = 10.0
    # Upper bounds for unauthenticated compute inputs (multi-physics grid / steps,
    # legacy WebSocket demo streams). Requests above these are rejected with 422.
    MAX_MULTI_PHYSICS_GRID_POINTS_PER_AXIS: int = 32
    MAX_MULTI_PHYSICS_STEPS: int = 20000
    MAX_WS_DURATION_STEPS: int = 2000
    DEFAULT_TEMPERATURE: float = 300.0  # Kelvin
    DEFAULT_PRESSURE: float = 101325.0  # Pascal (1 atm)
    
    # Security configuration
    SECRET_KEY: Optional[str] = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    # Optional dedicated token for Analytics mutate in production. Falls back to SECRET_KEY.
    ANALYTICS_WRITE_TOKEN: Optional[str] = None
    
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

    # Request body size limit (bytes, default 10 MB)
    REQUEST_MAX_BODY_SIZE: int = 10 * 1024 * 1024

    # Custom validation for CORS origins - must run BEFORE type coercion
    @field_validator("CORS_ORIGINS", mode='before')
    @classmethod
    def validate_cors_origins(cls, v: Union[List[str], str]) -> List[str]:
        """Validate and normalize CORS origins from environment variable string."""
        if isinstance(v, str):
            # Handle comma-separated string from environment variable
            if not v.startswith("["):
                return [origin.strip() for origin in v.split(",") if origin.strip()]
            # Handle JSON array string
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    # Also validate RATE_LIMIT_WHITELIST_IPS
    @field_validator("RATE_LIMIT_WHITELIST_IPS", mode='before')
    @classmethod
    def validate_whitelist_ips(cls, v: Union[List[str], str]) -> List[str]:
        """Validate and normalize whitelist IPs from environment variable string."""
        if isinstance(v, str):
            if not v.startswith("["):
                return [ip.strip() for ip in v.split(",") if ip.strip()]
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [ip.strip() for ip in v.split(",") if ip.strip()]
        return v

    @model_validator(mode="after")
    def load_secrets_from_files(self) -> "Settings":
        """Load SECRET_KEY and JWT_SECRET_KEY from Docker secret files if *_FILE env vars are set."""
        if not self.SECRET_KEY:
            secret = _read_secret_from_file("SECRET_KEY_FILE")
            if secret:
                object.__setattr__(self, "SECRET_KEY", secret)
        if not self.JWT_SECRET_KEY:
            secret = _read_secret_from_file("JWT_SECRET_KEY_FILE")
            if secret:
                object.__setattr__(self, "JWT_SECRET_KEY", secret)
        if not self.ANALYTICS_WRITE_TOKEN:
            token = _read_secret_from_file("ANALYTICS_WRITE_TOKEN_FILE")
            if token:
                object.__setattr__(self, "ANALYTICS_WRITE_TOKEN", token)

        # Enforce safe production CORS defaults when local dev origins are left unchanged.
        if self.ENVIRONMENT == EnvironmentType.PRODUCTION:
            local_origins = {
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:5173",
            }
            configured_origins = set(self.CORS_ORIGINS or [])
            if not configured_origins or configured_origins.issubset(local_origins):
                object.__setattr__(
                    self,
                    "CORS_ORIGINS",
                    ["https://conscious.energy", "https://www.conscious.energy"],
                )

        # Disable the global per-IP rate limiter under the test environment. The full test
        # suite floods a single client past the 60 req/min limit and would otherwise return
        # 429s (the limiter's own unit tests build a dedicated app with the middleware
        # attached explicitly, so they are unaffected). See VERIFICATION_GATE_REPORT.md.
        if self.ENVIRONMENT == EnvironmentType.TEST and self.ENABLE_RATE_LIMITING:
            object.__setattr__(self, "ENABLE_RATE_LIMITING", False)

        if self.ENVIRONMENT == EnvironmentType.PRODUCTION and not self.SECRET_KEY:
            raise ValueError(
                "LENR_SECRET_KEY is required when LENR_ENVIRONMENT=production"
            )
        return self

    # Pydantic configuration - use environment variable prefix and .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="LENR_",
        case_sensitive=True,
        extra="ignore"
    )


def openapi_surface(environment: EnvironmentType) -> Dict[str, Optional[str]]:
    """Public OpenAPI URLs. Disabled in production (health stays public)."""
    if environment == EnvironmentType.PRODUCTION:
        return {"docs_url": None, "redoc_url": None, "openapi_url": None}
    return {
        "docs_url": "/api/docs",
        "redoc_url": "/api/redoc",
        "openapi_url": "/api/openapi.json",
    }


# Create a global settings instance
settings = Settings()


def get_settings() -> Settings:
    """
    Return the application settings.
    
    Used as a FastAPI dependency for accessing settings.
    """
    return settings 