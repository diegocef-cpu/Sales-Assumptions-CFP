import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useSat } from "@/context/SatContext";
import { suggestCatalog } from "@/lib/api";

export default function StepCatalog() {
  const { state, addItem, addItems, updateItem, removeItem, loadPreset } = useSat();
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLabeled, setAiLabeled] = useState(false);

  const commitDraft = () => {
    const names = draft
      .split(/[,\n]/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (!names.length) return;
    addItems(names);
    setDraft("");
  };

  const runSuggest = async () => {
    if (!state.industry.trim()) {
      toast.error("Add your industry on the previous step first");
      return;
    }
    setLoading(true);
    try {
      const data = await suggestCatalog({
        industry: state.industry,
        businessModel: state.businessModel,
        description: state.description,
        months: state.months,
      });
      loadPreset({
        items: data.items.map((i) => ({
          name: i.name,
          category: i.category,
          price: i.price,
          unitCost: i.unit_cost,
          units: i.units,
        })),
      });
      setAiLabeled(true);
      toast.success("Suggested a starter catalogue — edit anything you like");
    } catch (e) {
      toast.error("Could not generate suggestions. Add your items manually.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sat-card p-5">
        <span className="text-sm font-semibold text-slate-800">List what you sell</span>
        <p className="mt-1 text-xs text-slate-500">
          One per line, or separate with commas. Products, services, packages — whatever you invoice for.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <textarea
            data-testid="catalog-input"
            rows={2}
            className="sat-input resize-none"
            placeholder="Signature blend retail bag&#10;Wholesale 5kg&#10;Barista training session"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitDraft();
            }}
          />
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <button data-testid="catalog-add-btn" onClick={commitDraft} className="sat-btn-primary whitespace-nowrap">
              <Plus size={16} /> Add
            </button>
            <button
              data-testid="ai-suggest-catalog-btn"
              onClick={runSuggest}
              disabled={loading}
              className="sat-btn-ghost whitespace-nowrap"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Suggest for me
            </button>
          </div>
        </div>
      </div>

      {state.items.length > 0 && (
        <div className="sat-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Your catalogue · <span data-testid="catalog-count">{state.items.length}</span> item
              {state.items.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-3">
              {aiLabeled && (
                <span
                  data-testid="catalog-ai-label"
                  className="rounded-full bg-[#f2f9ec] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#4a7a24]"
                >
                  AI estimate, please verify
                </span>
              )}
              <button
                data-testid="catalog-add-blank-btn"
                onClick={() => addItem("")}
                className="text-xs font-semibold text-[#4a7a24] hover:underline"
              >
                + add blank row
              </button>
            </div>
          </div>
          <ul>
            {state.items.map((it, i) => {
              const empty = !it.name.trim();
              return (
                <li
                  key={it.id}
                  data-testid={`catalog-row-${i}`}
                  className={`flex items-center gap-3 border-b border-slate-100 px-5 py-2.5 last:border-0 ${
                    empty ? "bg-amber-50/60" : ""
                  }`}
                >
                  <span className="font-num w-6 text-xs text-slate-400">{i + 1}</span>
                  <input
                    data-testid={`catalog-item-name-${i}`}
                    className={`sat-input py-1.5 ${empty ? "border-amber-400 ring-2 ring-amber-200" : ""}`}
                    value={it.name}
                    placeholder={`Product / Service ${i + 1}`}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                  />
                  <button
                    data-testid={`catalog-remove-${i}`}
                    onClick={() => removeItem(it.id)}
                    className="shrink-0 rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Remove"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
