from fastapi import Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from passlib.context import CryptContext
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.user import User

security = HTTPBasic()
pwd = CryptContext(schemes=["bcrypt"])


async def basic_auth(credentials: HTTPBasicCredentials = Depends(security)):
    async with SessionLocal() as db:
        q = await db.execute(select(User).where(User.username == credentials.username))
        user = q.scalar_one_or_none()

        # AUTO CREATE (your requirement)
        if not user:
            user = User(
                username=credentials.username,
                password_hash=pwd.hash(credentials.password),
            )
            db.add(user)
            await db.commit()
            return user

        if not pwd.verify(credentials.password, user.password_hash):
            raise HTTPException(401, "Invalid credentials")

        return user
