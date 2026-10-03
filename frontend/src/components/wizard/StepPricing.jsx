import React, { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, BookOpen } from "lucide-react";
import { useSat } from "@/context/SatContext";
import { suggestAssumptions } from "@/lib/api";
import { fmtMoney } from "@/lib/model";
import { NumberCell } from "@/components/ui/NumberCell";

export default function StepPricing() {
  const { state, updateItem, setUnits } = useSat();
  const [busy, setBusy] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const suggest = async (item) => {
    setBusy(item.id);
    try {
      const data = await suggestAssumptions({
        industry: state.industry,
        businessModel: state.businessModel,
        itemName: item.name,
        months: state.months,
      });
      updateItem(item.id, { price: data.price, unitCost: data.unit_cost });
      if (data.units?.length) setUnits(item.id, data.units);
      setSuggestions((s) => [
        {
          id: item.id,
          name: item.name,
          price: data.price,
          unitCost: data.unit_cost,
          note: data.note,
          source: data.source,
        },
        ...s.filter((x) => x.id !== item.id),
      ]);
      toast.success(data.note || `Suggested pricing for ${item.name}`);
    } catch (e) {
      toast.error("Suggestion failed — enter the price manually");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
        Enter the price a customer pays for one unit — one bag, one hour, one job, one monthly plan. Not sure? Ask Sat for a
        typical figure for your industry and adjust it.
      </p>

      <div className="sat-card divide-y divide-slate-100 overflow-hidden">
        {state.items.map((it, i) => (
          <div key={it.id} className="grid grid-cols-1 items-center gap-3 px-5 py-4 sm:grid-cols-[1fr_180px_auto]">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{it.name || `Product / Service ${i + 1}`}</p>
              <p className="text-xs text-slate-400">{state.categories.find((c) => c.id === it.categoryId)?.name}</p>
            </div>
            <div className="relative">
              <span className="font-num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
              <NumberCell
                data-testid={`price-input-${i}`}
                decimals={2}
                className="sat-input font-num pl-7 text-right"
                placeholder="0.00"
                value={it.price}
                onChange={(v) => updateItem(it.id, { price: v })}
              />
            </div>
            <button
              data-testid={`ai-suggest-price-${i}`}
              onClick={() => suggest(it)}
              disabled={busy === it.id}
              className="sat-btn-ghost whitespace-nowrap px-3 py-2 text-xs"
            >
              {busy === it.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Suggest
            </button>
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div data-testid="price-suggestions-panel" className="sat-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <BookOpen size={14} className="text-[#4a7a24]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommended prices &amp; sources</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {suggestions.map((s) => (
              <li key={s.id} data-testid={`price-suggestion-${s.id}`} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">{s.name || "Product / Service"}</span>
                  <span className="font-num text-sm font-bold text-[#3f6420]">
                    recommended {fmtMoney(s.price, 2)} / unit
                    <span className="ml-2 font-normal text-slate-400">direct cost {fmtMoney(s.unitCost, 2)}</span>
                  </span>
                </div>
                {s.note && <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{s.note}</p>}
                <p className="mt-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Source:</span>{" "}
                  {s.source || "Claude Sonnet 4.6 estimate from general industry benchmarks"}
                </p>
              </li>
            ))}
          </ul>
          <p className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
            These are AI estimates based on published industry benchmarks, not a quote — confirm against your own invoices
            before sending the pack to a lender.
          </p>
        </div>
      )}
    </div>
  );
}
