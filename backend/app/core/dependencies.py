"""
Dependency injection module for LENR Sim App

This module defines FastAPI dependencies for accessing various services
and components throughout the application.
"""

from typing import Generator, Callable, Dict, Any, Optional

from fastapi import Depends

from app.core.config import get_settings, Settings
from app.physics.enhanced_fusion import calculator as fusion_calculator
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("dependencies", "logs/app.log")


def get_fusion_calculator():
    """
    Dependency for accessing the fusion calculator instance.
    """
    return fusion_calculator


class PhysicsComponents:
    """Container for physics-related components that can be injected together."""
    
    def __init__(
        self,
        settings: Settings = Depends(get_settings),
        fusion_calculator=Depends(get_fusion_calculator)
    ):
        self.settings = settings
        self.fusion_calculator = fusion_calculator


def get_physics_components(
    settings: Settings = Depends(get_settings),
    fusion_calculator=Depends(get_fusion_calculator)
) -> PhysicsComponents:
    """
    Dependency for accessing all physics-related components.
    """
    return PhysicsComponents(
        settings=settings,
        fusion_calculator=fusion_calculator
    )


# Service factory - acts as a service locator pattern
class ServiceFactory:
    """
    Factory class for managing service instances.
    
    This provides a central location for creating and accessing
    service instances throughout the application.
    """
    _services: Dict[str, Any] = {}
    _factories: Dict[str, Callable[[], Any]] = {}
    
    @classmethod
    def register_service(cls, name: str, instance: Any) -> None:
        """Register a service instance."""
        cls._services[name] = instance
        logger.debug(f"Registered service: {name}")
    
    @classmethod
    def register_factory(cls, name: str, factory: Callable[[], Any]) -> None:
        """Register a factory function for a service."""
        cls._factories[name] = factory
        logger.debug(f"Registered service factory: {name}")
    
    @classmethod
    def get_service(cls, name: str) -> Any:
        """
        Get a service instance by name.
        
        If the service doesn't exist and a factory is registered,
        it will create the service on demand.
        """
        if name not in cls._services and name in cls._factories:
            cls._services[name] = cls._factories[name]()
            logger.debug(f"Created service on demand: {name}")
        
        if name not in cls._services:
            logger.warning(f"Service not found: {name}")
            return None
        
        return cls._services[name]


# Initialize the service factory with default services
def initialize_services():
    """
    Initialize the service factory with default services.
    
    This should be called during application startup.
    """
    ServiceFactory.register_service("fusion_calculator", fusion_calculator)
    
    logger.info("Service factory initialized with default services")


def get_service_factory() -> ServiceFactory:
    """
    Dependency for accessing the service factory.
    """
    return ServiceFactory 