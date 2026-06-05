import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select, text

from services.auth.main import app
from services.auth.database import get_db
from services.auth.models import Base, UserContact, HandshakeStatus, VerificationCode
from services.auth.auth_utils import create_access_token
from datetime import datetime, timezone, timedelta
import logging
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
        except Exception:
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


# ---------- Helper ----------
async def get_otp(client, email, db_session):
    await client.post(f"/auth/send-otp?email={email}")
    result = await db_session.execute(
        select(VerificationCode)
        .where(VerificationCode.email == email)
        .where(VerificationCode.used == False)
        .order_by(VerificationCode.created_at.desc())
    )
    code_entry = result.scalars().first()
    return code_entry.code


# ---------- Registration ----------
@pytest.mark.asyncio
async def test_register(client, db_session):
    otp = await get_otp(client, "reg1@test.com", db_session)
    resp = await client.post("/auth/register", json={
        "phone_number": "+1234567890",
        "password": "StrongP@ss1",
        "full_name": "Alice",
        "email": "reg1@test.com",
        "otp": otp
    })
    assert resp.status_code == 201, f"Registration failed: {resp.text}"


@pytest.mark.asyncio
async def test_register_duplicate(client, db_session):
    otp = await get_otp(client, "reg2@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1234567891",
        "password": "Test1234!",
        "email": "reg2@test.com",
        "otp": otp
    })
    # Duplicate phone – must fail
    resp = await client.post("/auth/register", json={
        "phone_number": "+1234567891",
        "password": "Test1234!",
        "email": "reg2@test.com",
        "otp": otp
    })
    assert resp.status_code == 400


# ---------- Login ----------
@pytest.mark.asyncio
async def test_login(client, db_session):
    otp = await get_otp(client, "login@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1234567892",
        "password": "Login1234!",
        "email": "login@test.com",
        "otp": otp
    })
    resp = await client.post("/auth/login", json={
        "phone_number": "+1234567892",
        "password": "Login1234!"
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client, db_session):
    otp = await get_otp(client, "wrongpwd@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+7777777777",
        "password": "RightP@ss",
        "email": "wrongpwd@test.com",
        "otp": otp
    })
    resp = await client.post("/auth/login", json={
        "phone_number": "+7777777777",
        "password": "WrongP@ss"
    })
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    resp = await client.post("/auth/login", json={
        "phone_number": "+9999999999",
        "password": "DoesNotExist1"
    })
    assert resp.status_code == 401


