import React, { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2, CopyPlus, Eraser } from "lucide-react";
import { useSat } from "@/context/SatContext";
import { suggestAssumptions } from "@/lib/api";
import { applyPattern, emptyUnits, monthLabels, num, fmtMoney } from "@/lib/model";

const PATTERNS = [
  { id: "flat", label: "Same every month" },
  { id: "growth", label: "Grow 5% / month" },
  { id: "rampup", label: "Ramp up" },
  { id: "q4", label: "Q4 peak" },
  { id: "summer", label: "Summer surge" },
];

export default function StepVolumes() {
  const { state, setUnit, setUnits, updateItem, totals } = useSat();
  const [base, setBase] = useState({});
  const [busy, setBusy] = useState(null);
  const [needBase, setNeedBase] = useState(null);

  const labels = monthLabels(state.startMonth, state.months);
  const startIdx = parseInt((state.startMonth || "2026-01").split("-")[1], 10) - 1;

  const fill = (item, pattern) => {
    const typed = num(base[item.id]);
    const existing = num((item.units || []).find((u) => num(u) > 0));
    const b = typed > 0 ? typed : existing;
    if (b <= 0) {
      setNeedBase(item.id);
      toast.error("Type a typical monthly volume in the box first, then pick a pattern");
      return;
    }
    setNeedBase(null);
    if (typed <= 0) setBase((s) => ({ ...s, [item.id]: String(b) }));
    setUnits(item.id, applyPattern(pattern, b, state.months, { startIdx, growth: 5 }));
    toast.success(`Filled all ${state.months} months for ${item.name || "this item"}`);
  };

  const suggest = async (item) => {
    setBusy(item.id);
    try {
      const data = await suggestAssumptions({
        industry: state.industry,
        businessModel: state.businessModel,
        itemName: item.name,
        months: state.months,
        price: num(item.price),
      });
      if (data.units?.length) setUnits(item.id, data.units);
      if (num(item.unitCost) === 0 && data.unit_cost) updateItem(item.id, { unitCost: data.unit_cost });
      toast.success(data.note || `Suggested monthly volumes for ${item.name}`);
    } catch (e) {
      toast.error("Suggestion failed — enter volumes manually");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
        Enter the quantity of units you expect to sell in the months you'll be paid. Use a quick pattern to fill all{" "}
        {state.months} months at once, then tweak individual cells.
      </p>

      {state.items.map((it, i) => (
        <div key={it.id} className="sat-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{it.name || `Product / Service ${i + 1}`}</p>
              <p className="font-num text-xs text-slate-500">
                {fmtMoney(it.price, 2)} / unit · {totals.perItem[it.id]?.unitsTotal.toLocaleString()} units ·{" "}
                <span className="font-semibold text-[#4a7a24]">{fmtMoney(totals.perItem[it.id]?.revTotal)}</span> revenue
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {i > 0 && (
                <button
                  data-testid={`volume-copy-above-${i}`}
                  onClick={() => {
                    const prev = state.items[i - 1];
                    setUnits(it.id, [...prev.units]);
                    toast.success(`Copied volumes from ${prev.name || `Product / Service ${i}`}`);
                  }}
                  className="sat-chip"
                  title={`Duplicate the monthly volumes entered for ${state.items[i - 1].name || "the item above"}`}
                >
                  <CopyPlus size={12} /> Copy from {state.items[i - 1].name ? `“${state.items[i - 1].name}”` : "above"}
                </button>
              )}
              <button
                data-testid={`volume-clear-${i}`}
                onClick={() => {
                  setUnits(it.id, emptyUnits(state.months));
                  setBase((s) => ({ ...s, [it.id]: "" }));
                }}
                className="sat-chip"
              >
                <Eraser size={12} /> Clear
              </button>
              <button
                data-testid={`ai-suggest-volume-${i}`}
                onClick={() => suggest(it)}
                disabled={busy === it.id}
                className="sat-chip"
              >
                {busy === it.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Suggest volumes
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border-b border-slate-200 bg-white px-5 py-4">
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Typical units sold per month
              </span>
              <input
                data-testid={`volume-base-${i}`}
                type="number"
                min="0"
                className={`sat-input font-num mt-1.5 w-36 py-1.5 text-right ${
                  needBase === it.id ? "border-amber-400 ring-2 ring-amber-200" : ""
                }`}
                placeholder="e.g. 120"
                value={base[it.id] ?? ""}
                onChange={(e) => {
                  setNeedBase(null);
                  setBase((b) => ({ ...b, [it.id]: e.target.value }));
                }}
              />
            </label>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Then pick a pattern to fill all {state.months} months
              </span>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {PATTERNS.map((p) => (
                  <button key={p.id} data-testid={`volume-pattern-${p.id}-${i}`} onClick={() => fill(it, p.id)} className="sat-chip">
                    <Wand2 size={12} /> {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  {labels.map((l) => (
                    <th key={l} className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wider">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {labels.map((l, m) => (
                    <td key={l} className="border-b border-slate-100 px-1 py-1.5">
                      <input
                        data-testid={`volume-cell-${i}-${m}`}
                        type="number"
                        min="0"
                        className="sat-cell-input"
                        value={num(it.units[m]) === 0 ? "" : it.units[m]}
                        placeholder="0"
                        onChange={(e) => setUnit(it.id, m, num(e.target.value))}
                      />
                    </td>
                  ))}
                </tr>
                <tr className="bg-[#f2f9ec]">
                  {labels.map((l, m) => (
                    <td key={l} className="font-num px-2 py-1.5 text-right text-[10px] text-[#3f6420]">
                      {fmtMoney(totals.perItem[it.id]?.revenue[m] ?? 0)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
