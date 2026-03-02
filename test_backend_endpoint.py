#!/usr/bin/env python3
"""
Simple test script to verify the backend endpoint is working.
"""
import requests
import os

def test_backend_endpoint():
    """Test if the backend endpoint is working."""
    backend_url = "http://localhost:8001"
    
    print(f"Testing backend endpoint at: {backend_url}/api/v2/product/test")
    
    try:
        # Test the test endpoint
        response = requests.get(f"{backend_url}/api/v2/product/test", timeout=5)
        print(f"Backend status: {response.status_code}")
        print(f"Backend response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Backend endpoint is working!")
        else:
            print("❌ Backend endpoint returned error")
            
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running or not accessible")
        print("Please start the backend server with: npm run dev (in backend directory)")
        return False
    except requests.exceptions.Timeout:
        print("❌ Request timed out - backend might be running but slow")
        return False
    except Exception as e:
        print(f"❌ Error testing backend: {e}")
        return False
    
    return True

if __name__ == "__main__":
    test_backend_endpoint()