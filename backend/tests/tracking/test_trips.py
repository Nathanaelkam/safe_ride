import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from services.tracking.main import app
from services.tracking.database import get_db
from services.tracking.models import Base
from services.auth.auth_utils import create_access_token

TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5433/test_tracking_db"


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def create_token(user_id="11111111-1111-1111-1111-111111111111"):
    return create_access_token({"sub": user_id})


@pytest.mark.asyncio
async def test_start_trip(client):
    token = create_token()
    resp = await client.post("/trips/start", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["passenger_id"] == "11111111-1111-1111-1111-111111111111"
    assert data["status"] == "ACTIVE"
    assert data["completed_at"] is None
    assert "id" in data


@pytest.mark.asyncio
async def test_complete_trip(client):
    token = create_token()
    # Start
    start_resp = await client.post("/trips/start", headers={"Authorization": f"Bearer {token}"})
    trip_id = start_resp.json()["id"]

    # Complete
    comp_resp = await client.post(f"/trips/{trip_id}/complete", headers={"Authorization": f"Bearer {token}"})
    assert comp_resp.status_code == 200
    data = comp_resp.json()
    assert data["status"] == "COMPLETED"
    assert data["completed_at"] is not None


@pytest.mark.asyncio
async def test_complete_trip_wrong_user(client):
    token_a = create_token("user-a")
    start_resp = await client.post("/trips/start", headers={"Authorization": f"Bearer {token_a}"})
    trip_id = start_resp.json()["id"]

    token_b = create_token("user-b")
    resp = await client.post(f"/trips/{trip_id}/complete", headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Not your trip"


@pytest.mark.asyncio
async def test_start_trip_invalid_token(client):
    resp = await client.post("/trips/start", headers={"Authorization": "Bearer invalid"})
    assert resp.status_code == 401

@pytest.mark.asyncio
async def test_complete_trip_twice(client):
    token = create_token()
    # Start and complete a trip
    resp = await client.post("/trips/start", headers={"Authorization": f"Bearer {token}"})
    trip_id = resp.json()["id"]
    await client.post(f"/trips/{trip_id}/complete", headers={"Authorization": f"Bearer {token}"})

    # Try to complete again → should fail
    resp = await client.post(f"/trips/{trip_id}/complete", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Trip not active"

def create_token(user_id="11111111-1111-1111-1111-111111111111"):
    from services.auth.auth_utils import create_access_token
    return create_access_token({"sub": user_id})


@pytest.mark.asyncio
async def test_share_trip(client):
    token = create_token()
    resp = await client.post("/trips/start", headers={"Authorization": f"Bearer {token}"})
    trip_id = resp.json()["id"]

    resp = await client.post(f"/trips/{trip_id}/share", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "share_token" in data
    assert data["expires_in"] == 3600