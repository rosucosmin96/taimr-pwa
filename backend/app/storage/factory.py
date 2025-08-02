from typing import TypeVar

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from supabase import create_client

from app.config import settings

from .interfaces import StorageServiceInterface
from .sqlite_service import SQLiteService
from .supabase_service import SupabaseService

T = TypeVar("T")


class StorageFactory:
    """Factory for creating storage services based on environment."""

    @staticmethod
    def create_storage_service(
        model_class: type, response_class: type[T], table_name: str = None
    ) -> StorageServiceInterface[T]:
        """Create a storage service based on environment."""

        if settings.environment == "dev":
            # Use SQLite - create session directly
            engine = create_engine(f"sqlite:///{settings.database_path}")
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            db_session = SessionLocal()
            return SQLiteService(db_session, model_class, response_class)
        else:
            # Use Supabase - create client directly
            supabase_client = create_client(
                settings.supabase_url, settings.supabase_service_role_key
            )
            table_name = table_name or model_class.__tablename__
            return SupabaseService(supabase_client, table_name, response_class)
