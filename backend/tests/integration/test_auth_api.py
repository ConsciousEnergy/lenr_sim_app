"""
Integration tests for authentication and authorization API endpoints.

These tests verify that the authentication and authorization API endpoints correctly
handle user registration, login, token refresh, password reset, and role-based access control.
"""

import pytest
import re
import time
from fastapi.testclient import TestClient
from typing import Dict, Any, Tuple

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def user_credentials() -> Dict[str, str]:
    """Return user credentials for testing authentication."""
    return {
        "email": f"test_user_{int(time.time())}@example.com",
        "password": "Test@Password123",
        "first_name": "Test",
        "last_name": "User"
    }


@pytest.fixture
def admin_credentials() -> Dict[str, str]:
    """Return admin credentials for testing authentication."""
    return {
        "email": f"test_admin_{int(time.time())}@example.com",
        "password": "Admin@Password123",
        "first_name": "Test",
        "last_name": "Admin"
    }


@pytest.fixture
def registered_user(client: TestClient, user_credentials: Dict[str, str]) -> Dict[str, Any]:
    """Register a standard user and return their credentials and user ID."""
    response = client.post("/api/auth/register", json=user_credentials)
    assert response.status_code == 201
    
    result = response.json()
    assert "user_id" in result
    assert "email" in result
    assert result["email"] == user_credentials["email"]
    
    return {
        "user_id": result["user_id"],
        "email": result["email"],
        "password": user_credentials["password"]
    }


@pytest.fixture
def registered_admin(client: TestClient, admin_credentials: Dict[str, str]) -> Dict[str, Any]:
    """Register an admin user and return their credentials and user ID."""
    # First register as a normal user
    response = client.post("/api/auth/register", json=admin_credentials)
    assert response.status_code == 201
    
    user_id = response.json()["user_id"]
    
    # Use a superadmin token to promote this user to admin
    # Note: In a real test environment, you would need to properly set up this superadmin
    # This is a simplified example that may need adaptation depending on your auth system
    superadmin_login_response = client.post("/api/auth/login", json={
        "email": "superadmin@example.com",
        "password": "SuperAdmin@Password123"
    })
    
    # If your system doesn't have a default superadmin, you may need to skip this test
    # or set up the superadmin in your test database
    if superadmin_login_response.status_code == 200:
        superadmin_token = superadmin_login_response.json()["access_token"]
        
        # Promote user to admin
        response = client.put(
            f"/api/admin/users/{user_id}/role",
            json={"role": "admin"},
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        assert response.status_code == 200
    
    return {
        "user_id": user_id,
        "email": admin_credentials["email"],
        "password": admin_credentials["password"]
    }


@pytest.fixture
def user_token(client: TestClient, registered_user: Dict[str, Any]) -> Dict[str, str]:
    """Log in as a registered user and return authentication tokens."""
    login_data = {
        "email": registered_user["email"],
        "password": registered_user["password"]
    }
    
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    
    result = response.json()
    assert "access_token" in result
    assert "refresh_token" in result
    assert "token_type" in result
    assert result["token_type"] == "bearer"
    
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"]
    }


@pytest.fixture
def admin_token(client: TestClient, registered_admin: Dict[str, Any]) -> Dict[str, str]:
    """Log in as an admin user and return authentication tokens."""
    login_data = {
        "email": registered_admin["email"],
        "password": registered_admin["password"]
    }
    
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    
    result = response.json()
    assert "access_token" in result
    assert "refresh_token" in result
    
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"]
    }


