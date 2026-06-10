from typing import Any, Optional

from pydantic import BaseModel


class OrgQueued(BaseModel):
    status: str = "queued"


class OrgProcessing(BaseModel):
    status: str = "processing"


class OrgFailed(BaseModel):
    status: str = "failed"
    error: Optional[str] = None


class OrgReady(BaseModel):
    status: str = "ready"
    data: dict[str, Any]


class OrgNotFound(BaseModel):
    status: str = "not_found"


class OrgStatusResponse(BaseModel):
    status: str
    error: Optional[str] = None

