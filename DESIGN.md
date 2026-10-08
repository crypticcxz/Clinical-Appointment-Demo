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

Outlined clinic choice rows with integrated abstract line artwork. Compact progress indicator. Calendar date buttons with dots for availability, strong selected state, and explicit unavailable labels. Native labeled form controls. Olive primary actions; low-emphasis secondary actions. Inline admin editor and action confirmations.

## Motion

180–240 ms opacity and transform transitions communicate step changes and selection. No layout animation, decorative looping, bounce, or orchestrated page-load sequence. Respect prefers-reduced-motion.
