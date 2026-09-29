"""Didox partner API gateway: org info by TIN/PINFL, banks, regions, districts."""
import time

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from app.api.routes import _meta, _validate_tin
from app.core.cache import didox_cache
from app.core.didox import DidoxError, didox_client
from app.core.security import basic_auth
from app.models.user import User
from app.schemas.didox import (
    DidoxBanksResponse,
    DidoxDistrictsResponse,
    DidoxOrgResponse,
    DidoxRegionsResponse,
    ErrorDetail,
)
from app.services.didox_service import DidoxService

router = APIRouter(prefix="/didox", tags=["didox"])

# OpenAPI docs for the failures every /didox/* endpoint can return.
DIDOX_ERROR_RESPONSES = {
    502: {"model": ErrorDetail, "description": "Didox returned an error or an unreadable response."},
    503: {"model": ErrorDetail, "description": "DIDOX_BASE_URL / PARTNER_AUTHORIZATION are not set."},
    504: {"model": ErrorDetail, "description": "Didox did not answer within DIDOX_TIMEOUT_SECONDS."},
}


def get_didox_service() -> DidoxService:
    return DidoxService(didox_client, didox_cache)


async def didox_error_handler(request: Request, exc: DidoxError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@router.get(
    "/org/{tin}",
    summary="Organization by TIN or PINFL",
    responses={
        200: {"model": DidoxOrgResponse},
        404: {"model": ErrorDetail, "description": "Didox has no record for this TIN."},
        **DIDOX_ERROR_RESPONSES,
    },
)
async def didox_org(
    tin: str,
    request: Request,
    user: User = Depends(basic_auth),
    service: DidoxService = Depends(get_didox_service),
):
    """
    Organization details from Didox by TIN (INN) or PINFL, with its bank name.

    `data` is the Didox record, unchanged. `bank_name` is resolved from
    `data.bankCode` via the Didox bank list. Cached for DIDOX_INFO_TTL_SECONDS.
    """
    t0 = time.perf_counter()
    _validate_tin(tin)
    result = await service.get_org(tin)
    result["_meta"] = _meta(request, t0)
    return result


@router.get(
    "/banks",
    summary="All banks",
    responses={200: {"model": DidoxBanksResponse}, **DIDOX_ERROR_RESPONSES},
)
async def didox_banks(
    request: Request,
    user: User = Depends(basic_auth),
    service: DidoxService = Depends(get_didox_service),
):
    """All banks known to Didox (about 2,000). `bankId` is the bank's MFO code."""
    t0 = time.perf_counter()
    return {"data": await service.get_banks(), "_meta": _meta(request, t0)}


@router.get(
    "/regions",
    summary="Waybill regions",
    responses={200: {"model": DidoxRegionsResponse}, **DIDOX_ERROR_RESPONSES},
)
async def didox_regions(
    request: Request,
    user: User = Depends(basic_auth),
    service: DidoxService = Depends(get_didox_service),
):
    """Waybill regions from Didox. Pass `regionId` to the districts endpoint."""
    t0 = time.perf_counter()
    return {"data": await service.get_regions(), "_meta": _meta(request, t0)}


@router.get(
    "/regions/{region_id}/districts",
    summary="Waybill districts of a region",
    responses={200: {"model": DidoxDistrictsResponse}, **DIDOX_ERROR_RESPONSES},
)
async def didox_districts(
    region_id: int,
    request: Request,
    user: User = Depends(basic_auth),
    service: DidoxService = Depends(get_didox_service),
):
    """Waybill districts of one region (`regionId` from /didox/regions). Unknown regions return an empty list."""
    t0 = time.perf_counter()
    return {"data": await service.get_districts(region_id), "_meta": _meta(request, t0)}
