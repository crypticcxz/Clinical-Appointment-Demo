import { dateKey } from './lib.js';

export function clinicFromReply(text) {
  const value = text.toLowerCase().trim();
  const aesthetic = /\baesthetic(s)?\b/.test(value);
  const skin = /\bskin\b/.test(value);
  if (aesthetic === skin) return null;
  return aesthetic ? 'aesthetic' : 'skin';
}

export function dateFromReply(text, month, now = new Date()) {
  const value = text.trim().toLowerCase();
  const today = dateKey(now);
  if (value === 'today') return today;
  if (value === 'tomorrow') return dateKey(new Date(new Date(`${today}T12:00:00+05:00`).getTime() + 86400000));
  let candidate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) candidate = value;
  else if (/^\d{1,2}$/.test(value)) candidate = `${month}-${value.padStart(2, '0')}`;
  else {
    const match = value.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/);
    if (!match) return null;
    const names = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const index = names.indexOf(match[2].slice(0, 3));
    if (index < 0) return null;
    candidate = `${match[3] || month.slice(0,4)}-${String(index + 1).padStart(2,'0')}-${match[1].padStart(2,'0')}`;
  }
  const parsed = new Date(`${candidate}T12:00:00+05:00`);
  return !Number.isNaN(parsed.getTime()) && dateKey(parsed) === candidate ? candidate : null;
}

export function minutesFromReply(text) {
  const match = text.trim().toLowerCase().replace(/\./g, '').match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (minute > 59 || hour > (match[3] ? 12 : 23) || (match[3] && hour < 1)) return null;
  if (match[3]) hour = hour % 12 + (match[3] === 'pm' ? 12 : 0);
  return hour * 60 + minute;
}

export function slotFromReply(text, slots) {
  const minutes = minutesFromReply(text);
  if (minutes === null) return null;
  return slots.find(slot => {
    const time = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Karachi', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).format(new Date(slot.startsAt));
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute === minutes;
  }) || null;
}
