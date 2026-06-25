import type { SelectOption } from "../../core/types";
import { cn } from "../../core/cn";

export type OptionBadgeProps = {
  option: SelectOption;
  isSelected: boolean;
  isActive: boolean;
};

export function OptionBadge({
  option,
  isSelected: _isSelected,
  isActive: _isActive
}: OptionBadgeProps): JSX.Element {
  const Icon = option.icon;

  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1 truncate rounded-full px-2 py-0.5 text-sm font-medium",
        option.colorClass ?? "",
      )}
      style={option.colorStyle}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {option.label}
    </span>
  );
}
