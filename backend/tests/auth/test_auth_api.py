import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select, text
import logging

from services.auth.main import app
from services.auth.database import get_db
from services.auth.models import (
    Base,
    UserContact,
    HandshakeStatus,
    RegistrationSession,
)
from services.auth.auth_utils import create_access_token
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5433/test_auth_db"


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    for attempt in range(60):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(lambda c: None)
                break
        except Exception as e:
            logger.warning(f"DB not ready: {e}")
            await asyncio.sleep(1)
    else:
        raise RuntimeError("Test database not reachable")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    async_session = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
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


# ---------- Two-step registration helper ----------
async def register_user(
    client, db_session, phone, password, email, full_name="Test"
):
    """Full two‑step registration flow. Returns the user's UUID."""
    # Step 1 – init
    resp = await client.post(
        "/auth/register/init",
        json={
            "phone_number": phone,
            "email": email,
            "password": password,
            "full_name": full_name,
        },
    )
    assert resp.status_code == 201, f"Init failed: {resp.text}"
    session_token = resp.json()["session_token"]

    # Fetch the OTP from the database
    result = await db_session.execute(
        select(RegistrationSession).where(RegistrationSession.id == session_token)
    )
    session = result.scalars().first()
    assert session is not None, "Session not found"
    otp = session.otp

    # Step 2 – verify
    resp = await client.post(
        "/auth/register/verify",
        json={"session_token": session_token, "otp": otp},
    )
    assert resp.status_code == 201, f"Verify failed: {resp.text}"
    return resp.json()["id"]


# ---------- Registration ----------
@pytest.mark.asyncio
async def test_register(client, db_session):
    await register_user(client, db_session, "+1234567890", "StrongP@ss1", "reg1@test.com", "Alice")


@pytest.mark.asyncio
async def test_register_duplicate(client, db_session):
    await register_user(client, db_session, "+1234567891", "Test1234!", "reg2@test.com")
    # Duplicate phone – must fail
    resp = await client.post(
        "/auth/register/init",
        json={
            "phone_number": "+1234567891",
            "email": "reg2dup@test.com",
            "password": "Test1234!",
            "full_name": "Bob",
        },
    )
    assert resp.status_code == 400


