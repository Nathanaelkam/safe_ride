import pytest
from httpx import AsyncClient
from services.auth.main import app
from services.auth.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
import asyncio

# Use a separate test database; in CI, Jenkins will spin up a test Postgres container
TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5433/test_auth_db"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    eng = create_async_engine(TEST_DATABASE_URL)
    yield eng
    await eng.dispose()

@pytest.fixture
async def db_session(test_engine):
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

@pytest.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_db_health_success(client, db_session):
    # We need to ensure the test database exists; Jenkins will handle that via docker run
    # For local tests, you'll spin up the test DB manually or use the same compose.
    resp = await client.get("/db-health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["database"] == "connected"