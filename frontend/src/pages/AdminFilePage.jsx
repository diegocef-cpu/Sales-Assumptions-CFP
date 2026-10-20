import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Undo2,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { SatProvider } from "@/context/SatContext";
import { BorrowerCtx } from "@/context/BorrowerContext";
import { AssumptionTable } from "@/components/AssumptionTable";
import { MarginDashboard } from "@/components/MarginDashboard";
import { useSat } from "@/context/SatContext";
import { useAdminAuth } from "@/pages/AdminShell";
import { getFile, markReviewed as markReviewedApi, reopenFile as reopenFileApi } from "@/lib/admin";
import { exportXlsx } from "@/lib/api";
import {
  buildCombinedCsv,
  buildCostCsv,
  buildSalesCsv,
  downloadBlob,
  downloadCsv,
  fmtMoney,
  fmtPct,
} from "@/lib/model";

const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
};

const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  } catch (e) {
    return iso;
  }
};

export default function AdminFilePage() {
  const { passcode } = useAdminAuth();
  const { id } = useParams();
  const [file, setFile] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | not_found

  const refresh = useCallback(async () => {
    try {
      const data = await getFile(passcode, id);
      setFile(data);
      setState("ready");
    } catch (err) {
      setState("not_found");
    }
  }, [passcode, id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (state === "loading") {
    return (
      <Shell showStartOver={false}>
        <main className="mx-auto flex min-h-[40vh] max-w-md items-center justify-center">
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={14} className="animate-spin" /> Loading file...
          </span>
        </main>
      </Shell>
    );
  }

  if (state === "not_found") {
    return (
      <Shell showStartOver={false}>
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-slate-900">File not found</h1>
          <p className="mt-3 text-sm text-slate-500">
            This file no longer exists or the ID is wrong.
          </p>
          <Link to="/admin" className="mt-6 inline-block text-sm font-semibold text-[#4a7a24] hover:underline">
            Back to list
          </Link>
        </main>
      </Shell>
    );
  }

  return (
    <Shell showStartOver={false}>
      <FileView file={file} passcode={passcode} onFileChange={(patch) => setFile((prev) => ({ ...prev, ...patch }))} />
    </Shell>
  );
}

function FileView({ file, passcode, onFileChange }) {
  const navigate = useNavigate();
  const initialState = useMemo(() => file.state || {}, [file.state]);

  // Read-only borrower-style context so AssumptionTable + MarginDashboard
  // render in their submitted view (no inputs).
  const ctxValue = useMemo(
    () => ({
      token: null,
      fileId: file.id,
      readOnly: true,
      saveStatus: "idle",
      stale: false,
      submittedAt: file.submitted_at || file.last_submitted_at || null,
      borrowerEmail: file.borrower_email || "",
      submitError: null,
      submit: async () => {},
      flushNow: () => {},
      canSubmit: false,
    }),
    [file.id, file.submitted_at, file.last_submitted_at, file.borrower_email],
  );

  return (
    <BorrowerCtx.Provider value={ctxValue}>
      <SatProvider persistKey={null} initialState={initialState}>
        <main className="mx-auto max-w-[96rem] space-y-8 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <Link
              to="/admin"
              data-testid="back-to-list"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={13} /> Back to list
            </Link>
          </div>

          <FileHeader file={file} passcode={passcode} onFileChange={onFileChange} />

          <FileBody file={file} />
        </main>
      </SatProvider>
    </BorrowerCtx.Provider>
  );
}

function FileHeader({ file, passcode, onFileChange }) {
  const [busy, setBusy] = useState(null);

  const showReopenMarker =
    file.status === "in_progress" &&
    file.reopened_at &&
    (!file.last_submitted_at || file.reopened_at > file.last_submitted_at);

  const markReviewed = async () => {
    setBusy("review");
    try {
      const r = await markReviewedApi(passcode, file.id);
      onFileChange({ needs_review: false, reviewed_at: r.reviewed_at });
      toast.success("Marked reviewed");
    } catch (e) {
      toast.error("Could not update");
    } finally {
      setBusy(null);
    }
  };

  const reopen = async () => {
    if (!window.confirm("Reopen this file? The borrower will be able to edit it again. Their current answers stay.")) {
      return;
    }
    setBusy("reopen");
    try {
      const r = await reopenFileApi(passcode, file.id);
      onFileChange({
        status: "in_progress",
        needs_review: false,
        reviewed_at: null,
        reopened_at: r.reopened_at,
      });
      toast.success("File reopened");
    } catch (e) {
      toast.error("Could not reopen");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="sat-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 data-testid="file-business-name" className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {file.business_name || "Untitled"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {file.owner_name ? `${file.owner_name} · ` : ""}
            <span className="text-slate-400">{file.borrower_email}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              data-testid="file-status-chip"
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                file.status === "submitted"
                  ? "bg-[#f2f9ec] text-[#3f6420]"
                  : file.status === "in_progress"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {STATUS_LABEL[file.status]}
            </span>
            {file.status === "submitted" && (file.submitted_at || file.last_submitted_at) && (
              <span
                data-testid="file-submitted-marker"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f9ec] px-2.5 py-0.5 text-[11px] font-semibold text-[#3f6420]"
              >
                <CheckCircle2 size={11} /> Submitted on {fmtDate(file.submitted_at || file.last_submitted_at)}
              </span>
            )}
            {showReopenMarker && (
              <span
                data-testid="file-reopened-marker"
                className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700"
              >
                Reopened {fmtDate(file.reopened_at)}
              </span>
            )}
            {file.reviewed_at && (
              <span
                data-testid="file-reviewed-marker"
                className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700"
              >
                Reviewed on {fmtDate(file.reviewed_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          {file.status === "submitted" ? (
            <>
              {file.needs_review && (
                <button
                  data-testid="file-mark-reviewed-btn"
                  onClick={markReviewed}
                  disabled={busy === "review"}
                  className="sat-chip"
                >
                  {busy === "review" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Mark reviewed
                </button>
              )}
              <button
                data-testid="file-reopen-btn"
                onClick={reopen}
                disabled={busy === "reopen"}
                className="sat-chip"
              >
                {busy === "reopen" ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />}
                Reopen
              </button>
            </>
          ) : (
            <p data-testid="file-not-submitted-note" className="max-w-xs text-right text-xs text-slate-500">
              Not submitted yet. This is the borrower's current progress.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function FileBody({ file }) {
  // Pull totals from SatProvider so download buttons use the exact borrower numbers.
  const { state, totals } = useSat();
  const [xlsxBusy, setXlsxBusy] = useState(false);

  const notes = (state.description || "").trim();

  const exportBoth = () => {
    const csv = buildCombinedCsv(state, totals);
    downloadCsv(`${(state.businessName || "sat").toLowerCase().replace(/\s+/g, "-")}-assumptions.csv`, csv);
    toast.success("CSV downloaded");
  };

  const exportSales = () => {
    const csv = buildSalesCsv(state, totals);
    downloadCsv(`${(state.businessName || "sat").toLowerCase().replace(/\s+/g, "-")}-sales.csv`, csv);
  };

  const exportCosts = () => {
    const csv = buildCostCsv(state, totals);
    downloadCsv(`${(state.businessName || "sat").toLowerCase().replace(/\s+/g, "-")}-costs.csv`, csv);
  };

  const exportExcel = async () => {
    setXlsxBusy(true);
    try {
      const blob = await exportXlsx(state, totals.labels);
      const slug = (state.businessName || "sat").toLowerCase().replace(/\s+/g, "-");
      downloadBlob(`${slug}-assumptions.xlsx`, blob);
      toast.success("Excel workbook downloaded");
    } catch (e) {
      toast.error("Excel download failed");
    } finally {
      setXlsxBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600">
            {state.industry || "Business"} · {state.months}-month horizon from {totals.labels[0] || "–"} · estimated gross margin{" "}
            <strong data-testid="file-margin" className="text-[#4a7a24]">{fmtPct(totals.marginPct)}</strong>
          </p>
          <p className="font-num mt-1 text-xs text-slate-400">
            Revenue {fmtMoney(totals.revenue)} · direct costs {fmtMoney(totals.cost)} · gross profit {fmtMoney(totals.gross)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button data-testid="file-download-sales" onClick={exportSales} className="sat-chip">
            <Download size={13} /> Sales CSV
          </button>
          <button data-testid="file-download-costs" onClick={exportCosts} className="sat-chip">
            <Download size={13} /> Costs CSV
          </button>
          <button data-testid="file-download-combined" onClick={exportBoth} className="sat-chip">
            <Download size={13} /> Both tables
          </button>
          <button
            data-testid="file-download-xlsx"
            onClick={exportExcel}
            disabled={xlsxBusy}
            className="sat-btn-primary py-2 text-xs"
          >
            {xlsxBusy ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Excel workbook
          </button>
        </div>
      </div>

      <MarginDashboard />

      {notes && (
        <section
          data-testid="file-notes-card"
          className="sat-card border-l-4 border-l-[#7ac24a] bg-[#f8fbf2] p-5"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#4a7a24]">Borrower notes</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{notes}</p>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900">Sales assumptions</h2>
        <AssumptionTable mode="sales" />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900">Cost assumptions</h2>
        <AssumptionTable mode="cost" />
      </section>
    </>
  );
}
