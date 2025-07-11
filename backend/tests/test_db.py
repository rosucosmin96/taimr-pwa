#!/usr/bin/env python3
"""
Test script to verify database setup.
Run with: python test_db.py
"""

import os
import sys
from pathlib import Path

from app.database.factory import DatabaseFactory
from app.models import Client, Service, User

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))


def test_database():
    """Test the database setup."""
    print("Testing database setup...")

    # Get database provider
    db_provider = DatabaseFactory.get_current_provider()

    print(f"Database URL: {db_provider.get_url()}")
    print(f"Environment: {os.getenv('ENVIRONMENT', 'dev')}")

    # Test connection
    if db_provider.is_connected():
        print("✅ Database connection successful!")
    else:
        print("❌ Database connection failed!")
        return

    # Create tables
    print("Creating tables...")
    db_provider.create_tables()
    print("✅ Tables created successfully!")

    # Test creating a user
    print("Testing model creation...")
    session = db_provider.get_session()

    try:
        # Create a test user
        user = User(email="test@example.com", name="Test User")
        session.add(user)
        session.commit()
        print("✅ User created successfully!")

        # Create a test service
        service = Service(
            user_id=user.id,
            name="Test Service",
            default_duration_minutes=60,
            default_price_per_hour=100.00,
        )
        session.add(service)
        session.commit()
        print("✅ Service created successfully!")

        # Create a test client
        client = Client(
            user_id=user.id,
            service_id=service.id,
            name="Test Client",
            email="client@example.com",
        )
        session.add(client)
        session.commit()
        print("✅ Client created successfully!")

        # Query the data back
        users = session.query(User).all()
        services = session.query(Service).all()
        clients = session.query(Client).all()

        print(
            f"✅ Found {len(users)} users, {len(services)} services, {len(clients)} clients"
        )

    except Exception as e:
        print(f"❌ Error during testing: {e}")
        session.rollback()
    finally:
        session.close()

    print("Database test completed!")


if __name__ == "__main__":
    test_database()
