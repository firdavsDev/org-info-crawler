import pytest
from fastapi import HTTPException
from fastapi.security import HTTPBasicCredentials

from app.core.security import authenticate_credentials, pwd


class FakeResult:
    def __init__(self, user):
        self.user = user

    def scalar_one_or_none(self):
        return self.user


class FakeUser:
    def __init__(self, username, password_hash):
        self.username = username
        self.password_hash = password_hash


class FakeDb:
    def __init__(self, user=None):
        self.user = user
        self.added = []
        self.committed = False

    async def execute(self, statement):
        return FakeResult(self.user)

    def add(self, obj):
        self.added.append(obj)
        self.user = obj

    async def commit(self):
        self.committed = True


def credentials(username="admin", password="secret"):
    return HTTPBasicCredentials(username=username, password=password)


@pytest.mark.asyncio
async def test_existing_user_with_valid_password_returns_user():
    user = FakeUser("admin", pwd.hash("secret"))
    db = FakeDb(user=user)

    result = await authenticate_credentials(
        db=db,
        credentials=credentials(),
        auto_create=False,
    )

    assert result is user
    assert db.added == []
    assert db.committed is False


@pytest.mark.asyncio
async def test_existing_user_with_invalid_password_returns_401():
    user = FakeUser("admin", pwd.hash("secret"))
    db = FakeDb(user=user)

    with pytest.raises(HTTPException) as exc:
        await authenticate_credentials(
            db=db,
            credentials=credentials(password="wrong"),
            auto_create=False,
        )

    assert exc.value.status_code == 401
    assert db.added == []
    assert db.committed is False


@pytest.mark.asyncio
async def test_missing_user_returns_401_when_auto_create_disabled():
    db = FakeDb()

    with pytest.raises(HTTPException) as exc:
        await authenticate_credentials(
            db=db,
            credentials=credentials(),
            auto_create=False,
        )

    assert exc.value.status_code == 401
    assert db.added == []
    assert db.committed is False


@pytest.mark.asyncio
async def test_missing_user_is_created_when_auto_create_enabled():
    db = FakeDb()

    result = await authenticate_credentials(
        db=db,
        credentials=credentials(),
        auto_create=True,
    )

    assert result.username == "admin"
    assert pwd.verify("secret", result.password_hash)
    assert db.added == [result]
    assert db.committed is True
