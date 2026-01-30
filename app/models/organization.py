import enum

from sqlalchemy import JSON, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class JobStatus(str, enum.Enum):
    queued = "queued"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)

    tin: Mapped[str] = mapped_column(String(20), unique=True)
    status: Mapped[JobStatus]

    # full parsed json cached
    payload: Mapped[dict] = mapped_column(JSON)
