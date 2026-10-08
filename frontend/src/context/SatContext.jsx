import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { computeTotals, emptyUnits, makeItem, uid } from "@/lib/model";

const DEFAULT_STORAGE_KEY = "sat-session-v1";
const SatCtx = createContext(null);

export const CATEGORY_THRESHOLD = 10;

const defaultState = () => {
  const now = new Date();
  return {
    businessName: "",
    industry: "",
    businessModel: "mixed",
    description: "",
    months: 12,
    startMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    useCategories: false,
    categories: [{ id: "cat-default", name: "" }],
    items: [],
    completed: false,
  };
};

const loadFromStorage = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch (e) {
    /* ignore corrupt session */
  }
  return defaultState();
};

export const SatProvider = ({ children, persistKey = DEFAULT_STORAGE_KEY, initialState, onChange }) => {
  const [state, setState] = useState(() => {
    if (initialState) return { ...defaultState(), ...initialState };
    if (persistKey) return loadFromStorage(persistKey);
    return defaultState();
  });

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const lastSyncedRef = useRef(null); // populated on mount with initial JSON
  useEffect(() => {
    const serialized = JSON.stringify(state);
    if (lastSyncedRef.current === null) {
      // First mount: record the hydrated snapshot without broadcasting.
      lastSyncedRef.current = serialized;
      return;
    }
    if (serialized === lastSyncedRef.current) return;
    lastSyncedRef.current = serialized;
    if (persistKey) localStorage.setItem(persistKey, serialized);
    onChangeRef.current?.(state);
  }, [state, persistKey]);

  const api = useMemo(() => {
    const update = (patch) => setState((s) => ({ ...s, ...patch }));

    const setMonths = (months) =>
      setState((s) => ({
        ...s,
        months,
        items: s.items.map((it) => {
          const u = (it.units || []).slice(0, months);
          while (u.length < months) u.push(0);
          return { ...it, units: u };
        }),
      }));

    const addItem = (name = "", categoryId) =>
      setState((s) => ({
        ...s,
        items: [...s.items, makeItem(name, s.months, categoryId ?? s.categories[0]?.id ?? null)],
      }));

    const addItems = (names) =>
      setState((s) => ({
        ...s,
        items: [...s.items, ...names.map((n) => makeItem(n, s.months, s.categories[0]?.id ?? null))],
      }));

    const updateItem = (id, patch) =>
      setState((s) => ({ ...s, items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));

    const setUnit = (id, monthIdx, value) =>
      setState((s) => ({
        ...s,
        items: s.items.map((it) => {
          if (it.id !== id) return it;
          const units = [...(it.units || emptyUnits(s.months))];
          units[monthIdx] = value;
          return { ...it, units };
        }),
      }));

    const setUnits = (id, units) => updateItem(id, { units });

    const removeItem = (id) => setState((s) => ({ ...s, items: s.items.filter((it) => it.id !== id) }));

    const addCategory = (name) =>
      setState((s) => ({ ...s, categories: [...s.categories, { id: uid(), name: name || "" }] }));

    const updateCategory = (id, name) =>
      setState((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)) }));

    const removeCategory = (id) =>
      setState((s) => {
        if (s.categories.length <= 1) return s;
        const fallback = s.categories.find((c) => c.id !== id).id;
        return {
          ...s,
          categories: s.categories.filter((c) => c.id !== id),
          items: s.items.map((it) => (it.categoryId === id ? { ...it, categoryId: fallback } : it)),
        };
      });

    const reset = () => setState(defaultState());

    const applyCategorySuggestion = ({ categories: names, assignments }) =>
      setState((s) => {
        const cats = names.map((n) => ({ id: uid(), name: n }));
        const byName = new Map(cats.map((c) => [c.name, c.id]));
        const items = s.items.map((it) => {
          const target = assignments?.[it.id];
          const cid = (target && byName.get(target)) || cats[0].id;
          return { ...it, categoryId: cid };
        });
        return { ...s, categories: cats, items };
      });

    const loadPreset = (preset) =>
      setState((s) => {
        const months = s.months;
        const catNames = [...new Set(preset.items.map((i) => i.category).filter(Boolean))];
        const categories = catNames.length
          ? catNames.map((n) => ({ id: uid(), name: n }))
          : [{ id: "cat-default", name: "Products & Services" }];
        const items = preset.items.map((i) => {
          const units = (i.units || []).slice(0, months);
          while (units.length < months) units.push(units[units.length - 1] ?? 0);
          return {
            id: uid(),
            name: i.name,
            categoryId: (categories.find((c) => c.name === i.category) || categories[0]).id,
            price: i.price ?? 0,
            unitCost: i.unitCost ?? i.unit_cost ?? 0,
            units,
          };
        });
        return {
          ...s,
          industry: preset.industry ?? s.industry,
          businessModel: preset.businessModel ?? s.businessModel,
          useCategories: categories.length > 1,
          categories,
          items,
        };
      });

    return {
      update,
      setMonths,
      addItem,
      addItems,
      updateItem,
      setUnit,
      setUnits,
      removeItem,
      addCategory,
      updateCategory,
      removeCategory,
      reset,
      loadPreset,
      applyCategorySuggestion,
    };
  }, []);

  const totals = useMemo(() => computeTotals(state), [state]);

  return <SatCtx.Provider value={{ state, setState, totals, ...api }}>{children}</SatCtx.Provider>;
};

export const useSat = () => {
  const ctx = useContext(SatCtx);
  if (!ctx) throw new Error("useSat must be used inside SatProvider");
  return ctx;
};
