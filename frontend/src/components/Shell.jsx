import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sprout, RotateCcw } from "lucide-react";
import { useSat } from "@/context/SatContext";
import { BorrowerCtx } from "@/context/BorrowerContext";

export const Logo = ({ compact = false }) => (
  <Link to="/" data-testid="brand-logo" className="group flex items-center gap-2.5">
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7ac24a] text-white shadow-sm transition-transform group-hover:-rotate-6">
      <Sprout size={18} strokeWidth={2.5} />
    </span>
    <span className="leading-none">
      <span className="font-display block text-lg font-extrabold tracking-tight text-slate-900">Sat</span>
      {!compact && <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">sales assumptions tool</span>}
    </span>
  </Link>
);

const ResetButton = () => {
  const sat = useSatSafe();
  const navigate = useNavigate();
  if (!sat) return null;
  const onReset = () => {
    sat.reset();
    navigate("/");
  };
  return (
    <button data-testid="reset-session-btn" onClick={onReset} className="sat-chip" title="Start over">
      <RotateCcw size={13} /> Start over
    </button>
  );
};

// A safe wrapper so the lender dashboard (no SatProvider) can still use <Shell>.
const useSatSafe = () => {
  try {
    return useSat();
  } catch (e) {
    return null;
  }
};

export const Shell = ({ children, right, showStartOver = true, banner }) => {
  const borrower = useContext(BorrowerCtx);
  const hideStartOver = !showStartOver || !!borrower;

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="flex items-center gap-2">
            {right}
            {!hideStartOver && <ResetButton />}
          </div>
        </div>
      </header>
      {banner}
      {children}
    </div>
  );
};