class TestAuthAPI:
    """Tests for the authentication API endpoints."""
    
    def test_register_user(self, client: TestClient, user_credentials: Dict[str, str]):
        """Test user registration."""
        response = client.post("/api/auth/register", json=user_credentials)
        assert response.status_code == 201
        
        result = response.json()
        assert "user_id" in result
        assert "email" in result
        assert result["email"] == user_credentials["email"]
        assert "password" not in result  # Password should not be returned
    
    def test_register_duplicate_email(self, client: TestClient, registered_user: Dict[str, Any]):
        """Test registration with an existing email address."""
        duplicate_user = {
            "email": registered_user["email"],
            "password": "DifferentPassword123!",
            "first_name": "Another",
            "last_name": "User"
        }
        
        response = client.post("/api/auth/register", json=duplicate_user)
        assert response.status_code == 409  # Conflict
    
    def test_register_invalid_password(self, client: TestClient):
        """Test registration with an invalid password."""
        user_with_weak_password = {
            "email": f"weak_password_user_{int(time.time())}@example.com",
            "password": "weak",  # Too simple/short
            "first_name": "Weak",
            "last_name": "Password"
        }
        
        response = client.post("/api/auth/register", json=user_with_weak_password)
        assert response.status_code == 422  # Unprocessable Entity
    
    def test_login_success(self, client: TestClient, registered_user: Dict[str, Any]):
        """Test successful login."""
        login_data = {
            "email": registered_user["email"],
            "password": registered_user["password"]
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        result = response.json()
        assert "access_token" in result
        assert "refresh_token" in result
        assert "token_type" in result
        assert result["token_type"] == "bearer"
    
    def test_login_invalid_email(self, client: TestClient):
        """Test login with a non-existent email."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "SomePassword123!"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401  # Unauthorized
    
    def test_login_invalid_password(self, client: TestClient, registered_user: Dict[str, Any]):
        """Test login with an incorrect password."""
        login_data = {
            "email": registered_user["email"],
            "password": "WrongPassword123!"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401  # Unauthorized
    
    def test_refresh_token(self, client: TestClient, user_token: Dict[str, str]):
        """Test refreshing access token using refresh token."""
        refresh_data = {
            "refresh_token": user_token["refresh_token"]
        }
        
        response = client.post("/api/auth/refresh", json=refresh_data)
        assert response.status_code == 200
        
        result = response.json()
        assert "access_token" in result
        assert "token_type" in result
        assert result["token_type"] == "bearer"
        
        # New access token should be different from the old one
        assert result["access_token"] != user_token["access_token"]
    
    def test_refresh_invalid_token(self, client: TestClient):
        """Test refreshing with an invalid refresh token."""
        refresh_data = {
            "refresh_token": "invalid_refresh_token"
        }
        
        response = client.post("/api/auth/refresh", json=refresh_data)
        assert response.status_code == 401  # Unauthorized
    
    def test_logout(self, client: TestClient, user_token: Dict[str, str]):
        """Test user logout."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        response = client.post("/api/auth/logout", headers=headers)
        assert response.status_code == 200
        
        # After logout, the token should be invalidated
        # Attempt to access a protected endpoint
        protected_response = client.get("/api/users/me", headers=headers)
        assert protected_response.status_code == 401  # Unauthorized
    
    def test_password_reset_request(self, client: TestClient, registered_user: Dict[str, Any]):
        """Test requesting a password reset."""
        request_data = {
            "email": registered_user["email"]
        }
        
        response = client.post("/api/auth/password-reset/request", json=request_data)
        assert response.status_code in [200, 202]  # 202 if async processing is used
    
    def test_password_reset_nonexistent_email(self, client: TestClient):
        """Test requesting a password reset for a non-existent email."""
        request_data = {
            "email": "nonexistent@example.com"
        }
        
        response = client.post("/api/auth/password-reset/request", json=request_data)
        assert response.status_code in [200, 202]  # Should not reveal if email exists
    
    def test_get_current_user(self, client: TestClient, user_token: Dict[str, str], registered_user: Dict[str, Any]):
        """Test getting the current user's profile."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        response = client.get("/api/users/me", headers=headers)
        assert response.status_code == 200
        
        user_info = response.json()
        assert "user_id" in user_info
        assert user_info["user_id"] == registered_user["user_id"]
        assert user_info["email"] == registered_user["email"]
        assert "password" not in user_info  # Password should not be returned
    
    def test_update_user_profile(self, client: TestClient, user_token: Dict[str, str]):
        """Test updating the user's profile."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        update_data = {
            "first_name": "Updated",
            "last_name": "Name"
        }
        
        response = client.put("/api/users/me", json=update_data, headers=headers)
        assert response.status_code == 200
        
        updated_user = response.json()
        assert updated_user["first_name"] == update_data["first_name"]
        assert updated_user["last_name"] == update_data["last_name"]
    
    def test_change_password(self, client: TestClient, user_token: Dict[str, str], registered_user: Dict[str, Any]):
        """Test changing the user's password."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        change_password_data = {
            "current_password": registered_user["password"],
            "new_password": "NewPassword@456"
        }
        
        response = client.post(
            "/api/users/me/change-password",
            json=change_password_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify we can log in with the new password
        login_data = {
            "email": registered_user["email"],
            "password": "NewPassword@456"
        }
        
        login_response = client.post("/api/auth/login", json=login_data)
        assert login_response.status_code == 200
    
    def test_change_password_incorrect_current(self, client: TestClient, user_token: Dict[str, str]):
        """Test changing password with incorrect current password."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        change_password_data = {
            "current_password": "WrongCurrentPassword123!",
            "new_password": "NewPassword@456"
        }
        
        response = client.post(
            "/api/users/me/change-password",
            json=change_password_data,
            headers=headers
        )
        assert response.status_code == 401  # Unauthorized


