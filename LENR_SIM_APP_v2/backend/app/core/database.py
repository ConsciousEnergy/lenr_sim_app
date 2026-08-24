"""
Database Connection Module for LENR Simulation App

Provides async SQLAlchemy engine and session management for PostgreSQL (production)
and SQLite (development) databases.

v0.2.3-beta: Initial database implementation for analytics and experiment storage.
"""

import asyncio
import os
import logging
import time
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool
from sqlalchemy import text

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


class DatabaseManager:
    """
    Manages database connections and sessions.
    
    Supports both PostgreSQL (production) and SQLite (development).
    Uses async SQLAlchemy 2.0 patterns.
    """
    
    def __init__(self):
        self._engine: Optional[AsyncEngine] = None
        self._session_factory: Optional[async_sessionmaker[AsyncSession]] = None
        self._is_initialized = False
    
    @property
    def engine(self) -> AsyncEngine:
        """Get the database engine."""
        if self._engine is None:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        return self._engine
    
    @property
    def session_factory(self) -> async_sessionmaker[AsyncSession]:
        """Get the session factory."""
        if self._session_factory is None:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        return self._session_factory
    
    def initialize(
        self,
        database_url: str,
        echo: bool = False,
        pool_size: int = 5,
        max_overflow: int = 10,
        pool_timeout: int = 30,
    ) -> None:
        """
        Initialize the database engine and session factory.
        
        Args:
            database_url: Database connection URL (async format)
            echo: Whether to log SQL statements
            pool_size: Number of connections to keep in pool
            max_overflow: Max connections above pool_size
            pool_timeout: Seconds to wait for connection from pool
        """
        if self._is_initialized:
            logger.warning("Database already initialized, skipping re-initialization")
            return
        
        # Determine if using SQLite (for development)
        is_sqlite = database_url.startswith("sqlite")
        
        # Configure pool based on database type
        if is_sqlite:
            # SQLite doesn't support connection pooling well with async
            engine_kwargs = {
                "poolclass": NullPool,
            }
            logger.info("Initializing SQLite database (development mode)")
        else:
            # PostgreSQL with connection pooling
            engine_kwargs = {
                "poolclass": AsyncAdaptedQueuePool,
                "pool_size": pool_size,
                "max_overflow": max_overflow,
                "pool_timeout": pool_timeout,
                "pool_pre_ping": True,  # Verify connections before use
            }
            logger.info("Initializing PostgreSQL database (production mode)")
        
        # Create async engine
        self._engine = create_async_engine(
            database_url,
            echo=echo,
            **engine_kwargs
        )
        
        # Create session factory
        self._session_factory = async_sessionmaker(
            bind=self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
        
        self._is_initialized = True
        logger.info(f"Database initialized successfully")
    
    async def create_tables(self) -> None:
        """Create all tables defined in models."""
        if not self._is_initialized:
            raise RuntimeError("Database not initialized")
        
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("Database tables created successfully")
    
    async def drop_tables(self) -> None:
        """Drop all tables (use with caution!)."""
        if not self._is_initialized:
            raise RuntimeError("Database not initialized")
        
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        
        logger.warning("Database tables dropped")
    
    async def health_check(self) -> dict:
        """
        Check database connectivity and return status.
        
        Returns:
            Dict with status, latency, and connection info
        """
        import time
        
        if not self._is_initialized:
            return {
                "status": "error",
                "message": "Database not initialized",
                "connected": False
            }
        
        try:
            start = time.time()
            async with self._session_factory() as session:
                await session.execute(text("SELECT 1"))
            latency_ms = (time.time() - start) * 1000
            
            return {
                "status": "healthy",
                "connected": True,
                "latency_ms": round(latency_ms, 2),
                "pool_size": getattr(self._engine.pool, 'size', 'N/A'),
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "connected": False,
                "error": str(e)
            }
    
    async def wait_for_connection(
        self, retries: int = 5, base_delay: float = 2.0
    ) -> bool:
        """
        Wait for the database to become reachable using exponential backoff.
        
        Critical for Docker Swarm where the backend may start before PostgreSQL.
        
        Args:
            retries: Maximum number of connection attempts.
            base_delay: Initial delay in seconds (doubles each attempt).
            
        Returns:
            True if connection succeeded, False otherwise.
        """
        for attempt in range(1, retries + 1):
            try:
                async with self._session_factory() as session:
                    await session.execute(text("SELECT 1"))
                logger.info(f"Database connection verified on attempt {attempt}")
                return True
            except Exception as exc:
                delay = base_delay * (2 ** (attempt - 1))
                logger.warning(
                    f"DB connection attempt {attempt}/{retries} failed: {exc}. "
                    f"Retrying in {delay:.1f}s..."
                )
                if attempt < retries:
                    await asyncio.sleep(delay)
        logger.error(f"Database unreachable after {retries} attempts")
        return False

    async def close(self) -> None:
        """Close the database connection pool."""
        if self._engine:
            await self._engine.dispose()
            self._is_initialized = False
            logger.info("Database connection closed")
    
    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Context manager for database sessions.
        
        Usage:
            async with db_manager.session() as session:
                result = await session.execute(query)
        """
        async with self._session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise


# Global database manager instance
db_manager = DatabaseManager()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for database sessions.
    
    Usage in routes:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db_session)):
            ...
    """
    async with db_manager.session() as session:
        yield session


def get_database_url(
    db_host: Optional[str] = None,
    db_port: int = 5432,
    db_user: Optional[str] = None,
    db_password: Optional[str] = None,
    db_name: Optional[str] = None,
    use_sqlite_fallback: bool = True,
) -> str:
    """
    Build database URL from components or environment variables.
    
    Priority:
    1. Explicit parameters
    2. Environment variables — unprefixed ``DB_*`` or ``LENR_DB_*``
       (Pydantic Settings uses the ``LENR_`` prefix; Swarm stack sets both)
    3. SQLite fallback for development
    
    Returns:
        Async database URL string
    """
    def _env(*names: str, default: Optional[str] = None) -> Optional[str]:
        for name in names:
            value = os.getenv(name)
            if value is not None and value != "":
                return value
        return default

    # Check for explicit PostgreSQL configuration
    host = db_host or _env("DB_HOST", "LENR_DB_HOST")
    port = db_port or int(_env("DB_PORT", "LENR_DB_PORT", default="5432") or "5432")
    user = db_user or _env("DB_USER", "LENR_DB_USER")
    name = db_name or _env("DB_NAME", "LENR_DB_NAME")
    
    # Try to get password from file (Docker secrets) or env var
    password = db_password
    if not password:
        password_file = _env("DB_PASSWORD_FILE", "LENR_DB_PASSWORD_FILE")
        if password_file and os.path.exists(password_file):
            with open(password_file, 'r', encoding='utf-8') as f:
                password = f.read().strip()
        else:
            password = _env("DB_PASSWORD", "LENR_DB_PASSWORD")
    
    # If we have PostgreSQL config, build the URL
    if host and user and password and name:
        return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{name}"

    sqlite_override = _env("SQLITE_PATH", "LENR_SQLITE_PATH")
    if sqlite_override:
        parent = os.path.dirname(os.path.abspath(sqlite_override))
        if parent:
            os.makedirs(parent, exist_ok=True)
        return f"sqlite+aiosqlite:///{os.path.abspath(sqlite_override)}"
    
    # Fall back to SQLite for development
    if use_sqlite_fallback:
        # Create data directory if it doesn't exist
        data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
        os.makedirs(data_dir, exist_ok=True)
        sqlite_path = os.path.join(data_dir, "lenr_sim.db")
        return f"sqlite+aiosqlite:///{sqlite_path}"
    
    raise ValueError(
        "Database configuration incomplete. Set DB_HOST, DB_USER, DB_PASSWORD, "
        "DB_NAME environment variables or provide them as parameters."
    )
