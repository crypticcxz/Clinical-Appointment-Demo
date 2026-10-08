export const CLINICS = ["aesthetic", "skin"];
export const TIMEZONE = "Asia/Karachi";
export const UUID =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function validateBooking(data) {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email =
    typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  if (name.length < 2 || name.length > 100)
    throw new AppError("Enter your full name (2–100 characters).");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AppError("Enter a valid email address.");
  if (
    !/^\+?[\d\s().-]{7,25}$/.test(phone) ||
    phone.replace(/\D/g, "").length < 7
  )
    throw new AppError("Enter a valid phone number.");
  if (typeof data.slotId !== "string" || !UUID.test(data.slotId))
    throw new AppError("Choose an available appointment.");
  return { name, email, phone, slotId: data.slotId };
}
export function validateSlots(data, now = new Date()) {
  if (!CLINICS.includes(data.clinic))
    throw new AppError("Choose a valid clinic.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || ""))
    throw new AppError("Choose a valid date.");
  const calendarDate = new Date(`${data.date}T00:00:00Z`);
  if (
    !Number.isFinite(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0, 10) !== data.date
  )
    throw new AppError("Choose a valid date.");
  if (
    !Array.isArray(data.times) ||
    !data.times.length ||
    data.times.length > 26
  )
    throw new AppError("Select at least one time slot (maximum 26).");
  const starts = [...new Set(data.times)].map((time) => {
    if (typeof time !== "string" || !/^(0[89]|1\d|20):(00|30)$/.test(time))
      throw new AppError(
        "Times must be between 08:00 and 20:30, in 30-minute intervals.",
      );
    const start = new Date(`${data.date}T${time}:00+05:00`);
    if (start <= now || start > new Date(now.getTime() + 366 * 86400000))
      throw new AppError("Slots must be in the future and within one year.");
    return start.toISOString();
  });
  return { clinic: data.clinic, starts };
}
export function monthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || ""))
    throw new AppError("Choose a valid month.");
  const [y, m] = month.split("-").map(Number);
  if (y < 2020 || y > 2100) throw new AppError("Choose a valid month.");
  return {
    from: new Date(`${month}-01T00:00:00+05:00`).toISOString(),
    to: new Date(
      `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01T00:00:00+05:00`,
    ).toISOString(),
  };
}
