from .factory import DatabaseFactory


def init_database():
    """Initialize the database with all tables."""
    db_provider = DatabaseFactory.get_current_provider()

    print(f"Initializing database: {db_provider.get_url()}")

    # Create all tables
    db_provider.create_tables()

    print("Database initialized successfully!")


def drop_database():
    """Drop all tables from the database."""
    db_provider = DatabaseFactory.get_current_provider()

    print(f"Dropping all tables from: {db_provider.get_url()}")

    # Drop all tables
    db_provider.drop_tables()

    print("Database tables dropped successfully!")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "drop":
        drop_database()
    else:
        init_database()
