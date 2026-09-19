import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSat } from "@/context/SatContext";

export default function StepCategories() {
  const { state, addCategory, updateCategory, removeCategory, updateItem } = useSat();

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
        Name your sales categories, then drop each product or service into one. A category can hold as many items as you need —
        this is what keeps a large catalogue readable in the projection.
      </p>

      <div className="sat-card p-5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sales categories</span>
        <div className="mt-3 space-y-2.5">
          {state.categories.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eef3e2] text-[11px] font-bold text-[#4a5d23]">
                {i + 1}
              </span>
              <input
                data-testid={`category-name-${i}`}
                className="sat-input py-1.5"
                value={c.name}
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
          ))}
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
            <li key={it.id} className="grid grid-cols-1 gap-3 border-b border-slate-100 px-5 py-3 last:border-0 sm:grid-cols-[1fr_240px]">
              <span className="truncate text-sm font-medium text-slate-800">{it.name || `Product / Service ${i + 1}`}</span>
              <select
                data-testid={`assign-category-${i}`}
                className="sat-input py-1.5"
                value={it.categoryId ?? ""}
                onChange={(e) => updateItem(it.id, { categoryId: e.target.value })}
              >
                {state.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
