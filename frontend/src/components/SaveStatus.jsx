import React from "react";
import { Check, Loader2, AlertTriangle, Lock } from "lucide-react";

const PALETTE = {
  idle: { icon: Check, text: "Saved", cls: "text-slate-400" },
  saving: { icon: Loader2, text: "Saving...", cls: "text-slate-500 animate-pulse" },
  saved: { icon: Check, text: "Saved", cls: "text-[#4a7a24]" },
  retrying: { icon: AlertTriangle, text: "Could not save, retrying", cls: "text-amber-600" },
  stale: { icon: Lock, text: "Submitted, reload to continue", cls: "text-slate-500" },
};

export const SaveStatus = ({ status }) => {
  const cfg = PALETTE[status] || PALETTE.idle;
  const Icon = cfg.icon;
  const spin = status === "saving";
  return (
    <span
      data-testid="save-status"
      data-status={status}
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${cfg.cls}`}
    >
      <Icon size={12} className={spin ? "animate-spin" : ""} />
      {cfg.text}
    </span>
  );
};

export default SaveStatus;
