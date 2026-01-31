"""
Framework detection utility for fastapi-voyager.

This module provides a centralized framework detection mechanism that is used
by both introspectors and adapters to avoid code duplication.
"""
from enum import Enum
from typing import Any

from fastapi_voyager.introspectors.base import AppIntrospector


class FrameworkType(Enum):
    """Supported framework types."""
    FASTAPI = "fastapi"
    DJANGO_NINJA = "django_ninja"
    LITESTAR = "litestar"
    UNKNOWN = "unknown"


def detect_framework(app: Any) -> FrameworkType:
    """
    Detect the framework type of the given application.

    This function uses the same detection logic as the introspector system,
    ensuring consistency across the codebase.

    Args:
        app: A web application instance

    Returns:
        FrameworkType: The detected framework type

    Note:
        The detection order matters: Litestar is checked before Django Ninja
        to avoid Django import issues.
    """
    # If it's already an introspector, try to determine framework from it
    if isinstance(app, AppIntrospector):
        app_class_name = type(app).__name__
        if "FastAPI" in app_class_name:
            return FrameworkType.FASTAPI
        elif "DjangoNinja" in app_class_name or "Ninja" in app_class_name:
            return FrameworkType.DJANGO_NINJA
        elif "Litestar" in app_class_name:
            return FrameworkType.LITESTAR
        return FrameworkType.UNKNOWN

    # Get the class name for type checking
    app_class_name = type(app).__name__

    # Try FastAPI
    try:
        from fastapi import FastAPI
        if isinstance(app, FastAPI):
            return FrameworkType.FASTAPI
    except ImportError:
        pass

    # Try Litestar (check before Django Ninja to avoid Django import issues)
    try:
        from litestar import Litestar
        if isinstance(app, Litestar):
            return FrameworkType.LITESTAR
    except ImportError:
        pass

    # Try Django Ninja (check by class name first to avoid import if not needed)
    try:
        if app_class_name == "NinjaAPI":
            from ninja import NinjaAPI
            if isinstance(app, NinjaAPI):
                return FrameworkType.DJANGO_NINJA
    except ImportError:
        pass

    return FrameworkType.UNKNOWN


def get_introspector(app: Any) -> AppIntrospector | None:
    """
    Get the appropriate introspector for the given app.

    This is a centralized function that uses the framework detection logic
    to return the correct introspector instance.

    Args:
        app: A web application instance or AppIntrospector

    Returns:
        An AppIntrospector instance, or None if framework not supported

    Raises:
        TypeError: If the app type is not supported
    """
    # If it's already an introspector, return it
    if isinstance(app, AppIntrospector):
        return app

    framework = detect_framework(app)

    if framework == FrameworkType.FASTAPI:
        from fastapi_voyager.introspectors import FastAPIIntrospector
        if FastAPIIntrospector:
            return FastAPIIntrospector(app)

    elif framework == FrameworkType.LITESTAR:
        from fastapi_voyager.introspectors import LitestarIntrospector
        if LitestarIntrospector:
            return LitestarIntrospector(app)

    elif framework == FrameworkType.DJANGO_NINJA:
        from fastapi_voyager.introspectors import DjangoNinjaIntrospector
        if DjangoNinjaIntrospector:
            return DjangoNinjaIntrospector(app)

    # If we get here, the app type is not supported
    raise TypeError(
        f"Unsupported app type: {type(app).__name__}. "
        f"Supported types: FastAPI, Django Ninja API, Litestar, or any AppIntrospector implementation. "
        f"If you're using a different framework, please implement AppIntrospector for that framework. "
        f"See ADAPTER_EXAMPLE.md for instructions."
    )