# ---------- Contacts ----------
@pytest.mark.asyncio
async def test_add_contact(client, db_session):
    otp = await get_otp(client, "contact1@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1111111111",
        "password": "User1Pass!",
        "email": "contact1@test.com",
        "otp": otp
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
async def test_add_self_as_contact(client, db_session):
    otp = await get_otp(client, "self@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1010101010",
        "password": "SelfTest1",
        "email": "self@test.com",
        "otp": otp
    })
    login_resp = await client.post("/auth/login", json={
        "phone_number": "+1010101010",
        "password": "SelfTest1"
    })
    token = login_resp.json()["access_token"]
    resp = await client.post("/contacts/", json={
        "contact_phone": "+1010101010",
        "contact_name": "Myself"
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400
    assert "Cannot add yourself" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_list_contacts(client, db_session):
    otp = await get_otp(client, "listcontacts@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+3333333333",
        "password": "User3Pass!",
        "email": "listcontacts@test.com",
        "otp": otp
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
    otp_a = await get_otp(client, "handshake1@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+5555555555",
        "password": "UserA!Pass",
        "email": "handshake1@test.com",
        "otp": otp_a
    })
    login_a = await client.post("/auth/login", json={
        "phone_number": "+5555555555",
        "password": "UserA!Pass"
    })
    token_a = login_a.json()["access_token"]

    otp_b = await get_otp(client, "handshake2@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+6666666666",
        "password": "UserB!Pass",
        "email": "handshake2@test.com",
        "otp": otp_b
    })
    login_b = await client.post("/auth/login", json={
        "phone_number": "+6666666666",
        "password": "UserB!Pass"
    })
    token_b = login_b.json()["access_token"]

    await client.post("/contacts/", json={
        "contact_phone": "+6666666666",
        "contact_name": "Mom"
    }, headers={"Authorization": f"Bearer {token_a}"})

    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+6666666666",
            UserContact.status == HandshakeStatus.PENDING
        )
    )
    contact = result.scalars().first()
    assert contact is not None
    contact_id = str(contact.id)

    resp = await client.put(
        f"/contacts/{contact_id}/respond?action=ACCEPTED",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ACCEPTED"


@pytest.mark.asyncio
async def test_respond_handshake_not_found(client, db_session):
    otp = await get_otp(client, "handshake404@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+8888888888",
        "password": "TestPass1",
        "email": "handshake404@test.com",
        "otp": otp
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


@pytest.mark.asyncio
async def test_access_protected_with_invalid_token(client):
    resp = await client.get("/contacts/", headers={"Authorization": "Bearer fake-token"})
    assert resp.status_code == 401
    assert "Invalid token" in resp.json()["detail"]


# ---------- Refresh Token Tests ----------
@pytest.mark.asyncio
async def test_login_returns_refresh_token(client, db_session):
    otp = await get_otp(client, "refresh1@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1112223333",
        "password": "Refresh123",
        "email": "refresh1@test.com",
        "otp": otp
    })
    resp = await client.post("/auth/login", json={
        "phone_number": "+1112223333",
        "password": "Refresh123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_refresh_grants_new_access_token(client, db_session):
    otp = await get_otp(client, "refresh2@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1112224444",
        "password": "RefreshTest1",
        "email": "refresh2@test.com",
        "otp": otp
    })
    login_resp = await client.post("/auth/login", json={
        "phone_number": "+1112224444",
        "password": "RefreshTest1"
    })
    tokens = login_resp.json()
    refresh_token = tokens["refresh_token"]
    refresh_resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
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
    otp = await get_otp(client, "refresh3@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1112225555",
        "password": "RefreshReuse",
        "email": "refresh3@test.com",
        "otp": otp
    })
    login_resp = await client.post("/auth/login", json={
        "phone_number": "+1112225555",
        "password": "RefreshReuse"
    })
    old_refresh = login_resp.json()["refresh_token"]
    refresh_resp = await client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert refresh_resp.status_code == 200
    re_resp = await client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert re_resp.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_refresh_token(client, db_session):
    otp = await get_otp(client, "logout@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1112226666",
        "password": "LogoutTest",
        "email": "logout@test.com",
        "otp": otp
    })
    login_resp = await client.post("/auth/login", json={
        "phone_number": "+1112226666",
        "password": "LogoutTest"
    })
    refresh_token = login_resp.json()["refresh_token"]
    logout_resp = await client.post("/auth/logout", json={"refresh_token": refresh_token})
    assert logout_resp.status_code == 204
    refresh_resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_resp.status_code == 401


@pytest.mark.asyncio
async def test_metrics_endpoint(client):
    resp = await client.get("/metrics")
    assert resp.status_code == 200
    assert "auth_http_requests_total" in resp.text


