# Sat (Sales Assumptions Tool) — PRD

## Original problem statement
Build a web app that guides business owners through inputting sales and cost assumptions so a lender can use the output to build a cash flow projection. The data-entry flow must feel conversational and simple (guided step-by-step wizard, not a blank spreadsheet), inferring/suggesting assumptions where possible. 12-month default horizon. If the owner lists more than 10 products/services, prompt them to group into sales categories. Required deliverables: a Sales Assumptions table (categories/products as rows, sale price + monthly unit volumes as columns, matching the provided Google Sheets screenshot), a Cost Assumptions table (same structure, per-unit costs), and a dynamically updating Gross Margin estimate. Must work generically across industries (products, services or a mix).

## User choices (confirmed 2026-06)
- Storage: in-session only (React context + localStorage)
- Flow: step-by-step wizard with progress bar
- AI suggestions: yes, Emergent LLM key (Claude Sonnet 4.6)
- Export: CSV of both tables
- Design: white + green #7ac24a, branded "Sat"

## Architecture
- Frontend: React 19 (CRA/craco), react-router, Tailwind, shadcn primitives, recharts, sonner.
  - `src/context/SatContext.jsx` — single in-session store (flat `items[]` + `categories[]`), persisted to localStorage key `sat-session-v1`.
  - `src/lib/model.js` — all calculation logic: `computeTotals` (per-item/per-month revenue, cost, gross profit, margin, per-category shares, peak month), `applyPattern` (quick-fill volume patterns), `buildSalesCsv` / `buildCostCsv`.
  - `src/pages/` — Landing, Wizard, Results. `src/components/wizard/Step*.jsx` — one file per wizard step.
  - `src/components/AssumptionTable.jsx` — single spreadsheet component rendering both output tables (`mode="sales" | "cost"`).
- Backend: FastAPI (`/app/backend/server.py`), two AI endpoints using `emergentintegrations` LlmChat with `anthropic / claude-sonnet-4-6`:
  - `POST /api/ai/suggest-catalog` → starter catalogue with categories, prices, per-unit costs, seasonal monthly volumes.
  - `POST /api/ai/suggest-assumptions` → price, unit cost and monthly volumes for a single named item.
- No database use for projections (by user choice); MongoDB client remains configured but unused.

## User personas
1. **Business owner / borrower** — non-financial, needs to answer plain questions and get lender-ready numbers.
2. **Lender / underwriter** — consumes the two CSV tables and the gross margin snapshot to build a cash flow projection.

## Core requirements (static)
- Guided question-based flow, never a raw blank grid.
- Adaptive: categorization step appears only when > 10 items (or opted into).
- Industry-agnostic fields (product / service / mix / subscription).
- Sales Assumptions table + Cost Assumptions table + live Gross Margin.
- Calculations recompute on every edit.

## Implemented (2026-06-19)- Landing page with industry quick-start presets and live mini-table preview.
- 6–7 step wizard with progress bar and step pills: Business profile → What you sell → (Grouping, conditional) → Prices → Volumes → Costs → Review. Per-step blocking validation.
- AI "Suggest for me" at catalogue level and per item on Prices / Volumes / Costs steps.
- Quick-fill volume patterns: flat, 5% monthly growth, ramp up, Q4 peak, summer surge; plus editable 12-month cells with a live revenue row.
- Per-unit cost entry with 40% / 60% target-margin helpers and a running gross margin bar.
- Review step with revenue / cost / gross profit / margin KPIs and consistency warnings.
- Results page: 5 KPI cards, revenue-vs-cost area chart, category revenue donut, margin trend line, monthly gross profit bars.
- Both spreadsheet tables (dark headers, olive category bands, sticky name columns, 12 month columns, annual totals) with full inline editing; cost table adds Gross profit and Gross margin rows.
- CSV export: sales, cost, or both.
- Session persistence across reload and "Start over" reset.
- Tested end to end: `/app/test_reports/iteration_1.json` — backend 100%, frontend 100%.

