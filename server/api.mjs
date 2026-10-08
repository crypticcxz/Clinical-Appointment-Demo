import { createHash, randomBytes } from "node:crypto";
import {
  AppError,
  CLINICS,
  UUID,
  monthRange,
  validateBooking,
  validateSlots,
} from "./domain.mjs";
import {
  checkPassword,
  hashPassword,
  requireAdmin,
  signSession,
  sessionCookie,
} from "./auth.mjs";
import { postgresStore, demoStore } from "./store.mjs";

let storePromise;
const demoSecret = randomBytes(32).toString("hex");
const demoHash = hashPassword("admin123");
export function createHandler({ store, config }) {
  return async (request) => {
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    const reply = (body, status = 200, extra = {}) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...headers, ...extra },
      });
    try {
      const url = new URL(request.url);
      const route = url.pathname
        .replace(/^\/(?:\.netlify\/functions\/)?api\/?/, "")
        .replace(/\/$/, "");
      const method = request.method;
      if (!["GET", "POST", "PATCH"].includes(method))
        throw new AppError("Method not allowed.", 405);
      if (method !== "GET") {
        const origin = request.headers.get("origin");
        if (!origin || origin !== url.origin)
          throw new AppError("Request origin is not allowed.", 403);
        if (
          !request.headers.get("content-type")?.startsWith("application/json")
        )
          throw new AppError("Send JSON data.", 415);
      }
      let body = {};
      if (method !== "GET") {
        const text = await request.text();
        if (text.length > 10000)
          throw new AppError("Request is too large.", 413);
        try {
          body = JSON.parse(text);
        } catch {
          throw new AppError("Invalid request data.");
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new AppError("Invalid request data.");
      }
      const ip = request.headers.get("x-nf-client-connection-ip") || "local";
      const key = (type) =>
        `${type}:${createHash("sha256")
          .update(ip + config.secret)
          .digest("hex")}`;
      if (route === "config" && method === "GET")
        return reply({ demo: config.demo, timezone: "Asia/Karachi" });
      if (route === "availability" && method === "GET") {
        if (!CLINICS.includes(url.searchParams.get("clinic")))
          throw new AppError("Choose a clinic.");
        const { from, to } = monthRange(url.searchParams.get("month"));
        const slots = await store.slots(
          url.searchParams.get("clinic"),
          from,
          to,
        );
        return reply({
          slots: slots
            .filter((s) => s.available)
            .map(({ id, clinic, startsAt }) => ({ id, clinic, startsAt })),
        });
      }
      if (route === "bookings" && method === "POST") {
        await store.rateLimit(key("booking"), 20, 3600);
        const booking = await store.book(validateBooking(body));
        return reply({ booking }, 201);
      }
      if (route === "admin/login" && method === "POST") {
        await store.rateLimit(key("login"), 8, 900);
        const validPassword = checkPassword(body.password, config.passwordHash);
        if (
          !validPassword ||
          typeof body.email !== "string" ||
          body.email.trim().toLowerCase() !== config.email
        )
          throw new AppError("Email or password is incorrect.", 401);
        return reply({ ok: true }, 200, {
          "Set-Cookie": sessionCookie(
            signSession(config.secret, config.email),
            config.demo,
          ),
        });
      }
      if (route.startsWith("admin/")) {
        requireAdmin(request, config);
        if (route === "admin/session" && method === "GET")
          return reply({ email: config.email, demo: config.demo });
        if (route === "admin/logout" && method === "POST")
          return reply({ ok: true }, 200, {
            "Set-Cookie": sessionCookie("", config.demo, true),
          });
        if (route === "admin/slots" && method === "GET") {
          const { from, to } = monthRange(url.searchParams.get("month"));
          const clinic = url.searchParams.get("clinic");
          if (clinic && !CLINICS.includes(clinic))
            throw new AppError("Choose a valid clinic.");
          return reply({
            slots: await store.slots(clinic || null, from, to, true),
          });
        }
        if (route === "admin/slots" && method === "POST") {
          const input = validateSlots(body);
          await store.addSlots(input.clinic, input.starts);
          return reply({ ok: true }, 201);
        }
        const slotMatch = route.match(/^admin\/slots\/([\da-f-]{36})$/i);
        if (slotMatch && method === "PATCH") {
          if (!UUID.test(slotMatch[1]) || typeof body.enabled !== "boolean")
            throw new AppError(
              "Choose a valid slot and open or blocked status.",
            );
          await store.setEnabled(slotMatch[1], body.enabled);
          return reply({ ok: true });
        }
        const cancelMatch = route.match(
          /^admin\/bookings\/([\da-f-]{36})\/cancel$/i,
        );
        if (cancelMatch && method === "POST") {
          if (!UUID.test(cancelMatch[1]))
            throw new AppError("Choose a valid booking.");
          await store.cancel(cancelMatch[1]);
          return reply({ ok: true });
        }
        const rescheduleMatch = route.match(
          /^admin\/bookings\/([\da-f-]{36})\/reschedule$/i,
        );
        if (rescheduleMatch && method === "POST") {
          if (
            !UUID.test(rescheduleMatch[1]) ||
            typeof body.slotId !== "string" ||
            !UUID.test(body.slotId)
          )
            throw new AppError("Choose a valid booking and an available time.");
          await store.reschedule(rescheduleMatch[1], body.slotId);
          return reply({ ok: true });
        }
      }
      throw new AppError("Endpoint not found.", 404);
    } catch (error) {
      if (error instanceof AppError)
        return reply({ error: error.message }, error.status);
      console.error("API operation failed:", error.code || error.name);
      return reply(
        { error: "We couldn’t complete this request. Please try again." },
        500,
      );
    }
  };
}
export async function handleRequest(request) {
  const demo =
    process.env.LOCAL_DEMO === "true" &&
    process.env.NODE_ENV !== "production" &&
    !process.env.NETLIFY;
  const config = demo
    ? {
        demo: true,
        email: "login@admin.com",
        passwordHash: demoHash,
        secret: demoSecret,
      }
    : {
        demo: false,
        email: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
        passwordHash: process.env.ADMIN_PASSWORD_HASH,
        secret: process.env.SESSION_SECRET,
      };
  if (
    !demo &&
    (!process.env.DATABASE_URL ||
      !config.email ||
      !config.passwordHash ||
      !config.secret ||
      config.secret.length < 32)
  )
    return new Response(
      JSON.stringify({
        error: "Online booking is not available yet. Please try again later.",
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  try {
    storePromise ||= demo
      ? demoStore()
      : Promise.resolve(postgresStore(process.env.DATABASE_URL));
    return await createHandler({ store: await storePromise, config })(request);
  } catch {
    storePromise = undefined;
    return new Response(
      JSON.stringify({ error: "Booking service is temporarily unavailable." }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
