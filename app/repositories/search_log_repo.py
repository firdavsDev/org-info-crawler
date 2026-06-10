from datetime import datetime

from sqlalchemy import select
from sqlalchemy import desc

from app.models.search_log import SearchLog


class SearchLogRepository:

    def __init__(self, db):
        self.db = db

    async def log(self, username: str, tin: str) -> None:
        entry = SearchLog(username=username, tin=tin, searched_at=datetime.utcnow())
        self.db.add(entry)
        await self.db.commit()

    async def get_recent(self, username: str, limit: int) -> list[SearchLog]:
        q = await self.db.execute(
            select(SearchLog)
            .where(SearchLog.username == username)
            .order_by(desc(SearchLog.searched_at))
            .limit(limit)
        )
        return q.scalars().all()
