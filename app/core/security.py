from fastapi import Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from passlib.context import CryptContext
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.user import User

security = HTTPBasic()
pwd = CryptContext(schemes=["bcrypt"])


def unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"WWW-Authenticate": "Basic"},
    )


async def authenticate_credentials(
    db,
    credentials: HTTPBasicCredentials,
    auto_create: bool,
):
    q = await db.execute(select(User).where(User.username == credentials.username))
    user = q.scalar_one_or_none()

    if not user:
        if not auto_create:
            raise unauthorized("Invalid credentials")

        user = User(
            username=credentials.username,
            password_hash=pwd.hash(credentials.password),
        )
        db.add(user)
        await db.commit()
        return user

    if not pwd.verify(credentials.password, user.password_hash):
        raise unauthorized("Invalid credentials")

    return user


async def basic_auth(credentials: HTTPBasicCredentials = Depends(security)):
    async with SessionLocal() as db:
        return await authenticate_credentials(
            db=db,
            credentials=credentials,
        )
