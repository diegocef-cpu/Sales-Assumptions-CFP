from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import uuid
import secrets
import hmac
import time
import logging
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any

from emergentintegrations.llm.chat import LlmChat, UserMessage
from fastapi.responses import StreamingResponse

from xlsx_export import ExportRequest, build_workbook

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')


class CatalogRequest(BaseModel):
    industry: str
    business_model: Optional[str] = "mixed"
    description: Optional[str] = ""
    months: int = 12


class ItemSuggestion(BaseModel):
    name: str
    category: Optional[str] = None
    price: float = 0
    unit_cost: float = 0
    units: List[float] = Field(default_factory=list)
    note: Optional[str] = None


class CatalogResponse(BaseModel):
    items: List[ItemSuggestion]
    rationale: Optional[str] = None


class AssumptionRequest(BaseModel):
    industry: str
    business_model: Optional[str] = "mixed"
    item_name: str
    months: int = 12
    price: Optional[float] = None


class AssumptionResponse(BaseModel):
    price: float
    unit_cost: float
    units: List[float]
    note: Optional[str] = None
    source: Optional[str] = None


class CategoryItem(BaseModel):
    id: str
    name: str


class CategoriesRequest(BaseModel):
    industry: str
    business_model: Optional[str] = "mixed"
    items: List[CategoryItem]


class CategoriesResponse(BaseModel):
    categories: List[str]
    assignments: Dict[str, str]  # keyed by item id


def _extract_json(text: str) -> dict:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fence:
        text = fence.group(1).strip()
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object in model response: {text[:200]}")
    return json.loads(text[start:end + 1])


async def _ask_json(system_message: str, prompt: str) -> dict:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="LLM key not configured")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"sat-{uuid.uuid4()}",
        system_message=system_message,
    ).with_model("anthropic", "claude-sonnet-4-6")
    reply = await chat.send_message(UserMessage(text=prompt))
    return _extract_json(reply if isinstance(reply, str) else str(reply))


SYSTEM = (
    "You are a financial analyst helping small business owners build lender-ready "
    "12-month sales and cost assumptions. You reply ONLY with a single valid JSON "
    "object, no prose, no markdown fences. Use realistic figures in USD for the "
    "given industry, including plausible seasonality month to month."
)


@api_router.get("/")
async def root():
    return {"message": "Sat API ready"}


@api_router.post("/ai/suggest-catalog", response_model=CatalogResponse)
async def suggest_catalog(req: CatalogRequest):
    prompt = (
        f"Industry: {req.industry}\nBusiness model: {req.business_model}\n"
        f"Extra context from owner: {req.description or 'none'}\n"
        f"Projection horizon: {req.months} months.\n\n"
        "Suggest 4 to 6 typical revenue-generating products or services this business sells. "
        "Group them under 2 or 3 short sales category names.\n"
        "Return JSON exactly shaped as: "
        '{"rationale": "one short sentence", "items": [{"name": "...", "category": "...", '
        f'"price": 0, "unit_cost": 0, "units": [{req.months} integers], "note": "why"}}]}}\n'
        "price = sale price per unit in dollars, unit_cost = direct cost to deliver one unit "
        "(must be lower than price), units = units sold per month with realistic seasonality."
    )
    data = await _ask_json(SYSTEM, prompt)
    items = []
    for raw in data.get("items", [])[:12]:
        units = [float(u or 0) for u in (raw.get("units") or [])][:req.months]
        units += [units[-1] if units else 0.0] * (req.months - len(units))
        items.append(ItemSuggestion(
            name=str(raw.get("name", "Product")),
            category=raw.get("category") or None,
            price=float(raw.get("price") or 0),
            unit_cost=float(raw.get("unit_cost") or 0),
            units=units,
            note=raw.get("note"),
        ))
    if not items:
        raise HTTPException(status_code=502, detail="Could not generate suggestions")
    return CatalogResponse(items=items, rationale=data.get("rationale"))


@api_router.post("/ai/suggest-assumptions", response_model=AssumptionResponse)
async def suggest_assumptions(req: AssumptionRequest):
    prompt = (
        f"Industry: {req.industry}\nBusiness model: {req.business_model}\n"
        f"Product or service: {req.item_name}\n"
        f"Known sale price: {req.price if req.price else 'unknown'}\n"
        f"Projection horizon: {req.months} months.\n\n"
        "Return JSON exactly shaped as: "
        f'{{"price": 0, "unit_cost": 0, "units": [{req.months} integers], '
        '"note": "one short sentence explaining how the recommended price was reasoned", '
        '"source": "the benchmark or basis behind the figure, e.g. IBISWorld specialty coffee industry reports, '
        'US BLS average consumer prices, typical published menu pricing for independent cafes"}\n'
        "If the sale price is known, keep it. unit_cost is the direct cost to deliver one unit "
        "and must be lower than price. units = units sold per month with realistic seasonality. "
        "The source must name a real, recognisable benchmark, industry report, trade association or "
        "public pricing reference — never invent a URL."
    )
    data = await _ask_json(SYSTEM, prompt)
    units = [float(u or 0) for u in (data.get("units") or [])][:req.months]
    units += [units[-1] if units else 0.0] * (req.months - len(units))
    return AssumptionResponse(
        price=float(data.get("price") or req.price or 0),
        unit_cost=float(data.get("unit_cost") or 0),
        units=units,
        note=data.get("note"),
        source=data.get("source"),
    )


