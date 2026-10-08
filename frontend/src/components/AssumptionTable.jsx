import React, { useContext } from "react";
import { useSat } from "@/context/SatContext";
import { BorrowerCtx } from "@/context/BorrowerContext";
import { fmtMoney, fmtPct, num } from "@/lib/model";
import { NumberCell } from "@/components/ui/NumberCell";

/** Spreadsheet-style assumption table. mode: "sales" | "cost" */
export const AssumptionTable = ({ mode }) => {
  const { state, totals, updateItem, setUnit } = useSat();
  const borrower = useContext(BorrowerCtx);
  const readOnly = !!borrower?.readOnly;
  const isSales = mode === "sales";
  const priceKey = isSales ? "price" : "unitCost";

  return (
    <div data-testid={`${mode}-assumptions-table`} className="sat-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-3">
        <h3 data-testid={`${mode}-table-title`} className="font-display text-sm font-bold uppercase tracking-wider text-white">
          {isSales ? "Monthly sales projection" : "Monthly direct cost projection"}
        </h3>
        <p className="text-[11px] text-slate-400">
          {isSales
            ? "Enter quantity of units sold in the months you will be paid."
            : "Cost per unit × units sold = direct cost per month."}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="sticky left-0 z-20 min-w-[150px] bg-slate-800 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider">
                Sales category
              </th>
              <th className="sticky left-[150px] z-20 min-w-[200px] bg-slate-800 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider">
                Name of product or service
              </th>
              <th className="min-w-[110px] px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider">
                {isSales ? "Sales price ($)" : "Cost per unit ($)"}
              </th>
              {totals.labels.map((l) => (
                <th key={l} className="min-w-[74px] px-2 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider">
                  {l}
                </th>
              ))}
              <th className="min-w-[120px] bg-slate-900 px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider">
                {state.months === 12 ? "Annual" : `${state.months}-month`} {isSales ? "revenue" : "cost"} ($)
              </th>
            </tr>
          </thead>
          <tbody>
            {state.categories.map((cat) => {
              const catItems = state.items.filter((i) => i.categoryId === cat.id);
              if (!catItems.length) return null;
              const catTotal = catItems.reduce(
                (a, i) => a + (isSales ? totals.perItem[i.id].revTotal : totals.perItem[i.id].costTotal),
                0
              );
              return catItems.map((it, ri) => {
                const m = totals.perItem[it.id];
                return (
                  <tr key={it.id} className={ri % 2 ? "bg-slate-50/70" : "bg-white"}>
                    {ri === 0 && (
                      <td
                        rowSpan={catItems.length}
                        data-testid={`${mode}-category-cell-${cat.id}`}
                        className="sticky left-0 z-10 border-l-4 border-[#7ac24a] bg-[#eef3e2] px-3 py-2 align-top text-[11px] font-bold uppercase tracking-wide text-[#2d3b16]"
                      >
                        {cat.name}
                        <span className="font-num mt-1 block text-[10px] font-semibold normal-case tracking-normal text-[#4a5d23]">
                          {fmtMoney(catTotal)}
                        </span>
                      </td>
                    )}
                    <td
                      className={`sticky left-[150px] z-10 border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-700 ${
                        ri % 2 ? "bg-slate-50/95" : "bg-white"
                      }`}
                    >
                      {readOnly ? (
                        <span data-testid={`${mode}-name-${it.id}`} className="block py-1">
                          {it.name}
                        </span>
                      ) : (
                        <input
                          data-testid={`${mode}-name-${it.id}`}
                          className="w-full border-b border-transparent bg-transparent outline-none transition-colors hover:border-slate-300 focus:border-[#7ac24a]"
                          value={it.name}
                          onChange={(e) => updateItem(it.id, { name: e.target.value })}
                        />
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1">
                      {readOnly ? (
                        <span
                          data-testid={`${mode}-price-${it.id}`}
                          className="font-num block py-1 pr-2 text-right text-xs text-slate-700"
                        >
                          {fmtMoney(it[priceKey])}
                        </span>
                      ) : (
                        <NumberCell
                          data-testid={`${mode}-price-${it.id}`}
                          decimals={2}
                          className="sat-cell-input"
                          value={it[priceKey]}
                          placeholder="0.00"
                          onChange={(v) => updateItem(it.id, { [priceKey]: v })}
                        />
                      )}
                    </td>
                    {totals.labels.map((l, mi) =>
                      isSales ? (
                        <td key={l} className="border-b border-slate-100 px-1 py-1">
                          {readOnly ? (
                            <span
                              data-testid={`sales-units-${it.id}-${mi}`}
                              className="font-num block py-1 pr-1 text-right text-xs text-slate-700"
                            >
                              {num(it.units[mi]) ? it.units[mi] : "–"}
                            </span>
                          ) : (
                            <NumberCell
                              data-testid={`sales-units-${it.id}-${mi}`}
                              decimals={2}
                              className="sat-cell-input"
                              value={it.units[mi]}
                              placeholder="0"
                              onChange={(v) => setUnit(it.id, mi, v)}
                            />
                          )}
                        </td>
                      ) : (
                        <td
                          key={l}
                          data-testid={`cost-month-${it.id}-${mi}`}
                          className="font-num border-b border-slate-100 px-2 py-2 text-right text-xs text-slate-600"
                        >
                          {m.cost[mi] ? fmtMoney(m.cost[mi]) : "–"}
                        </td>
                      )
                    )}
                    <td
                      data-testid={`${mode}-item-total-${it.id}`}
                      className="font-num border-b border-slate-100 bg-[#f2f9ec] px-3 py-2 text-right text-xs font-bold text-[#3f6420]"
                    >
                      {fmtMoney(isSales ? m.revTotal : m.costTotal)}
                    </td>
                  </tr>
                );
              });
            })}

            <tr className="bg-slate-900 text-white">
              <td colSpan={2} className="sticky left-0 z-10 bg-slate-900 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider">
                Total {isSales ? "revenue" : "direct costs"} ($)
              </td>
              <td className="px-3 py-2.5" />
              {(isSales ? totals.monthlyRevenue : totals.monthlyCost).map((v, i) => (
                <td key={i} data-testid={`${mode}-month-total-${i}`} className="font-num px-2 py-2.5 text-right text-xs font-semibold">
                  {v ? fmtMoney(v) : "–"}
                </td>
              ))}
              <td data-testid={`${mode}-grand-total`} className="font-num bg-[#7ac24a] px-3 py-2.5 text-right text-sm font-bold text-white">
                {fmtMoney(isSales ? totals.revenueTotal : totals.costTotal)}
              </td>
            </tr>

            {!isSales && (
              <>
                <tr className="bg-[#eef3e2]">
                  <td colSpan={2} className="sticky left-0 z-10 bg-[#eef3e2] px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#2d3b16]">
                    Gross profit ($)
                  </td>
                  <td />
                  {totals.monthlyGP.map((v, i) => (
                    <td key={i} data-testid={`gross-profit-month-${i}`} className="font-num px-2 py-2.5 text-right text-xs font-semibold text-[#2d3b16]">
                      {v ? fmtMoney(v) : "–"}
                    </td>
                  ))}
                  <td data-testid="gross-profit-total" className="font-num px-3 py-2.5 text-right text-sm font-bold text-[#2d3b16]">
                    {fmtMoney(totals.grossProfit)}
                  </td>
                </tr>
                <tr className="bg-[#eef3e2] border-t border-[#cbe8af]">
                  <td colSpan={2} className="sticky left-0 z-10 bg-[#eef3e2] px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#2d3b16]">
                    Gross margin (%)
                  </td>
                  <td />
                  {totals.monthlyMarginPct.map((v, i) => (
                    <td key={i} data-testid={`gross-margin-month-${i}`} className="font-num px-2 py-2.5 text-right text-xs font-semibold text-[#4a5d23]">
                      {v ? fmtPct(v) : "–"}
                    </td>
                  ))}
                  <td data-testid="gross-margin-total" className="font-num px-3 py-2.5 text-right text-sm font-bold text-[#3f6420]">
                    {fmtPct(totals.marginPct)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
