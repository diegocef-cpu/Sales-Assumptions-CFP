import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, CheckCircle2, RefreshCw, Plus } from "lucide-react";
import { Shell } from "@/components/Shell";
import { usePrivatePage } from "@/hooks/usePrivatePage";
import {
  checkPasscode,
  listFiles,
  createFile as createFileApi,
  markReviewed as markReviewedApi,
  reopenFile as reopenFileApi,
} from "@/lib/admin";

const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "needs_review", label: "Needs review" },
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
];

const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return iso;
  }
};

const submittedCell = (f) => {
  if (f.status === "submitted") return fmtDate(f.last_submitted_at || f.submitted_at);
  if (f.status === "in_progress" && f.reopened_at && (!f.last_submitted_at || f.reopened_at > f.last_submitted_at)) {
    return `Reopened ${fmtDate(f.reopened_at)}`;
  }
  return "";
};

export default function LenderDashboard() {
  usePrivatePage();
  const [passcode, setPasscode] = useState("");
  const [authed, setAuthed] = useState(false);

  if (!authed) {
    return (
      <Shell showStartOver={false}>
        <PasscodeGate
          passcode={passcode}
          setPasscode={setPasscode}
          onAuthed={() => setAuthed(true)}
        />
      </Shell>
    );
  }
  return (
    <Shell showStartOver={false}>
      <Dashboard passcode={passcode} />
    </Shell>
  );
}

function PasscodeGate({ passcode, setPasscode, onAuthed }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!passcode) return;
    setBusy(true);
    setErr("");
    try {
      await checkPasscode(passcode);
      onAuthed();
    } catch (e) {
      const code = e?.response?.status;
      if (code === 429) setErr("Too many attempts. Try again later.");
      else setErr("That passcode did not match. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-4">
      <form onSubmit={submit} className="sat-card w-full p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Lender passcode</h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter the shared passcode to open the lender dashboard. A refresh will ask for it again.
        </p>
        <label className="mt-5 block">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Passcode</span>
          <input
            data-testid="lender-passcode-input"
            type="password"
            autoFocus
            className="sat-input mt-2"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
        </label>
        {err && (
          <p data-testid="lender-passcode-error" className="mt-3 text-xs text-amber-700">
            {err}
          </p>
        )}
        <button
          data-testid="lender-passcode-submit"
          type="submit"
          disabled={busy || !passcode}
          className="sat-btn-primary mt-5 w-full"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : null} Continue
        </button>
      </form>
    </main>
  );
}

