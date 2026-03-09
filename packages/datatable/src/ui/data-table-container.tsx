import type { ReactNode } from "react";

export function DataTableContainer({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="relative overflow-visible rounded-3xl bg-[radial-gradient(circle_at_20%_20%,rgba(125,211,252,0.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(253,224,71,0.28),transparent_38%),linear-gradient(180deg,#ffffff,#f1f5f9)] p-3 sm:p-5">
      {children}
    </div>
  );
}