@pytest.mark.asyncio
async def test_refresh_with_deleted_user(client, db_session):
    otp = await get_otp(client, "delete@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1113337777",
        "password": "DeleteMe1",
        "email": "delete@test.com",
        "otp": otp
    })
    login_resp = await client.post("/auth/login", json={
        "phone_number": "+1113337777",
        "password": "DeleteMe1"
    })
    tokens = login_resp.json()
    refresh_token = tokens["refresh_token"]
    from services.auth.models import User
    result = await db_session.execute(select(User).where(User.phone_number == "+1113337777"))
    user = result.scalars().first()
    await db_session.delete(user)
    await db_session.commit()
    resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_access_with_nonexistent_user(client):
    token = create_access_token({"sub": "00000000-0000-0000-0000-000000000000"})
    resp = await client.get("/contacts/", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "User not found"


@pytest.mark.asyncio
async def test_respond_handshake_invalid_action(client, db_session):
    otp_a = await get_otp(client, "invalidact@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+7777777777",
        "password": "InvalidAction1",
        "email": "invalidact@test.com",
        "otp": otp_a
    })
    login_a = await client.post("/auth/login", json={
        "phone_number": "+7777777777",
        "password": "InvalidAction1"
    })
    token_a = login_a.json()["access_token"]

    otp_b = await get_otp(client, "invalidact2@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+8888888888",
        "password": "InvalidAction2",
        "email": "invalidact2@test.com",
        "otp": otp_b
    })
    login_b = await client.post("/auth/login", json={
        "phone_number": "+8888888888",
        "password": "InvalidAction2"
    })
    token_b = login_b.json()["access_token"]

    await client.post("/contacts/", json={
        "contact_phone": "+8888888888",
        "contact_name": "Test"
    }, headers={"Authorization": f"Bearer {token_a}"})

    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+8888888888",
            UserContact.status == HandshakeStatus.PENDING
        )
    )
    contact = result.scalars().first()
    assert contact is not None
    contact_id = str(contact.id)

    resp = await client.put(
        f"/contacts/{contact_id}/respond?action=INVALID",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_respond_handshake_rejected(client, db_session):
    otp_a = await get_otp(client, "reject_a@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+5555555555",
        "password": "UserA!Pass",
        "email": "reject_a@test.com",
        "otp": otp_a
    })
    login_a = await client.post("/auth/login", json={
        "phone_number": "+5555555555",
        "password": "UserA!Pass"
    })
    token_a = login_a.json()["access_token"]

    otp_b = await get_otp(client, "reject_b@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+6666666666",
        "password": "UserB!Pass",
        "email": "reject_b@test.com",
        "otp": otp_b
    })
    login_b = await client.post("/auth/login", json={
        "phone_number": "+6666666666",
        "password": "UserB!Pass"
    })
    token_b = login_b.json()["access_token"]

    await client.post("/contacts/", json={
        "contact_phone": "+6666666666",
        "contact_name": "Mom"
    }, headers={"Authorization": f"Bearer {token_a}"})

    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+6666666666",
            UserContact.status == HandshakeStatus.PENDING
        )
    )
    contact = result.scalars().first()
    assert contact is not None
    contact_id = str(contact.id)

    resp = await client.put(
        f"/contacts/{contact_id}/respond?action=REJECTED",
        headers={"Authorization": f"Bearer {token_b}"}
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
        text("INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked) "
             "VALUES (gen_random_uuid(), :user_id, :hash, :expires, false)"),
        {"user_id": "00000000-0000-0000-0000-000000000000", "hash": token_hash, "expires": expires}
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
    otp = await get_otp(client, "accepted@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1212121212",
        "password": "FilterTest1",
        "email": "accepted@test.com",
        "otp": otp
    })
    login_resp = await client.post("/auth/login", json={
        "phone_number": "+1212121212",
        "password": "FilterTest1"
    })
    token = login_resp.json()["access_token"]
    await client.post("/contacts/", json={
        "contact_phone": "+1313131313",
        "contact_name": "Friend"
    }, headers={"Authorization": f"Bearer {token}"})
    resp = await client.get("/contacts/?status=ACCEPTED", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_respond_handshake_twice(client, db_session):
    otp_a = await get_otp(client, "twice_a@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+5555555555",
        "password": "UserA!Pass",
        "email": "twice_a@test.com",
        "otp": otp_a
    })
    login_a = await client.post("/auth/login", json={
        "phone_number": "+5555555555",
        "password": "UserA!Pass"
    })
    token_a = login_a.json()["access_token"]

    otp_b = await get_otp(client, "twice_b@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+6666666666",
        "password": "UserB!Pass",
        "email": "twice_b@test.com",
        "otp": otp_b
    })
    login_b = await client.post("/auth/login", json={
        "phone_number": "+6666666666",
        "password": "UserB!Pass"
    })
    token_b = login_b.json()["access_token"]

    await client.post("/contacts/", json={
        "contact_phone": "+6666666666",
        "contact_name": "Mom"
    }, headers={"Authorization": f"Bearer {token_a}"})

    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+6666666666",
            UserContact.status == HandshakeStatus.PENDING
        )
    )
    contact = result.scalars().first()
    assert contact is not None
    contact_id = str(contact.id)

    resp = await client.put(f"/contacts/{contact_id}/respond?action=ACCEPTED",
                            headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 200

    resp = await client.put(f"/contacts/{contact_id}/respond?action=ACCEPTED",
                            headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 404
    assert "Pending contact request not found" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_list_contacts_rejected(client, db_session):
    otp_a = await get_otp(client, "rejected_a@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1111111111",
        "password": "RejectTest1",
        "email": "rejected_a@test.com",
        "otp": otp_a
    })
    login_a = await client.post("/auth/login", json={
        "phone_number": "+1111111111",
        "password": "RejectTest1"
    })
    token_a = login_a.json()["access_token"]

    otp_b = await get_otp(client, "rejected_b@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+2222222222",
        "password": "RejectTest2",
        "email": "rejected_b@test.com",
        "otp": otp_b
    })
    login_b = await client.post("/auth/login", json={
        "phone_number": "+2222222222",
        "password": "RejectTest2"
    })
    token_b = login_b.json()["access_token"]

    await client.post("/contacts/", json={
        "contact_phone": "+2222222222",
        "contact_name": "RejectMe"
    }, headers={"Authorization": f"Bearer {token_a}"})

    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+2222222222",
            UserContact.status == HandshakeStatus.PENDING
        )
    )
    contact = result.scalars().first()
    assert contact is not None
    contact_id = str(contact.id)

    await client.put(f"/contacts/{contact_id}/respond?action=REJECTED",
                     headers={"Authorization": f"Bearer {token_b}"})

    resp = await client.get("/contacts/?status=REJECTED", headers={"Authorization": f"Bearer {token_a}"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["status"] == "REJECTED"


@pytest.mark.asyncio
async def test_list_contacts_pending_empty(client, db_session):
    otp = await get_otp(client, "pendingempty@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1231231234",
        "password": "EmptyPending1",
        "email": "pendingempty@test.com",
        "otp": otp
    })
    login_resp = await client.post("/auth/login", json={
        "phone_number": "+1231231234",
        "password": "EmptyPending1"
    })
    token = login_resp.json()["access_token"]
    resp = await client.get("/contacts/?status=PENDING", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_metrics_after_handshake(client):
    resp = await client.get("/metrics")
    assert resp.status_code == 200
    assert "auth_handshake_results_total" in resp.text


@pytest.mark.asyncio
async def test_add_duplicate_contact(client, db_session):
    otp = await get_otp(client, "dupcontact@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1111111111",
        "password": "DupContact1",
        "email": "dupcontact@test.com",
        "otp": otp
    })
    login_resp = await client.post("/auth/login", json={
        "phone_number": "+1111111111",
        "password": "DupContact1"
    })
    token = login_resp.json()["access_token"]
    await client.post("/contacts/", json={
        "contact_phone": "+2222222222",
        "contact_name": "Friend"
    }, headers={"Authorization": f"Bearer {token}"})
    resp = await client.post("/contacts/", json={
        "contact_phone": "+2222222222",
        "contact_name": "Friend"
    }, headers={"Authorization": f"Bearer {token}"})
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
    resp = await client.post("/auth/register", json={
        "phone_number": "123",
        "password": "ValidPass1"
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_contacts_by_user(client):
    resp = await client.get("/contacts/user/11111111-1111-1111-1111-111111111111")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_internal_get_contacts_with_accepted(client, db_session):
    otp_a = await get_otp(client, "internal_a@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1112223333",
        "password": "InternalTest1",
        "email": "internal_a@test.com",
        "otp": otp_a
    })
    otp_b = await get_otp(client, "internal_b@test.com", db_session)
    await client.post("/auth/register", json={
        "phone_number": "+1112224444",
        "password": "InternalTest2",
        "email": "internal_b@test.com",
        "otp": otp_b
    })
    login_a = await client.post("/auth/login", json={
        "phone_number": "+1112223333",
        "password": "InternalTest1"
    })
    token_a = login_a.json()["access_token"]
    await client.post("/contacts/", json={
        "contact_phone": "+1112224444",
        "contact_name": "Friend"
    }, headers={"Authorization": f"Bearer {token_a}"})

    login_b = await client.post("/auth/login", json={
        "phone_number": "+1112224444",
        "password": "InternalTest2"
    })
    token_b = login_b.json()["access_token"]

    result = await db_session.execute(
        select(UserContact).where(
            UserContact.contact_phone == "+1112224444",
            UserContact.status == HandshakeStatus.PENDING
        )
    )
    contact = result.scalars().first()
    assert contact is not None
    contact_id = str(contact.id)

    await client.put(
        f"/contacts/{contact_id}/respond?action=ACCEPTED",
        headers={"Authorization": f"Bearer {token_b}"}
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


# ---------- Email OTP Tests ----------
@pytest.mark.asyncio
async def test_send_otp(client):
    resp = await client.post("/auth/send-otp?email=test@example.com")
    assert resp.status_code == 200
    assert resp.json() == {"message": "Verification code sent to your email"}


@pytest.mark.asyncio
async def test_register_with_otp_full(client, db_session):
    email = "otpuser@example.com"
    await client.post(f"/auth/send-otp?email={email}")
    from services.auth.models import VerificationCode
    result = await db_session.execute(
        select(VerificationCode)
        .where(VerificationCode.email == email)
        .where(VerificationCode.used == False)
        .order_by(VerificationCode.created_at.desc())
    )
    code_entry = result.scalars().first()
    assert code_entry is not None
    otp = code_entry.code

    resp = await client.post("/auth/register", json={
        "phone_number": "+237612345679",
        "email": email,
        "password": "StrongP@ss1",
        "full_name": "Bob",
        "otp": otp
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["phone_number"] == "+237612345679"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_invalid_otp(client, db_session):
    email = "badotp@example.com"
    await client.post(f"/auth/send-otp?email={email}")
    resp = await client.post("/auth/register", json={
        "phone_number": "+237612345680",
        "email": email,
        "password": "StrongP@ss1",
        "full_name": "Eve",
        "otp": "000000"
    })
    assert resp.status_code == 400
    assert "Invalid or expired verification code" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_expired_otp(client, db_session):
    email = "expired@example.com"
    await client.post(f"/auth/send-otp?email={email}")
    from services.auth.models import VerificationCode
    from datetime import datetime, timezone, timedelta
    result = await db_session.execute(
        select(VerificationCode)
        .where(VerificationCode.email == email)
        .where(VerificationCode.used == False)
        .order_by(VerificationCode.created_at.desc())
    )
    code_entry = result.scalars().first()
    code_entry.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    await db_session.commit()

    resp = await client.post("/auth/register", json={
        "phone_number": "+237612345681",
        "email": email,
        "password": "StrongP@ss1",
        "full_name": "Old",
        "otp": code_entry.code
    })
    assert resp.status_code == 400
    assert "Invalid or expired verification code" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_reuse_otp(client, db_session):
    email = "reuse@example.com"
    await client.post(f"/auth/send-otp?email={email}")
    from services.auth.models import VerificationCode
    result = await db_session.execute(
        select(VerificationCode)
        .where(VerificationCode.email == email)
        .where(VerificationCode.used == False)
        .order_by(VerificationCode.created_at.desc())
    )
    code_entry = result.scalars().first()
    otp = code_entry.code

    resp = await client.post("/auth/register", json={
        "phone_number": "+237612345682",
        "email": email,
        "password": "StrongP@ss1",
        "full_name": "Reuse",
        "otp": otp
    })
    assert resp.status_code == 201

    resp = await client.post("/auth/register", json={
        "phone_number": "+237612345683",
        "email": email,
        "password": "StrongP@ss1",
        "full_name": "Reuse2",
        "otp": otp
    })
    assert resp.status_code == 400
    assert "Invalid or expired verification code" in resp.json()["detail"]