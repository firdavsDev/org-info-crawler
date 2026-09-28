"""Tests for the fields added to OrgSpider for the September 2026 orginfo.uz markup."""
from pathlib import Path

from crawler.spiders.orginfo_spider import parse_org_html

FIXTURES = Path(__file__).parent / "fixtures"
URL = "https://orginfo.uz/uz/organization/abc123/"


def parse(name):
    return parse_org_html((FIXTURES / name).read_text(encoding="utf-8"), "300000001", URL)


def test_director_and_position():
    record = parse("orginfo_detail_2026.html")
    assert record["director"] == "EXAMPLE DIRECTOR NAME"
    assert record["director_position"] == "ceo"


def test_large_taxpayer():
    assert parse("orginfo_detail_2026.html")["large_taxpayer"] == "Yo'q"


def test_data_as_of():
    assert parse("orginfo_detail_2026.html")["data_as_of"] == "02.09.2026"


def test_source_url_and_tin():
    record = parse("orginfo_detail_2026.html")
    assert record["source_url"] == URL
    assert record["tin"] == "300000001"


def test_older_markup_leaves_new_fields_empty():
    record = parse("orginfo_detail.html")
    assert record["director"] == "SOLANUZ DIRECTOR NAME"
    assert record["director_position"] is None
    assert record["large_taxpayer"] is None
    assert record["data_as_of"] is None
