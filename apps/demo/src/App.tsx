import { useEffect, useMemo, useState } from "react";
import { Globe, Layers } from "lucide-react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexPage } from "./convex-page";
import { InMemoryPage } from "./in-memory-page";

type DemoPageId = "in-memory" | "convex";

const PAGE_COPY: Record<
  DemoPageId,
  {
    title: string;
    description: string;
  }
> = {
  "in-memory": {
    title: "In-memory",
    description: "Local data source with the full feature surface enabled."
  },
  convex: {
    title: "Convex",
    description: "Adapter-driven pagination and collaborative presence."
  }
};

function readPageFromHash(hash: string): DemoPageId {
  return hash === "#/convex" ? "convex" : "in-memory";
}

export function App(): JSX.Element {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;
  const [page, setPage] = useState<DemoPageId>(() =>
    typeof window === "undefined" ? "in-memory" : readPageFromHash(window.location.hash)
  );
  const convexClient = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl]
  );

  useEffect(() => {
    const syncPage = (): void => {
      setPage(readPageFromHash(window.location.hash));
    };

    window.addEventListener("hashchange", syncPage);
    return () => {
      window.removeEventListener("hashchange", syncPage);
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 p-6">
      <header className="shrink-0 space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Convex DataTable</h1>
          <p className="max-w-4xl text-sm text-slate-600">
            Two dedicated demo pages: one for the in-memory data source and one for the Convex adapter flow.
          </p>
        </div>
        <nav className="flex flex-wrap gap-3" aria-label="Demo pages">
          <a
            href="#/in-memory"
            aria-current={page === "in-memory" ? "page" : undefined}
            className={`inline-flex min-w-56 items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm transition ${
              page === "in-memory"
                ? "border-sky-300 bg-white text-slate-900"
                : "border-slate-200 bg-white/70 text-slate-700"
            }`}
          >
            <Layers className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="block text-sm font-medium">{PAGE_COPY["in-memory"].title}</span>
              <span className="block text-xs text-slate-500">{PAGE_COPY["in-memory"].description}</span>
            </span>
          </a>
          <a
            href="#/convex"
            aria-current={page === "convex" ? "page" : undefined}
            className={`inline-flex min-w-56 items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm transition ${
              page === "convex"
                ? "border-teal-300 bg-white text-slate-900"
                : "border-slate-200 bg-white/70 text-slate-700"
            }`}
          >
            <Globe className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="block text-sm font-medium">{PAGE_COPY.convex.title}</span>
              <span className="block text-xs text-slate-500">{PAGE_COPY.convex.description}</span>
            </span>
          </a>
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {page === "convex" ? (
          convexClient ? (
            <ConvexProvider client={convexClient}>
              <ConvexPage />
            </ConvexProvider>
          ) : (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-sm text-amber-950">
              Set <code>VITE_CONVEX_URL</code> in <code>apps/demo/.env.local</code> and run{" "}
              <code>npx convex dev</code> from <code>apps/demo</code> to use the real Convex page.
            </section>
          )
        ) : (
          <InMemoryPage />
        )}
      </div>
    </main>
  );
}
