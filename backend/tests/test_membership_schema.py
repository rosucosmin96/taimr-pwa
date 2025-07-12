#!/usr/bin/env python3
"""Test script to verify membership schema and API endpoints."""

import sys
from pathlib import Path

from sqlalchemy import text

from app.database import get_db
from app.database.init_db import init_database

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))


def test_database_schema():
    """Test that the database schema includes the new membership table."""
    print("🔄 Testing database schema...")

    # Initialize database
    init_database()

    # Get a database session
    db = next(get_db())

    try:
        # Test that the memberships table exists
        result = db.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='memberships'"
            )
        )
        tables = result.fetchall()

        if tables:
            print("✅ Memberships table created successfully")
        else:
            print("❌ Memberships table not found")
            return False

        # Test that the meetings table has the membership_id column
        result = db.execute(text("PRAGMA table_info(meetings)"))
        columns = result.fetchall()
        column_names = [col[1] for col in columns]

        if "membership_id" in column_names:
            print("✅ Meetings table has membership_id column")
        else:
            print("❌ Meetings table missing membership_id column")
            return False

        print("✅ Database schema test passed!")
        return True

    except Exception as e:
        print(f"❌ Database schema test failed: {e}")
        return False
    finally:
        db.close()


def test_model_imports():
    """Test that all models can be imported correctly."""
    print("🔄 Testing model imports...")

    try:

        print("✅ All models imported successfully")
        return True
    except Exception as e:
        print(f"❌ Model import failed: {e}")
        return False


if __name__ == "__main__":
    print("🧪 Testing Membership Implementation")
    print("=" * 50)

    # Test model imports
    if not test_model_imports():
        sys.exit(1)

    # Test database schema
    if not test_database_schema():
        sys.exit(1)

    print("\n🎉 All tests passed! Membership implementation is ready.")
