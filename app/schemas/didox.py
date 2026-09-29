"""
Response shapes of the /didox/* endpoints, for the OpenAPI docs.

The routes pass Didox payloads through unchanged, so these models only
document the fields (via `responses=`); they never validate or filter a
response. Field lists match live Didox responses as of September 2026.
"""
from pydantic import BaseModel, ConfigDict, Field

_META_EXAMPLE = {"request_id": "abc-130", "elapsed_ms": 4.2}


class ResponseMeta(BaseModel):
    request_id: str | None = None
    elapsed_ms: float


class ErrorDetail(BaseModel):
    detail: str


class DidoxOrgInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    tin: str | None = Field(None, description="Taxpayer identification number (STIR/INN).")
    name: str | None = Field(None, description="Full registered name.")
    shortName: str | None = Field(None, description="Short name.")
    fullName: str | None = Field(None, description="Same as name.")
    fullname: str | None = Field(None, description="Same as name.")
    shortname: str | None = Field(None, description="Same as shortName.")
    regDate: str | None = Field(None, description="Registration date, DD.MM.YYYY.")
    na1Code: int | None = Field(None, description="Legal form code.")
    na1Name: str | None = Field(None, description="Legal form, in Russian.")
    statusCode: int | None = Field(None, description="Taxpayer status code.")
    statusName: str | None = Field(None, description="Taxpayer status, in Russian.")
    ns10Code: int | None = Field(None, description="Region code.")
    ns11Code: int | None = Field(None, description="District code.")
    address: str | None = Field(None, description="Registered address.")
    oked: str | None = Field(None, description="OKED economic activity code.")
    director: str | None = Field(None, description="Director's full name.")
    directorTin: str | None = Field(None, description="Director's TIN.")
    directorPinfl: str | None = Field(None, description="Director's PINFL.")
    accountant: str | None = Field(None, description="Chief accountant's full name.")
    mfo: str | None = Field(None, description="Bank MFO code; matches bankId in /didox/banks.")
    bankCode: str | None = Field(None, description="Same as mfo.")
    account: str | None = Field(None, description="Settlement account number.")
    bankAccount: str | None = Field(None, description="Same as account.")
    VATRegCode: str | None = Field(None, description="VAT registration code.")
    VATRegStatus: int | None = None
    VATRegStatusCode: str | None = None
    VATRegSimplified: bool | None = None
    isBudget: int | None = Field(None, description="1 for a budget-funded organization.")
    taxpayerType: int | None = None
    isItd: bool | None = None
    personalNum: str | None = Field(None, description="Personal number (PINFL); empty for legal entities.")
    selfEmployment: bool | None = None
    privateNotary: bool | None = None
    peasantFarm: bool | None = None


class DidoxOrgResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "data": {
                    "ns10Code": 27,
                    "ns11Code": 12,
                    "shortName": "\"EXAMPLE\" MCHJ",
                    "tin": "304918546",
                    "name": "\"EXAMPLE\" MAS'ULIYATI CHEKLANGAN JAMIYAT",
                    "regDate": "30.05.2017",
                    "na1Code": 12,
                    "na1Name": "Общество с огр. ответствен.",
                    "statusCode": 0,
                    "statusName": "Действующие и имеющие налоговые обязательства",
                    "mfo": "00475",
                    "account": "20208000000000000001",
                    "address": "Example MFY, Example ko‘chasi, 1-uy",
                    "oked": "10310",
                    "directorTin": "500000000",
                    "directorPinfl": "30000000000000",
                    "director": "JOHN DOE",
                    "accountant": "JANE DOE",
                    "isBudget": 0,
                    "taxpayerType": 1,
                    "isItd": False,
                    "personalNum": None,
                    "selfEmployment": False,
                    "privateNotary": False,
                    "peasantFarm": False,
                    "VATRegCode": "300000000000",
                    "VATRegStatus": 20,
                    "VATRegStatusCode": "1110",
                    "VATRegSimplified": False,
                    "bankAccount": "20208000000000000001",
                    "bankCode": "00475",
                    "shortname": "\"EXAMPLE\" MCHJ",
                    "fullname": "\"EXAMPLE\" MAS'ULIYATI CHEKLANGAN JAMIYAT",
                    "fullName": "\"EXAMPLE\" MAS'ULIYATI CHEKLANGAN JAMIYAT",
                },
                "bank_name": "НУРАФШОН Ш., \"АГРОБАНК\" АТБ ТОШКЕНТ ВИЛОЯТ ХУДУДИЙ ФИЛИАЛИ",
                "_meta": _META_EXAMPLE,
            }
        }
    )

    data: DidoxOrgInfo = Field(description="The Didox record, unchanged.")
    bank_name: str | None = Field(None, description="Bank name for data.bankCode, from /didox/banks.")
    meta: ResponseMeta = Field(alias="_meta")


class DidoxBank(BaseModel):
    model_config = ConfigDict(extra="allow")

    bankId: str = Field(description="Bank MFO code, 5 digits.")
    name: str


class DidoxBanksResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "data": [{"bankId": "00475", "name": "НУРАФШОН Ш., \"АГРОБАНК\" АТБ ТОШКЕНТ ВИЛОЯТ ХУДУДИЙ ФИЛИАЛИ"}],
                "_meta": _META_EXAMPLE,
            }
        }
    )

    data: list[DidoxBank]
    meta: ResponseMeta = Field(alias="_meta")


class _DidoxPlace(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = Field(None, description="Name in English.")
    nameUzLatn: str | None = Field(None, description="Name in Uzbek, Latin script.")
    nameUzCyrl: str | None = Field(None, description="Name in Uzbek, Cyrillic script.")
    nameRu: str | None = Field(None, description="Name in Russian.")
    regionId: int | None = None
    districtCode: int | None = None
    active: int | None = Field(None, description="1 when active.")


class DidoxRegion(_DidoxPlace):
    code: int | None = Field(None, description="SOATO code of the region.")
    regionId: int | None = Field(None, description="Pass this to /didox/regions/{region_id}/districts.")


class DidoxDistrict(_DidoxPlace):
    soato: int | None = Field(None, description="SOATO code of the district.")
    regionId: int | None = Field(None, description="Region this district belongs to.")


class DidoxRegionsResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "data": [
                    {
                        "code": 1703,
                        "name": "Andijan region",
                        "nameUzCyrl": "Андижон вилояти",
                        "nameUzLatn": "Andijon viloyati",
                        "nameRu": "Андижанская область",
                        "regionId": 3,
                        "districtCode": 0,
                        "active": 1,
                    }
                ],
                "_meta": _META_EXAMPLE,
            }
        }
    )

    data: list[DidoxRegion]
    meta: ResponseMeta = Field(alias="_meta")


class DidoxDistrictsResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "data": [
                    {
                        "soato": 1703202,
                        "name": "Altynkul district",
                        "nameUzCyrl": "Олтинкўл тумани",
                        "nameUzLatn": "Oltinko'l tumani",
                        "nameRu": "Алтынкульский район",
                        "regionId": 3,
                        "districtCode": 6,
                        "active": 1,
                    }
                ],
                "_meta": _META_EXAMPLE,
            }
        }
    )

    data: list[DidoxDistrict] = Field(description="Empty list for an unknown region.")
    meta: ResponseMeta = Field(alias="_meta")
