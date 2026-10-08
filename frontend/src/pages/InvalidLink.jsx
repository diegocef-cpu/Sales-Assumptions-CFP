import React from "react";
import { Link } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { usePrivatePage } from "@/hooks/usePrivatePage";

export default function InvalidLink() {
  usePrivatePage();
  return (
    <Shell showStartOver={false}>
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">This link is not valid</h1>
        <p className="mt-4 text-sm text-slate-600">
          The private link you opened is no longer active or was mistyped. Please contact your lender for a working link.
        </p>
        <p className="mt-10 text-xs text-slate-400">
          Want to practice first?{" "}
          <Link to="/" className="font-semibold text-[#4a7a24] hover:underline">
            Open the practice version
          </Link>
          .
        </p>
      </main>
    </Shell>
  );
}