# ---------- Login ----------
@pytest.mark.asyncio
async def test_login(client, db_session):
    await register_user(client, db_session, "+1234567892", "Login1234!", "login@test.com")
    resp = await client.post(
        "/auth/login",
        json={"phone_number": "+1234567892", "password": "Login1234!"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client, db_session):
    await register_user(client, db_session, "+7777777777", "RightP@ss", "wrongpwd@test.com")
    resp = await client.post(
        "/auth/login",
        json={"phone_number": "+7777777777", "password": "WrongP@ss"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    resp = await client.post(
        "/auth/login",
        json={"phone_number": "+9999999999", "password": "DoesNotExist1"},
    )
    assert resp.status_code == 401


# ---------- Contacts ----------
@pytest.mark.asyncio
async def test_add_contact(client, db_session):
    await register_user(client, db_session, "+1111111111", "User1Pass!", "contact1@test.com")
    login_resp = await client.post(
        "/auth/login",
        json={"phone_number": "+1111111111", "password": "User1Pass!"},
    )
    token = login_resp.json()["access_token"]
    resp = await client.post(
        "/contacts/",
        json={"contact_phone": "+2222222222", "contact_name": "Brother"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, f"Add contact failed: {resp.text}"


@pytest.mark.asyncio
async def test_add_self_as_contact(client, db_session):
    await register_user(client, db_session, "+1010101010", "SelfTest1", "self@test.com")
    login_resp = await client.post(
        "/auth/login",
        json={"phone_number": "+1010101010", "password": "SelfTest1"},
    )
    token = login_resp.json()["access_token"]
    resp = await client.post(
        "/contacts/",
        json={"contact_phone": "+1010101010", "contact_name": "Myself"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400
    assert "Cannot add yourself" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_list_contacts(client, db_session):
    await register_user(client, db_session, "+3333333333", "User3Pass!", "listcontacts@test.com")
    login_resp = await client.post(
        "/auth/login",
        json={"phone_number": "+3333333333", "password": "User3Pass!"},
    )
    token = login_resp.json()["access_token"]
    await client.post(
        "/contacts/",
        json={"contact_phone": "+4444444444", "contact_name": "Sister"},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.get("/contacts/", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_respond_handshake(client, db_session):
    await register_user(client, db_session, "+5555555555", "UserA!Pass", "handshake1@test.com")
    login_a = await client.post(
        "/auth/login",
        json={"phone_number": "+5555555555", "password": "UserA!Pass"},
    )
    token_a = login_a.json()["access_token"]

    await register_user(client, db_session, "+6666666666", "UserB!Pass", "handshake2@test.com")
    login_b = await client.post(
        "/auth/login",
        json={"phone_number": "+6666666666", "password": "UserB!Pass"},
    )
    token_b = login_b.json()["access_token"]

    await client.post(
        "/contacts/",
        json={"contact_phone": "+6666666666", "contact_name": "Mom"},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+6666666666",
            UserContact.status == HandshakeStatus.PENDING,
        )
    )
    contact = result.scalars().first()
    assert contact is not None
    contact_id = str(contact.id)

    resp = await client.put(
        f"/contacts/{contact_id}/respond?action=ACCEPTED",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ACCEPTED"


@pytest.mark.asyncio
async def test_respond_handshake_not_found(client, db_session):
    await register_user(client, db_session, "+8888888888", "TestPass1", "handshake404@test.com")
    login_resp = await client.post(
        "/auth/login",
        json={"phone_number": "+8888888888", "password": "TestPass1"},
    )
    token = login_resp.json()["access_token"]
    resp = await client.put(
        "/contacts/00000000-0000-0000-0000-000000000000/respond?action=ACCEPTED",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_access_protected_with_invalid_token(client):
    resp = await client.get("/contacts/", headers={"Authorization": "Bearer fake-token"})
    assert resp.status_code == 401
    assert "Invalid token" in resp.json()["detail"]


# ---------- Refresh Token Tests ----------
@pytest.mark.asyncio
async def test_login_returns_refresh_token(client, db_session):
    await register_user(client, db_session, "+1112223333", "Refresh123", "refresh1@test.com")
    resp = await client.post(
        "/auth/login",
        json={"phone_number": "+1112223333", "password": "Refresh123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_refresh_grants_new_access_token(client, db_session):
    await register_user(client, db_session, "+1112224444", "RefreshTest1", "refresh2@test.com")
    login_resp = await client.post(
        "/auth/login",
        json={"phone_number": "+1112224444", "password": "RefreshTest1"},
    )
    tokens = login_resp.json()
    refresh_token = tokens["refresh_token"]
    refresh_resp = await client.post(
        "/auth/refresh", json={"refresh_token": refresh_token}
    )
    assert refresh_resp.status_code == 200
    new_tokens = refresh_resp.json()
    assert "access_token" in new_tokens
    assert new_tokens["refresh_token"] != refresh_token


@pytest.mark.asyncio
async def test_refresh_with_invalid_token_fails(client):
    resp = await client.post("/auth/refresh", json={"refresh_token": "invalid"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_reuse_of_old_refresh_token_fails(client, db_session):
    await register_user(client, db_session, "+1112225555", "RefreshReuse", "refresh3@test.com")
    login_resp = await client.post(
        "/auth/login",
        json={"phone_number": "+1112225555", "password": "RefreshReuse"},
    )
    old_refresh = login_resp.json()["refresh_token"]
    refresh_resp = await client.post(
        "/auth/refresh", json={"refresh_token": old_refresh}
    )
    assert refresh_resp.status_code == 200
    re_resp = await client.post(
        "/auth/refresh", json={"refresh_token": old_refresh}
    )
    assert re_resp.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_refresh_token(client, db_session):
    await register_user(client, db_session, "+1112226666", "LogoutTest", "logout@test.com")
    login_resp = await client.post(
        "/auth/login",
        json={"phone_number": "+1112226666", "password": "LogoutTest"},
    )
    refresh_token = login_resp.json()["refresh_token"]
    logout_resp = await client.post(
        "/auth/logout", json={"refresh_token": refresh_token}
    )
    assert logout_resp.status_code == 204
    refresh_resp = await client.post(
        "/auth/refresh", json={"refresh_token": refresh_token}
    )
    assert refresh_resp.status_code == 401


@pytest.mark.asyncio
async def test_metrics_endpoint(client):
    resp = await client.get("/metrics")
    assert resp.status_code == 200
    assert "auth_http_requests_total" in resp.text


@pytest.mark.asyncio
async def test_refresh_with_deleted_user(client, db_session):
    await register_user(client, db_session, "+1113337777", "DeleteMe1", "delete@test.com")
    login_resp = await client.post(
        "/auth/login",
        json={"phone_number": "+1113337777", "password": "DeleteMe1"},
    )
    tokens = login_resp.json()
    refresh_token = tokens["refresh_token"]
    from services.auth.models import User

    result = await db_session.execute(
        select(User).where(User.phone_number == "+1113337777")
    )
    user = result.scalars().first()
    await db_session.delete(user)
    await db_session.commit()
    resp = await client.post(
        "/auth/refresh", json={"refresh_token": refresh_token}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_access_with_nonexistent_user(client):
    token = create_access_token({"sub": "00000000-0000-0000-0000-000000000000"})
    resp = await client.get("/contacts/", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "User not found"


@pytest.mark.asyncio
async def test_respond_handshake_invalid_action(client, db_session):
    await register_user(client, db_session, "+7777777777", "InvalidAction1", "invalidact@test.com")
    login_a = await client.post(
        "/auth/login",
        json={"phone_number": "+7777777777", "password": "InvalidAction1"},
    )
    token_a = login_a.json()["access_token"]

    await register_user(client, db_session, "+8888888888", "InvalidAction2", "invalidact2@test.com")
    login_b = await client.post(
        "/auth/login",
        json={"phone_number": "+8888888888", "password": "InvalidAction2"},
    )
    token_b = login_b.json()["access_token"]

    await client.post(
        "/contacts/",
        json={"contact_phone": "+8888888888", "contact_name": "Test"},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+8888888888",
            UserContact.status == HandshakeStatus.PENDING,
        )
    )
    contact = result.scalars().first()
    assert contact is not None
    contact_id = str(contact.id)

    resp = await client.put(
        f"/contacts/{contact_id}/respond?action=INVALID",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_respond_handshake_rejected(client, db_session):
    await register_user(client, db_session, "+5555555555", "UserA!Pass", "reject_a@test.com")
    login_a = await client.post(
        "/auth/login",
        json={"phone_number": "+5555555555", "password": "UserA!Pass"},
    )
    token_a = login_a.json()["access_token"]

    await register_user(client, db_session, "+6666666666", "UserB!Pass", "reject_b@test.com")
    login_b = await client.post(
        "/auth/login",
        json={"phone_number": "+6666666666", "password": "UserB!Pass"},
    )
    token_b = login_b.json()["access_token"]

    await client.post(
        "/contacts/",
        json={"contact_phone": "+6666666666", "contact_name": "Mom"},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+6666666666",
            UserContact.status == HandshakeStatus.PENDING,
        )
    )
    contact = result.scalars().first()
    assert contact is not None
    contact_id = str(contact.id)

    resp = await client.put(
        f"/contacts/{contact_id}/respond?action=REJECTED",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "REJECTED"


@pytest.mark.asyncio
async def test_refresh_token_user_not_found(client, db_session):
    from datetime import datetime, timezone, timedelta
    from services.auth.auth_utils import generate_refresh_token, hash_token

    await db_session.execute(text("ALTER TABLE refresh_tokens DISABLE TRIGGER ALL"))
    await db_session.commit()

    raw = generate_refresh_token()
    token_hash = hash_token(raw)
    expires = datetime.now(timezone.utc) + timedelta(days=1)

    await db_session.execute(
        text(
            "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked) "
            "VALUES (gen_random_uuid(), :user_id, :hash, :expires, false)"
        ),
        {
            "user_id": "00000000-0000-0000-0000-000000000000",
            "hash": token_hash,
            "expires": expires,
        },
    )
    await db_session.commit()

    await db_session.execute(text("ALTER TABLE refresh_tokens ENABLE TRIGGER ALL"))
    await db_session.commit()

    resp = await client.post("/auth/refresh", json={"refresh_token": raw})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "User not found"


@pytest.mark.asyncio
async def test_logout_invalid_token(client):
    resp = await client.post("/auth/logout", json={"refresh_token": "invalid_token"})
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_list_contacts_accepted(client, db_session):
    await register_user(client, db_session, "+1212121212", "FilterTest1", "accepted@test.com")
    login_resp = await client.post(
        "/auth/login",
        json={"phone_number": "+1212121212", "password": "FilterTest1"},
    )
    token = login_resp.json()["access_token"]
    await client.post(
        "/contacts/",
        json={"contact_phone": "+1313131313", "contact_name": "Friend"},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.get(
        "/contacts/?status=ACCEPTED", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_respond_handshake_twice(client, db_session):
    await register_user(client, db_session, "+5555555555", "UserA!Pass", "twice_a@test.com")
    login_a = await client.post(
        "/auth/login",
        json={"phone_number": "+5555555555", "password": "UserA!Pass"},
    )
    token_a = login_a.json()["access_token"]

    await register_user(client, db_session, "+6666666666", "UserB!Pass", "twice_b@test.com")
    login_b = await client.post(
        "/auth/login",
        json={"phone_number": "+6666666666", "password": "UserB!Pass"},
    )
    token_b = login_b.json()["access_token"]

    await client.post(
        "/contacts/",
        json={"contact_phone": "+6666666666", "contact_name": "Mom"},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+6666666666",
            UserContact.status == HandshakeStatus.PENDING,
        )
    )
    contact = result.scalars().first()
    assert contact is not None
    contact_id = str(contact.id)

    resp = await client.put(
        f"/contacts/{contact_id}/respond?action=ACCEPTED",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 200

    resp = await client.put(
        f"/contacts/{contact_id}/respond?action=ACCEPTED",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404
    assert "Pending contact request not found" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_list_contacts_rejected(client, db_session):
    await register_user(client, db_session, "+1111111111", "RejectTest1", "rejected_a@test.com")
    login_a = await client.post(
        "/auth/login",
        json={"phone_number": "+1111111111", "password": "RejectTest1"},
    )
    token_a = login_a.json()["access_token"]

    await register_user(client, db_session, "+2222222222", "RejectTest2", "rejected_b@test.com")
    login_b = await client.post(
        "/auth/login",
        json={"phone_number": "+2222222222", "password": "RejectTest2"},
    )
    token_b = login_b.json()["access_token"]

    await client.post(
        "/contacts/",
        json={"contact_phone": "+2222222222", "contact_name": "RejectMe"},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+2222222222",
            UserContact.status == HandshakeStatus.PENDING,
        )
    )
    contact = result.scalars().first()
    assert contact is not None
    contact_id = str(contact.id)

    await client.put(
        f"/contacts/{contact_id}/respond?action=REJECTED",
        headers={"Authorization": f"Bearer {token_b}"},
    )

    resp = await client.get(
        "/contacts/?status=REJECTED", headers={"Authorization": f"Bearer {token_a}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["status"] == "REJECTED"


@pytest.mark.asyncio
async def test_list_contacts_pending_empty(client, db_session):
    await register_user(client, db_session, "+1231231234", "EmptyPending1", "pendingempty@test.com")
    login_resp = await client.post(
        "/auth/login",
        json={"phone_number": "+1231231234", "password": "EmptyPending1"},
    )
    token = login_resp.json()["access_token"]
    resp = await client.get(
        "/contacts/?status=PENDING", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_metrics_after_handshake(client):
    resp = await client.get("/metrics")
    assert resp.status_code == 200
    assert "auth_handshake_results_total" in resp.text


@pytest.mark.asyncio
async def test_add_duplicate_contact(client, db_session):
    await register_user(client, db_session, "+1111111111", "DupContact1", "dupcontact@test.com")
    login_resp = await client.post(
        "/auth/login",
        json={"phone_number": "+1111111111", "password": "DupContact1"},
    )
    token = login_resp.json()["access_token"]
    await client.post(
        "/contacts/",
        json={"contact_phone": "+2222222222", "contact_name": "Friend"},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.post(
        "/contacts/",
        json={"contact_phone": "+2222222222", "contact_name": "Friend"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400
    assert "Contact already exists" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_logout_empty_body(client):
    resp = await client.post("/auth/logout", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_db_dependency():
    from services.auth.database import get_db

    gen = get_db()
    session = await gen.__anext__()
    assert session is not None


@pytest.mark.asyncio
async def test_register_invalid_phone(client):
    resp = await client.post(
        "/auth/register/init",
        json={
            "phone_number": "123",
            "email": "short@test.com",
            "password": "ValidPass1",
            "full_name": "Short",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_contacts_by_user(client):
    resp = await client.get("/contacts/user/11111111-1111-1111-1111-111111111111")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_internal_get_contacts_with_accepted(client, db_session):
    await register_user(client, db_session, "+1112223333", "InternalTest1", "internal_a@test.com")
    await register_user(client, db_session, "+1112224444", "InternalTest2", "internal_b@test.com")
    login_a = await client.post(
        "/auth/login",
        json={"phone_number": "+1112223333", "password": "InternalTest1"},
    )
    token_a = login_a.json()["access_token"]
    await client.post(
        "/contacts/",
        json={"contact_phone": "+1112224444", "contact_name": "Friend"},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    login_b = await client.post(
        "/auth/login",
        json={"phone_number": "+1112224444", "password": "InternalTest2"},
    )
    token_b = login_b.json()["access_token"]

    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+1112224444",
            UserContact.status == HandshakeStatus.PENDING,
        )
    )
    contact = result.scalars().first()
    assert contact is not None
    contact_id = str(contact.id)

    await client.put(
        f"/contacts/{contact_id}/respond?action=ACCEPTED",
        headers={"Authorization": f"Bearer {token_b}"},
    )

    resp = await client.get("/contacts/user/" + str(contact.user_id))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["contact_phone"] == "+1112224444"
    assert data[0]["status"] == "ACCEPTED"


@pytest.mark.asyncio
async def test_internal_contacts_endpoint(client):
    resp = await client.get("/internal/contacts/11111111-1111-1111-1111-111111111111")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ---------- Two‑step registration tests ----------
@pytest.mark.asyncio
async def test_register_init_sends_otp(client, db_session):
    """Init should store session and return session_token."""
    resp = await client.post(
        "/auth/register/init",
        json={
            "phone_number": "+237612345600",
            "email": "otpuser@example.com",
            "password": "StrongP@ss1",
            "full_name": "Bob",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "session_token" in data
    assert data["message"] == "Verification code sent to your email"


@pytest.mark.asyncio
async def test_register_verify_success(client, db_session):
    """Complete the two‑step flow and get a user."""
    # Init
    resp = await client.post(
        "/auth/register/init",
        json={
            "phone_number": "+237612345601",
            "email": "verifyuser@example.com",
            "password": "StrongP@ss1",
            "full_name": "Alice",
        },
    )
    session_token = resp.json()["session_token"]

    # Fetch OTP
    result = await db_session.execute(
        select(RegistrationSession).where(RegistrationSession.id == session_token)
    )
    session = result.scalars().first()
    otp = session.otp

    # Verify
    resp = await client.post(
        "/auth/register/verify",
        json={"session_token": session_token, "otp": otp},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["phone_number"] == "+237612345601"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_verify_wrong_otp(client, db_session):
    """Wrong OTP should fail."""
    resp = await client.post(
        "/auth/register/init",
        json={
            "phone_number": "+237612345602",
            "email": "badotp@example.com",
            "password": "StrongP@ss1",
            "full_name": "Eve",
        },
    )
    session_token = resp.json()["session_token"]

    resp = await client.post(
        "/auth/register/verify",
        json={"session_token": session_token, "otp": "000000"},
    )
    assert resp.status_code == 400
    assert "Invalid verification code" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_verify_expired_session(client, db_session):
    """Expired session should fail."""
    resp = await client.post(
        "/auth/register/init",
        json={
            "phone_number": "+237612345603",
            "email": "expired@example.com",
            "password": "StrongP@ss1",
            "full_name": "Old",
        },
    )
    session_token = resp.json()["session_token"]

    # Manually expire the session
    result = await db_session.execute(
        select(RegistrationSession).where(RegistrationSession.id == session_token)
    )
    session = result.scalars().first()
    session.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    await db_session.commit()

    resp = await client.post(
        "/auth/register/verify",
        json={"session_token": session_token, "otp": session.otp},
    )
    assert resp.status_code == 400
    assert "Invalid or expired session" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_verify_reuse_session(client, db_session):
    """Session can only be used once."""
    resp = await client.post(
        "/auth/register/init",
        json={
            "phone_number": "+237612345604",
            "email": "reuse@example.com",
            "password": "StrongP@ss1",
            "full_name": "Reuse",
        },
    )
    session_token = resp.json()["session_token"]

    result = await db_session.execute(
        select(RegistrationSession).where(RegistrationSession.id == session_token)
    )
    session = result.scalars().first()
    otp = session.otp

    # First verification – success
    resp = await client.post(
        "/auth/register/verify",
        json={"session_token": session_token, "otp": otp},
    )
    assert resp.status_code == 201

    # Second attempt with same session – fail
    resp = await client.post(
        "/auth/register/verify",
        json={"session_token": session_token, "otp": otp},
    )
    assert resp.status_code == 400
    assert "Invalid or expired session" in resp.json()["detail"]