from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SearchLog(Base):
    __tablename__ = "search_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Store username as a plain string (no FK) for simplicity and log resilience
    username: Mapped[str] = mapped_column(String(50), index=True)
    tin: Mapped[str] = mapped_column(String(20))
    searched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=datetime.utcnow
    )
