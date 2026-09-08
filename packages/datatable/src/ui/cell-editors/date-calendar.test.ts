import { describe, expect, it } from "vitest";
import {
  calendarMonthFromIso,
  formatIsoDateLabel,
  formatMonthLabel,
  getCalendarWeeks,
  parseIsoDateParts,
  shiftCalendarMonth,
  todayIsoDate,
  weekdayLabels
} from "./date-calendar";

describe("date calendar helpers", () => {
  it("parses valid ISO dates and rejects invalid calendar days", () => {
    expect(parseIsoDateParts("2026-03-05")).toEqual({ year: 2026, month: 3, day: 5 });
    expect(parseIsoDateParts("2026-02-30")).toBeNull();
    expect(parseIsoDateParts("March 5")).toBeNull();
  });

  it("shifts months across year boundaries", () => {
    expect(shiftCalendarMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftCalendarMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftCalendarMonth({ year: 2026, month: 3 }, 0)).toEqual({ year: 2026, month: 3 });
  });

  it("builds a six-week grid that keeps month navigation independent of the selected day", () => {
    const weeks = getCalendarWeeks({ year: 2026, month: 3 }, "2026-03-05");
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toHaveLength(7);

    const firstWeek = weeks[0] ?? [];
    expect(firstWeek[0]?.isoDate).toBe("2026-03-01");
    expect(firstWeek[0]?.inCurrentMonth).toBe(true);

    const selected = weeks.flat().find((day) => day.isoDate === "2026-03-05");
    expect(selected?.isToday).toBe(true);
    expect(selected?.inCurrentMonth).toBe(true);

    const aprilWeeks = getCalendarWeeks(shiftCalendarMonth({ year: 2026, month: 3 }, 1), "2026-03-05");
    const aprilNinth = aprilWeeks.flat().find((day) => day.isoDate === "2026-04-09");
    expect(aprilNinth?.inCurrentMonth).toBe(true);
    expect(aprilNinth?.isToday).toBe(false);
  });

  it("formats month and weekday labels for the active locale", () => {
    expect(formatMonthLabel({ year: 2026, month: 4 }, "en-US")).toBe("April 2026");
    expect(formatMonthLabel({ year: 2026, month: 3 }, "pt-BR").toLowerCase()).toContain("março");
    expect(formatMonthLabel({ year: 2026, month: 4 }, "pt-BR").toLowerCase()).toContain("abril");
    expect(weekdayLabels("en-US")[0]).toBe("Sun");
    expect(formatIsoDateLabel("2026-04-09", "en-US")).toBe("Apr 9, 2026");
  });

  it("falls back to today when the current value is not an ISO date", () => {
    const now = new Date(2026, 6, 20);
    expect(calendarMonthFromIso("", now)).toEqual({ year: 2026, month: 7 });
    expect(todayIsoDate(now)).toBe("2026-07-20");
  });
});
