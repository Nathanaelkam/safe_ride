import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from services.auth.main import app
from services.auth.database import get_db
from services.auth.models import Base   # <-- needed for create_all / drop_all

TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5433/test_auth_db"


@pytest.fixture(scope="function")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    # Retry until the database is ready (maximum 30 attempts)
    for attempt in range(30):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(lambda c: None)   # just test connectivity
                break
        except Exception:
            await asyncio.sleep(1)
    else:
        raise RuntimeError("Test database not reachable")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture(scope="function")
async def db_session(test_engine):
    async_session = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
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
async def test_db_health_failure(client, db_session):
    from unittest.mock import AsyncMock

    mock_session = AsyncMock(spec=AsyncSession)
    mock_session.execute = AsyncMock(side_effect=Exception("Simulated failure"))

    async def faulty_override():
        yield mock_session

    app.dependency_overrides[get_db] = faulty_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/db-health")
    app.dependency_overrides.clear()
    assert resp.status_code == 500
    assert "Database connection failed" in resp.json()["detail"]
