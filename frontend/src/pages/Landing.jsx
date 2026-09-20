import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageSquareQuote, Table2, TrendingUp, Sparkles } from "lucide-react";
import { Shell } from "@/components/Shell";
import { useSat } from "@/context/SatContext";

const STEPS = [
  { icon: MessageSquareQuote, title: "Answer plain questions", body: "One question at a time. No blank spreadsheet, no formulas to write." },
  { icon: Sparkles, title: "Get suggested numbers", body: "Sat proposes prices, per-unit costs and seasonal volumes for your industry." },
  { icon: Table2, title: "Two lender-ready tables", body: "Sales assumptions and cost assumptions, in the exact layout a lender expects." },
  { icon: TrendingUp, title: "Live gross margin", body: "Revenue, direct costs and margin recalculate the moment you edit a cell." },
];

const PRESETS = ["Retail Store", "Restaurant", "Construction", "Entertainment"];

export default function Landing() {
  const navigate = useNavigate();
  const { update, state } = useSat();

  const start = (industry) => {
    if (industry) update({ industry });
    navigate("/wizard");
  };

  return (
    <Shell>
      <main>
        <section className="sat-grain relative overflow-hidden border-b border-slate-200">
          <div className="pointer-events-none absolute -right-32 -top-40 h-[30rem] w-[30rem] rounded-full bg-[#7ac24a]/15 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
            <div className="sat-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#cbe8af] bg-[#f2f9ec] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#3f6420]">
                Projection builder
              </span>
              <h1 className="font-display mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Your sales assumptions,
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10">answered not typed.</span>
                  <span className="absolute bottom-1 left-0 z-0 h-3 w-full bg-[#7ac24a]/35" />
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600">
                SAT is a CEF tool that guides you through a short interview about what you sell, what you charge, and what it
                costs to deliver it. In the end, you get a clear sales table, cost table, and gross margin estimate that can be
                plugged directly into your cash flow projection.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button data-testid="start-wizard-btn" onClick={() => start()} className="sat-btn-primary px-6 py-3 text-base">
                  Start the guided interview <ArrowRight size={17} />
                </button>
                {state.items.length > 0 && (
                  <button data-testid="view-results-btn" onClick={() => navigate("/results")} className="sat-btn-ghost px-6 py-3 text-base">
                    Open my tables
                  </button>
                )}
              </div>

              <div className="mt-10">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Or jump in with your industry</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button key={p} data-testid={`preset-${p.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => start(p)} className="sat-chip">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sat-rise relative" style={{ animationDelay: "120ms" }}>
              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xl">
                <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-white">Monthly sales projection</span>
                  <span className="text-[10px] text-slate-400">Jan – Dec</span>
                </div>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-800 text-slate-200">
                      <th className="px-3 py-2 text-left font-semibold">Product / Service</th>
                      <th className="px-2 py-2 text-right font-semibold">Price</th>
                      {["Jan", "Feb", "Mar", "Apr"].map((m) => (
                        <th key={m} className="px-2 py-2 text-right font-semibold">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-num">
                    {[
                      ["Sales Category 1", null, null],
                      ["Signature blend (retail bag)", "18.00", [140, 150, 165, 180]],
                      ["Wholesale 5kg", "72.00", [22, 24, 26, 30]],
                      ["Sales Category 2", null, null],
                      ["Barista training session", "240.00", [4, 5, 6, 6]],
                    ].map(([name, price, units], i) =>
                      price === null ? (
                        <tr key={i} className="border-l-4 border-[#7ac24a] bg-[#eef3e2]">
                          <td colSpan={6} className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#2d3b16]">{name}</td>
                        </tr>
                      ) : (
                        <tr key={i} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/60">
                          <td className="px-3 py-2 text-left font-sans text-slate-700">{name}</td>
                          <td className="px-2 py-2 text-right text-slate-900">{price}</td>
                          {units.map((u, j) => (
                            <td key={j} className="px-2 py-2 text-right text-slate-600">{u}</td>
                          ))}
                        </tr>
                      )
                    )}
                    <tr className="bg-slate-900 text-white">
                      <td className="px-3 py-2 font-sans text-[10px] font-bold uppercase tracking-wider">Gross margin</td>
                      <td colSpan={5} className="px-2 py-2 text-right font-num text-sm font-bold text-[#a8e06f]">61.4%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">How it works</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="sat-card sat-rise p-6 transition-shadow hover:shadow-md" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f2f9ec] text-[#4a7a24]">
                  <s.icon size={19} />
                </span>
                <h3 className="font-display mt-4 text-base font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </Shell>
  );
}
