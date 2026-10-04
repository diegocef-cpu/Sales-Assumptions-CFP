import React, { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Percent, Info } from "lucide-react";
import { useSat } from "@/context/SatContext";
import { suggestAssumptions } from "@/lib/api";
import { num, fmtMoney, fmtPct } from "@/lib/model";
import { NumberCell } from "@/components/ui/NumberCell";

export default function StepCosts() {
  const { state, updateItem, totals } = useSat();
  const [busy, setBusy] = useState(null);
  const [aiLabeled, setAiLabeled] = useState({});

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
      updateItem(item.id, { unitCost: data.unit_cost });
      setAiLabeled((m) => ({ ...m, [item.id]: true }));
      toast.success(`Suggested direct cost for ${item.name}`);
    } catch (e) {
      toast.error("Suggestion failed, enter the cost manually");
    } finally {
      setBusy(null);
    }
  };

  const setTargetMargin = (item, pct) => updateItem(item.id, { unitCost: +(num(item.price) * (1 - pct)).toFixed(2) });

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
        Now the direct cost of delivering one unit: materials, stock you buy in, subcontractors, crew labor tied to the job,
        packaging, delivery, and payment fees.
      </p>

      <div
        data-testid="costs-overhead-note"
        className="my-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900"
      >
        <Info size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <p>
          <strong className="font-semibold">Leave out overhead costs</strong> like rent, office salaries, marketing, and insurance.
          Those are added further down in the cash flow.
        </p>
      </div>

      <div className="sat-card divide-y divide-slate-100 overflow-hidden">
        {state.items.map((it, i) => {
          const m = totals.perItem[it.id];
          const healthy = m?.marginPct >= 0.3;
          return (
            <div key={it.id} className="grid grid-cols-1 items-center gap-3 px-5 py-4 lg:grid-cols-[1fr_170px_auto_auto]">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{it.name || `Product / Service ${i + 1}`}</p>
                <p className="font-num text-xs text-slate-400">sells for {fmtMoney(it.price, 2)} / unit</p>
              </div>
              <div className="relative">
                <span className="font-num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
              <NumberCell
                data-testid={`cost-input-${i}`}
                decimals={2}
                className="sat-input font-num pl-7 text-right"
                placeholder="0.00"
                value={it.unitCost}
                onChange={(v) => updateItem(it.id, { unitCost: v })}
              />
              </div>
              <div className="flex items-center gap-2">
                {[0.4, 0.6].map((p) => (
                  <button
                    key={p}
                    data-testid={`cost-target-${p * 100}-${i}`}
                    onClick={() => setTargetMargin(it, p)}
                    className="sat-chip"
                    title={`Set cost for a ${p * 100}% margin`}
                  >
                    <Percent size={11} /> {p * 100}% margin
                  </button>
                ))}
                <button
                  data-testid={`ai-suggest-cost-${i}`}
                  onClick={() => suggest(it)}
                  disabled={busy === it.id}
                  className="sat-chip"
                >
                  {busy === it.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Suggest
                </button>
                {aiLabeled[it.id] && (
                  <span
                    data-testid={`cost-ai-label-${i}`}
                    className="rounded-full bg-[#f2f9ec] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#4a7a24]"
                  >
                    AI estimate, please verify
                  </span>
                )}
              </div>
              <span
                data-testid={`item-margin-${i}`}
                className={`font-num shrink-0 rounded-md px-2.5 py-1 text-right text-xs font-bold ${
                  healthy ? "bg-[#f2f9ec] text-[#3f6420]" : "bg-amber-50 text-amber-700"
                }`}
              >
                {fmtPct(m?.marginPct ?? 0)} margin
              </span>
            </div>
          );
        })}
      </div>

      <div className="sat-card overflow-hidden bg-slate-900 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Running gross margin, all {state.months} months, every product combined
          </span>
          <span className="font-num text-[11px] text-slate-500">revenue − direct costs = gross profit</span>
        </div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-4">
          {[
            {
              label: "Revenue",
              hint: `price × units, all ${state.months} months`,
              value: fmtMoney(totals.revenueTotal),
              testid: "running-revenue",
            },
            {
              label: "Direct costs",
              hint: "cost per unit × units",
              value: fmtMoney(totals.costTotal),
              testid: "running-costs",
            },
            {
              label: "Gross profit",
              hint: "revenue less direct costs",
              value: fmtMoney(totals.grossProfit),
              testid: "running-gross-profit",
            },
            {
              label: "Gross margin",
              hint: "gross profit ÷ revenue",
              value: fmtPct(totals.marginPct),
              testid: "running-margin",
              accent: true,
            },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
              <p
                data-testid={s.testid}
                className={`font-num mt-1.5 text-xl font-bold ${s.accent ? "text-[#a8e06f]" : "text-white"}`}
              >
                {s.value}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">{s.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
