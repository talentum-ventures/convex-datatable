import type { SelectOption } from "../../core/types";
import { cn } from "../../core/cn";

export type OptionBadgeProps = {
  option: SelectOption;
  isSelected: boolean;
  isActive: boolean;
};

export function OptionBadge({
  option,
  isSelected,
  isActive
}: OptionBadgeProps): JSX.Element {
  const Icon = option.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        option.colorClass,
        isActive ? "ring-2 ring-slate-900/10 ring-offset-1 ring-offset-white" : "",
        isSelected ? "shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12)]" : ""
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {option.label}
    </span>
  );
}
