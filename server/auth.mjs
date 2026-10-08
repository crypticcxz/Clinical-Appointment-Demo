import {
  createHmac,
  scryptSync,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
import { AppError } from "./domain.mjs";
export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function checkPassword(password, stored) {
  if (typeof password !== "string" || password.length > 200) return false;
  const [salt, expected] = (stored || "").split(":");
  if (!salt || !/^[a-f0-9]{128}$/i.test(expected || "")) return false;
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(expected, "hex"),
  );
}
export function signSession(secret, email, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: now + 8 * 3600000 }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function verifySession(token, secret, email, now = Date.now()) {
  if (!token || !secret) return false;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra) return false;
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    return parsed.email === email && parsed.exp > now;
  } catch {
    return false;
  }
}
export function requireAdmin(request, config) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("forma_session="))
    ?.slice(14);
  if (!verifySession(token, config.secret, config.email))
    throw new AppError("Please sign in to continue.", 401);
}
export function sessionCookie(token, demo = false, clear = false) {
  return `forma_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 28800}${demo ? "" : "; Secure"}`;
}
