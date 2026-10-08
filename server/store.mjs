import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { AppError } from "./domain.mjs";

export function postgresStore(url) {
  const sql = neon(url);
  return {
    async rateLimit(key, max, seconds) {
      const rows =
        await sql`INSERT INTO rate_limits (key) VALUES (${key}) ON CONFLICT (key) DO UPDATE SET hits = CASE WHEN rate_limits.window_start < now() - (${seconds} * interval '1 second') THEN 1 ELSE rate_limits.hits + 1 END, window_start = CASE WHEN rate_limits.window_start < now() - (${seconds} * interval '1 second') THEN now() ELSE rate_limits.window_start END RETURNING hits`;
      if (rows[0].hits > max)
        throw new AppError("Too many attempts. Please try again later.", 429);
    },
    async slots(clinic, from, to, admin = false) {
      const rows =
        await sql`SELECT s.id, s.clinic, s.starts_at, s.enabled, b.id AS booking_id, b.name, b.email, b.phone, b.created_at FROM slots s LEFT JOIN bookings b ON b.slot_id = s.id AND b.status = 'confirmed' WHERE s.starts_at >= ${from} AND s.starts_at < ${to} AND (${clinic}::text IS NULL OR s.clinic = ${clinic}) ORDER BY s.starts_at`;
      return rows.map((r) => ({
        id: r.id,
        clinic: r.clinic,
        startsAt: new Date(r.starts_at).toISOString(),
        enabled: r.enabled,
        available:
          r.enabled && !r.booking_id && new Date(r.starts_at) > new Date(),
        ...(admin && {
          booking: r.booking_id
            ? {
                id: r.booking_id,
                name: r.name,
                email: r.email,
                phone: r.phone,
                createdAt: r.created_at,
              }
            : null,
        }),
      }));
    },
    async book(data) {
      try {
        const rows =
          await sql`WITH eligible AS (SELECT id FROM slots WHERE id = ${data.slotId}::uuid AND enabled AND starts_at > now() FOR UPDATE) INSERT INTO bookings (slot_id, name, email, phone) SELECT id, ${data.name}, ${data.email}, ${data.phone} FROM eligible RETURNING id, slot_id`;
        if (!rows.length)
          throw new AppError(
            "This slot is no longer available. Please choose another time.",
            409,
          );
        return { id: rows[0].id, slotId: rows[0].slot_id };
      } catch (error) {
        if (error.code === "23505")
          throw new AppError(
            "Someone just booked this slot. Please choose another time.",
            409,
          );
        throw error;
      }
    },
    async addSlots(clinic, starts) {
      await sql.transaction(
        starts.map(
          (start) =>
            sql`INSERT INTO slots (clinic, starts_at) VALUES (${clinic}, ${start}) ON CONFLICT (clinic, starts_at) DO NOTHING`,
        ),
      );
    },
    async setEnabled(id, enabled) {
      const rows =
        await sql`WITH target AS (SELECT id FROM slots WHERE id = ${id}::uuid FOR UPDATE) UPDATE slots SET enabled = ${enabled} WHERE id IN (SELECT id FROM target) RETURNING id`;
      if (!rows.length) throw new AppError("Slot not found.", 404);
    },
    async cancel(id) {
      const rows =
        await sql`UPDATE bookings SET status = 'cancelled' WHERE id = ${id}::uuid AND status = 'confirmed' RETURNING id`;
      if (!rows.length)
        throw new AppError("Booking not found or already cancelled.", 404);
    },
    async reschedule(id, slotId) {
      try {
        const rows =
          await sql`WITH target AS (SELECT id, clinic FROM slots WHERE id = ${slotId}::uuid AND enabled AND starts_at > now() FOR UPDATE) UPDATE bookings b SET slot_id = target.id FROM target, slots old WHERE b.id = ${id}::uuid AND b.status = 'confirmed' AND old.id = b.slot_id AND old.clinic = target.clinic RETURNING b.id`;
        if (!rows.length)
          throw new AppError(
            "Choose an available time in the same clinic.",
            409,
          );
      } catch (error) {
        if (error.code === "23505")
          throw new AppError(
            "That time was just booked. Refresh and choose another slot.",
            409,
          );
        throw error;
      }
    },
  };
}

