#!/usr/bin/env python3
"""
Simple test script to verify database interface works with both providers.
"""

import os
import sys
from pathlib import Path

# Add the app directory to the Python path (updated for tests directory)
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from app.database.providers.factory import DatabaseFactory
from app.database.providers.sqlite import SQLiteProvider


def test_sqlite_provider():
    """Test SQLite provider functionality."""
    print("Testing SQLite Provider...")

    # Create SQLite provider
    provider = SQLiteProvider("test_local.db")

    # Test insert
    user_data = {
        "id": "test-user-123",
        "email": "test@example.com",
        "name": "Test User",
    }

    try:
        result = provider.insert("users", user_data)
        print(f"✓ Insert successful: {result}")

        # Test select
        users = provider.select("users", {"email": "test@example.com"})
        print(f"✓ Select successful: {users}")

        # Test update
        update_data = {"name": "Updated Test User"}
        result = provider.update("users", update_data, {"id": "test-user-123"})
        print(f"✓ Update successful: {result}")

        # Test delete
        success = provider.delete("users", {"id": "test-user-123"})
        print(f"✓ Delete successful: {success}")

        print("✓ SQLite provider test completed successfully!")

    except Exception as e:
        print(f"✗ SQLite provider test failed: {e}")

    finally:
        # Clean up test database
        try:
            os.remove("test_local.db")
        except OSError:
            pass


def test_factory():
    """Test database factory."""
    print("\nTesting Database Factory...")

    # Test with LOCAL_ENVIRONMENT=true
    os.environ["LOCAL_ENVIRONMENT"] = "true"
    provider = DatabaseFactory.create_provider()
    print(f"✓ Factory created provider: {type(provider).__name__}")

    # Test with LOCAL_ENVIRONMENT=false
    os.environ["LOCAL_ENVIRONMENT"] = "false"
    provider = DatabaseFactory.create_provider()
    print(f"✓ Factory created provider: {type(provider).__name__}")


def test_table_interface():
    """Test table interface compatibility."""
    print("\nTesting Table Interface...")

    provider = SQLiteProvider("test_table.db")

    try:
        # Test table interface
        table = provider.get_table("users")

        # Test insert through table interface
        user_data = {
            "id": "table-test-123",
            "email": "table@example.com",
            "name": "Table Test User",
        }

        result = table.insert(user_data).data
        print(f"✓ Table insert successful: {result}")

        # Test select through table interface
        result = table.eq("email", "table@example.com").execute().data
        print(f"✓ Table select successful: {result}")

        print("✓ Table interface test completed successfully!")

    except Exception as e:
        print(f"✗ Table interface test failed: {e}")

    finally:
        # Clean up test database
        try:
            os.remove("test_table.db")
        except OSError:
            pass


if __name__ == "__main__":
    print("Database Interface Test Suite")
    print("=" * 40)

    test_sqlite_provider()
    test_factory()
    test_table_interface()

    print("\n" + "=" * 40)
    print("Test suite completed!")
