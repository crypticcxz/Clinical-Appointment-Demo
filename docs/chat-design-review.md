# Conversational booking review

The customer flow now uses typed replies in a scrollable conversation. The ivory and olive tokens, serif narrative, and appointment summary remain consistent with the existing design. Admin controls and the booking API are unchanged.

Impeccable product principles applied: plain assistant text rather than nested cards, clear speaker labels, restrained customer reply surfaces, a persistent composer, explicit final confirmation, and short opacity/transform transitions with reduced-motion support.

Verified in the local browser: clinic selection, live date and time replies, invalid email recovery, contact collection, optional saving prompt, changing the selected time, and successful booking with a reference. The transcript scrolls independently. At 390 x 844 the composer remains visible near the bottom of the initial view and no horizontal overflow was detected. Desktop also has no horizontal overflow.

Nine automated tests pass, including clinic ambiguity, invalid calendar dates, clinic-local relative dates, AM/PM parsing, and matching only actual available slots. The production build passes. A live Netlify/Neon deployment has not been rechecked for this frontend update.

The assistant uses explicit parsing, not an AI service. It accepts clinic names, supported date/time formats, and documented edit commands; unrestricted natural-language requests are not supported.

## Calendar message update

Date/time selection now uses the existing interactive calendar and time buttons inside an assistant message. Month navigation updates that message in place. Selecting a time adds a dated customer reply and continues into the unchanged contact conversation. Previous calendar messages become inactive snapshots, preventing accidental edits from old messages.

Local browser checks: available date selection, time selection continuing to the name prompt, reopening date selection, next-month navigation, and inactive earlier calendar controls. At 390 x 844, the calendar and times stack inside the message; selecting a date scrolls its available times into view. No horizontal overflow was detected. The transcript remains independently scrollable. Nine regression tests and the production build pass. Screenshot: screenshots/booking-chat-calendar.jpg. Live Netlify/Neon verification remains pending deployment.
