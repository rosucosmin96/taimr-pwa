"""
Example usage of the unified storage service interface.

This demonstrates how to use the same interface for both SQLite and Supabase storage.
"""

from uuid import UUID, uuid4

from app.api.services.model import (
    ServiceResponse,
)
from app.models.service import Service as ServiceModel
from app.storage.factory import StorageFactory


class ExampleServiceUsage:
    """Example showing how to use the unified storage service."""

    def __init__(self):
        # Create a service using the factory - automatically chooses SQLite or Supabase
        self.storage = StorageFactory.create_storage_service(
            model_class=ServiceModel,
            response_class=ServiceResponse,
            table_name="services",
        )

    async def example_crud_operations(self, user_id: UUID):
        """Example CRUD operations using the unified interface."""

        # Create a new service
        service_data = {
            "id": str(uuid4()),
            "name": "Example Service",
            "default_duration_minutes": 60,
            "default_price_per_hour": 50.0,
        }

        new_service = await self.storage.create(user_id, service_data)
        print(f"Created service: {new_service.name}")

        # Get all services for the user
        all_services = await self.storage.get_all(user_id)
        print(f"Found {len(all_services)} services")

        # Get a specific service
        service = await self.storage.get_by_id(user_id, new_service.id)
        if service:
            print(f"Retrieved service: {service.name}")

        # Update the service
        update_data = {"name": "Updated Service Name"}
        updated_service = await self.storage.update(
            user_id, new_service.id, update_data
        )
        if updated_service:
            print(f"Updated service: {updated_service.name}")

        # Check if service exists
        exists = await self.storage.exists(user_id, new_service.id)
        print(f"Service exists: {exists}")

        # Delete the service
        deleted = await self.storage.delete(user_id, new_service.id)
        print(f"Service deleted: {deleted}")

        return all_services


# Example usage in a controller
async def example_controller_method(user_id: UUID):
    """Example of how to use the service in a controller."""

    example_service = ExampleServiceUsage()

    try:
        services = await example_service.example_crud_operations(user_id)
        return services
    except Exception as e:
        print(f"Error: {e}")
        return []


if __name__ == "__main__":
    # This would be called with a real user_id in practice
    import asyncio

    async def main():
        user_id = uuid4()
        await example_controller_method(user_id)

    asyncio.run(main())
