import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from fastapi import HTTPException

from services.auth.main import app
from services.auth.database import get_db

TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5433/test_auth_db"


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    async_session = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_db_health_success(client):
    resp = await client.get("/db-health")
    assert resp.status_code == 200
    assert resp.json() == {"database": "connected"}


@pytest.mark.asyncio
async def test_db_health_failure():
    """Force a database error to cover the except branch."""
    # Create a mock session that raises an exception on execute()
    mock_session = AsyncMock(spec=AsyncSession)
    mock_session.execute = AsyncMock(side_effect=Exception("Simulated DB failure"))

    async def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/db-health")
    
    app.dependency_overrides.clear()
    
    assert resp.status_code == 500
    assert "Database connection failed" in resp.json()["detail"]
