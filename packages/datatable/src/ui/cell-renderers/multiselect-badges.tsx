import type { SelectOption } from "../../core/types";
import { cn } from "../../core/cn";
import { findOptionByValue } from "../../core/select-options";

export type MultiSelectBadgesProps = {
  columnId: string;
  options: ReadonlyArray<SelectOption>;
  values: ReadonlyArray<string>;
};

export function MultiSelectBadges({
  columnId,
  options,
  values
}: MultiSelectBadgesProps): JSX.Element {
  if (values.length === 0) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {values.map((entry) => {
        const option = findOptionByValue(options, entry);
        const Icon = option?.icon;
        return (
          <span
            key={`${columnId}-${entry}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              option?.colorClass ?? "bg-slate-100 text-slate-700"
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {option?.label ?? entry}
          </span>
        );
      })}
    </div>
  );
}