@api_router.post("/ai/suggest-categories", response_model=CategoriesResponse)
async def suggest_categories(req: CategoriesRequest):
    cleaned = [(it.id, it.name.strip()) for it in req.items if it.name and it.name.strip()]
    if not cleaned:
        raise HTTPException(status_code=400, detail="At least one item name is required")
    count_rule = "1 or 2 categories" if len(cleaned) <= 3 else "2 to 4 categories"
    items_payload = [{"id": iid, "name": name} for iid, name in cleaned]
    prompt = (
        f"Industry: {req.industry}\nBusiness model: {req.business_model}\n"
        f"Items the owner sells (each has an id, which may repeat the same name across different ids): "
        f"{json.dumps(items_payload)}\n\n"
        f"Group these items into {count_rule}. Use short, simple customer-facing "
        "category names (for example a restaurant with Tacos and Ice cream would use "
        '"Entrees" and "Desserts"). Every id must be assigned to one of the categories '
        "you return. Two items with the same name may land in the same category, that is fine.\n"
        'Return JSON exactly shaped as: {"categories": ["Name A", "Name B"], '
        '"assignments": {"<item id>": "<category name>"}}'
    )
    data = await _ask_json(SYSTEM, prompt)
    cats = [str(c).strip() for c in (data.get("categories") or []) if str(c).strip()]
    if not cats:
        raise HTTPException(status_code=502, detail="Could not generate categories")
    raw_assign = data.get("assignments") or {}
    assignments: Dict[str, str] = {}
    for iid, _name in cleaned:
        chosen = str(raw_assign.get(iid, "")).strip()
        if chosen not in cats:
            chosen = cats[0]
        assignments[iid] = chosen
    return CategoriesResponse(categories=cats, assignments=assignments)


@api_router.post("/export/xlsx")
async def export_xlsx(req: ExportRequest):
    buf = build_workbook(req)
    slug = re.sub(r"[^a-z0-9]+", "-", (req.business_name or "sat").lower()).strip("-") or "sat"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{slug}-assumptions.xlsx"'},
    )


# --------------------------------------------------------------------------
# Borrower files: lender creates a private file, borrower fills it in.
# Three personas live in strictly separate code paths from the practice demo.
# --------------------------------------------------------------------------

ADMIN_PASSCODE = os.environ.get("SAT_ADMIN_PASSCODE") or ""
MAX_STATE_BYTES = 1_000_000
RATE_LIMIT_FAILS_PER_HOUR = 10
_fail_attempts: Dict[str, List[float]] = defaultdict(list)

if not ADMIN_PASSCODE:
    logger.warning(
        "SAT_ADMIN_PASSCODE is not set. Admin routes are disabled and will return 503 "
        "until the environment variable is configured."
    )

NOT_FOUND = HTTPException(status_code=404, detail="This link is not valid")


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    recent = [t for t in _fail_attempts[ip] if now - t < 3600]
    _fail_attempts[ip] = recent
    if len(recent) >= RATE_LIMIT_FAILS_PER_HOUR:
        raise HTTPException(status_code=429, detail="Too many attempts, try again later")


def _record_fail(ip: str) -> None:
    _fail_attempts[ip].append(time.time())


def require_admin(request: Request) -> bool:
    if not ADMIN_PASSCODE:
        raise HTTPException(status_code=503, detail="Admin access is not configured")
    ip = _client_ip(request)
    _check_rate_limit(ip)
    header = request.headers.get("x-admin-passcode", "")
    if not hmac.compare_digest(header, ADMIN_PASSCODE):
        _record_fail(ip)
        raise HTTPException(status_code=401, detail="Invalid passcode")
    return True


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_out(doc: Dict[str, Any], include_state: bool, borrower_view: bool = False) -> Dict[str, Any]:
    out = {
        "id": doc["_id"],
        "business_name": doc.get("business_name", ""),
        "owner_name": doc.get("owner_name", ""),
        "borrower_email": doc.get("borrower_email", ""),
        "status": doc.get("status", "not_started"),
        "needs_review": doc.get("needs_review", False),
        "created_at": doc.get("created_at"),
        "first_opened_at": doc.get("first_opened_at"),
        "last_saved_at": doc.get("last_saved_at"),
        "submitted_at": doc.get("submitted_at"),
        "last_submitted_at": doc.get("last_submitted_at"),
        "reopened_at": doc.get("reopened_at"),
    }
    if not borrower_view:
        out["token"] = doc.get("token")
    if include_state:
        out["state"] = doc.get("state", {})
    return out


def _submit_valid(state: Dict[str, Any]) -> bool:
    for i in (state.get("items") or []):
        name = (i.get("name") or "").strip()
        try:
            price = float(i.get("price") or 0)
        except (TypeError, ValueError):
            price = 0.0
        units = i.get("units") or []
        has_units = False
        for u in units:
            try:
                if float(u or 0) > 0:
                    has_units = True
                    break
            except (TypeError, ValueError):
                continue
        if name and price > 0 and has_units:
            return True
    return False


