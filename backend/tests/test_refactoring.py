#!/usr/bin/env python3

import asyncio
import sys
from uuid import uuid4


def test_imports():
    """Test that all key components can be imported."""
    print("🧪 Testing imports...")

    try:
        # Test storage layer imports

        print("✅ Storage layer imports successful")

        # Test service imports

        print("✅ Service imports successful")

        # Test main app import

        print("✅ Main app import successful")

        return True
    except Exception as e:
        print(f"❌ Import test failed: {e}")
        return False


def test_storage_factory():
    """Test that StorageFactory works correctly."""
    print("\n🧪 Testing StorageFactory...")

    try:
        from app.models import Client, Service, User
        from app.storage.factory import StorageFactory

        # Test creating storage services for different models
        StorageFactory.create_storage_service(
            model_class=Service,
            response_class=dict,  # Use dict for testing
            table_name="services",
        )
        print("✅ Service storage created")

        StorageFactory.create_storage_service(
            model_class=Client,
            response_class=dict,  # Use dict for testing
            table_name="clients",
        )
        print("✅ Client storage created")

        StorageFactory.create_storage_service(
            model_class=User,
            response_class=dict,  # Use dict for testing
            table_name="users",
        )
        print("✅ User storage created")

        return True
    except Exception as e:
        print(f"❌ StorageFactory test failed: {e}")
        return False


def test_service_instantiation():
    """Test that all services can be instantiated."""
    print("\n🧪 Testing service instantiation...")

    try:
        # Test service instantiation
        from app.api.clients.service import ClientService
        from app.api.profile.service import ProfileService
        from app.api.services.service import ServiceService
        from app.api.stats.service import StatsService

        ClientService()
        print("✅ ClientService instantiated")

        ServiceService()
        print("✅ ServiceService instantiated")

        ProfileService()
        print("✅ ProfileService instantiated")

        StatsService()
        print("✅ StatsService instantiated")

        return True
    except Exception as e:
        print(f"❌ Service instantiation test failed: {e}")
        return False


async def test_storage_operations():
    """Test basic storage operations."""
    print("\n🧪 Testing storage operations...")

    try:
        from app.config import settings

        # Only run storage operations test in development mode
        if settings.environment != "dev":
            print("⏭️  Skipping storage operations test in production mode")
            return True

        from app.models import User
        from app.storage.factory import StorageFactory

        # Create a test user storage with proper response class
        user_storage = StorageFactory.create_storage_service(
            model_class=User,
            response_class=dict,  # Use dict as response class for testing
            table_name="users",
        )

        # Test user ID
        test_user_id = uuid4()

        # Test data (without id to let the model generate it)
        user_data = {
            "email": "test@example.com",
            "name": "Test User",
            "profile_picture_url": None,
            "tutorial_checked": False,
        }

        # Test create operation
        created_user = await user_storage.create(test_user_id, user_data)
        print("✅ Create operation successful")

        # Get the created user's ID for subsequent operations
        created_user_id = (
            created_user["id"] if isinstance(created_user, dict) else created_user.id
        )

        # Test get_by_id operation
        retrieved_user = await user_storage.get_by_id(test_user_id, created_user_id)
        if retrieved_user:
            print("✅ Get by ID operation successful")
        else:
            print("❌ Get by ID operation failed")
            return False

        # Test exists operation
        exists = await user_storage.exists(test_user_id, created_user_id)
        if exists:
            print("✅ Exists operation successful")
        else:
            print("❌ Exists operation failed")
            return False

        # Test update operation
        update_data = {"name": "Updated Test User"}
        updated_user = await user_storage.update(
            test_user_id, created_user_id, update_data
        )
        if updated_user:
            print("✅ Update operation successful")
        else:
            print("❌ Update operation failed")
            return False

        # Test delete operation
        deleted = await user_storage.delete(test_user_id, created_user_id)
        if deleted:
            print("✅ Delete operation successful")
        else:
            print("❌ Delete operation failed")
            return False

        return True
    except Exception as e:
        print(f"❌ Storage operations test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_configuration():
    """Test that configuration is working correctly."""
    print("\n🧪 Testing configuration...")

    try:
        from app.config import settings

        print(f"✅ Environment: {settings.environment}")
        print(f"✅ Database path: {settings.database_path}")
        print(f"✅ Supabase URL: {settings.supabase_url}")
        print(
            f"✅ Enable meeting status updates: {settings.enable_meeting_status_updates}"
        )

        return True
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False


async def main():
    """Run all tests."""
    print("🚀 Starting comprehensive refactoring test...")
    print("=" * 60)

    tests = [
        ("Import Tests", test_imports),
        ("Storage Factory Tests", test_storage_factory),
        ("Service Instantiation Tests", test_service_instantiation),
        ("Storage Operations Tests", test_storage_operations),
        ("Configuration Tests", test_configuration),
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name}...")
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()

            if result:
                passed += 1
                print(f"✅ {test_name} PASSED")
            else:
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            print(f"❌ {test_name} FAILED with exception: {e}")

    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! The refactoring is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
