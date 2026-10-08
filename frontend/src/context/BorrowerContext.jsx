import React, { createContext, useContext } from "react";

/**
 * Borrower context tells the shared wizard/results components they are inside a
 * server-backed private file, not the practice demo. When this context is null,
 * the components behave exactly as before (localStorage only).
 *
 * Shape:
 *   {
 *     token: string,
 *     fileId: string,
 *     readOnly: boolean,              // true after submit
 *     saveStatus: "idle" | "saving" | "saved" | "retrying" | "stale",
 *     submittedAt: string | null,
 *     borrowerEmail: string,
 *     submitError: string | null,
 *     submit: () => Promise<void>,
 *     flushNow: () => void,           // flush pending debounced save immediately
 *     canSubmit: boolean,
 *   }
 */
export const BorrowerCtx = createContext(null);

export const useBorrower = () => useContext(BorrowerCtx);
