import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, Loader2, Layers, Info } from "lucide-react";
import { useSat, CATEGORY_THRESHOLD } from "@/context/SatContext";
import { suggestCatalog } from "@/lib/api";

export default function StepCatalog() {
  const { state, addItem, addItems, updateItem, removeItem, update, loadPreset } = useSat();
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

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
      toast.success(data.rationale || "Suggested a starter catalogue — edit anything you like");
    } catch (e) {
      toast.error("Could not generate suggestions. Add your items manually.");
    } finally {
      setLoading(false);
    }
  };

  const overThreshold = state.items.length > CATEGORY_THRESHOLD;

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
            <button data-testid="ai-suggest-catalog-btn" onClick={runSuggest} disabled={loading} className="sat-btn-ghost whitespace-nowrap">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Suggest for me
            </button>
          </div>
        </div>
      </div>

      {state.items.length > 0 && (
        <div className="sat-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Your catalogue · <span data-testid="catalog-count">{state.items.length}</span> item
              {state.items.length === 1 ? "" : "s"}
            </span>
            <button data-testid="catalog-add-blank-btn" onClick={() => addItem("")} className="text-xs font-semibold text-[#4a7a24] hover:underline">
              + add blank row
            </button>
          </div>
          <ul>
            {state.items.map((it, i) => (
              <li key={it.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-2.5 last:border-0">
                <span className="font-num w-6 text-xs text-slate-400">{i + 1}</span>
                <input
                  data-testid={`catalog-item-name-${i}`}
                  className="sat-input py-1.5"
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
            ))}
          </ul>
        </div>
      )}

      {overThreshold && !state.useCategories && (
        <div data-testid="category-group-prompt" className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex gap-3">
            <Layers size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">That's more than {CATEGORY_THRESHOLD} items — let's group them.</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Lenders read a projection faster when similar products sit under sales categories. We'll add a grouping step next so
                each category can hold several products or services.
              </p>
              <button
                data-testid="enable-categories-btn"
                onClick={() => update({ useCategories: true })}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
              >
                <Layers size={14} /> Group into categories
              </button>
            </div>
          </div>
        </div>
      )}

      {!overThreshold && (
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <Info size={14} className="mt-0.5 shrink-0" />
          With {CATEGORY_THRESHOLD} items or fewer we skip category grouping and keep it simple.{" "}
          <button data-testid="optin-categories-btn" onClick={() => update({ useCategories: !state.useCategories })} className="font-semibold text-[#4a7a24] hover:underline">
            {state.useCategories ? "Skip grouping" : "Group anyway"}
          </button>
        </p>
      )}
    </div>
  );
}
