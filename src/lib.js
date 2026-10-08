export const BRAND = "Clinical Appointment Demo";
export const CLINICS = {
  aesthetic: {
    name: "Aesthetic clinic",
    short: "Aesthetic",
    description: "Thoughtful treatments, tailored to you.",
    detail: "Explore aesthetic treatments with a personal consultation.",
    tag: "Aesthetics & rejuvenation",
  },
  skin: {
    name: "Skin care clinic",
    short: "Skin care",
    description: "A fresh start for your skin.",
    detail: "Discuss your skin concerns and build a care plan.",
    tag: "Skin health & care",
  },
};
export const ZONE = "Asia/Karachi";
export function dateKey(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function currentMonth() {
  return dateKey(new Date()).slice(0, 7);
}
export function moveMonth(month, offset) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + offset, 1)).toISOString().slice(0, 7);
}
export function monthLabel(month) {
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: ZONE,
  });
}
export function timeLabel(date) {
  return new Date(date)
    .toLocaleTimeString("en-GB", {
      timeZone: ZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
}
export function fullDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
export function shortDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: ZONE,
    day: "numeric",
    month: "short",
  });
}
export async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body && { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The booking service is unavailable. Please try again.");
  }
  if (!response.ok) {
    const error = new Error(data.error || "Please try again.");
    error.status = response.status;
    throw error;
  }
  return data;
}
export function json(method, body) {
  return { method, body: JSON.stringify(body) };
}
export function calendarContents(slot, clinic) {
  const stamp = (date) =>
    new Date(date)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Clinical Appointment Demo//Appointments//EN",
      "BEGIN:VEVENT",
      `UID:${slot.id}@forma.local`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(slot.startsAt)}`,
      `DTEND:${stamp(new Date(new Date(slot.startsAt).getTime() + 30 * 60000))}`,
      `SUMMARY:${BRAND} - ${CLINICS[clinic].name}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n"
  );
}
export function downloadCalendar(slot, clinic) {
  const content = calendarContents(slot, clinic);
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "clinic-appointment.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
