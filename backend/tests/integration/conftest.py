"""
Pytest configuration for integration tests.

This module provides fixtures for integration tests, including
a FastAPI test client, mock database session, and authentication helpers.
"""

import os
import sys
import pytest
import asyncio
from typing import Generator, Dict, Any
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Import application modules
from app.main import app
from app.core.config import get_settings
from app.db.session import get_db
from app.core.security import create_access_token
from app.core.security import get_password_hash

# Test settings
settings = get_settings(env_file=".env.test")

# Test database URL - use SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create async engine and session for testing
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
TestingSessionLocal = sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def setup_database():
    """Set up test database."""
    # Import models here to prevent circular imports
    from app.db.base import Base
    
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # Clean up
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session(setup_database) -> AsyncSession:
    """
    Create a fresh database session for each test.
    
    This fixture allows us to rollback after each test, 
    ensuring test isolation.
    """
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()
        await session.close()

@pytest.fixture
async def override_get_db(db_session: AsyncSession):
    """Override the get_db dependency to use our test session."""
    async def _override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    return _override_get_db

@pytest.fixture
async def client(override_get_db) -> Generator:
    """
    Create a FastAPI TestClient that uses the test database.
    """
    # Override the get_db dependency
    app.dependency_overrides[get_db] = override_get_db
    
    # Create test client
    with TestClient(app) as test_client:
        yield test_client
    
    # Clear dependency overrides
    app.dependency_overrides.clear()

@pytest.fixture
def test_user() -> Dict[str, Any]:
    """Return test user data."""
    return {
        "email": "test@example.com",
        "password": "password123",
        "full_name": "Test User"
    }

@pytest.fixture
async def create_test_user(db_session: AsyncSession, test_user: Dict[str, Any]):
    """Create a test user in the database."""
    from app.models.user import User
    
    # Create user
    db_user = User(
        email=test_user["email"],
        hashed_password=get_password_hash(test_user["password"]),
        full_name=test_user["full_name"],
        is_active=True,
        is_superuser=False
    )
    
    db_session.add(db_user)
    await db_session.commit()
    await db_session.refresh(db_user)
    
    return db_user

@pytest.fixture
def token_headers(test_user: Dict[str, Any]) -> Dict[str, str]:
    """Return authorization headers for the test user."""
    token = create_access_token(
        subject=test_user["email"],
        expires_minutes=60
    )
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def authenticated_client(client: TestClient, create_test_user, token_headers: Dict[str, str]) -> TestClient:
    """Return an authenticated test client."""
    client.headers.update(token_headers)
    return client

@pytest.fixture
def simulation_parameters() -> Dict[str, Any]:
    """Return default simulation parameters for testing."""
    return {
        "reaction_name": "d-d",
        "projectile_z": 1,
        "projectile_a": 2,
        "target_z": 1,
        "target_a": 2,
        "temperature": 300.0,
        "pressure": 1.0e5,
        "electric_field": 0.0,
        "lattice_constant": 4.0e-10,
        "debye_temperature": 300.0,
        "loading_ratio": 0.8
    } 