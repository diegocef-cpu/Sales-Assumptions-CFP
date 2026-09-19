export const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const uid = () => Math.random().toString(36).slice(2, 10);

export const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const monthLabels = (startMonth, count) => {
  const [y, m] = (startMonth || "2026-01").split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const idx = (m - 1 + i) % 12;
    const year = y + Math.floor((m - 1 + i) / 12);
    return `${MONTH_ABBR[idx]}-${String(year).slice(2)}`;
  });
};

export const emptyUnits = (count) => Array.from({ length: count }, () => 0);

export const makeItem = (name, months, categoryId) => ({
  id: uid(),
  name,
  categoryId: categoryId ?? null,
  price: 0,
  unitCost: 0,
  units: emptyUnits(months),
});

export const fmtMoney = (v, digits = 0) =>
  `$${num(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const fmtPct = (v) => `${(num(v) * 100).toFixed(1)}%`;

/** Quick-fill volume patterns. Returns an array of `months` unit values. */
export const applyPattern = (pattern, base, months, opts = {}) => {
  const b = num(base);
  const growth = num(opts.growth ?? 5) / 100;
  const out = [];
  for (let i = 0; i < months; i++) {
    if (pattern === "flat") out.push(b);
    else if (pattern === "growth") out.push(Math.round(b * Math.pow(1 + growth, i)));
    else if (pattern === "q4") {
      const monthIdx = (num(opts.startIdx) + i) % 12;
      const boost = monthIdx >= 9 ? 1.6 : monthIdx <= 1 ? 0.75 : 1;
      out.push(Math.round(b * boost));
    } else if (pattern === "summer") {
      const monthIdx = (num(opts.startIdx) + i) % 12;
      const boost = monthIdx >= 4 && monthIdx <= 7 ? 1.5 : monthIdx >= 10 ? 0.7 : 1;
      out.push(Math.round(b * boost));
    } else if (pattern === "rampup") {
      out.push(Math.round(b * (0.4 + (0.6 * i) / Math.max(1, months - 1)) * 1.6));
    } else out.push(b);
  }
  return out;
};

export const computeTotals = (state) => {
  const months = state.months;
  const items = state.items;
  const monthlyRevenue = emptyUnits(months);
  const monthlyCost = emptyUnits(months);
  const perItem = {};

  items.forEach((it) => {
    const price = num(it.price);
    const unitCost = num(it.unitCost);
    const rev = [];
    const cost = [];
    for (let m = 0; m < months; m++) {
      const u = num(it.units?.[m]);
      const r = u * price;
      const c = u * unitCost;
      rev.push(r);
      cost.push(c);
      monthlyRevenue[m] += r;
      monthlyCost[m] += c;
    }
    const revTotal = rev.reduce((a, b) => a + b, 0);
    const costTotal = cost.reduce((a, b) => a + b, 0);
    const unitsTotal = (it.units || []).slice(0, months).reduce((a, b) => a + num(b), 0);
    perItem[it.id] = {
      revenue: rev,
      cost,
      revTotal,
      costTotal,
      unitsTotal,
      grossProfit: revTotal - costTotal,
      marginPct: revTotal > 0 ? (revTotal - costTotal) / revTotal : 0,
    };
  });

  const monthlyGP = monthlyRevenue.map((r, i) => r - monthlyCost[i]);
  const monthlyMarginPct = monthlyRevenue.map((r, i) => (r > 0 ? monthlyGP[i] / r : 0));
  const revenueTotal = monthlyRevenue.reduce((a, b) => a + b, 0);
  const costTotal = monthlyCost.reduce((a, b) => a + b, 0);

  const perCategory = state.categories.map((c) => {
    const catItems = items.filter((i) => i.categoryId === c.id);
    const rev = catItems.reduce((a, i) => a + perItem[i.id].revTotal, 0);
    const cst = catItems.reduce((a, i) => a + perItem[i.id].costTotal, 0);
    return {
      id: c.id,
      name: c.name,
      revenue: rev,
      cost: cst,
      grossProfit: rev - cst,
      marginPct: rev > 0 ? (rev - cst) / rev : 0,
      share: revenueTotal > 0 ? rev / revenueTotal : 0,
    };
  });

  let peakIdx = 0;
  monthlyRevenue.forEach((r, i) => {
    if (r > monthlyRevenue[peakIdx]) peakIdx = i;
  });

  return {
    months,
    labels: monthLabels(state.startMonth, months),
    perItem,
    perCategory,
    monthlyRevenue,
    monthlyCost,
    monthlyGP,
    monthlyMarginPct,
    revenueTotal,
    costTotal,
    grossProfit: revenueTotal - costTotal,
    marginPct: revenueTotal > 0 ? (revenueTotal - costTotal) / revenueTotal : 0,
    avgMonthlyGP: months > 0 ? (revenueTotal - costTotal) / months : 0,
    peakMonth: { label: monthLabels(state.startMonth, months)[peakIdx], value: monthlyRevenue[peakIdx] },
  };
};

const esc = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const rowsToCsv = (rows) => rows.map((r) => r.map(esc).join(",")).join("\n");

export const buildSalesCsv = (state, totals) => {
  const rows = [
    ["MONTHLY SALES PROJECTION", state.businessName || "", "", ...totals.labels.map(() => ""), ""],
    ["Sales Category", "Name of Product or Service", "Sales price ($)", ...totals.labels, "Annual Revenue ($)"],
  ];
  state.categories.forEach((cat) => {
    const catItems = state.items.filter((i) => i.categoryId === cat.id);
    catItems.forEach((it, idx) => {
      rows.push([
        idx === 0 ? cat.name : "",
        it.name,
        num(it.price).toFixed(2),
        ...(it.units || []).slice(0, state.months).map((u) => num(u)),
        totals.perItem[it.id].revTotal.toFixed(2),
      ]);
    });
  });
  rows.push([]);
  rows.push(["", "TOTAL REVENUE ($)", "", ...totals.monthlyRevenue.map((v) => v.toFixed(2)), totals.revenueTotal.toFixed(2)]);
  return rowsToCsv(rows);
};

export const buildCostCsv = (state, totals) => {
  const rows = [
    ["MONTHLY DIRECT COST PROJECTION", state.businessName || ""],
    ["Sales Category", "Name of Product or Service", "Cost per unit ($)", ...totals.labels, "Annual Direct Cost ($)"],
  ];
  state.categories.forEach((cat) => {
    const catItems = state.items.filter((i) => i.categoryId === cat.id);
    catItems.forEach((it, idx) => {
      rows.push([
        idx === 0 ? cat.name : "",
        it.name,
        num(it.unitCost).toFixed(2),
        ...totals.perItem[it.id].cost.map((v) => v.toFixed(2)),
        totals.perItem[it.id].costTotal.toFixed(2),
      ]);
    });
  });
  rows.push([]);
  rows.push(["", "TOTAL DIRECT COSTS ($)", "", ...totals.monthlyCost.map((v) => v.toFixed(2)), totals.costTotal.toFixed(2)]);
  rows.push(["", "GROSS PROFIT ($)", "", ...totals.monthlyGP.map((v) => v.toFixed(2)), totals.grossProfit.toFixed(2)]);
  rows.push([
    "",
    "GROSS MARGIN (%)",
    "",
    ...totals.monthlyMarginPct.map((v) => (v * 100).toFixed(1)),
    (totals.marginPct * 100).toFixed(1),
  ]);
  return rowsToCsv(rows);
};

export const downloadCsv = (filename, content) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
