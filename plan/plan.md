# Saved Borrower Files for Sat

A lender creates a private file for each borrower, hands over a link, and watches the file move from "not started" to "submitted". The existing public app stays as a practice version that saves nothing.

## Who it's for

- Lenders who need realistic sales and cost assumptions from borrowers applying for small loans.
- Small-business borrowers filling out those numbers at their own pace, usually without an account and often on a phone.

## Core features and experience

- Three separate areas kept apart on purpose: the practice version at the home page, a borrower's private file at a long random link, and a passcode-protected lender page. The practice version never writes to the database and the lender page is never linked from the public app.
- Borrower files are the system of record. Each file carries a business name, owner name, borrower email, status, and the full wizard answers. The link in the URL is the credential: anyone who holds it can open and edit until it is submitted, and the backend never confirms whether a given link ever existed.
- Autosave only after a real change. Loading a file sends nothing to the server. The first user-made edit triggers a save about a second after they stop typing, and every step change flushes any pending edit. A small indicator next to the header shows saved, saving, or "Could not save, retrying". The file's first-open timestamp is written on that first saved change, not on page load, so a lender who opens a borrower link to peek never leaves a trace in the record.
- The business name stays editable in the wizard throughout. When the borrower types a new value, the lender's list reflects it on the next save. A blank value (after trimming) is never pushed to the file's saved name, so clearing the field cannot wipe the lender's identifier.
- Submit is gated. The button only acts when the file holds at least one single item that has all three: a non-empty name, a price above zero, and units above zero in at least one month. One item has to satisfy every condition; a priced item in one row and a stocked item in another does not count. Otherwise the borrower sees: "Add at least one product or service with a price and units before submitting." The confirmation then makes clear that the lender will see the answers and that no further edits are possible.
- Once submitted, the file is read-only for the borrower: tables render, Excel and CSV downloads still work (including the lender notes), and a "Submitted on [date]" marker is shown. Editing controls disappear completely. If a stale tab tries to save after submit, it stops retrying and shows "This file has been submitted. Reload to see it."
- Lender page is passcode-only for now. The passcode is read from an environment variable, checked server-side on every admin request with a constant-time compare, and is only held in page memory so a refresh asks for it again. Failed attempts are capped at ten per hour per real client IP (first value of the forwarded-for header when behind a proxy, otherwise the direct remote address).
- Lender dashboard focused on new work. Submissions carry a "Needs review" chip with a light row tint, float to the top of the list, and show up in a count at the top of the page ("3 need review"). A "Mark reviewed" button clears the chip and the count. The status filter includes "Needs review".
- Reopen keeps history. Reopening a submitted file sets its status back to in progress, keeps the original submitted date as history, records when it was reopened, and clears the reviewed flag. The Submitted column shows "Reopened [date]" until the borrower submits again, at which point it shows the newer date and the file lands back in needs-review.
- A real file cannot be wiped in one click. The "Start over" button exists only on the practice page. On a real file no single control clears everything. If a reset path ever runs on a real file it never touches the business name, borrower email, link, or status.
- Privacy on real pages. The borrower link pages and the lender page never load PostHog or any analytics or third-party tracking script, and no tool records their URL. Those pages inject a no-referrer and a noindex meta tag into the document head on mount (and remove them again when the public demo page loads), so the privacy signals ride with the HTML and do not depend on the host passing custom response headers. The server also returns the matching response headers where the host allows it.
- Plain, short wording everywhere. No em-dashes.

## User flow

Lender creating a file:
1. Opens the lender page, enters the passcode.
2. Fills in business name (required), owner name (optional), and borrower email (required, light format check).
3. Receives the private link with a Copy button and shares it with the borrower however they already communicate.

Borrower filling in a file:
1. Opens the private link. The wizard loads with the business name pre-filled and the borrower email shown as read-only. Nothing is saved yet.
2. A short header note reminds them that this is their private link, worth saving to come back, and not to share.
3. They answer step by step. The first keystroke triggers the first save (and sets the first-open timestamp). From then on, the saved indicator confirms every change goes to the server. Closing the tab and opening the link later on another browser shows every answer still in place.
4. If they rename the business name in the first step, the lender's list reflects the new name after the next save.
5. On the last step they submit. If no single item carries a name, a price above zero, and units above zero in at least one month, the submit button holds and shows the "add at least one product or service" message. Otherwise a confirmation makes clear that the lender will see the answers and that no further edits are possible.
6. After submitting, the file still opens from the same link in read-only mode. They can download the Excel and CSV.

