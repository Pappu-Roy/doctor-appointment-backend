const { SLOT_MINUTES } = require("../constants");
const MS_PER_MIN = 60 * 1000;

function clinicOffset() {
  return process.env.CLINIC_UTC_OFFSET || "+06:00";
}

// "2026-10-05" ফরম্যাট + আসলেই বাস্তব তারিখ কিনা (2026-02-31 রিজেক্ট)
function isValidDateString(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(`${dateStr}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(dateStr);
}

// ক্লিনিকের একটা দিনের শুরু-শেষ (UTC Date) — DB query এর জন্য
function clinicDayRange(dateStr, offset = clinicOffset()) {
  const start = new Date(`${dateStr}T00:00:00${offset}`);
  const end = new Date(start.getTime() + 24 * 60 * MS_PER_MIN);
  return { start, end };
}

// UTC Date কে ক্লিনিকের তারিখ ("YYYY-MM-DD") বানায়
function toClinicDateString(date, offset = clinicOffset()) {
  const sign = offset.startsWith("-") ? -1 : 1;
  const [h, m] = offset.slice(1).split(":").map(Number);
  const shifted = new Date(date.getTime() + sign * (h * 60 + m) * MS_PER_MIN);
  return shifted.toISOString().slice(0, 10);
}

/**
 * PURE function: DB/Prisma কিছুই জানে না, তাই সহজে test করা যায়।
 * রিটার্ন: [{ startTime, endTime, available }]
 */
function generateSlots({
  dateStr, availability, bufferTime = 0, bookedStarts = [],
  now = new Date(), offset = clinicOffset(),
}) {
  const dayOfWeek = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  const booked = new Set(bookedStarts.map((d) => new Date(d).getTime()));

  const slotMs = SLOT_MINUTES * MS_PER_MIN;
  const stepMs = (SLOT_MINUTES + bufferTime) * MS_PER_MIN;
  const slots = [];

  for (const window of availability.filter((a) => a.dayOfWeek === dayOfWeek)) {
    let cursor = new Date(`${dateStr}T${window.startTime}:00${offset}`).getTime();
    const windowEnd = new Date(`${dateStr}T${window.endTime}:00${offset}`).getTime();

    while (cursor + slotMs <= windowEnd) {
      slots.push({
        startTime: new Date(cursor).toISOString(),
        endTime: new Date(cursor + slotMs).toISOString(),
        available: !booked.has(cursor) && cursor > now.getTime(),
      });
      cursor += stepMs; // slot + buffer
    }
  }
  return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

module.exports = {
  generateSlots, isValidDateString, clinicDayRange, toClinicDateString, clinicOffset,
};