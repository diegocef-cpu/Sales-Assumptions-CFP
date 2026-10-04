import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Download, Pencil, ArrowLeft, FileSpreadsheet, Loader2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { AssumptionTable } from "@/components/AssumptionTable";
import { MarginDashboard } from "@/components/MarginDashboard";
import { useSat } from "@/context/SatContext";
import { exportXlsx } from "@/lib/api";
import { buildCombinedCsv, buildCostCsv, buildSalesCsv, downloadBlob, downloadCsv, fmtPct } from "@/lib/model";

export default function Results() {
  const navigate = useNavigate();
  const { state, totals } = useSat();
  const [xlsxBusy, setXlsxBusy] = useState(false);

  const slug = (state.businessName || "sat").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const exportExcel = async () => {
    setXlsxBusy(true);
    try {
      const blob = await exportXlsx(state, totals.labels);
      downloadBlob(`${slug}-assumptions.xlsx`, blob);
      toast.success("Excel workbook downloaded");
    } catch (e) {
      toast.error("Excel export failed — try the CSV export");
    } finally {
      setXlsxBusy(false);
    }
  };

  const exportSales = () => {
    downloadCsv(`${slug}-sales-assumptions.csv`, buildSalesCsv(state, totals));
    toast.success("Sales assumptions CSV downloaded");
  };
  const exportCost = () => {
    downloadCsv(`${slug}-cost-assumptions.csv`, buildCostCsv(state, totals));
    toast.success("Cost assumptions CSV downloaded");
  };
  const exportBoth = () => {
    downloadCsv(`${slug}-all-assumptions.csv`, buildCombinedCsv(state, totals));
    toast.success("Sales + cost assumptions downloaded in one CSV");
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
          <button data-testid="export-csv-btn" onClick={exportBoth} className="sat-chip">
            <Download size={13} /> CSV (both tables)
          </button>
          <button data-testid="export-xlsx-btn" onClick={exportExcel} disabled={xlsxBusy} className="sat-btn-primary py-2 text-xs">
            {xlsxBusy ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Excel workbook
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

        {state.description && state.description.trim() && (
          <section
            data-testid="results-notes-card"
            className="sat-card border-l-4 border-l-[#7ac24a] bg-[#f8fbf2] p-5"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#4a7a24]">Your notes for your lender</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{state.description.trim()}</p>
          </section>
        )}

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
