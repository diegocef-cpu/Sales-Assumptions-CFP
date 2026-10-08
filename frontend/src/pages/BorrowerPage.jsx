import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SatProvider } from "@/context/SatContext";
import { BorrowerCtx } from "@/context/BorrowerContext";
import { fetchBorrowerFile, saveBorrowerState, submitBorrower } from "@/lib/borrower";
import { usePrivatePage } from "@/hooks/usePrivatePage";
import { num } from "@/lib/model";
import InvalidLink from "@/pages/InvalidLink";
import Wizard from "@/pages/Wizard";
import Results from "@/pages/Results";
const DEBOUNCE_MS = 1000;
const RETRY_SCHEDULE = [2000, 4000, 8000, 15000, 30000];

const sameState = (a, b) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (e) {
    return false;
  }
};

export default function BorrowerPage() {
  usePrivatePage();
  const { token } = useParams();
  const [loadState, setLoadState] = useState("loading"); // loading | ready | not_found
  const [file, setFile] = useState(null);
  const [initialState, setInitialState] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchBorrowerFile(token);
        if (cancelled) return;
        const state = {
          ...(data.state || {}),
          // Lender's seed values survive even if the saved state is older.
          businessName: data.state?.businessName || data.business_name || "",
          borrowerEmail: data.borrower_email || "",
        };
        setFile(data);
        setInitialState(state);
        setLoadState("ready");
      } catch (err) {
        if (!cancelled) setLoadState("not_found");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loadState === "loading") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center">
        <span className="inline-flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={14} className="animate-spin" /> Opening your file...
        </span>
      </main>
    );
  }
  if (loadState === "not_found") return <InvalidLink />;

  return (
    <BorrowerSession token={token} file={file} initialState={initialState} setFile={setFile} />
  );
}

function BorrowerSession({ token, file, initialState, setFile }) {
  const readOnly = file.status === "submitted";
  const [saveStatus, setSaveStatus] = useState("idle");
  const [stale, setStale] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [canSubmit, setCanSubmit] = useState(() => {
    const items = initialState?.items || [];
    return items.some(
      (i) =>
        (i.name || "").trim() &&
        num(i.price) > 0 &&
        (i.units || []).some((u) => num(u) > 0),
    );
  });

  // Latest state kept in a ref so the retry loop always sees the newest payload.
  const latestRef = useRef(initialState);
  // Latest business name override: send the current wizard businessName (trimmed).
  const latestBnRef = useRef(file.business_name || "");

  const debounceRef = useRef(null);
  const retryRef = useRef(null);
  const inFlightRef = useRef(false);

  const clearTimers = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
  };

  const doSave = useCallback(
    async (attempt = 0) => {
      if (stale || readOnly) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setSaveStatus("saving");
      try {
        const stateSnapshot = latestRef.current;
        const bn = (latestBnRef.current || "").trim();
        const res = await saveBorrowerState(token, stateSnapshot, bn || null);
        inFlightRef.current = false;
        setSaveStatus("saved");
        // Reflect server-side timestamps + status in the header.
        setFile((prev) => (prev ? { ...prev, ...res } : prev));
      } catch (err) {
        inFlightRef.current = false;
        if (err?.response?.status === 403) {
          setStale(true);
          setSaveStatus("stale");
          clearTimers();
          return;
        }
        setSaveStatus("retrying");
        const delay = RETRY_SCHEDULE[Math.min(attempt, RETRY_SCHEDULE.length - 1)];
        retryRef.current = setTimeout(() => doSave(attempt + 1), delay);
      }
    },
    [token, stale, readOnly, setFile],
  );

  const scheduleSave = useCallback(() => {
    if (stale || readOnly) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus((s) => (s === "retrying" ? "retrying" : "saving"));
    debounceRef.current = setTimeout(() => doSave(0), DEBOUNCE_MS);
  }, [doSave, stale, readOnly]);

  const flushNow = useCallback(() => {
    if (stale || readOnly) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    doSave(0);
  }, [doSave, stale, readOnly]);

  useEffect(() => () => clearTimers(), []);

  // Called by SatProvider whenever the wizard state changes (never on initial mount).
  const onChange = useCallback(
    (next) => {
      if (readOnly) return;
      if (sameState(latestRef.current, next)) return;
      latestRef.current = next;
      latestBnRef.current = next?.businessName || "";
      const items = next?.items || [];
      setCanSubmit(
        items.some(
          (i) =>
            (i.name || "").trim() &&
            num(i.price) > 0 &&
            (i.units || []).some((u) => num(u) > 0),
        ),
      );
      scheduleSave();
    },
    [scheduleSave, readOnly],
  );

  const submit = useCallback(async () => {
    if (!canSubmit) {
      setSubmitError(
        "Add at least one product or service with a price and units before submitting.",
      );
      return;
    }
    setSubmitError(null);
    // Flush pending edits before the server-side validation runs.
    if (debounceRef.current || inFlightRef.current) {
      await new Promise((resolve) => {
        const wait = () => {
          if (inFlightRef.current || debounceRef.current) {
            setTimeout(wait, 100);
          } else resolve();
        };
        flushNow();
        wait();
      });
    }
    try {
      const res = await submitBorrower(token);
      setFile((prev) => (prev ? { ...prev, status: "submitted", submitted_at: res.submitted_at } : prev));
      toast.success("Submitted to your lender");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Could not submit, please try again";
      setSubmitError(typeof msg === "string" ? msg : "Could not submit, please try again");
      throw err;
    }
  }, [canSubmit, flushNow, token, setFile]);

  const ctxValue = useMemo(
    () => ({
      token,
      fileId: file.id,
      readOnly,
      saveStatus: stale ? "stale" : saveStatus,
      stale,
      submittedAt: file.submitted_at || file.last_submitted_at || null,
      borrowerEmail: file.borrower_email || "",
      submitError,
      submit,
      flushNow,
      canSubmit,
    }),
    [
      token,
      file.id,
      file.submitted_at,
      file.last_submitted_at,
      file.borrower_email,
      readOnly,
      saveStatus,
      stale,
      submitError,
      submit,
      flushNow,
      canSubmit,
    ],
  );

  return (
    <BorrowerCtx.Provider value={ctxValue}>
      <SatProvider persistKey={null} initialState={initialState} onChange={onChange}>
        {readOnly ? <Results /> : <Wizard />}
      </SatProvider>
    </BorrowerCtx.Provider>
  );
}
