# Clinical Appointment Demo

A React appointment app with a customer booking flow and protected clinic admin panel. The visual direction is calm studio: ivory, olive, generous spacing, and restrained transitions.

## Run locally

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173/ for booking and http://127.0.0.1:5173/admin for management.

Without a DATABASE_URL, the development server starts a **local demo** with sample availability for the next 60 days. Local appointments persist in the ignored `.local/demo.json` file. No clinic is contacted, and no emails or SMS messages are sent.

Local demo admin: `login@admin.com`, password `admin123`. The login screen can fill these credentials for you. These credentials work only in local demo mode, never in a Netlify deployment.

## Features

- Aesthetic and skin care clinic selection.
- Scrollable booking chat with typed clinic and contact replies, an interactive calendar and time buttons sent within an assistant message, live availability, and a final confirmation before booking.
- Browser autofill and optional device-local contact details with a forget action.
- Type `help` for edit commands, `next month` to browse dates, `use saved details` when asked for your name, and `forget saved details` to clear browser storage. The booking assistant uses deterministic parsing and does not require an AI service.
- Booking confirmation, reference, and downloadable calendar event.
- Protected `/admin` login, signed HttpOnly session cookies, persistent login and booking rate limits.
- Open appointment slots, block or reopen a slot, search customer bookings, reschedule within the same clinic, or cancel a booking.
- Shared Postgres data with a unique constraint preventing simultaneous confirmed bookings for one slot.
- Responsive customer and admin views, keyboard focus, and reduced-motion support.

## Deploy on Netlify with Neon Postgres

The code is ready for Netlify; deploying requires your Netlify and Neon accounts and a database connection. Select their Free plans and monitor their usage allowances. No paid service is required for the core demo. Custom domain registration and notifications are separate.

1. Create a Neon Postgres project and copy its connection string.
2. Copy `.env.example` to `.env` locally. Set `DATABASE_URL` and your `ADMIN_EMAIL`.
3. Run `npm run admin:password`, enter a strong password (at least 12 characters), and put the generated `salt:hash` value in `ADMIN_PASSWORD_HASH`. Only the hash is needed by the deployed app.
4. Generate a session signing secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Set `SESSION_SECRET` to the output.
5. Run `npm run db:setup` to create the database tables and booking uniqueness index. It is idempotent and does not create sample slots.
6. Push this project to your own Git repository and import it into Netlify.
7. In Netlify, set `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET` as secret environment variables available to **Functions**. Do not prefix these with `VITE_`, and do not commit `.env`.
8. The included `netlify.toml` sets `npm run build`, publish directory `dist`, and functions directory `netlify/functions`. Deploy, then sign into `/admin` and open appointment slots.
9. Verify a booking from a separate browser and confirm it appears in the admin panel. Requests to `/api/admin/slots` without a session must return 401.

If production credentials are missing, the API returns 503 and keeps booking unavailable. It never silently switches to local demo data.

## API and data model

Public endpoints: `GET /api/config`, `GET /api/availability?clinic=skin&month=2026-10`, and `POST /api/bookings`.

Admin endpoints: login, logout, session, list/create slots, block/reopen slots, cancel and reschedule bookings. All administrative reads and writes except login require a valid session. Mutating requests require same-origin JSON. Public availability never includes customer contact details.

Each slot belongs to one clinic and represents one 30-minute consultation. This version assumes one appointment capacity per clinic, per time slot. All dates and opening times use **Asia/Karachi (UTC+5)**. For multiple practitioners, variable-duration treatments, or another clinic timezone, extend the data model before use.

The `bookings` table retains cancelled records. The dashboard lists current reservations, including past visits; it does not expose a cancellation-history view. Rescheduling shows open slots in the currently selected month. Slot creation keeps existing slots as they are, including blocked slots; reopen those in Availability.

## Checks

```sh
npm test
npm run build
```

Tests cover contact validation, timezone boundaries, invalid and past slots, signed-session expiry and tampering, admin authorization, same-origin writes, public-data isolation, login throttling, and local booking races/rescheduling/cancellation. The actual Neon integration must also be checked against your configured database before real customer use.

The Impeccable design assessment and browser verification limits are recorded in [docs/design-review.md](docs/design-review.md). Preview images are in `docs/screenshots/`.

## Scope

This is a booking demo, not a medical record system. It collects only contact details. It has one admin account, no payment processing, no email/SMS delivery, no customer sign-in, and no cross-device saved details. Browser storage is opt-in, device-local, and can be removed from the details form. Customer contact details remain in the database until removed under your chosen retention policy.

Free hosting does not guarantee unlimited uptime or traffic. Netlify and Neon allowances can change; check their current pricing pages when deploying.
