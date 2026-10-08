CREATE TABLE IF NOT EXISTS slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic text NOT NULL CHECK (clinic IN ('aesthetic', 'skin')),
  starts_at timestamptz NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE (clinic, starts_at)
);
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES slots(id),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_confirmed_booking_per_slot ON bookings(slot_id) WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS slots_starts_at_idx ON slots(starts_at);
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);
