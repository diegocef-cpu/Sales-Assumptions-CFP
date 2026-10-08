import React, { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { useSat } from "@/context/SatContext";
import { suggestAssumptions } from "@/lib/api";
import { NumberCell } from "@/components/ui/NumberCell";

export default function StepPricing() {
  const { state, updateItem, setUnits } = useSat();
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
      });
      updateItem(item.id, { price: data.price, unitCost: data.unit_cost });
      if (data.units?.length) setUnits(item.id, data.units);
      setAiLabeled((m) => ({ ...m, [item.id]: true }));
      toast.success(`Suggested pricing for ${item.name}`);
    } catch (e) {
      toast.error("Suggestion failed, enter the price manually");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
        Enter the price a customer pays for one unit, one bag, one hour, one job, one monthly plan. Not sure? Ask Sat for a
        typical figure for your industry and adjust it.
      </p>

      <div className="sat-card divide-y divide-slate-100 overflow-hidden">
        {state.items.map((it, i) => (
          <div key={it.id} className="grid grid-cols-1 items-center gap-3 px-5 py-4 sm:grid-cols-[1fr_180px_auto_auto]">
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
            {aiLabeled[it.id] ? (
              <span
                data-testid={`price-ai-label-${i}`}
                className="rounded-full bg-[#f2f9ec] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#4a7a24]"
              >
                AI estimate, please verify
              </span>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
