import React, { useEffect, useState } from "react";

/**
 * Numeric input that lets the user type freely, including leading "0",
 * trailing ".", and partially-written decimals, while still committing
 * a parsed number to the shared state on every valid keystroke.
 *
 * Props:
 *   value      – number held in shared state
 *   onChange   – (n:number) => void, called with the parsed number
 *   decimals   – max decimal places allowed (0 for units, 2 for money)
 *   data-testid, placeholder, className, min, …rest – forwarded to <input>
 *
 * Behaviour:
 *   - While focused, the <input> shows exactly what the user has typed.
 *   - While blurred, the <input> is kept in sync with `value`; 0 renders
 *     as an empty box so the placeholder shows.
 */
export const NumberCell = ({
  value,
  onChange,
  decimals = 2,
  placeholder,
  className,
  min = 0,
  "data-testid": testId,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [local, setLocal] = useState("");

  // Keep the displayed text in sync with the external value when not focused
  // (so programmatic updates like "Suggest" or "Copy from above" show up).
  useEffect(() => {
    if (!focused) {
      const empty = value === 0 || value === null || value === undefined || value === "";
      setLocal(empty ? "" : String(value));
    }
  }, [value, focused]);

  const pattern =
    decimals > 0
      ? new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`)
      : /^\d*$/;

  const handleChange = (e) => {
    const v = e.target.value;
    if (v !== "" && !pattern.test(v)) return; // reject invalid characters silently
    setLocal(v);
    if (v === "" || v === ".") {
      onChange(0);
      return;
    }
    const n = parseFloat(v);
    onChange(Number.isFinite(n) ? n : 0);
  };

  const handleFocus = (e) => {
    setFocused(true);
    // Start empty when the stored value is 0 so the user can simply type "0".
    const empty = value === 0 || value === null || value === undefined || value === "";
    setLocal(empty ? "" : String(value));
    rest.onFocus?.(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    rest.onBlur?.(e);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      data-testid={testId}
      className={className}
      placeholder={placeholder}
      value={local}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
};

export default NumberCell;