Lender reviewing:
1. Submitted files appear at the top with a "Needs review" chip and tint, and the top-of-page count goes up by one.
2. The lender opens the private link in another tab to see the tables and download the exports. Opening it without typing anything does not change the file (phase 1 does not add downloads inside the dashboard itself).
3. Clicking "Mark reviewed" clears the chip and the count. If the numbers need changes, "Reopen" puts the file back into the borrower's hands and shows "Reopened [date]" until the next submission.

Practice version at the home page:
1. A banner at the top explains that nothing is saved or sent to a lender and tells visitors to ask their lender for a real link.
2. The wizard, calculations, and exports behave exactly as they do today, with "Start over" still available.

Wrong or guessed link:
1. A plain page says the link is not valid and to contact the lender. The backend reveals nothing about whether the token ever existed.

Stale tab after submit:
1. A tab left open on an in-progress file after another device has submitted stops retrying on the first 403 and shows "This file has been submitted. Reload to see it."

## UI/UX feel

- The existing wizard look stays. Same green, same cards, same type.
- Borrower header gains two subtle, calm elements: a save-status indicator ("Saved", "Saving...", "Could not save, retrying") and the private-link reminder. Neither competes with the step content.
- Practice banner at the top of the home page is friendly and small, not alarming. Reads: "This is a practice version. Nothing is saved or sent to a lender. Ask your lender for a link to submit your real numbers."
- Lender page is utilitarian: a passcode gate, then a form at the top to create a file, then a table below. Needs-review rows are the only coloured rows in the table and the only chip that stands out. Everything else is quiet so the eye lands on new work.
- Submitted borrower view hides all input controls completely. The read-only tables and the download buttons stay in the same spots they occupied during editing, so the page does not feel like a different screen.
- The submit-blocked and submit-stale messages sit as quiet banners near the submit button, not as alerts or modals.

## Implementation phases

Only phase 1 is built now.

**Phase 1 (this build): the full MVP described above.**
- Three separate areas.
- Create, open, autosave only after a real change, submit with validation, read-only after submit, downloads keep working.
- Passcode-only lender page with real-IP rate limit, needs-review handling, reopen with history, status filter, counts, mark reviewed.
- Robots noindex and no-referrer headers on borrower and admin pages, no analytics loaded there. Save-size cap on borrower state.

**Phase 2 (not now): richer lender dashboard.**
- Downloads inside the admin dashboard so the lender does not need to open the borrower link.
- Assigned-to and reviewer fields.
- Converting demo sessions into pending requests the lender can turn into real files.
- Lender email notifications when a borrower submits.
- Soft delete of mistaken files.

**Phase 3 (not now): identity.**
- Replace the shared passcode with Microsoft (or similar) sign-in for lenders, through the single access-check function set up in phase 1.
- Optional borrower identity confirmation if lenders want it.
- Audit log of who did what and when.

## Assumptions

- The link in the URL is the only credential a borrower needs. No borrower login, no email verification, no magic-link email. If the borrower loses the link, the lender copies it again from the dashboard.
- The real file lives in the database only. The practice version continues to use the browser's local storage, under a different key, and the two never share state.
- Last write wins. If the same file is open in two tabs or on two devices, whichever save lands last is what persists. Phase 1 does not try to merge concurrent edits. Submit afterwards is the only exception: a tab left behind will not keep trying to overwrite the submitted copy.
- The lender does not need to delete files in phase 1. Mistaken files stay in the list and can be ignored or reopened. Delete is in phase 2.
- No uniqueness check on borrower email. The same borrower can have multiple files, each with its own link.
- Rate limiting on passcode attempts is per real client IP (forwarded-for first value, else the direct address), held in server memory, and reset when the server restarts. Enough for a shared passcode used by a small team.
- Autosave debounces at roughly one second after the last change, flushes on step navigation, and does not fire at all until the user edits something.
- Opening a file as a lender to look at the numbers does not touch the file. First-open timestamp is written on first saved change, not on page load.
- The business name in the wizard is the source of truth for the file's business_name whenever the trimmed value is non-empty. The lender's initial value is only a seed; borrower edits win. A blank value never overwrites what the lender saved.
- Submit validation lives on the server too. The server rejects a submit that does not meet the "one single item with a name, a price, and units all on the same row" rule, so the client-side message is a convenience and not a security boundary.
- The size cap on saved state (one megabyte) is well above what the wizard produces today and is only there to stop abuse.
- When a lender opens a borrower link, they see the exact same page the borrower sees, including the private-link reminder. Phase 1 does not add a separate lender preview mode.
- Reopen does not notify the borrower automatically. The lender tells the borrower however they normally communicate. Email notifications are in phase 2.
- The practice-version banner is persistent, not dismissible. Visitors see it every time until phase 2 revisits onboarding.
- The home page keeps whatever analytics it carries today. The privacy guarantees in this plan apply only to borrower and lender pages.