function Dashboard({ passcode }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [newest, setNewest] = useState(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await listFiles(passcode);
      setFiles(data);
    } catch (e) {
      toast.error("Could not load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needsReviewCount = useMemo(() => files.filter((f) => f.needs_review).length, [files]);

  const visible = useMemo(() => {
    const list = files.filter((f) => {
      if (filter === "all") return true;
      if (filter === "needs_review") return f.needs_review;
      return f.status === filter;
    });
    // Needs-review rows float to the top (then by created_at desc).
    return [...list].sort((a, b) => {
      if (a.needs_review !== b.needs_review) return a.needs_review ? -1 : 1;
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
  }, [files, filter]);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">Lender dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a private file for a borrower, share the link, and watch it move to submitted.
        </p>
        {needsReviewCount > 0 && (
          <p
            data-testid="needs-review-count"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
          >
            {needsReviewCount} need review
          </p>
        )}
      </div>

      <CreateForm
        passcode={passcode}
        onCreated={(doc) => {
          setFiles((prev) => [doc, ...prev]);
          setNewest(doc);
        }}
      />

      {newest && (
        <NewLink file={newest} onDismiss={() => setNewest(null)} />
      )}

      <section className="sat-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                data-testid={`filter-${f.value}`}
                onClick={() => setFilter(f.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === f.value ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            data-testid="refresh-files-btn"
            onClick={refresh}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-white text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3">Business</th>
              <th className="px-3 py-3">Owner / Email</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Submitted</th>
              <th className="px-3 py-3">Link</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                  No files to show. Create one above.
                </td>
              </tr>
            )}
            {visible.map((f) => (
              <FileRow
                key={f.id}
                file={f}
                passcode={passcode}
                onUpdated={(patch) =>
                  setFiles((prev) => prev.map((p) => (p.id === f.id ? { ...p, ...patch } : p)))
                }
              />
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function CreateForm({ passcode, onCreated }) {
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canCreate = businessName.trim() && emailOk;

  const submit = async (e) => {
    e.preventDefault();
    if (!canCreate) return;
    setBusy(true);
    try {
      const doc = await createFileApi(passcode, {
        business_name: businessName.trim(),
        owner_name: ownerName.trim(),
        borrower_email: email.trim(),
      });
      onCreated(doc);
      setBusinessName("");
      setOwnerName("");
      setEmail("");
      toast.success("File created. Copy the link below.");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Could not create file";
      toast.error(typeof msg === "string" ? msg : "Could not create file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="sat-card p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Create a new file</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Business name</span>
          <input
            data-testid="create-business-name"
            className="sat-input mt-1"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Owner name <span className="text-slate-400">optional</span></span>
          <input
            data-testid="create-owner-name"
            className="sat-input mt-1"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Borrower email</span>
          <input
            data-testid="create-borrower-email"
            type="email"
            className="sat-input mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex items-center justify-end">
        <button
          data-testid="create-file-btn"
          type="submit"
          disabled={!canCreate || busy}
          className="sat-btn-primary py-2"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create file
        </button>
      </div>
    </form>
  );
}

function NewLink({ file, onDismiss }) {
  const url = `${window.location.origin}/b/${file.token}`;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error("Copy failed, please select and copy manually.");
    }
  };
  return (
    <div
      data-testid="new-link-banner"
      className="sat-card border-l-4 border-l-[#7ac24a] bg-[#f8fbf2] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#4a7a24]">
            Link for {file.business_name}
          </p>
          <p className="font-num mt-1 truncate text-xs text-slate-700">{url}</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="copy-new-link" onClick={copy} className="sat-chip">
            {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={onDismiss} className="text-xs font-semibold text-slate-400 hover:text-slate-700">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function FileRow({ file: f, passcode, onUpdated }) {
  const url = `${window.location.origin}/b/${f.token}`;
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error("Copy failed");
    }
  };
  const onMarkReviewed = async () => {
    setBusy(true);
    try {
      await markReviewedApi(passcode, f.id);
      onUpdated({ needs_review: false });
      toast.success("Marked reviewed");
    } catch (e) {
      toast.error("Could not update");
    } finally {
      setBusy(false);
    }
  };
  const onReopen = async () => {
    if (!window.confirm("Reopen this file? The borrower can edit it again.")) return;
    setBusy(true);
    try {
      const r = await reopenFileApi(passcode, f.id);
      onUpdated({ status: "in_progress", needs_review: false, reopened_at: r.reopened_at });
      toast.success("File reopened");
    } catch (e) {
      toast.error("Could not reopen");
    } finally {
      setBusy(false);
    }
  };

  const rowTint = f.needs_review ? "bg-amber-50/70" : "";
  return (
    <tr data-testid={`file-row-${f.id}`} className={`border-b border-slate-100 ${rowTint}`}>
      <td className="px-5 py-3 align-top">
        <p className="text-sm font-semibold text-slate-800">{f.business_name}</p>
        {f.needs_review && (
          <span
            data-testid={`needs-review-chip-${f.id}`}
            className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800"
          >
            Needs review
          </span>
        )}
      </td>
      <td className="px-3 py-3 align-top text-xs text-slate-600">
        {f.owner_name && <p>{f.owner_name}</p>}
        <p className="text-slate-400">{f.borrower_email}</p>
      </td>
      <td className="px-3 py-3 align-top text-xs">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            f.status === "submitted"
              ? "bg-[#f2f9ec] text-[#3f6420]"
              : f.status === "in_progress"
                ? "bg-blue-50 text-blue-700"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {STATUS_LABEL[f.status]}
        </span>
      </td>
      <td className="px-3 py-3 align-top text-xs text-slate-600">{submittedCell(f)}</td>
      <td className="px-3 py-3 align-top">
        <button data-testid={`copy-link-${f.id}`} onClick={copy} className="sat-chip py-1 text-[11px]">
          {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy link"}
        </button>
      </td>
      <td className="px-5 py-3 align-top text-right">
        <div className="flex flex-wrap justify-end gap-2">
          {f.needs_review && (
            <button
              data-testid={`mark-reviewed-${f.id}`}
              onClick={onMarkReviewed}
              disabled={busy}
              className="sat-chip py-1 text-[11px]"
            >
              Mark reviewed
            </button>
          )}
          {f.status === "submitted" && (
            <button
              data-testid={`reopen-${f.id}`}
              onClick={onReopen}
              disabled={busy}
              className="sat-chip py-1 text-[11px]"
            >
              Reopen
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
