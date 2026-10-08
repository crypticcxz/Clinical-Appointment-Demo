# Design system

## Scene and theme

A customer makes a quiet self-care appointment on their phone during daylight, looking for a reassuring, legible interface. Use a light ivory surface with low-chroma olive neutrals and a restrained olive accent.

## Color

Use OKLCH tokens: ivory canvas, pale tinted surfaces, deep olive ink, muted olive secondary text, olive action color, restrained amber warnings and red errors. Avoid pure white and black.

## Typography

System sans-serif for controls, body, dates, and administrative data. Georgia serif for the main booking narrative only. Fixed rem hierarchy; readable line lengths and generous leading.

## Layout

Wide desktop booking shell with a persistent narrative and appointment summary on the left and one focused task on the right. Mobile collapses to a compact header and sequential content. Admin uses a clear toolbar and responsive booking rows.

## Components

Customer booking uses a scrollable conversation, plain assistant messages, pale olive customer replies, a fixed composer, and a persistent appointment summary. The assistant sends an interactive calendar and available time buttons within a message. Picking a time adds the appointment choice as a customer reply. Earlier calendars remain visible but inactive. Other steps use typed replies, with browser autofill for contact details. Olive primary actions; low-emphasis secondary actions. Admin retains its calendar, inline availability editor, and action confirmations.

## Motion

180–240 ms opacity and transform transitions communicate step changes and selection. No layout animation, decorative looping, bounce, or orchestrated page-load sequence. Respect prefers-reduced-motion.
