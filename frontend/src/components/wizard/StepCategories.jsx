import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useSat } from "@/context/SatContext";
import { suggestCategories } from "@/lib/api";

const PLACEHOLDERS = ["Entrees", "Desserts", "Drinks", "Add-ons"];

export default function StepCategories() {
  const { state, addCategory, updateCategory, removeCategory, updateItem, applyCategorySuggestion } = useSat();
  const [loading, setLoading] = useState(false);
  const [aiLabeled, setAiLabeled] = useState(false);

  const hasEdits = () => {
    const named = state.categories.some((c) => c.name.trim() !== "");
    const multiple = state.categories.length > 1;
    const spread = new Set(state.items.map((i) => i.categoryId)).size > 1;
    return named || multiple || spread;
  };

  const runSuggest = async () => {
    const names = state.items.map((i) => i.name.trim()).filter(Boolean);
    if (!names.length) {
      toast.error("Add some items on the previous step first");
      return;
    }
    if (hasEdits() && !window.confirm("This will overwrite your current categories and item assignments. Continue?")) {
      return;
    }
    setLoading(true);
    try {
      const data = await suggestCategories({
        industry: state.industry,
        businessModel: state.businessModel,
        items: names,
      });
      applyCategorySuggestion({ categories: data.categories, assignments: data.assignments });
      setAiLabeled(true);
      toast.success("Suggested categories — review and edit as needed");
    } catch (e) {
      toast.error("Could not generate suggestions. Name your categories below.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
        Group similar items together, for example: Entrees, Desserts. If you only sell a few things, one category is fine. Just give
        it a name.
      </p>

      <div className="sat-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sales categories</span>
          <div className="flex items-center gap-3">
            {aiLabeled && (
              <span
                data-testid="categories-ai-label"
                className="rounded-full bg-[#f2f9ec] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#4a7a24]"
              >
                AI suggestion, please review and edit
              </span>
            )}
            <button
              data-testid="ai-suggest-categories-btn"
              onClick={runSuggest}
              disabled={loading}
              className="sat-btn-ghost whitespace-nowrap px-3 py-2 text-xs"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Suggest categories
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-2.5">
          {state.categories.map((c, i) => {
            const empty = !c.name.trim();
            return (
              <div key={c.id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eef3e2] text-[11px] font-bold text-[#4a5d23]">
                  {i + 1}
                </span>
                <input
                  data-testid={`category-name-${i}`}
                  className={`sat-input py-1.5 ${empty ? "border-amber-400 ring-2 ring-amber-200" : ""}`}
                  value={c.name}
                  placeholder={PLACEHOLDERS[i % PLACEHOLDERS.length]}
                  onChange={(e) => updateCategory(c.id, e.target.value)}
                />
                <button
                  data-testid={`category-remove-${i}`}
                  onClick={() => removeCategory(c.id)}
                  disabled={state.categories.length <= 1}
                  className="shrink-0 rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
        <button data-testid="add-category-btn" onClick={() => addCategory()} className="sat-btn-ghost mt-4 py-2 text-xs">
          <Plus size={14} /> Add category
        </button>
      </div>

      <div className="sat-card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Assign items
        </div>
        <ul>
          {state.items.map((it, i) => (
            <li
              key={it.id}
              className="grid grid-cols-1 gap-3 border-b border-slate-100 px-5 py-3 last:border-0 sm:grid-cols-[1fr_240px]"
            >
              <span className="truncate text-sm font-medium text-slate-800">{it.name || `Product / Service ${i + 1}`}</span>
              <select
                data-testid={`assign-category-${i}`}
                className="sat-input py-1.5"
                value={it.categoryId ?? ""}
                onChange={(e) => updateItem(it.id, { categoryId: e.target.value })}
              >
                {state.categories.map((c, ci) => (
                  <option key={c.id} value={c.id}>
                    {c.name || `Category ${ci + 1}`}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