class BorrowerFileCreate(BaseModel):
    business_name: str
    owner_name: Optional[str] = ""
    borrower_email: str


class BorrowerFileSave(BaseModel):
    state: Dict[str, Any]
    business_name_override: Optional[str] = None


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@api_router.post("/admin/auth/check")
async def admin_auth_check(request: Request):
    require_admin(request)
    return {"ok": True}


@api_router.get("/admin/files")
async def admin_list_files(request: Request):
    require_admin(request)
    out: List[Dict[str, Any]] = []
    async for doc in db.borrower_files.find({}).sort("created_at", -1):
        out.append(_to_out(doc, include_state=False))
    return out


@api_router.post("/admin/files")
async def admin_create_file(request: Request, body: BorrowerFileCreate):
    require_admin(request)
    bn = (body.business_name or "").strip()
    email = (body.borrower_email or "").strip()
    if not bn:
        raise HTTPException(400, "Business name is required")
    if not _EMAIL_RE.match(email):
        raise HTTPException(400, "Enter a valid email address")
    now = _now_iso()
    doc = {
        "_id": str(uuid.uuid4()),
        "token": secrets.token_urlsafe(28),
        "business_name": bn,
        "owner_name": (body.owner_name or "").strip(),
        "borrower_email": email,
        "status": "not_started",
        "needs_review": False,
        "state": {"businessName": bn, "borrowerEmail": email},
        "created_at": now,
        "first_opened_at": None,
        "last_saved_at": None,
        "submitted_at": None,
        "last_submitted_at": None,
        "reopened_at": None,
    }
    await db.borrower_files.insert_one(doc)
    return _to_out(doc, include_state=False)


@api_router.post("/admin/files/{file_id}/mark-reviewed")
async def admin_mark_reviewed(request: Request, file_id: str):
    require_admin(request)
    r = await db.borrower_files.update_one({"_id": file_id}, {"$set": {"needs_review": False}})
    if not r.matched_count:
        raise HTTPException(404, "File not found")
    return {"ok": True}


@api_router.post("/admin/files/{file_id}/reopen")
async def admin_reopen(request: Request, file_id: str):
    require_admin(request)
    now = _now_iso()
    r = await db.borrower_files.update_one(
        {"_id": file_id, "status": "submitted"},
        {"$set": {"status": "in_progress", "reopened_at": now, "needs_review": False}},
    )
    if not r.matched_count:
        raise HTTPException(404, "Not a submitted file")
    return {"ok": True, "reopened_at": now}


@api_router.get("/borrower/{token}")
async def borrower_get(token: str):
    doc = await db.borrower_files.find_one({"token": token})
    if not doc:
        raise NOT_FOUND
    return _to_out(doc, include_state=True, borrower_view=True)


@api_router.put("/borrower/{token}")
async def borrower_save(token: str, body: BorrowerFileSave):
    try:
        payload_size = len(json.dumps(body.state).encode("utf-8"))
    except (TypeError, ValueError):
        raise HTTPException(400, "Invalid state payload")
    if payload_size > MAX_STATE_BYTES:
        raise HTTPException(413, "Saved state is too large")
    doc = await db.borrower_files.find_one({"token": token})
    if not doc:
        raise NOT_FOUND
    if doc.get("status") == "submitted":
        raise HTTPException(status_code=403, detail={"code": "already_submitted"})
    now = _now_iso()
    updates: Dict[str, Any] = {
        "state": body.state,
        "last_saved_at": now,
    }
    if doc.get("status") == "not_started":
        updates["status"] = "in_progress"
    if not doc.get("first_opened_at"):
        updates["first_opened_at"] = now
    bn = (body.business_name_override or "").strip()
    if bn:
        updates["business_name"] = bn
    await db.borrower_files.update_one({"_id": doc["_id"]}, {"$set": updates})
    merged = {**doc, **updates}
    return _to_out(merged, include_state=False, borrower_view=True)


@api_router.post("/borrower/{token}/submit")
async def borrower_submit(token: str):
    doc = await db.borrower_files.find_one({"token": token})
    if not doc:
        raise NOT_FOUND
    if doc.get("status") == "submitted":
        raise HTTPException(409, "Already submitted")
    if not _submit_valid(doc.get("state") or {}):
        raise HTTPException(
            400,
            "Add at least one product or service with a price and units before submitting.",
        )
    now = _now_iso()
    await db.borrower_files.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "status": "submitted",
            "submitted_at": now,
            "last_submitted_at": now,
            "needs_review": True,
        }},
    )
    return {"ok": True, "submitted_at": now}


app.include_router(api_router)


@app.middleware("http")
async def privacy_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/api/borrower") or path.startswith("/api/admin"):
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.on_event("startup")
async def _ensure_indexes():
    try:
        await db.borrower_files.create_index("token", unique=True)
        await db.borrower_files.create_index("status")
    except Exception as e:
        logger.warning("Could not ensure borrower_files indexes: %s", e)


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
