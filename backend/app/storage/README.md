# Unified Storage Service Interface

This module provides a unified interface for database operations that works with both SQLite (development) and Supabase (production) storage providers.

## Overview

The storage service interface provides a consistent API for CRUD operations regardless of the underlying database technology. This allows for seamless switching between development (SQLite) and production (Supabase) environments.

## Architecture

### Core Components

1. **StorageServiceInterface** (`interfaces.py`)
   - Abstract base class defining the contract for storage operations
   - Generic type support for different response models
   - Consistent method signatures across implementations

2. **SQLiteService** (`sqlite_service.py`)
   - Implementation using SQLAlchemy ORM
   - Used in development environment
   - Full SQLAlchemy query capabilities

3. **SupabaseService** (`supabase_service.py`)
   - Implementation using Supabase SDK
   - Used in production environment
   - Leverages Supabase's Row-Level Security (RLS)

4. **ServiceFactory** (`factory.py`)
   - Factory pattern for creating appropriate service based on environment
   - Automatic provider selection based on `ENVIRONMENT` setting

## Usage

### Basic Usage

```python
from app.storage.factory import StorageFactory
from app.models.service import Service as ServiceModel
from app.api.services.model import ServiceResponse

# Create a service instance
storage_service = StorageFactory.create_storage_service(
    model_class=ServiceModel,
    response_class=ServiceResponse,
    table_name='services'
)

# Use the same interface regardless of environment
services = await storage_service.get_all(user_id)
service = await storage_service.get_by_id(user_id, service_id)
new_service = await storage_service.create(user_id, service_data)
updated_service = await storage_service.update(user_id, service_id, update_data)
deleted = await storage_service.delete(user_id, service_id)
exists = await storage_service.exists(user_id, service_id)
```

### Service Implementation Example

```python
from app.storage.factory import StorageFactory
from app.models.service import Service as ServiceModel
from app.api.services.model import ServiceResponse

class ServiceService:
    def __init__(self):
        self.storage = StorageFactory.create_storage_service(
            model_class=ServiceModel,
            response_class=ServiceResponse,
            table_name='services'
        )

    async def get_services(self, user_id: UUID) -> List[ServiceResponse]:
        return await self.storage.get_all(user_id)

    async def create_service(self, user_id: UUID, service_data: dict) -> ServiceResponse:
        return await self.storage.create(user_id, service_data)

    async def update_service(self, user_id: UUID, service_id: UUID, update_data: dict) -> Optional[ServiceResponse]:
        return await self.storage.update(user_id, service_id, update_data)

    async def delete_service(self, user_id: UUID, service_id: UUID) -> bool:
        return await self.storage.delete(user_id, service_id)
```

## Environment Configuration

The service automatically chooses the appropriate implementation based on the `ENVIRONMENT` setting:

- **Development** (`ENVIRONMENT=dev`): Uses SQLite with SQLAlchemy ORM
- **Production** (`ENVIRONMENT=production`): Uses Supabase with Supabase SDK

## Benefits

1. **Unified Interface**: Same API for both SQLite and Supabase
2. **Environment Agnostic**: Controllers don't need to know about database details
3. **Type Safety**: Generic types ensure consistency
4. **Easy Testing**: Can easily mock the interface
5. **Extensible**: Easy to add new storage providers
6. **Consistent Error Handling**: Same error patterns across providers

## Method Reference

### StorageServiceInterface Methods

- `get_all(user_id: UUID, filters: Optional[Dict] = None) -> List[T]`
  - Retrieve all records for a user with optional filtering

- `get_by_id(user_id: UUID, record_id: UUID) -> Optional[T]`
  - Retrieve a single record by ID

- `create(user_id: UUID, data: Dict[str, Any]) -> T`
  - Create a new record

- `update(user_id: UUID, record_id: UUID, data: Dict[str, Any]) -> Optional[T]`
  - Update an existing record

- `delete(user_id: UUID, record_id: UUID) -> bool`
  - Delete a record

- `exists(user_id: UUID, record_id: UUID) -> bool`
  - Check if a record exists

## Migration Strategy

1. **Phase 1**: ✅ Create interface and implementations
2. **Phase 2**: Refactor existing services to use new interface
3. **Phase 3**: Update controllers to use new service pattern
4. **Phase 4**: Remove old SQLAlchemy-specific code

## Testing

The interface can be easily tested with mocks:

```python
from unittest.mock import Mock
from app.services.interfaces import StorageServiceInterface

# Mock the interface
mock_storage = Mock(spec=StorageServiceInterface)

# Test your service with the mock
service = ServiceService(mock_storage)
```

## Future Enhancements

- Add support for complex queries and joins
- Implement caching layer
- Add bulk operations support
- Add transaction support
- Add migration utilities
