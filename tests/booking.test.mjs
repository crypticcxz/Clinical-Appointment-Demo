import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import {
  monthRange,
  validateBooking,
  validateSlots,
} from "../server/domain.mjs";
import {
  checkPassword,
  hashPassword,
  signSession,
  verifySession,
} from "../server/auth.mjs";
import { demoStore } from "../server/store.mjs";
import { createHandler } from "../server/api.mjs";
import { calendarContents, dateKey } from "../src/lib.js";

test("calendar event exports a 30-minute UTC event and uses clinic-local date boundaries", () => {
  const event = calendarContents(
    { id: "example-slot", startsAt: "2026-10-09T05:00:00.000Z" },
    "skin",
  );
  assert.match(event, /DTSTART:20261009T050000Z\r\n/);
  assert.match(event, /DTEND:20261009T053000Z\r\n/);
  assert.match(event, /SUMMARY:Clinical Appointment Demo - Skin care clinic/);
  assert.equal(event.endsWith("END:VCALENDAR\r\n"), true);
  assert.equal(dateKey("2026-10-08T20:00:00Z"), "2026-10-09");
});

test("booking input is validated and normalized", () => {
  const input = {
    name: "  Jane Demo  ",
    email: "JANE@EXAMPLE.COM ",
    phone: "+92 300 1234567",
    slotId: randomUUID(),
  };
  assert.equal(validateBooking(input).name, "Jane Demo");
  assert.equal(validateBooking(input).email, "jane@example.com");
  for (const invalid of [
    { name: "" },
    { email: "invalid" },
    { phone: "abc" },
    { slotId: "a".repeat(36) },
  ])
    assert.throws(() => validateBooking({ ...input, ...invalid }));
});
test("slot creation rejects invalid dates, past times and off-grid times", () => {
  const now = new Date("2026-10-08T10:00:00Z");
  const input = {
    clinic: "skin",
    date: "2026-10-09",
    times: ["09:00", "09:00", "14:30"],
  };
  assert.deepEqual(validateSlots(input, now).starts, [
    "2026-10-09T04:00:00.000Z",
    "2026-10-09T09:30:00.000Z",
  ]);
  for (const invalid of [
    { date: "2026-02-30" },
    { date: "2026-10-07" },
    { times: ["09:15"] },
    { times: [] },
    { clinic: "unknown" },
    { date: "2028-01-01" },
  ])
    assert.throws(() => validateSlots({ ...input, ...invalid }, now));
  assert.deepEqual(monthRange("2026-12"), {
    from: "2026-11-30T19:00:00.000Z",
    to: "2026-12-31T19:00:00.000Z",
  });
  assert.throws(() => monthRange("2026-13"));
});
test("password verification and signed sessions reject tampering and expiry", () => {
  const hash = hashPassword("a sufficiently long password");
  assert.equal(checkPassword("a sufficiently long password", hash), true);
  assert.equal(checkPassword("wrong password", hash), false);
  assert.equal(checkPassword("anything", "malformed"), false);
  const token = signSession("secret", "admin@example.com", 100);
  assert.equal(verifySession(token, "secret", "admin@example.com", 200), true);
  assert.equal(
    verifySession(token + "x", "secret", "admin@example.com", 200),
    false,
  );
  assert.equal(
    verifySession(token, "wrong-secret", "admin@example.com", 200),
    false,
  );
  assert.equal(verifySession(token, "secret", "other@example.com", 200), false);
  assert.equal(
    verifySession(token, "secret", "admin@example.com", 100 + 8 * 3600000),
    false,
  );
});
test("local booking concurrency, blocked slots, rescheduling and cancellation", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "clinic-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = await demoStore(pathToFileURL(directory + "/"));
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 90 * 86400000).toISOString();
  const all = await store.slots("skin", from, to, true);
  const input = {
    slotId: all[0].id,
    name: "Test Customer",
    email: "demo@example.com",
    phone: "+92 300 1234567",
  };
  const results = await Promise.allSettled([
    store.book(input),
    store.book(input),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.status, 409);
  const booking = results.find((r) => r.status === "fulfilled").value;
  await store.setEnabled(all[1].id, false);
  await assert.rejects(store.book({ ...input, slotId: all[1].id }), {
    status: 409,
  });
  await assert.rejects(store.reschedule(booking.id, all[1].id), {
    status: 409,
  });
  const otherClinic = (await store.slots("aesthetic", from, to))[0];
  await assert.rejects(store.reschedule(booking.id, otherClinic.id), {
    status: 409,
  });
  await store.reschedule(booking.id, all[2].id);
  assert.equal(
    (await store.slots("skin", from, to)).find((s) => s.id === all[0].id)
      .available,
    true,
  );
  assert.equal(
    (await store.slots("skin", from, to)).find((s) => s.id === all[2].id)
      .available,
    false,
  );
  await store.cancel(booking.id);
  assert.equal(
    (await store.slots("skin", from, to)).find((s) => s.id === all[2].id)
      .available,
    true,
  );
  await assert.rejects(store.cancel(booking.id), { status: 404 });
  // The local demo persists after a process/store restart.
  const restarted = await demoStore(pathToFileURL(directory + "/"));
  assert.equal(
    (await restarted.slots("skin", from, to)).find((s) => s.id === all[1].id)
      .enabled,
    false,
  );
});
test("API protects admin data, rejects cross-origin writes, strips public customer data and rate-limits login", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "clinic-api-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = await demoStore(pathToFileURL(directory + "/"));
  const config = {
    demo: true,
    email: "admin@example.com",
    secret: "test-secret",
    passwordHash: hashPassword("correct password"),
  };
  const handle = createHandler({ store, config });
  const req = (
    path,
    method = "GET",
    body,
    cookie,
    origin = "http://localhost:5173",
  ) =>
    new Request(`http://localhost:5173/api/${path}`, {
      method,
      headers: {
        ...(body && { "Content-Type": "application/json", Origin: origin }),
        ...(cookie && { cookie }),
      },
      ...(body && { body: JSON.stringify(body) }),
    });
  assert.equal((await handle(req("admin/slots?month=2026-10"))).status, 401);
  assert.equal(
    (
      await handle(
        req(
          "admin/login",
          "POST",
          { email: config.email, password: "correct password" },
          null,
          "https://evil.example",
        ),
      )
    ).status,
    403,
  );
  const login = await handle(
    req("admin/login", "POST", {
      email: config.email,
      password: "correct password",
    }),
  );
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  assert.match(login.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert.equal(
    (await handle(req("admin/session", "GET", null, cookie))).status,
    200,
  );
  const soon = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 7);
  const publicSlots = await (
    await handle(req(`availability?clinic=skin&month=${soon}`))
  ).json();
  assert.ok(publicSlots.slots.length);
  const slot = publicSlots.slots[0];
  const response = await handle(
    req("bookings", "POST", {
      slotId: slot.id,
      name: "Private Name",
      email: "private@example.com",
      phone: "+92 300 1234567",
    }),
  );
  assert.equal(response.status, 201);
  const publicAfter = await (
    await handle(req(`availability?clinic=skin&month=${soon}`))
  ).text();
  assert.equal(publicAfter.includes("Private Name"), false);
  assert.equal(publicAfter.includes("private@example.com"), false);
  assert.equal(publicAfter.includes(slot.id), false);
  const admin = await (
    await handle(req(`admin/slots?month=${soon}`, "GET", null, cookie))
  ).text();
  assert.equal(admin.includes("private@example.com"), true);
  const directRoute = new Request(
    "http://localhost:5173/.netlify/functions/api/config",
  );
  assert.equal((await handle(directRoute)).status, 200);
  for (let i = 0; i < 7; i++)
    await handle(
      req("admin/login", "POST", { email: config.email, password: "wrong" }),
    );
  assert.equal(
    (
      await handle(
        req("admin/login", "POST", { email: config.email, password: "wrong" }),
      )
    ).status,
    429,
  );
});
