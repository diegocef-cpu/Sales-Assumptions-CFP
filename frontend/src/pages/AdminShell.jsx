import React, { createContext, useContext, useState } from "react";
import { Loader2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { usePrivatePage } from "@/hooks/usePrivatePage";
import { checkPasscode } from "@/lib/admin";

const AdminAuthCtx = createContext(null);

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthCtx);
  if (!ctx) throw new Error("useAdminAuth must be used inside <AdminShell>");
  return ctx;
};

/**
 * Wraps every /admin route. Holds the passcode in component memory only, so a
 * refresh asks for it again and client-side navigation between admin pages
 * keeps the same unlocked session.
 */
export default function AdminShell({ children }) {
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
  return <AdminAuthCtx.Provider value={{ passcode }}>{children}</AdminAuthCtx.Provider>;
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
      if (code === 503) setErr("Admin access is not configured on the server.");
      else if (code === 429) setErr("Too many attempts. Try again later.");
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
