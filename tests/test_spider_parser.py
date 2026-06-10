"""Parser tests for OrgSpider.parse_detail using a saved HTML fixture."""
from pathlib import Path

import pytest
from selectolax.parser import HTMLParser

FIXTURE = Path(__file__).parent / "fixtures" / "orginfo_detail.html"


# ---------------------------------------------------------------------------
# Replicate the parsing logic from the spider so the test stays pure Python
# (no Scrapy request/response machinery needed).
# ---------------------------------------------------------------------------

def parse_detail_html(html_text: str, tin: str) -> dict:
    html = HTMLParser(html_text)

    def text(css):
        el = html.css_first(css)
        return el.text(strip=True) if el else None

    def row_value(label_text: str):
        for row in html.css("div.row.border-bottom, div.row.pt-3"):
            label_el = row.css_first("div.col-6.text-body-tertiary span")
            if label_el and label_el.text(strip=True) == label_text:
                value_el = row.css_first("div.col-6:last-child")
                if value_el:
                    return " ".join(value_el.text(strip=True).split())
        return None

    charter_raw = row_value("Ustav fondi")
    charter_fund = charter_raw.replace("\u00a0", " ") if charter_raw else None

    address_locality = text("[itemprop=addressLocality]")
    street_address   = text("[itemprop=streetAddress]")
    if address_locality and street_address:
        full_address = f"{address_locality}, {street_address}"
    elif address_locality or street_address:
        full_address = address_locality or street_address
    else:
        full_address = None

    director = None
    for card in html.css("div.card-body"):
        h2 = card.css_first("h2.h5")
        if h2 and "Boshqaruv" in h2.text():
            for row in card.css("div.row"):
                label_el = row.css_first("div.col-6.text-body-tertiary span")
                if label_el and "Rahbar" in label_el.text():
                    val_el = row.css_first("div.col-6:last-child span")
                    if val_el:
                        director = val_el.text(strip=True)
                    break
            break

    founders = []
    for card in html.css("div.card-body"):
        h2 = card.css_first("h2.h5")
        if h2 and "Ta'sischilar" in h2.text():
            for row in card.css("div.row.py-2"):
                name_el  = row.css_first("a span")
                share_el = row.css_first("[itemprop=percentOwnership]")
                if name_el:
                    founders.append({
                        "name":  name_el.text(strip=True),
                        "share": share_el.attrs.get("content") if share_el else None,
                    })
            break

    return {
        "tin": tin,
        "name": text("h1[itemprop=name]"),
        "legal_name": text("[itemprop=legalName]"),
        "alternate_name": text("[itemprop=alternateName]"),
        "founding_date": text("[itemprop=foundingDate]"),
        "status": text("[itemprop=status]"),
        "registration_authority": row_value("Ro'yxatdan o'tkazuvchi organ"),
        "thsht": row_value("THSHT"),
        "dbibt": row_value("DBIBT"),
        "ifut": row_value("IFUT"),
        "charter_fund": charter_fund,
        "email": text("a[itemprop=email]"),
        "phone": text("a[itemprop=telephone]"),
        "address": full_address,
        "director": director,
        "founders": founders if founders else None,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.fixture
def parsed():
    return parse_detail_html(FIXTURE.read_text(encoding="utf-8"), "304918546")


def test_tin(parsed):
    assert parsed["tin"] == "304918546"


def test_name(parsed):
    assert "SOLANUZ" in parsed["name"]


def test_legal_name(parsed):
    assert "SOLANUZ" in parsed["legal_name"]


def test_alternate_name(parsed):
    assert parsed["alternate_name"] == '"SOLANUZ" MCHJ'


def test_founding_date(parsed):
    assert parsed["founding_date"] == "30.05.2017"


def test_status(parsed):
    assert parsed["status"] == "Hozirda mavjud"


def test_registration_authority(parsed):
    assert parsed["registration_authority"] == "Davlat xizmatlari markazi"


def test_thsht(parsed):
    assert parsed["thsht"].startswith("152")


def test_dbibt(parsed):
    assert parsed["dbibt"].startswith("79994")


def test_ifut(parsed):
    assert parsed["ifut"].startswith("01111")


def test_charter_fund(parsed):
    # Non-breaking spaces replaced; value ends with UZS
    assert parsed["charter_fund"].endswith("UZS")
    assert "\u00a0" not in parsed["charter_fund"]


def test_email(parsed):
    assert parsed["email"] == "info@solanuz.uz"


def test_phone(parsed):
    assert parsed["phone"] == "711508832"


def test_address(parsed):
    assert parsed["address"] is not None
    assert "Namangan" in parsed["address"]
    assert "Xumxona" in parsed["address"]


def test_director(parsed):
    assert parsed["director"] == "SOLANUZ DIRECTOR NAME"


def test_founders_list(parsed):
    founders = parsed["founders"]
    assert isinstance(founders, list)
    assert len(founders) == 2


def test_founders_names(parsed):
    names = [f["name"] for f in parsed["founders"]]
    assert "FOUNDER ONE" in names
    assert "FOUNDER TWO" in names


def test_founders_shares(parsed):
    shares = {f["name"]: f["share"] for f in parsed["founders"]}
    assert shares["FOUNDER ONE"] == "60.00"
    assert shares["FOUNDER TWO"] == "40.00"
