"""
Management CLI — run as:
    docker compose exec api python manage.py createuser
"""
import asyncio
import sys

import click
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

pwd = CryptContext(schemes=["bcrypt"])


def _get_session() -> AsyncSession:
    import os
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@db:5432/orginfo",
    )
    engine = create_async_engine(db_url, echo=False)
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return factory()


@click.group()
def cli():
    pass


@cli.command()
@click.option("--username", prompt="Username", help="Login username for the staff member.")
@click.option(
    "--password",
    prompt="Password",
    hide_input=True,
    confirmation_prompt=True,
    help="Password (input hidden).",
)
def createuser(username: str, password: str):
    """Create a new staff user account."""
    asyncio.run(_createuser(username, password))


async def _createuser(username: str, password: str) -> None:
    from app.models.user import User  # imported here to avoid top-level app bootstrap

    async with _get_session() as db:
        result = await db.execute(select(User).where(User.username == username))
        existing = result.scalar_one_or_none()
        if existing:
            click.echo(f"Error: user '{username}' already exists.", err=True)
            sys.exit(1)

        user = User(
            username=username,
            password_hash=pwd.hash(password),
        )
        db.add(user)
        await db.commit()
        click.echo(f"User '{username}' created successfully.")


if __name__ == "__main__":
    cli()