## Added since (2026-06-19, iterations 2–3)
- Prices step: "Recommended prices & sources" panel — each AI suggestion is listed below the table with the recommended price, implied direct cost, reasoning and a cited benchmark/source (new `source` field on `/api/ai/suggest-assumptions`).
- Volumes step UX: labelled "Typical units sold per month" field + aligned "pick a pattern" row; patterns fall back to the first entered volume, amber highlight + toast when no base exists; per-item **Clear**, **Copy from "<previous item>"** and **Copy to all** buttons.
- "Q4 peak" replaced by **Winter surge** (boosts the real Dec/Jan/Feb calendar months, dips Jun–Aug).
- Projection length restricted to **12 months (microloans under $50K)** and **24 months (loans over $50K)**; 24-month horizon verified end to end.
- **Excel export**: `POST /api/export/xlsx` (openpyxl) builds a styled 3-sheet workbook — Summary, Sales Assumptions, Cost Assumptions (with Total revenue, Total direct costs, Gross profit and Gross margin rows, frozen panes, olive category bands). Downloaded from the Results header.
- Verified in `/app/test_reports/iteration_2.json` and `iteration_3.json` — backend 100%, frontend 100%.

## Fixed 2026-10-03
- **Number inputs no longer eat a leading "0"** — added `components/ui/NumberCell.jsx`, a controlled text input that keeps the raw typed string in local state while focused and commits the parsed number to shared state on every valid keystroke. Allows `0`, `0.`, `0.3`, `0.35`, `.5`, etc. Decimals capped at 2 for price/cost fields, 0 for unit fields. Wired into `AssumptionTable`, `StepPricing`, `StepCosts`, `StepVolumes`. Verified by scripted screenshot run.
- **Decimal units** — volume cells (`AssumptionTable` sales rows and `StepVolumes`) now allow 2 decimals (e.g. 1.5). `applyPattern` in `lib/model.js` rounds to 2 decimals instead of `Math.round` so quick-fill patterns preserve fractional volumes. The "typical units sold per month" base input now accepts `step="0.01"`.
- **Require item names** — "What you sell" step blocks Continue if any item has a blank/whitespace name ("Give every item a name to continue"); empty rows get an amber highlight. Rows are never silently deleted when their name is cleared.
- **AI suggestion labels + removed benchmark text** — every "Suggest" button (catalog, price, cost, volumes, categories) now shows a small "AI estimate, please verify" / "AI suggestion, please review and edit" badge after a successful call. The "Recommended prices & sources" panel in `StepPricing` was removed because the AI-named sources were unreliable; the backend `source` field is still returned but no longer displayed.
- **Required grouping step + AI-suggested categories** — `CATEGORY_THRESHOLD` gating removed; the Grouping step is always shown. New blank sessions start with a single empty-named category. Added backend `POST /api/ai/suggest-categories` (industry + business model + item names → 1–4 short category names and a per-item assignment). The step has a "Suggest categories" button that fills in names and assignments; if the owner already renamed categories or assigned items it asks for confirmation before overwriting. Continue is blocked until every category has a name ("Give every category a name to continue"). Example placeholders ("Entrees", "Desserts", "Drinks") show in the name boxes.

## Backlog
### P0
- None outstanding.
### P1
- Multiple saved scenarios / side-by-side comparison (needs persistence).
- Overheads + fixed cost step to produce a full cash flow projection, not just gross margin.
- Custom seasonality (owner marks their own busy/quiet months).
### P2
- Shareable read-only link for the lender.
- Import an existing spreadsheet to pre-fill the catalogue.
- Currency selection beyond USD.
- Give recharts containers a fixed minHeight to silence initial -1 width warnings.

## Next tasks
1. Add overheads/fixed-costs step and a net cash flow view.
2. Add xlsx export.
3. Add scenario save/compare (requires moving state to MongoDB).
