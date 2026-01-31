"""
Test FastAPI embedding service with /dot endpoint.

This test starts the FastAPI embedding service and validates the /dot endpoint.
"""
import asyncio
from typing import AsyncGenerator, Generator

import httpx
import pytest
import pytest_asyncio

from tests.fastapi.embedding import app
from tests import embedding_test_utils


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Create an async HTTP client for testing."""
    # Use ASGITransport for testing ASGI apps with httpx
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def expected_framework_name() -> str:
    """Return the expected framework name for FastAPI."""
    return "FastAPI"


@pytest.fixture
def expected_routes() -> list[str]:
    """Return expected route names for FastAPI."""
    return embedding_test_utils.EXPECTED_ROUTES


# Reuse shared test functions
@pytest.mark.asyncio
async def test_dot_endpoint_returns_success(async_client: httpx.AsyncClient):
    """Test that /voyager/dot endpoint returns 200 OK."""
    await embedding_test_utils.test_dot_endpoint_returns_success(async_client)


@pytest.mark.asyncio
async def test_dot_endpoint_has_tags(async_client: httpx.AsyncClient):
    """Test that /voyager/dot endpoint returns tags data."""
    await embedding_test_utils.test_dot_endpoint_has_tags(async_client)


@pytest.mark.asyncio
async def test_dot_endpoint_tags_have_routes(async_client: httpx.AsyncClient):
    """Test that tags have associated routes."""
    await embedding_test_utils.test_dot_endpoint_tags_have_routes(async_client)


@pytest.mark.asyncio
async def test_dot_endpoint_routes_structure(async_client: httpx.AsyncClient):
    """Test that routes have correct structure."""
    await embedding_test_utils.test_dot_endpoint_routes_structure(async_client)


@pytest.mark.asyncio
async def test_dot_endpoint_expected_routes(async_client: httpx.AsyncClient, expected_routes: list[str]):
    """Test that expected routes from demo.py are present."""
    await embedding_test_utils.test_dot_endpoint_expected_routes(async_client, expected_routes)


@pytest.mark.asyncio
async def test_dot_endpoint_other_fields(async_client: httpx.AsyncClient, expected_framework_name: str):
    """Test other required fields in /dot response."""
    await embedding_test_utils.test_dot_endpoint_other_fields(async_client, expected_framework_name)
