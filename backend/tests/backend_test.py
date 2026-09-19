"""Backend tests for Sat (sales assumptions tool) AI endpoints."""
import io
import os
import pytest
import requests
from openpyxl import load_workbook

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
    # regression: source field added
    assert "source" in data
    assert isinstance(data["source"], str) and len(data["source"]) > 0
    assert "note" in data


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


# --- xlsx export ---
def _make_payload(months=12):
    labels = [f"M{i+1}" for i in range(months)]
    units_a = [10] * months
    units_b = [5] * months
    return {
        "business_name": "TEST Northside Coffee",
        "industry": "coffee shop",
        "months": months,
        "labels": labels,
        "categories": [
            {"id": "cat1", "name": "Retail"},
            {"id": "cat2", "name": "Wholesale"},
        ],
        "items": [
            {"name": "12oz bag", "category_id": "cat1", "price": 18.0, "unit_cost": 6.0, "units": units_a},
            {"name": "5kg case", "category_id": "cat2", "price": 72.0, "unit_cost": 30.0, "units": units_b},
        ],
    }


def _load_wb(response):
    assert response.status_code == 200, response.text
    ct = response.headers.get("content-type", "")
    assert "openxmlformats-officedocument.spreadsheetml.sheet" in ct, ct
    return load_workbook(io.BytesIO(response.content))


def test_xlsx_export_12_months(session):
    payload = _make_payload(12)
    r = session.post(f"{API}/export/xlsx", json=payload, timeout=TIMEOUT)
    wb = _load_wb(r)
    assert set(wb.sheetnames) == {"Summary", "Sales Assumptions", "Cost Assumptions"}

    sales = wb["Sales Assumptions"]
    # Header row 3
    header = [sales.cell(row=3, column=c).value for c in range(1, 4 + 12 + 1)]
    expected = ["Sales category", "Name of product or service", "Sales price ($)", *payload["labels"], "Annual revenue ($)"]
    assert header == expected, header

    # First product row (row 4)
    assert sales.cell(row=4, column=2).value == "12oz bag"
    assert float(sales.cell(row=4, column=3).value) == 18.0
    # M1 units cell -> 10 (sales sheet stores units)
    assert float(sales.cell(row=4, column=4).value) == 10.0

    # Find TOTAL REVENUE row
    total_rev = None
    for r_idx in range(1, sales.max_row + 1):
        v = sales.cell(row=r_idx, column=1).value
        if isinstance(v, str) and "TOTAL REVENUE" in v:
            total_rev = r_idx
            break
    assert total_rev is not None, "TOTAL REVENUE row missing"
    # Annual total column
    expected_rev = (10 * 18 + 5 * 72) * 12  # 5160
    annual_rev = float(sales.cell(row=total_rev, column=4 + 12).value)
    assert abs(annual_rev - expected_rev) < 0.01

    # Cost sheet
    cost = wb["Cost Assumptions"]
    labels_found = {"TOTAL DIRECT COSTS ($)": None, "GROSS PROFIT ($)": None, "GROSS MARGIN (%)": None}
    for r_idx in range(1, cost.max_row + 1):
        v = cost.cell(row=r_idx, column=1).value
        if v in labels_found:
            labels_found[v] = r_idx
    for lbl, ri in labels_found.items():
        assert ri is not None, f"{lbl} missing"

    expected_cost = (10 * 6 + 5 * 30) * 12  # 2520
    expected_gp = expected_rev - expected_cost  # 2640
    expected_margin = expected_gp / expected_rev  # ~0.5116

    tot_cost = float(cost.cell(row=labels_found["TOTAL DIRECT COSTS ($)"], column=4 + 12).value)
    tot_gp = float(cost.cell(row=labels_found["GROSS PROFIT ($)"], column=4 + 12).value)
    tot_margin = float(cost.cell(row=labels_found["GROSS MARGIN (%)"], column=4 + 12).value)

    assert abs(tot_cost - expected_cost) < 0.01
    assert abs(tot_gp - expected_gp) < 0.01
    assert abs(tot_margin - expected_margin) < 0.001

    # Summary sheet margin
    summary = wb["Summary"]
    s_margin = None
    for r_idx in range(1, summary.max_row + 1):
        if summary.cell(row=r_idx, column=1).value == "Gross margin":
            s_margin = float(summary.cell(row=r_idx, column=2).value)
    assert s_margin is not None
    assert abs(s_margin - expected_margin) < 0.001


def test_xlsx_export_24_months(session):
    payload = _make_payload(24)
    r = session.post(f"{API}/export/xlsx", json=payload, timeout=TIMEOUT)
    wb = _load_wb(r)
    sales = wb["Sales Assumptions"]
    header = [sales.cell(row=3, column=c).value for c in range(1, 4 + 24 + 1)]
    assert len(header) == 4 + 24
    assert header[0] == "Sales category"
    assert header[3:3 + 24] == payload["labels"]
    assert header[-1] == "Annual revenue ($)"

    # arithmetic check
    expected_rev = (10 * 18 + 5 * 72) * 24
    total_rev_row = None
    for r_idx in range(1, sales.max_row + 1):
        v = sales.cell(row=r_idx, column=1).value
        if isinstance(v, str) and "TOTAL REVENUE" in v:
            total_rev_row = r_idx
            break
    assert total_rev_row is not None
    assert abs(float(sales.cell(row=total_rev_row, column=4 + 24).value) - expected_rev) < 0.01


def test_xlsx_content_disposition(session):
    payload = _make_payload(12)
    r = session.post(f"{API}/export/xlsx", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200
    cd = r.headers.get("content-disposition", "")
    assert ".xlsx" in cd
    assert "test-northside-coffee-assumptions.xlsx" in cd
