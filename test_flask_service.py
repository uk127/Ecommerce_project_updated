#!/usr/bin/env python3
"""
Simple test script to verify the Flask ML service is running and accessible.
"""
import requests
import os

def test_flask_service():
    """Test if the Flask ML service is running and responding."""
    flask_url = os.getenv('FLASK_ML_SERVICE_URL', 'http://localhost:5000')
    
    print(f"Testing Flask ML service at: {flask_url}")
    
    try:
        # Test if the service is running
        response = requests.get(f"{flask_url}/", timeout=5)
        print(f"Service status: {response.status_code}")
        print(f"Service response: {response.text}")
        
        # Test the specific endpoint we need
        response = requests.get(f"{flask_url}/generate-title-and-description", timeout=5)
        print(f"Endpoint status: {response.status_code}")
        print(f"Endpoint response: {response.text}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Flask ML service is not running or not accessible")
        print("Please start the Flask service with: python ml/res.py")
        return False
    except requests.exceptions.Timeout:
        print("❌ Request timed out - service might be running but slow")
        return False
    except Exception as e:
        print(f"❌ Error testing service: {e}")
        return False
    
    print("✅ Flask ML service is running and accessible")
    return True

if __name__ == "__main__":
    test_flask_service()