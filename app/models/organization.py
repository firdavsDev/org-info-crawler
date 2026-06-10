import enum
from datetime import datetime

from sqlalchemy import JSON, DateTime, String
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

    # last error message when status is failed
    error: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    # UTC timestamp of the last successful crawl; None until first ready state
    crawled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False), nullable=True
    )
