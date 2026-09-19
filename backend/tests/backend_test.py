"""Backend tests for Sat (sales assumptions tool) AI endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cashflow-wizard-9.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
TIMEOUT = 90


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_root(session):
    r = session.get(f"{API}/", timeout=30)
    assert r.status_code == 200
    assert r.json().get("message")


# --- suggest-catalog ---
def test_suggest_catalog_coffee_shop(session):
    payload = {"industry": "coffee shop", "business_model": "mixed", "description": "", "months": 12}
    r = session.post(f"{API}/ai/suggest-catalog", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    items = data.get("items")
    assert isinstance(items, list) and len(items) >= 1
    for it in items:
        assert it.get("name")
        assert "category" in it
        assert isinstance(it.get("price"), (int, float))
        assert isinstance(it.get("unit_cost"), (int, float))
        assert isinstance(it.get("units"), list)
        assert len(it["units"]) == 12
        # unit_cost generally below price
        if it["price"] > 0:
            assert it["unit_cost"] < it["price"], f"unit_cost {it['unit_cost']} not < price {it['price']} for {it['name']}"


# --- suggest-assumptions 12 months ---
def test_suggest_assumptions_landscaping_12(session):
    payload = {
        "industry": "landscaping",
        "business_model": "services",
        "item_name": "Lawn maintenance visit",
        "months": 12,
        "price": 120,
    }
    r = session.post(f"{API}/ai/suggest-assumptions", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data.get("price"), (int, float))
    assert isinstance(data.get("unit_cost"), (int, float))
    assert isinstance(data.get("units"), list)
    assert len(data["units"]) == 12


# --- suggest-assumptions 6 months ---
def test_suggest_assumptions_6_months(session):
    payload = {
        "industry": "landscaping",
        "business_model": "services",
        "item_name": "Lawn maintenance visit",
        "months": 6,
        "price": 120,
    }
    r = session.post(f"{API}/ai/suggest-assumptions", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["units"]) == 6
