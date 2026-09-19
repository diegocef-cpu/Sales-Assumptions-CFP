import React, { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { useSat } from "@/context/SatContext";
import { suggestAssumptions } from "@/lib/api";
import { applyPattern, monthLabels, num, fmtMoney } from "@/lib/model";

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

  const labels = monthLabels(state.startMonth, state.months);
  const startIdx = parseInt((state.startMonth || "2026-01").split("-")[1], 10) - 1;

  const fill = (item, pattern) => {
    const b = num(base[item.id]);
    if (b <= 0) {
      toast.error("Enter a typical monthly volume first");
      return;
    }
    setUnits(item.id, applyPattern(pattern, b, state.months, { startIdx, growth: 5 }));
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
              <input
                data-testid={`volume-base-${i}`}
                type="number"
                min="0"
                className="sat-input font-num w-28 py-1.5 text-right"
                placeholder="units / mo"
                value={base[it.id] ?? ""}
                onChange={(e) => setBase((b) => ({ ...b, [it.id]: e.target.value }))}
              />
              {PATTERNS.map((p) => (
                <button
                  key={p.id}
                  data-testid={`volume-pattern-${p.id}-${i}`}
                  onClick={() => fill(it, p.id)}
                  className="sat-chip"
                >
                  <Wand2 size={12} /> {p.label}
                </button>
              ))}
              <button
                data-testid={`ai-suggest-volume-${i}`}
                onClick={() => suggest(it)}
                disabled={busy === it.id}
                className="sat-chip"
              >
                {busy === it.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Suggest
              </button>
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
