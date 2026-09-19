import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Download, Pencil, ArrowLeft } from "lucide-react";
import { Shell } from "@/components/Shell";
import { AssumptionTable } from "@/components/AssumptionTable";
import { MarginDashboard } from "@/components/MarginDashboard";
import { useSat } from "@/context/SatContext";
import { buildCostCsv, buildSalesCsv, downloadCsv, fmtPct } from "@/lib/model";

export default function Results() {
  const navigate = useNavigate();
  const { state, totals } = useSat();

  const slug = (state.businessName || "sat").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const exportSales = () => {
    downloadCsv(`${slug}-sales-assumptions.csv`, buildSalesCsv(state, totals));
    toast.success("Sales assumptions exported");
  };
  const exportCost = () => {
    downloadCsv(`${slug}-cost-assumptions.csv`, buildCostCsv(state, totals));
    toast.success("Cost assumptions exported");
  };
  const exportBoth = () => {
    exportSales();
    setTimeout(exportCost, 400);
  };

  if (state.items.length === 0) {
    return (
      <Shell>
        <main className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-bold text-slate-900">Nothing to show yet</h1>
          <p className="mt-3 text-sm text-slate-600">Run the guided interview and your two assumption tables will appear here.</p>
          <button data-testid="results-start-wizard-btn" onClick={() => navigate("/wizard")} className="sat-btn-primary mx-auto mt-8">
            Start the guided interview
          </button>
        </main>
      </Shell>
    );
  }

  return (
    <Shell
      right={
        <>
          <button data-testid="edit-in-wizard-btn" onClick={() => navigate("/wizard")} className="sat-chip">
            <Pencil size={13} /> Edit in wizard
          </button>
          <button data-testid="export-csv-btn" onClick={exportBoth} className="sat-btn-primary py-2 text-xs">
            <Download size={14} /> Export both CSVs
          </button>
        </>
      }
    >
      <main className="mx-auto max-w-[96rem] space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <button onClick={() => navigate("/wizard")} className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
              <ArrowLeft size={13} /> back to the interview
            </button>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {state.businessName || "Your business"} — lender pack
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {state.industry || "Business"} · {state.months}-month horizon from {totals.labels[0]} · estimated gross margin{" "}
              <strong data-testid="header-margin" className="text-[#4a7a24]">{fmtPct(totals.marginPct)}</strong>
            </p>
          </div>
        </div>

        <MarginDashboard />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">1 · Sales assumptions</h2>
            <button data-testid="export-sales-csv-btn" onClick={exportSales} className="sat-chip">
              <Download size={12} /> Export sales CSV
            </button>
          </div>
          <AssumptionTable mode="sales" />
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">2 · Cost assumptions</h2>
            <button data-testid="export-cost-csv-btn" onClick={exportCost} className="sat-chip">
              <Download size={12} /> Export cost CSV
            </button>
          </div>
          <AssumptionTable mode="cost" />
          <p className="text-xs text-slate-500">
            Every cell above is editable — totals, gross profit and gross margin recalculate instantly.
          </p>
        </section>
      </main>
    </Shell>
  );
}
