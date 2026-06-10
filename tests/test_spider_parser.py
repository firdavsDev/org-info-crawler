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
