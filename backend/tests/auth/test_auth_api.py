import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

from services.auth.main import app
from services.auth.database import get_db
from services.auth.models import Base, UserContact, HandshakeStatus

TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5433/test_auth_db"


@pytest.fixture(scope="function")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    # Drop everything first, then create fresh tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
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


# ---------- Registration ----------
@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post("/auth/register", json={
        "phone_number": "+1234567890",
        "password": "StrongP@ss1",
        "full_name": "Alice"
    })
    assert resp.status_code == 201, f"Registration failed: {resp.text}"


@pytest.mark.asyncio
async def test_register_duplicate(client):
    await client.post("/auth/register", json={
        "phone_number": "+1234567891",
        "password": "Test1234!"
    })
    resp = await client.post("/auth/register", json={
        "phone_number": "+1234567891",
        "password": "Test1234!"
    })
    assert resp.status_code == 400


# ---------- Login ----------
@pytest.mark.asyncio
async def test_login(client):
    await client.post("/auth/register", json={
        "phone_number": "+1234567892",
        "password": "Login1234!"
    })
    resp = await client.post("/auth/login", json={
        "phone_number": "+1234567892",
        "password": "Login1234!"
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()

@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    resp = await client.post("/auth/login", json={
        "phone_number": "+9999999999",
        "password": "DoesNotExist1"
    })
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


# ---------- Contacts ----------
@pytest.mark.asyncio
async def test_add_contact(client):
    await client.post("/auth/register", json={
        "phone_number": "+1111111111",
        "password": "User1Pass!"
    })
    login_resp = await client.post("/auth/login", json={
        "phone_number": "+1111111111",
        "password": "User1Pass!"
    })
    token = login_resp.json()["access_token"]

    resp = await client.post("/contacts/", json={
        "contact_phone": "+2222222222",
        "contact_name": "Brother"
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201, f"Add contact failed: {resp.text}"


@pytest.mark.asyncio
async def test_add_self_as_contact(client):
    # Register and login
    await client.post("/auth/register", json={
        "phone_number": "+1010101010",
        "password": "SelfTest1"
    })
    login_resp = await client.post("/auth/login", json={
        "phone_number": "+1010101010",
        "password": "SelfTest1"
    })
    token = login_resp.json()["access_token"]

    # Attempt to add yourself
    resp = await client.post("/contacts/", json={
        "contact_phone": "+1010101010",
        "contact_name": "Myself"
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400
    assert "Cannot add yourself" in resp.json()["detail"]



@pytest.mark.asyncio
async def test_list_contacts(client):
    await client.post("/auth/register", json={
        "phone_number": "+3333333333",
        "password": "User3Pass!"
    })
    login_resp = await client.post("/auth/login", json={
        "phone_number": "+3333333333",
        "password": "User3Pass!"
    })
    token = login_resp.json()["access_token"]

    await client.post("/contacts/", json={
        "contact_phone": "+4444444444",
        "contact_name": "Sister"
    }, headers={"Authorization": f"Bearer {token}"})

    resp = await client.get("/contacts/", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_respond_handshake(client, db_session):
    # Register User A
    reg_a = await client.post("/auth/register", json={
        "phone_number": "+5555555555",
        "password": "UserA!Pass"
    })
    assert reg_a.status_code == 201, f"User A registration failed: {reg_a.text}"

    # Login User A
    login_a = await client.post("/auth/login", json={
        "phone_number": "+5555555555",
        "password": "UserA!Pass"
    })
    assert login_a.status_code == 200, f"User A login failed: {login_a.text}"
    token_a = login_a.json()["access_token"]

    # User A adds B
    await client.post("/contacts/", json={
        "contact_phone": "+6666666666",
        "contact_name": "Mom"
    }, headers={"Authorization": f"Bearer {token_a}"})

    # Register User B
    reg_b = await client.post("/auth/register", json={
        "phone_number": "+6666666666",
        "password": "UserB!Pass"
    })
    assert reg_b.status_code == 201, f"User B registration failed: {reg_b.text}"

    # Login User B
    login_b = await client.post("/auth/login", json={
        "phone_number": "+6666666666",
        "password": "UserB!Pass"
    })
    assert login_b.status_code == 200, f"User B login failed: {login_b.text}"
    token_b = login_b.json()["access_token"]

    # Find pending contact sent TO B
    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+6666666666",
            UserContact.status == HandshakeStatus.PENDING
        )
    )
    contact = result.scalars().first()
    assert contact is not None, "No pending contact found"
    contact_id = str(contact.id)

    # B accepts
    resp = await client.put(
        f"/contacts/{contact_id}/respond?action=ACCEPTED",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp.status_code == 200, f"Handshake failed: {resp.text}"
    assert resp.json()["status"] == "ACCEPTED"

@pytest.mark.asyncio
async def test_respond_handshake_not_found(client):
    # Register a user and try to respond to a non-existent contact ID
    await client.post("/auth/register", json={
        "phone_number": "+8888888888",
        "password": "TestPass1"
    })
    login_resp = await client.post("/auth/login", json={
        "phone_number": "+8888888888",
        "password": "TestPass1"
    })
    token = login_resp.json()["access_token"]

    resp = await client.put(
        "/contacts/00000000-0000-0000-0000-000000000000/respond?action=ACCEPTED",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()

    # ---------- Additional tests for coverage ----------
@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/auth/register", json={
        "phone_number": "+7777777777",
        "password": "RightP@ss"
    })
    resp = await client.post("/auth/login", json={
        "phone_number": "+7777777777",
        "password": "WrongP@ss"
    })
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_access_protected_with_invalid_token(client):
    # Try accessing contacts without a valid token
    resp = await client.get("/contacts/", headers={"Authorization": "Bearer fake-token"})
    assert resp.status_code == 401
    assert "Invalid token" in resp.json()["detail"]