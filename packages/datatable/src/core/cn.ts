import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ReadonlyArray<string | false | null | undefined>): string {
  return twMerge(clsx(inputs));
}
