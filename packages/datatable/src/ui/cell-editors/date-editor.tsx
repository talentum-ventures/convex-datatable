import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../core/cn";
import type { DataTableRowModel } from "../../core/types";
import { useDropdownPosition } from "../../hooks/use-dropdown-position";
import { Button } from "../primitives";
import {
  calendarMonthFromIso,
  formatIsoDateLabel,
  formatMonthLabel,
  getCalendarWeeks,
  shiftCalendarMonth,
  todayIsoDate,
  weekdayLabels
} from "./date-calendar";
import { containsInRefs, dateInputValue, parseEditorValue, type DefaultEditorProps } from "./shared";

export type DateEditorProps<TRow extends DataTableRowModel> = DefaultEditorProps<TRow> & {
  initialText: string;
};

export function DateEditor<TRow extends DataTableRowModel>({
  column,
  row,
  onCommit,
  onCancel,
  initialText
}: DateEditorProps<TRow>): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const finalizedRef = useRef(false);
  const columnRef = useRef(column);
  const rowRef = useRef(row);
  const onCommitRef = useRef(onCommit);
  const onCancelRef = useRef(onCancel);
  columnRef.current = column;
  rowRef.current = row;
  onCommitRef.current = onCommit;
  onCancelRef.current = onCancel;
  const dropdownStyle = useDropdownPosition(wrapperRef, dialogRef);
  const portalRoot = typeof document === "undefined" ? null : document.body;
  const locale = column.kind === "date" ? column.locale : undefined;
  const selectedIso = dateInputValue(initialText);
  const [viewMonth, setViewMonth] = useState(() => calendarMonthFromIso(selectedIso));
  const todayIso = useMemo(() => todayIsoDate(), []);
  const weeks = useMemo(() => getCalendarWeeks(viewMonth, todayIso), [todayIso, viewMonth]);
  const labels = useMemo(() => weekdayLabels(locale), [locale]);
  const displayText = selectedIso ? formatIsoDateLabel(selectedIso, locale) : "";

  const commit = (nextValue: string): void => {
    if (finalizedRef.current) {
      return;
    }

    finalizedRef.current = true;
    onCommitRef.current(parseEditorValue(columnRef.current, nextValue, rowRef.current));
  };

  useEffect(() => {
    const onMouseDown = (event: MouseEvent): void => {
      if (containsInRefs(event.target, [wrapperRef, dialogRef])) {
        return;
      }
      if (finalizedRef.current) {
        return;
      }
      finalizedRef.current = true;
      onCancelRef.current();
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (finalizedRef.current) {
        return;
      }
      finalizedRef.current = true;
      onCancelRef.current();
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      data-dt-editor-root="true"
      className="relative h-full w-full"
    >
      <div className="flex h-full w-full items-center">
        {displayText ? (
          <span className="truncate text-sm text-slate-900">{displayText}</span>
        ) : (
          <span className="text-sm text-slate-400">Select date</span>
        )}
      </div>

      {portalRoot
        ? createPortal(
            <div
              ref={dialogRef}
              role="dialog"
              aria-label={`Edit ${column.header}`}
              data-dt-editor-dialog="true"
              data-dt-date-picker="true"
              className="fixed z-30 w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
              style={dropdownStyle}
              onKeyDown={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 px-0"
                  aria-label="Previous month"
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => {
                    setViewMonth((current) => shiftCalendarMonth(current, -1));
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="text-sm font-medium text-slate-800" data-dt-date-month="true">
                  {formatMonthLabel(viewMonth, locale)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 px-0"
                  aria-label="Next month"
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => {
                    setViewMonth((current) => shiftCalendarMonth(current, 1));
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {labels.map((label, weekdayIndex) => (
                  <div
                    key={`${weekdayIndex}-${label}`}
                    className="flex h-8 items-center justify-center text-xs font-medium uppercase tracking-wide text-slate-500"
                    aria-hidden="true"
                  >
                    {label}
                  </div>
                ))}
                {weeks.flat().map((day) => {
                  const isSelected = day.isoDate === selectedIso;
                  return (
                    <button
                      key={day.isoDate}
                      type="button"
                      data-dt-date={day.isoDate}
                      aria-label={formatIsoDateLabel(day.isoDate, locale)}
                      aria-pressed={isSelected}
                      className={cn(
                        "h-8 w-8 rounded-md text-sm",
                        day.inCurrentMonth ? "text-slate-800" : "text-slate-400",
                        isSelected ? "bg-sky-600 text-white hover:bg-sky-600" : "hover:bg-slate-100",
                        day.isToday && !isSelected ? "ring-1 ring-sky-400" : ""
                      )}
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onClick={() => {
                        commit(day.isoDate);
                      }}
                    >
                      {day.day}
                    </button>
                  );
                })}
              </div>
            </div>,
            portalRoot
          )
        : null}
    </div>
  );
}
