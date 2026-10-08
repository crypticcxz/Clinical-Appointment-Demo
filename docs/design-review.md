# Impeccable design assessment

Assessed on 8 October 2026. Primary target: `src/Booking.jsx`; companion target: `src/Admin.jsx` and the shared styles. Context: PRODUCT.md and DESIGN.md. Product register, calm studio direction explicitly selected by the user.

## Method and verification limits

Reviewed source and the running local application at http://127.0.0.1:5173/. Used Impeccable's static detector and its live browser overlay on clinic selection, calendar, contact form, and the authenticated admin screen. The browser overlay was isolated in separate `[Human]` tabs. An independent review agent could not be started in this session, so the manual design review and deterministic assessment were performed sequentially. This is not an independent two-agent audit.

Customer and admin layouts were checked at desktop widths and at 390px. The admin layout was additionally checked at 320px. Browser checks confirmed booking, visibility of the same reservation in admin, rescheduling, cancellation, slot creation, blocking/reopening, saved-details fill, and removal. No document-wide horizontal overflow was observed in the measured layouts. Calendar event contents are covered by a unit test; the in-app browser's download-event check timed out, so actual calendar-app import remains unverified.

The live Neon database and a deployed Netlify function have not been exercised because accounts/credentials were not supplied. Local concurrency verification uses the development data adapter. The Postgres implementation uses row locks and a partial unique index to enforce reservation exclusivity.

## Anti-pattern verdict

The booking flow has a coherent visual hierarchy and recognizable controls. The original version had undersized secondary labels and redundant eyebrow text. The revised design removes those labels, improves text sizes, uses quiet integrated line illustrations for clinic selection, and reserves the olive accent for actionable or selected states.

Static scan: one `overused-font` warning for Arial. Final browser scans of the checked customer steps and admin booking overview reported the same font warning; the overlay also displayed a cream-palette notice. These are intentional choices: Impeccable's product register permits system fonts, and the user explicitly selected ivory and olive. They are retained as design tradeoffs, rather than treating a detector warning as an instruction to replace the chosen direction.

Real issues fixed during assessment:

- Functional text below 11px, including progress numbers, clinic metadata and admin count captions.
- Redundant decorative text above the task headings.
- A heading-level jump in the appointment summary, changed to paragraph text.
- Admin bookings requiring sideways table scrolling on phones, replaced by stacked responsive rows.
- A long rescheduling dropdown, replaced by separate date and time choices.
- An overlong admin session-note line, constrained to 75ch.
- Appointment context disappearing above the mobile form, addressed with a compact selected-appointment summary beside the fields.

The temporary detector injection and review-title changes were removed from application source after assessment. No live detector is included in the deployed app.

## Design health score

This is a manual usability assessment, not a certification.

| Heuristic                       | Score / 4   | Evidence or limitation                                                                                             |
| ------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Visibility of system status     | 3           | Step progress, loading states, save notices and booking confirmation; no automatic admin polling.                  |
| Match with the real world       | 4           | Clinic, date, time and contact details follow the expected booking order.                                          |
| User control and freedom        | 3           | Back/edit controls, forget details, inline cancellation confirmation; customers cannot self-cancel.                |
| Consistency and standards       | 3           | Shared controls, labels and selection treatment; bespoke calendar uses individual date buttons.                    |
| Error prevention                | 3           | Disabled unavailable dates, future-only slot validation, booking uniqueness and explicit destructive confirmation. |
| Recognition rather than recall  | 4           | Persistent desktop summary and repeated appointment context on mobile.                                             |
| Flexibility and efficiency      | 2           | Autofill, saved details, search and opening presets; no recurring-hours or bulk-blocking tools.                    |
| Aesthetic and minimalist design | 3           | Focused steps, restrained accent, consistent spacing; substantial whitespace on desktop is deliberate.             |
| Error recovery                  | 3           | Contact fields survive failures; competing booking redirects to refreshed availability.                            |
| Help and documentation          | 2           | Inline hints and clear deployment docs; clinic support information awaits real branding.                           |
| **Total**                       | **30 / 40** | **Good foundation; production integrations remain unverified.**                                                    |

## Cognitive load and emotional journey

Clinic choice exposes two options. Contact entry has three fields. Time selection is progressively revealed after a date is chosen. Calendar and opening-time grids necessarily exceed four options, but these are familiar scheduling controls rather than unrelated competing decisions. One checklist concern remains: selecting many availability times can feel dense. Customer flow: low cognitive load; administrator's opening editor: moderate density.

The first screen gives a clear starting point, the calendar makes availability visible, and confirmation provides a reference and calendar action. The main anxiety point is submitting a reservation; the visible appointment summary and clear demo disclosure reduce ambiguity. Cancellation requires an explicit inline second action and states the effect.

## Remaining issues

- **P2: No customer support route or self-service cancellation.** Before real operation, add actual clinic contact information and choose how customers request changes. The demo does not invent contact details.
- **P2: Admin rescheduling is limited to the selected month's available slots.** The hint makes the scope explicit. A cross-month date picker would improve this if operational needs require it.
- **P2: No booking draft persistence across a full refresh.** Switching steps preserves entered contact fields; refreshing starts a new booking. Device-local saved details are separate and opt-in. A tab-local draft would be a future enhancement.
- **P3: Opening many dates requires repeated single-day saves.** Add recurring hours or bulk date ranges when clinic operating rules are known.

## Persona checks

- **Jordan, first-time customer:** The two clinic choices, disabled next action until selection, availability dots, and confirmation reference support discovery. No unexplained login is required to book.
- **Sam, keyboard or assistive-technology user:** Native buttons and labeled inputs, visible focus, heading focus on step transitions, and reduced-motion support are present. Calendar dates require individual Tab navigation; an arrow-key calendar grid could improve efficiency. A dedicated screen-reader audit remains outstanding.
- **Casey, mobile customer:** Slots, form and primary action fit a 390px viewport; contact autocomplete reduces typing. Selected appointment information is repeated on the details step. Refresh loses the in-progress selection.
- **Clinic administrator:** Mobile booking rows expose Manage directly. Date/time rescheduling avoids a long flat slot list. Opening presets reduce repeated time selection; recurring schedules are outside this version.

## Recommended next checks

Connect Neon, run the schema setup, deploy on Netlify, and repeat the two-browser reservation-race and admin-authorization checks against the deployed API. Confirm actual calendar download/import in a normal browser. Set the real clinic name, contact information, operating rules and retention policy before real customer use.
