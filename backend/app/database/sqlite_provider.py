from pathlib import Path

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from ..models.base import Base
from .base import DatabaseProvider


class SQLiteProvider(DatabaseProvider):
    """SQLite database provider for local development."""

    def __init__(self, database_path: str = None):
        if database_path is None:
            # Default to a database file in the backend directory
            backend_dir = Path(__file__).parent.parent.parent
            database_path = backend_dir / "database.sqlite"

        self.database_path = str(database_path)
        self.engine = None
        self.SessionLocal = None
        self._setup_engine()

    def _setup_engine(self):
        """Setup the SQLAlchemy engine for SQLite."""
        # Create the database directory if it doesn't exist
        db_dir = Path(self.database_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)

        # SQLite URL
        sqlite_url = f"sqlite:///{self.database_path}"

        # Create engine with SQLite-specific settings
        self.engine = create_engine(
            sqlite_url,
            connect_args={
                "check_same_thread": False,  # Allow multiple threads
            },
            poolclass=StaticPool,  # Use static pool for SQLite
            echo=False,  # Set to True for SQL query logging
        )

        # Enable foreign key support for SQLite
        @event.listens_for(self.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        # Create session factory
        self.SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=self.engine
        )

    def get_engine(self):
        """Get the SQLAlchemy engine."""
        return self.engine

    def get_session(self) -> Session:
        """Get a database session."""
        if not self.SessionLocal:
            raise RuntimeError("Database not initialized")
        return self.SessionLocal()

    def create_tables(self) -> None:
        """Create all tables in the database."""
        Base.metadata.create_all(bind=self.engine)

    def drop_tables(self) -> None:
        """Drop all tables in the database."""
        Base.metadata.drop_all(bind=self.engine)

    def get_url(self) -> str:
        """Get the database URL."""
        return f"sqlite:///{self.database_path}"

    def is_connected(self) -> bool:
        """Check if the database is connected."""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                conn.commit()
            return True
        except Exception as e:
            print(f"Connection error: {e}")
            return False
