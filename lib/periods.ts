/**
 * Billing-period boundary math (PRD FR-1). Periods are monthly windows anchored
 * on a configurable day (default 15), e.g. "May 15 – Jun 15". All logic is pure
 * and operates on plain {year, month, day} parts so it is fully testable; the
 * caller converts "now" to America/Toronto parts via `torontoParts`.
 */

export interface DateParts {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
}

export interface PeriodBounds {
  /** Inclusive start, YYYY-MM-DD (this anchor date). */
  startDate: string;
  /** Exclusive end, YYYY-MM-DD (the next anchor date). */
  endDate: string;
  /** Human label, e.g. "May 15 – Jun 15". */
  label: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  return [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function addMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function subMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** Clamp an anchor day into a month that may have fewer days (e.g. Feb). */
function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function labelPart(month: number, day: number): string {
  return `${MONTHS[month - 1]} ${day}`;
}

/**
 * Given today's date parts and the anchor day, return the billing period that
 * contains today. Today ON the anchor day belongs to the period that starts that
 * day (start is inclusive).
 */
export function computePeriodBounds(today: DateParts, anchorDay: number): PeriodBounds {
  if (!Number.isInteger(anchorDay) || anchorDay < 1 || anchorDay > 31) {
    throw new Error(`anchorDay must be an integer 1–31, got ${anchorDay}`);
  }

  let start: { year: number; month: number };
  let end: { year: number; month: number };

  if (today.day >= clampDay(today.year, today.month, anchorDay)) {
    start = { year: today.year, month: today.month };
    end = addMonth(today.year, today.month);
  } else {
    start = subMonth(today.year, today.month);
    end = { year: today.year, month: today.month };
  }

  const startDay = clampDay(start.year, start.month, anchorDay);
  const endDay = clampDay(end.year, end.month, anchorDay);

  return {
    startDate: iso(start.year, start.month, startDay),
    endDate: iso(end.year, end.month, endDay),
    label: `${labelPart(start.month, startDay)} – ${labelPart(end.month, endDay)}`,
  };
}

/** Render date parts as a YYYY-MM-DD string. */
export function partsToISODate(parts: DateParts): string {
  return iso(parts.year, parts.month, parts.day);
}

/** Convert a Date to America/Toronto calendar parts (handles DST correctly). */
export function torontoParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}
