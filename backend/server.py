from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import uuid
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

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


app.include_router(api_router)

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
