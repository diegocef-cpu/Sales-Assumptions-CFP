import React, { useContext } from "react";
import { useSat } from "@/context/SatContext";
import { BorrowerCtx } from "@/context/BorrowerContext";

const MODELS = [
  { id: "products", label: "Physical products", hint: "You sell goods by the unit" },
  { id: "services", label: "Services", hint: "You bill jobs, hours or sessions" },
  { id: "mixed", label: "A mix of both", hint: "Products plus services" },
  { id: "subscription", label: "Subscriptions", hint: "Recurring plans or memberships" },
];

export default function StepProfile() {
  const { state, update, setMonths } = useSat();
  const borrower = useContext(BorrowerCtx);

  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">Business name</span>
          {!borrower && <span className="ml-2 text-xs text-slate-400">optional</span>}
          <input
            data-testid="profile-business-name"
            className="sat-input mt-2"
            placeholder="e.g. Northside Coffee Co."
            value={state.businessName}
            onChange={(e) => update({ businessName: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">What industry are you in?</span>
          <input
            data-testid="profile-industry"
            className="sat-input mt-2"
            placeholder="e.g. specialty coffee roastery"
            value={state.industry}
            onChange={(e) => update({ industry: e.target.value })}
          />
          <span className="mt-1.5 block text-xs text-slate-500">We use this to suggest realistic prices, costs and seasonality.</span>
        </label>
      </div>

      {borrower && (
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">Your email</span>
          <input
            data-testid="profile-borrower-email"
            className="sat-input mt-2 cursor-not-allowed bg-slate-50"
            value={borrower.borrowerEmail}
            readOnly
          />
          <span className="mt-1.5 block text-xs text-slate-500">
            Your lender set this. Contact them if it is wrong.
          </span>
        </label>
      )}

      <div>
        <span className="text-sm font-semibold text-slate-800">How do you make money?</span>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODELS.map((m) => {
            const active = state.businessModel === m.id;
            return (
              <button
                key={m.id}
                data-testid={`profile-model-${m.id}`}
                onClick={() => update({ businessModel: m.id })}
                className={`rounded-xl border p-4 text-left transition-all ${
                  active ? "border-[#7ac24a] bg-[#f2f9ec] shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className={`block text-sm font-semibold ${active ? "text-[#3f6420]" : "text-slate-800"}`}>{m.label}</span>
                <span className="mt-1 block text-xs text-slate-500">{m.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">Projection starts</span>
          <input
            data-testid="profile-start-month"
            type="month"
            className="sat-input mt-2"
            value={state.startMonth}
            onChange={(e) => update({ startMonth: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">Projection length</span>
          <select
            data-testid="profile-months"
            className="sat-input mt-2"
            value={state.months === 24 ? 24 : 12}
            onChange={(e) => setMonths(parseInt(e.target.value, 10))}
          >
            <option value={12}>12 months, microloans under $50K</option>
            <option value={24}>24 months, loans over $50K</option>
          </select>
          <span className="mt-1.5 block text-xs text-slate-500">
            Lenders ask for 12 months on a microloan under $50K, and 24 months once the request goes above $50K.
          </span>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-800">Notes for your lender</span>
        <span className="ml-2 text-xs text-slate-400">optional</span>
        <textarea
          data-testid="profile-description"
          rows={3}
          className="sat-input mt-2 resize-none"
          placeholder="e.g. we're busiest in December, most revenue comes from wholesale accounts"
          value={state.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </label>
    </div>
  );
}
