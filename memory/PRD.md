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

## Fixed 2026-10-04
- **Costs step copy & layout**: rewrote the intro paragraph (no em-dashes) and moved the overhead reminder into a separate amber info callout (`costs-overhead-note`) with a bold "Leave out overhead costs" lead-in.
- **Notes field flows into exports**: profile textarea renamed "Notes for your lender" (optional). Added `notes` to `ExportRequest`; Excel Summary now has a "Notes from the borrower" row with wrap_text and auto-sized row height (shows "None provided" when blank). `buildCombinedCsv` prepends a quoted "Notes from the borrower" row above the sales table when non-empty. Results page shows a small "Your notes for your lender" card when notes exist. Verified end-to-end via curl (xlsx) + screenshot (wizard + results).

## Fixed 2026-10-08: Borrower files MVP (Phase 1 of the saved-files plan)
- **Three strictly separated areas**: `/` (practice, localStorage only), `/b/:token` (borrower, server-backed), `/lender` (passcode-protected lender dashboard). Public app never writes to the DB; borrower/lender pages never load PostHog.
- **Backend**: new `borrower_files` collection; routes `POST /api/admin/auth/check`, `GET/POST /api/admin/files`, `POST /api/admin/files/{id}/mark-reviewed`, `POST /api/admin/files/{id}/reopen`, `GET /api/borrower/{token}`, `PUT /api/borrower/{token}` (403 after submit, 413 above 1 MB), `POST /api/borrower/{token}/submit` (server-side validates one item has name + price>0 + units>0). Admin auth is a constant-time compare on `SAT_ADMIN_PASSCODE` with 10-fail-per-hour rate-limit per real client IP (x-forwarded-for first value). Privacy middleware adds `X-Robots-Tag: noindex, nofollow` and `Referrer-Policy: no-referrer` on `/api/borrower/*` and `/api/admin/*`.
- **SatProvider refactor**: `persistKey`, `initialState`, and `onChange` props. Guard against hydrate-time autosave uses a JSON snapshot comparison that survives React 18 StrictMode's simulated remount.
- **BorrowerPage**: fetches the file, wraps SatProvider with `persistKey=null`, debounces saves at 1 s, exponential retry (2/4/8/15/30 s), flushes on step navigation and submit, 403 to "stale" state + banner, submit confirmation modal, server-validated submit; after submit the same URL renders Results in read-only mode (plain-text cells, no Edit button, "Submitted on [date]" marker). StepProfile adds a read-only "Your email" field in borrower mode. AssumptionTable collapses inputs to plain text when `borrower.readOnly`.
- **Lender dashboard**: passcode gate (memory-only, refresh asks again), create form (business name, owner name optional, borrower email light format check), new-link banner with Copy, filter chips (All / Needs review / Not started / In progress / Submitted), top-of-page "N need review" count, needs-review rows float to top with amber tint + chip, actions: Copy link / Mark reviewed / Reopen. Reopen keeps `last_submitted_at` as history and shows "Reopened [date]" in the Submitted column until the next submission.
- **Landing**: amber non-dismissible practice banner.
- **Privacy**: `usePrivatePage` hook injects noindex + no-referrer meta tags on borrower + lender pages; `index.html` wraps posthog init in a path check so the script never loads on `/b/*` or `/lender*`.
- **Business-name guard**: clearing the business-name field in the wizard never overwrites the lender's `business_name`; a non-empty override does.
- **No em-dashes** across any user-visible text (home, wizard, Results, lender, borrower).
- **No autosave on bare load**: file remains `not_started` with `first_opened_at=null` until the first real user edit.
- **Admin passcode**: `sat-lender-2026`, stored in `/app/backend/.env` as `SAT_ADMIN_PASSCODE`; recorded in `/app/memory/test_credentials.md`.
