import requests
import json

def test_api_endpoints():
    """Test various backend API endpoints to diagnose issues"""
    base_url = "http://localhost:8001"
    
    # Check API health
    health_url = f"{base_url}/api/health"
    print(f"\nTesting GET {health_url}")
    try:
        response = requests.get(health_url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"Exception: {str(e)}")
    
    # Check api/physics endpoint
    physics_url = f"{base_url}/api/physics"
    print(f"\nTesting GET {physics_url}")
    try:
        response = requests.get(physics_url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"Exception: {str(e)}")
    
    # Check API root 
    root_url = f"{base_url}/"
    print(f"\nTesting GET {root_url}")
    try:
        response = requests.get(root_url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"Exception: {str(e)}")
    
    # Check physics/status endpoint which should exist
    status_url = f"{base_url}/api/physics/status"
    print(f"\nTesting GET {status_url}")
    try:
        response = requests.get(status_url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"Exception: {str(e)}")
    
    # Try the initialize endpoint 
    initialize_url = f"{base_url}/api/physics/initialize"
    print(f"\nTesting POST {initialize_url}")
    payload = {
        "temperature": 300,
        "pressure": 101325,
        "electron_density": 1e28,
        "lattice_constant": 3.89e-10, 
        "dimensions": [10, 10, 10],
        "enhancement_factor": 1.0,
        "time_step": 1e-15,
        "max_steps": 1000
    }
    
    try:
        response = requests.post(initialize_url, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"Exception: {str(e)}")

if __name__ == "__main__":
    test_api_endpoints() 