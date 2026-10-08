import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { Shell } from "@/components/Shell";
import { SaveStatus } from "@/components/SaveStatus";
import { useSat } from "@/context/SatContext";
import { BorrowerCtx } from "@/context/BorrowerContext";
import { num } from "@/lib/model";
import StepProfile from "@/components/wizard/StepProfile";
import StepCatalog from "@/components/wizard/StepCatalog";
import StepCategories from "@/components/wizard/StepCategories";
import StepPricing from "@/components/wizard/StepPricing";
import StepVolumes from "@/components/wizard/StepVolumes";
import StepCosts from "@/components/wizard/StepCosts";
import StepReview from "@/components/wizard/StepReview";

const STEP_DEFS = [
  { id: "profile", label: "Business", question: "First, who are we projecting for?", Comp: StepProfile },
  { id: "catalog", label: "What you sell", question: "What products or services do you sell?", Comp: StepCatalog },
  { id: "categories", label: "Grouping", question: "Let's group these into sales categories", Comp: StepCategories },
  { id: "pricing", label: "Prices", question: "What do you charge for each one?", Comp: StepPricing },
  { id: "volumes", label: "Volumes", question: "How many units do you expect to sell each month?", Comp: StepVolumes },
  { id: "costs", label: "Costs", question: "What does it cost you to deliver one unit?", Comp: StepCosts },
  { id: "review", label: "Review", question: "Here's your snapshot, ready for your lender?", Comp: StepReview },
];

export default function Wizard() {
  const navigate = useNavigate();
  const { state, update } = useSat();
  const borrower = useContext(BorrowerCtx);
  const [stepId, setStepId] = useState("profile");

  const steps = STEP_DEFS;

  const idx = Math.max(0, steps.findIndex((s) => s.id === stepId));
  const step = steps[idx] ?? steps[0];
  const progress = ((idx + 1) / steps.length) * 100;

  const borrowerSubmitBlocker =
    borrower && step.id === "review" && !borrower.canSubmit
      ? "Add at least one product or service with a price and units before submitting."
      : null;

  const blocker = (() => {
    if (step.id === "profile" && !state.industry.trim()) return "Tell us your industry to continue";
    if (step.id === "catalog") {
      if (state.items.length === 0) return "Add at least one product or service";
      if (state.items.some((i) => !i.name.trim())) return "Give every item a name to continue";
    }
    if (step.id === "categories" && state.categories.some((c) => !c.name.trim()))
      return "Give every category a name to continue";
    if (step.id === "pricing" && state.items.some((i) => num(i.price) <= 0)) return "Every item needs a sale price above $0";
    if (step.id === "volumes" && state.items.every((i) => i.units.every((u) => num(u) === 0)))
      return "Enter at least some monthly unit volumes";
    if (borrowerSubmitBlocker) return borrowerSubmitBlocker;
    return null;
  })();

  const next = async () => {
    if (blocker) return;
    if (borrower) borrower.flushNow?.();
    if (step.id === "review") {
      if (borrower) {
        if (!window.confirm(
          "Submit to your lender? Once submitted, your answers will be visible to the lender and you will not be able to edit them.",
        )) {
          return;
        }
        try {
          await borrower.submit();
        } catch (e) {
          // submitError is now set on the context; stay on this step so the message shows.
        }
        return;
      }
      update({ completed: true });
      navigate("/results");
      return;
    }
    setStepId(steps[idx + 1].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    if (idx === 0) {
      if (!borrower) navigate("/");
      return;
    }
    if (borrower) borrower.flushNow?.();
    setStepId(steps[idx - 1].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Shell
      showStartOver={!borrower}
      right={borrower ? <SaveStatus status={borrower.saveStatus} /> : null}
      banner={
        borrower ? (
          <div className="border-b border-slate-200 bg-[#f8fbf2]">
            <div className="mx-auto max-w-5xl px-4 py-2 sm:px-6">
              <p data-testid="borrower-link-note" className="text-xs text-[#3f6420]">
                This is your private link. Save it to come back. Do not share it.
              </p>
            </div>
          </div>
        ) : null
      }
    >
      <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {steps.map((s, i) => (
                <span
                  key={s.id}
                  data-testid={`step-pill-${s.id}`}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                    i === idx ? "text-[#4a7a24]" : i < idx ? "text-slate-400" : "text-slate-300"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      i < idx ? "bg-[#7ac24a] text-white" : i === idx ? "bg-[#7ac24a]/20 text-[#4a7a24]" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {i < idx ? <Check size={11} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </span>
              ))}
            </div>
            <span data-testid="wizard-step-counter" className="font-num shrink-0 text-xs text-slate-400">
              {idx + 1} / {steps.length}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              data-testid="wizard-progress-bar"
              className="h-full rounded-full bg-[#7ac24a] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-32 pt-10 sm:px-6">
        <div key={step.id} className="sat-rise">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7ac24a]">Step {idx + 1}</p>
          <h1 data-testid="wizard-question" className="font-display mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {step.question}
          </h1>
          <div className="mt-8">
            <step.Comp />
          </div>
          {borrower?.stale && (
            <div
              data-testid="borrower-stale-banner"
              className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              This file has been submitted. Reload to see it.
            </div>
          )}
          {borrower?.submitError && step.id === "review" && (
            <div
              data-testid="borrower-submit-error"
              className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              {borrower.submitError}
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <button data-testid="wizard-back-btn" onClick={back} className="sat-btn-ghost">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            {blocker && (
              <span
                data-testid="wizard-blocker-msg"
                className="min-w-0 flex-1 text-right text-xs font-medium leading-snug text-amber-600 sm:flex-none sm:text-left"
              >
                {blocker}
              </span>
            )}
            <button
              data-testid="wizard-next-btn"
              onClick={next}
              disabled={!!blocker || borrower?.stale}
              className="sat-btn-primary shrink-0 px-6"
            >
              {step.id === "review"
                ? borrower
                  ? (<>Submit to lender <Send size={16} /></>)
                  : (<>Build my tables <ArrowRight size={16} /></>)
                : (<>Continue <ArrowRight size={16} /></>)}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
