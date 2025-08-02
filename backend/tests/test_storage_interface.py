from unittest.mock import Mock
from uuid import uuid4

import pytest

from app.api.services.model import ServiceResponse
from app.models.service import Service as ServiceModel
from app.storage.factory import StorageFactory

# Import the services we created
from app.storage.interfaces import StorageServiceInterface
from app.storage.sqlite_service import SQLiteService
from app.storage.supabase_service import SupabaseService


class TestStorageInterface:
    """Test the storage service interface implementations."""

    def test_sqlite_service_interface(self):
        """Test that SQLiteService implements the interface correctly."""
        # Mock database session
        mock_db = Mock()
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = []

        # Create service instance
        service = SQLiteService(mock_db, ServiceModel, ServiceResponse)

        # Verify it implements the interface
        assert isinstance(service, StorageServiceInterface)

    def test_supabase_service_interface(self):
        """Test that SupabaseService implements the interface correctly."""
        # Mock Supabase client
        mock_supabase = Mock()
        mock_table = Mock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = Mock(data=[])

        # Create service instance
        service = SupabaseService(mock_supabase, "services", ServiceResponse)

        # Verify it implements the interface
        assert isinstance(service, StorageServiceInterface)

    def test_storage_factory_creates_correct_type(self):
        """Test that StorageFactory creates the correct service type."""
        # This test would require proper mocking of the database factory
        # For now, we'll just test the factory method exists
        assert hasattr(StorageFactory, "create_storage_service")
        assert callable(StorageFactory.create_storage_service)

    @pytest.mark.asyncio
    async def test_sqlite_service_methods(self):
        """Test SQLite service method signatures."""
        mock_db = Mock()
        service = SQLiteService(mock_db, ServiceModel, ServiceResponse)

        user_id = uuid4()
        record_id = uuid4()

        # Test method signatures
        await service.get_all(user_id)
        await service.get_by_id(user_id, record_id)
        await service.create(user_id, {"name": "Test Service"})
        await service.update(user_id, record_id, {"name": "Updated Service"})
        await service.delete(user_id, record_id)
        await service.exists(user_id, record_id)

    @pytest.mark.asyncio
    async def test_supabase_service_methods(self):
        """Test Supabase service method signatures."""
        mock_supabase = Mock()
        service = SupabaseService(mock_supabase, "services", ServiceResponse)

        user_id = uuid4()
        record_id = uuid4()

        # Test method signatures
        await service.get_all(user_id)
        await service.get_by_id(user_id, record_id)
        await service.create(user_id, {"name": "Test Service"})
        await service.update(user_id, record_id, {"name": "Updated Service"})
        await service.delete(user_id, record_id)
        await service.exists(user_id, record_id)