// Local development only. Never selected in a Netlify deployment.
export async function demoStore(
  directory = new URL("../.local/", import.meta.url),
) {
  const { readFile, writeFile, mkdir } = await import("node:fs/promises");
  const path = new URL("demo.json", directory);
  let data;
  try {
    data = JSON.parse(await readFile(path, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    data = { slots: [], bookings: [], limits: {} };
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    for (let offset = 1; offset <= 60; offset++) {
      const date = new Date(`${today}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      if (date.getUTCDay() === 0) continue;
      const day = date.toISOString().slice(0, 10);
      for (const clinic of ["aesthetic", "skin"])
        for (const time of [
          "09:00",
          "09:30",
          "10:00",
          "10:30",
          "11:00",
          "11:30",
          "14:00",
          "14:30",
          "15:00",
          "15:30",
          "16:00",
          "16:30",
        ]) {
          if (
            (offset + Number(time.slice(0, 2)) + (clinic === "skin" ? 1 : 0)) %
              7 ===
            0
          )
            continue;
          data.slots.push({
            id: randomUUID(),
            clinic,
            startsAt: new Date(`${day}T${time}:00+05:00`).toISOString(),
            enabled: true,
          });
        }
    }
    await mkdir(directory, { recursive: true });
    await writeFile(path, JSON.stringify(data));
  }
  let queue = Promise.resolve();
  const mutate = (fn) => {
    const operation = queue.then(async () => {
      const result = fn();
      await writeFile(path, JSON.stringify(data));
      return result;
    });
    queue = operation.catch(() => {});
    return operation;
  };
  return {
    async rateLimit(key, max, seconds) {
      return mutate(() => {
        let item = data.limits[key];
        if (!item || item.start < Date.now() - seconds * 1000)
          item = data.limits[key] = { hits: 0, start: Date.now() };
        if (++item.hits > max)
          throw new AppError("Too many attempts. Please try again later.", 429);
      });
    },
    async slots(clinic, from, to, admin = false) {
      await queue;
      return data.slots
        .filter(
          (s) =>
            (!clinic || s.clinic === clinic) &&
            s.startsAt >= from &&
            s.startsAt < to,
        )
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((s) => {
          const booking = data.bookings.find(
            (b) => b.slotId === s.id && b.status === "confirmed",
          );
          return {
            ...s,
            available:
              s.enabled && !booking && new Date(s.startsAt) > new Date(),
            ...(admin && { booking: booking || null }),
          };
        });
    },
    book(input) {
      return mutate(() => {
        const slot = data.slots.find((s) => s.id === input.slotId);
        if (
          !slot?.enabled ||
          new Date(slot.startsAt) <= new Date() ||
          data.bookings.some(
            (b) => b.slotId === input.slotId && b.status === "confirmed",
          )
        )
          throw new AppError(
            "This slot is no longer available. Please choose another time.",
            409,
          );
        const booking = {
          ...input,
          id: randomUUID(),
          status: "confirmed",
          createdAt: new Date().toISOString(),
        };
        data.bookings.push(booking);
        return { id: booking.id, slotId: booking.slotId };
      });
    },
    addSlots(clinic, starts) {
      return mutate(() => {
        for (const startsAt of starts)
          if (
            !data.slots.some(
              (s) => s.clinic === clinic && s.startsAt === startsAt,
            )
          )
            data.slots.push({
              id: randomUUID(),
              clinic,
              startsAt,
              enabled: true,
            });
      });
    },
    setEnabled(id, enabled) {
      return mutate(() => {
        const slot = data.slots.find((s) => s.id === id);
        if (!slot) throw new AppError("Slot not found.", 404);
        slot.enabled = enabled;
      });
    },
    cancel(id) {
      return mutate(() => {
        const booking = data.bookings.find(
          (b) => b.id === id && b.status === "confirmed",
        );
        if (!booking)
          throw new AppError("Booking not found or already cancelled.", 404);
        booking.status = "cancelled";
      });
    },
    reschedule(id, slotId) {
      return mutate(() => {
        const booking = data.bookings.find(
          (b) => b.id === id && b.status === "confirmed",
        );
        const slot = data.slots.find((s) => s.id === slotId);
        const old = data.slots.find((s) => s.id === booking?.slotId);
        if (
          !booking ||
          !slot?.enabled ||
          new Date(slot.startsAt) <= new Date() ||
          slot.clinic !== old?.clinic ||
          data.bookings.some(
            (b) => b.slotId === slotId && b.status === "confirmed",
          )
        )
          throw new AppError(
            "Choose an available time in the same clinic.",
            409,
          );
        booking.slotId = slotId;
      });
    },
  };
}
