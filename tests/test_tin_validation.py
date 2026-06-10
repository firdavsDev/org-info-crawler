"""Unit tests for TIN validation in API routes."""
import re

import pytest

# Reuse the same regex as defined in routes.py to keep tests independent
# of FastAPI app startup (no DB / Kafka needed).
TIN_RE = re.compile(r"^\d{9,14}$")


@pytest.mark.parametrize("tin", [
    "123456789",       # 9 digits – minimum valid
    "12345678901234",  # 14 digits – maximum valid
    "304918546",       # real-world example
])
def test_valid_tin(tin):
    assert TIN_RE.match(tin), f"Expected {tin!r} to be valid"


@pytest.mark.parametrize("tin", [
    "12345678",        # 8 digits – too short
    "123456789012345", # 15 digits – too long
    "12345678A",       # contains a letter
    "",                # empty
    "abc",             # all letters
    "123 456 789",     # spaces
    "123-456-789",     # dashes
])
def test_invalid_tin(tin):
    assert not TIN_RE.match(tin), f"Expected {tin!r} to be invalid"
