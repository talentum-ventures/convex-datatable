import type {
  DataTableColumn,
  DataTableRowModel
} from "./types";
import { findOptionByValue } from "./select-options";

const COMMON_DATE_LOCALES = ["en-US", "en-GB", "pt-BR", "pt-PT", "es-ES", "fr-FR", "de-DE", "it-IT"];
const monthLookupCache = new Map<string, ReadonlyMap<string, number>>();

function normalizeDateToken(token: string): string {
  return token
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isoDateString(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isoDateFromDate(date: Date): string {
  return isoDateString(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

function expandedYear(yearText: string): number {
  const year = Number.parseInt(yearText, 10);
  if (yearText.length === 2) {
    return year >= 70 ? 1900 + year : 2000 + year;
  }
  return year;
}

function localeCandidates(locale: string | undefined): string[] {
  if (!locale) {
    return COMMON_DATE_LOCALES;
  }

  return [locale, ...COMMON_DATE_LOCALES.filter((entry) => entry !== locale)];
}

function monthLookupForLocale(locale: string): ReadonlyMap<string, number> {
  const cached = monthLookupCache.get(locale);
  if (cached) {
    return cached;
  }

  const lookup = new Map<string, number>();
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const sample = new Date(Date.UTC(2026, monthIndex, 2));
    for (const monthStyle of ["short", "long"] as const) {
      const label = new Intl.DateTimeFormat(locale, {
        month: monthStyle,
        timeZone: "UTC"
      }).format(sample);
      lookup.set(normalizeDateToken(label), monthIndex + 1);
    }
  }

  monthLookupCache.set(locale, lookup);
  return lookup;
}

function monthNumberFromToken(token: string, locale: string | undefined): number | null {
  const normalizedToken = normalizeDateToken(token);
  if (normalizedToken.length === 0) {
    return null;
  }

  for (const candidateLocale of localeCandidates(locale)) {
    const month = monthLookupForLocale(candidateLocale).get(normalizedToken);
    if (month !== undefined) {
      return month;
    }
  }

  return null;
}

function parseWordDate(raw: string, locale: string | undefined): string | null {
  const cleaned = raw.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const dayMonthYear = cleaned.match(/^(\d{1,2})\s+(?:de\s+)?([^\s]+)\s+(?:de\s+)?(\d{4})$/i);
  if (dayMonthYear) {
    const day = Number.parseInt(dayMonthYear[1] ?? "", 10);
    const month = monthNumberFromToken(dayMonthYear[2] ?? "", locale);
    const year = Number.parseInt(dayMonthYear[3] ?? "", 10);
    if (month !== null && isValidDateParts(year, month, day)) {
      return isoDateString(year, month, day);
    }
  }

  const monthDayYear = cleaned.match(/^([^\s]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (monthDayYear) {
    const month = monthNumberFromToken(monthDayYear[1] ?? "", locale);
    const day = Number.parseInt(monthDayYear[2] ?? "", 10);
    const year = Number.parseInt(monthDayYear[3] ?? "", 10);
    if (month !== null && isValidDateParts(year, month, day)) {
      return isoDateString(year, month, day);
    }
  }

  return null;
}

function parseNumericDate(raw: string, locale: string | undefined): string | null {
  const isoLike = raw.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (isoLike) {
    const year = Number.parseInt(isoLike[1] ?? "", 10);
    const month = Number.parseInt(isoLike[2] ?? "", 10);
    const day = Number.parseInt(isoLike[3] ?? "", 10);
    return isValidDateParts(year, month, day) ? isoDateString(year, month, day) : null;
  }

  const localized = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!localized) {
    return null;
  }

  const first = Number.parseInt(localized[1] ?? "", 10);
  const second = Number.parseInt(localized[2] ?? "", 10);
  const year = expandedYear(localized[3] ?? "");

  let month = first;
  let day = second;

  if (first > 12) {
    day = first;
    month = second;
  } else if (second > 12) {
    month = first;
    day = second;
  } else if (locale && !locale.toLowerCase().startsWith("en-us")) {
    day = first;
    month = second;
  }

  return isValidDateParts(year, month, day) ? isoDateString(year, month, day) : null;
}

export function formatColumnValue<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>,
  value: string | number | boolean | null | Date | ReadonlyArray<string>
): string {
  if (value === null) {
    return "";
  }

  switch (column.kind) {
    case "text":
    case "longText":
    case "link":
      return typeof value === "string" ? value : String(value);
    case "number":
      return typeof value === "number" ? String(value) : "";
    case "currency": {
      if (typeof value !== "number") {
        return "";
      }
      return new Intl.NumberFormat(column.locale, {
        style: "currency",
        currency: column.currency,
        minimumFractionDigits: column.minimumFractionDigits,
        maximumFractionDigits: column.maximumFractionDigits
      }).format(value);
    }
    case "select": {
      const textValue = typeof value === "string" ? value : "";
      const option = findOptionByValue(column.options, textValue);
      return option ? option.label : textValue;
    }
    case "multiselect": {
      if (!Array.isArray(value)) {
        return "";
      }
      const labels = value
        .map((entry) => {
          const option = findOptionByValue(column.options, entry);
          return option ? option.label : entry;
        })
        .filter((entry) => entry.length > 0);
      return labels.join(", ");
    }
    case "date": {
      const dateValue = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(dateValue.getTime())) {
        return "";
      }
      return new Intl.DateTimeFormat(column.locale, {
        dateStyle: column.dateStyle ?? "medium",
        timeZone: column.timezone
      }).format(dateValue);
    }
    case "reactNode":
      return "";
  }
}

export function parseTextNumber(input: string): number {
  const parsed = Number.parseFloat(input);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed;
}

export function parseDateValue(input: string, locale?: string): string {
  const raw = input.trim();
  if (raw.length === 0) {
    return "";
  }

  const matchedIsoDate = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (matchedIsoDate?.[1]) {
    return matchedIsoDate[1];
  }

  const wordDate = parseWordDate(raw, locale);
  if (wordDate) {
    return wordDate;
  }

  const numericDate = parseNumericDate(raw, locale);
  if (numericDate) {
    return numericDate;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return input;
  }

  return isoDateFromDate(parsed);
}