class TestRoleBasedAuthorization:
    """Tests for role-based access control."""
    
    def test_user_cannot_access_admin_endpoints(self, client: TestClient, user_token: Dict[str, str]):
        """Test that regular users cannot access admin endpoints."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        # Attempt to access an admin endpoint
        response = client.get("/api/admin/users", headers=headers)
        assert response.status_code == 403  # Forbidden
    
    def test_admin_can_access_admin_endpoints(self, client: TestClient, admin_token: Dict[str, str]):
        """Test that admin users can access admin endpoints."""
        # Skip if admin fixture is not properly set up
        if not admin_token.get("access_token"):
            pytest.skip("Admin user setup is not available")
            
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        
        # Access an admin endpoint
        response = client.get("/api/admin/users", headers=headers)
        assert response.status_code == 200
        
        users = response.json()
        assert isinstance(users, list)
    
    def test_admin_can_view_user_details(self, client: TestClient, admin_token: Dict[str, str], registered_user: Dict[str, Any]):
        """Test that admin users can view details of other users."""
        # Skip if admin fixture is not properly set up
        if not admin_token.get("access_token"):
            pytest.skip("Admin user setup is not available")
            
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        user_id = registered_user["user_id"]
        
        response = client.get(f"/api/admin/users/{user_id}", headers=headers)
        assert response.status_code == 200
        
        user_details = response.json()
        assert user_details["user_id"] == user_id
        assert user_details["email"] == registered_user["email"]
    
    def test_admin_can_update_user_role(self, client: TestClient, admin_token: Dict[str, str], registered_user: Dict[str, Any]):
        """Test that admin users can update the roles of other users."""
        # Skip if admin fixture is not properly set up
        if not admin_token.get("access_token"):
            pytest.skip("Admin user setup is not available")
            
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        user_id = registered_user["user_id"]
        
        update_role_data = {
            "role": "premium_user"
        }
        
        response = client.put(
            f"/api/admin/users/{user_id}/role",
            json=update_role_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify role was updated
        get_response = client.get(f"/api/admin/users/{user_id}", headers=headers)
        assert get_response.status_code == 200
        
        updated_user = get_response.json()
        assert updated_user["role"] == "premium_user"
    
    def test_access_token_expiration(self, client: TestClient, user_token: Dict[str, str]):
        """Test that access tokens expire after their specified lifetime."""
        # This test may be hard to implement in a unit test since token expiration
        # typically occurs after several minutes. You might want to skip this
        # or modify your auth system to use shorter lifetimes in test environments.
        pytest.skip("Token expiration test requires special handling or mocking of time")
    
    def test_inactive_user_cannot_login(self, client: TestClient, registered_user: Dict[str, Any], admin_token: Dict[str, str]):
        """Test that deactivated users cannot log in."""
        # Skip if admin fixture is not properly set up
        if not admin_token.get("access_token"):
            pytest.skip("Admin user setup is not available")
            
        # First, deactivate the user as admin
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        user_id = registered_user["user_id"]
        
        deactivate_data = {
            "is_active": False
        }
        
        response = client.put(
            f"/api/admin/users/{user_id}/status",
            json=deactivate_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # Now try to log in as the deactivated user
        login_data = {
            "email": registered_user["email"],
            "password": registered_user["password"]
        }
        
        login_response = client.post("/api/auth/login", json=login_data)
        assert login_response.status_code == 401  # Unauthorized 