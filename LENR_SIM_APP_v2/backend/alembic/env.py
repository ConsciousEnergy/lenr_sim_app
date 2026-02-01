"""
Alembic Environment Configuration for LENR Simulation App

Supports both sync (for running migrations) and async database operations.
v0.2.3-beta
"""

import asyncio
import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import models so Alembic can detect them
from app.core.database import Base, get_database_url
from app.models.database_models import (
    Experiment, 
    ExperimentTimeline, 
    AnalyticsSnapshot
)

# This is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for 'autogenerate' support
target_metadata = Base.metadata


def get_url() -> str:
    """
    Get database URL from environment or config.
    
    Priority:
    1. DATABASE_URL environment variable
    2. Construct from DB_* environment variables
    3. SQLite fallback for development
    """
    # Check for explicit DATABASE_URL
    url = os.getenv("DATABASE_URL")
    if url:
        # Convert sync URL to async if needed
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://")
        elif url.startswith("sqlite://"):
            return url.replace("sqlite://", "sqlite+aiosqlite://")
        return url
    
    # Use the helper function that builds URL from components
    return get_database_url()


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    
    Generates SQL script without connecting to the database.
    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations with the given connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Run migrations in 'online' mode with async engine.
    
    Creates an async Engine and associates a connection with the context.
    """
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.
    
    Uses asyncio to run async migrations.
    """
    asyncio.run(run_async_migrations())


# Determine mode and run appropriate migration function
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
