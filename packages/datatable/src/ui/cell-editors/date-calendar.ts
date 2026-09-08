export type CalendarMonth = {
  year: number;
  month: number;
};

export type CalendarDay = {
  isoDate: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CALENDAR_WEEK_COUNT = 6;
const DAYS_PER_WEEK = 7;

export function isoDateString(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayIsoDate(now = new Date()): string {
  return isoDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function parseIsoDateParts(isoDate: string): (CalendarMonth & { day: number }) | null {
  const matched = isoDate.trim().match(ISO_DATE_PATTERN);
  if (!matched) {
    return null;
  }

  const year = Number.parseInt(matched[1] ?? "", 10);
  const month = Number.parseInt(matched[2] ?? "", 10);
  const day = Number.parseInt(matched[3] ?? "", 10);
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function calendarMonthFromIso(isoDate: string, fallbackNow = new Date()): CalendarMonth {
  const parsed = parseIsoDateParts(isoDate);
  if (parsed) {
    return { year: parsed.year, month: parsed.month };
  }

  return {
    year: fallbackNow.getFullYear(),
    month: fallbackNow.getMonth() + 1
  };
}

export function shiftCalendarMonth(current: CalendarMonth, delta: number): CalendarMonth {
  const zeroBased = current.month - 1 + delta;
  const yearDelta = Math.floor(zeroBased / 12);
  const monthIndex = ((zeroBased % 12) + 12) % 12;

  return {
    year: current.year + yearDelta,
    month: monthIndex + 1
  };
}

export function getCalendarWeeks(
  current: CalendarMonth,
  todayIso: string
): ReadonlyArray<ReadonlyArray<CalendarDay>> {
  const firstOfMonth = new Date(current.year, current.month - 1, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(current.year, current.month - 1, 1 - startOffset);
  const weeks: CalendarDay[][] = [];

  for (let weekIndex = 0; weekIndex < CALENDAR_WEEK_COUNT; weekIndex += 1) {
    const week: CalendarDay[] = [];
    for (let weekday = 0; weekday < DAYS_PER_WEEK; weekday += 1) {
      const cellDate = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + weekIndex * DAYS_PER_WEEK + weekday
      );
      const isoDate = isoDateString(
        cellDate.getFullYear(),
        cellDate.getMonth() + 1,
        cellDate.getDate()
      );
      week.push({
        isoDate,
        day: cellDate.getDate(),
        inCurrentMonth: cellDate.getMonth() === current.month - 1,
        isToday: isoDate === todayIso
      });
    }
    weeks.push(week);
  }

  return weeks;
}

export function formatMonthLabel(current: CalendarMonth, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric"
  }).format(new Date(current.year, current.month - 1, 1));
}

export function formatIsoDateLabel(isoDate: string, locale?: string): string {
  const parsed = parseIsoDateParts(isoDate);
  if (!parsed) {
    return isoDate;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium"
  }).format(new Date(parsed.year, parsed.month - 1, parsed.day));
}

export function weekdayLabels(locale?: string): ReadonlyArray<string> {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const labels: string[] = [];

  for (let weekday = 0; weekday < DAYS_PER_WEEK; weekday += 1) {
    // 4 Jan 2026 is a Sunday, so offsets 0-6 walk a full week.
    labels.push(formatter.format(new Date(2026, 0, 4 + weekday)));
  }

  return labels;
}
