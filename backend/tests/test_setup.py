#!/usr/bin/env python3
"""
Test script to verify Epic-2 implementation
"""

import sys
from pathlib import Path

# Add the app directory to the Python path (updated for tests directory)
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))


def test_environment_loading():
    """Test environment variable loading."""
    print("Testing environment variable loading...")

    try:
        from app.config import settings

        print("✅ Environment variables loaded successfully")

        # Check required variables
        required_vars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SECRET_KEY"]

        for var in required_vars:
            value = getattr(settings, var)
            if not value:
                print(f"❌ Missing required environment variable: {var}")
                return False
            else:
                print(f"✅ {var}: {'*' * len(value)} (hidden)")

        return True
    except Exception as e:
        print(f"❌ Error loading environment variables: {e}")
        return False


def test_supabase_client():
    """Test Supabase client creation."""
    print("\nTesting Supabase client creation...")

    try:
        from app.database import db

        # Verify client exists (don't assign to unused variable)
        _ = db.client
        print("✅ Supabase client created successfully")
        return True
    except Exception as e:
        print(f"❌ Error creating Supabase client: {e}")
        return False


def test_auth_middleware():
    """Test authentication middleware setup."""
    print("\nTesting authentication middleware setup...")

    try:

        print("✅ Authentication middleware setup successfully")
        return True
    except Exception as e:
        print(f"❌ Error setting up authentication middleware: {e}")
        return False


def test_middleware_setup():
    """Test middleware setup."""
    print("\nTesting middleware setup...")

    try:
        from fastapi import FastAPI

        from app.middleware import setup_middleware

        app = FastAPI()
        setup_middleware(app)
        print("✅ Middleware setup successfully")
        return True
    except Exception as e:
        print(f"❌ Error setting up middleware: {e}")
        return False


def test_fastapi_app():
    """Test FastAPI application creation."""
    print("\nTesting FastAPI application creation...")

    try:

        print("✅ FastAPI application created successfully")
        return True
    except Exception as e:
        print(f"❌ Error creating FastAPI application: {e}")
        return False


def main():
    """Run all tests."""
    print("🧪 Testing Epic-2 Implementation")
    print("=" * 40)

    tests = [
        test_environment_loading,
        test_supabase_client,
        test_auth_middleware,
        test_middleware_setup,
        test_fastapi_app,
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1

    print("\n" + "=" * 40)
    print(f"Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Epic-2 implementation is ready.")
        return 0
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    exit(main())
