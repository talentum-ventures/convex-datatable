import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  forwardRef,
  useId
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../core/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white hover:bg-slate-800",
        secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
        ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
        destructive: "bg-rose-600 text-white hover:bg-rose-700"
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        lg: "h-10 px-5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm outline-none ring-offset-2 transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, ...props }, ref) => {
    const id = useId();
    const isChecked = Boolean(checked);

    return (
      <span className={cn("dt-checkbox relative inline-flex h-4 w-4 shrink-0", className)}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            "dt-checkbox-box pointer-events-none flex h-4 w-4 items-center justify-center rounded border transition-colors",
            isChecked && "dt-checkbox-box--checked"
          )}
        >
          {isChecked ? (
            <svg
              className="dt-checkbox-icon h-2.5 w-2.5"
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1.5 5 L3.8 7.5 L8.5 2.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
      </span>
    );
  }
);

Checkbox.displayName = "Checkbox";

export type BadgeProps = {
  className?: string;
  children: string;
};

export function Badge({ className, children }: BadgeProps): JSX.Element {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium", className)}>
      {children}
    </span>
  );
}
