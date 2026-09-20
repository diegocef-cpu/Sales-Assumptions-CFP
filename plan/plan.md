# Lender-issued borrower links, worked on together

## The short answer

Don't share the landing page. The landing page stays the front door; a borrower who lands there and starts typing produces work nobody can trace back.

Instead the lender creates a **request** for one named borrower, and the tool hands back a link that belongs to that borrower alone. The lender keeps a list of every request they've issued, sees whether each borrower hasn't opened it, is partway through, or has finished — and can sit inside the same projection and fill it in **alongside** the borrower when asked to.

## How it works

**Lender side (sign-in required)**

1. The lender signs in with an email and password.
2. They click "New request" and fill in: borrower or business name, the loan amount being considered (this picks the 12- or 24-month horizon automatically), and optionally the borrower's email address and a short note.
3. The tool produces a private link for that borrower, e.g. `…/b/7f3a9c2b4e`. The lender copies it into their own email, or lets the tool email the borrower directly.
4. A dashboard lists every request: borrower name, status, when they last touched it, how many products they've entered, and projected revenue, direct costs and gross margin once there's enough data. The lender opens any request to read both tables and download the CSV or Excel pack.

**Borrower side (no sign-in)**

1. The borrower opens their link and goes straight into the guided interview. No account, no password, nothing to remember.
2. Their answers save automatically as they type, so they can close the tab, switch from phone to laptop, or hand the link to their bookkeeper and pick up where they left off.
3. At the end they press "Send to my lender", which marks the request as submitted and notifies the lender.

## Working on it together

The lender and the borrower can be in the same projection at the same time — typically on a phone call, with the borrower reading out figures and the lender typing, or the other way round.

- The lender opens a request from their dashboard in **edit** mode: the same interview and the same tables the borrower sees, not a read-only copy.
- Changes flow both ways within a few seconds. If the borrower fixes a price on their phone, it appears on the lender's screen without either of them reloading.
- Edits merge field by field, so two people working on different products or different months never overwrite each other. If both type into the very same cell at the same moment, the later keystroke wins and the other person watches it change — nothing else they typed is lost.
- Each side can see when the other is in the projection, so nobody is surprised by figures moving on screen.
- Every figure carries a quiet marker of who set it last — borrower or lender — so the borrower can always see what their lender changed, and the lender can show their own file who supplied what.
- A short question thread sits alongside the tables, so the two can leave each other notes between calls ("is the $72 wholesale price before or after the discount?") rather than trading emails.

## Decisions worth pushing back on

- **The lender can edit, not just watch.** This is what makes working together possible, but it also means a lender can change a borrower's figures. The audit marker and question thread exist so it's never invisible. If lender edits should instead arrive as *suggestions the borrower accepts*, that's a different and slower build — say so now.
- **Only the lender signs in; borrowers never do.** Asking a borrower to register before the first question is the surest way to lose them. The cost is that the borrower link is a secret address with no password — anyone they forward it to can view and edit those figures. Tightening that means either a short code the lender reads out, or making borrowers register after all.
- **Changes appear within a few seconds, not instantly.** No live cursors or typing indicators of the kind you get in a shared document. Close enough for a phone call; if true keystroke-by-keystroke co-editing is the expectation, that's a materially bigger piece of work.
- **Who can create a lender account.** The plan allows anyone to register, and each lender sees only their own requests. If this is for one lender or one institution, registration should be closed and accounts issued instead.
- **Emails sent by the tool.** Two, both optional: an invite to the borrower containing their link, and a notification to the lender when a borrower submits. The invite needs the borrower's email address when the request is created, and replies go to the lender's own inbox.
- **Editing after submission.** The plan locks the borrower out of editing once they submit, while the lender keeps editing and can reopen it for the borrower. The alternative is leaving it open to both, which is friendlier but means the figures read yesterday may not be the figures there today.
- **No revision history.** "Who set this last" is shown, but not a full trail of every previous value. If a credit file needs before-and-after, that's separate work.
- **Borrowers who arrive via the landing page.** They can still use the tool anonymously, with their work kept in their browser and on a personal resume link. It won't appear on any lender's dashboard, because no lender issued it.
- **Retention and deletion.** Requests stay until the lender deletes them; nothing expires on its own.

## Assumptions

- One borrower, one link, one projection. A revised set of figures means issuing a second request.
- The loan amount is used only to choose the projection length and label the request — it doesn't appear in the borrower's tables.
- Links are long and random, so they cannot be discovered by guessing.
- Everything already built — the guided interview, the two assumption tables, the gross margin calculation, the AI suggestions, the CSV and Excel exports — stays as it is. This adds a lender workspace and shared editing around it.
