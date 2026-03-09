export type DebugScalar = string | number | boolean | null;

export type DebugDetails = Readonly<Record<string, DebugScalar>>;

export type DebugEventEntry = {
  ts: string;
  scope: string;
  message: string;
  details: DebugDetails;
};

const DEBUG_FLAG_PARAM = "dt_debug";
const DEBUG_STORAGE_FLAG = "rolha-grid:debug";
export const DEBUG_EVENTS_STORAGE_KEY = "rolha-grid:debug:events";
const DEBUG_MAX_EVENTS = 600;

const throttledEvents: Record<string, number> = {};

function readStoredEvents(): DebugEventEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(DEBUG_EVENTS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ReadonlyArray<DebugEventEntry>;
    return Array.isArray(parsed) ? [...parsed] : [];
  } catch {
    return [];
  }
}

function writeStoredEvents(events: ReadonlyArray<DebugEventEntry>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DEBUG_EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore storage errors while logging
  }
}

export function debugEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const queryFlag = params.get(DEBUG_FLAG_PARAM);

  if (queryFlag === "1") {
    try {
      window.localStorage.setItem(DEBUG_STORAGE_FLAG, "1");
    } catch {
      // ignore storage errors while enabling debug
    }
    return true;
  }

  if (queryFlag === "0") {
    try {
      window.localStorage.removeItem(DEBUG_STORAGE_FLAG);
    } catch {
      // ignore storage errors while disabling debug
    }
    return false;
  }

  return window.localStorage.getItem(DEBUG_STORAGE_FLAG) === "1";
}

export function pushDebugEvent(
  scope: string,
  message: string,
  details: DebugDetails = {}
): void {
  if (!debugEnabled() || typeof window === "undefined") {
    return;
  }

  const entry: DebugEventEntry = {
    ts: new Date().toISOString(),
    scope,
    message,
    details
  };

  const events = readStoredEvents();
  events.push(entry);
  if (events.length > DEBUG_MAX_EVENTS) {
    events.splice(0, events.length - DEBUG_MAX_EVENTS);
  }
  writeStoredEvents(events);

  console.log(`[rolha-grid][${scope}] ${message}`, details);
}

export function pushDebugEventThrottled(
  scope: string,
  key: string,
  minIntervalMs: number,
  message: string,
  details: DebugDetails = {}
): void {
  if (!debugEnabled()) {
    return;
  }

  const composite = `${scope}:${key}`;
  const now = Date.now();
  const last = throttledEvents[composite] ?? 0;
  if (now - last < minIntervalMs) {
    return;
  }

  throttledEvents[composite] = now;
  pushDebugEvent(scope, message, details);
}

export function readDebugEvents(): ReadonlyArray<DebugEventEntry> {
  return readStoredEvents();
}

export function clearDebugEvents(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(DEBUG_EVENTS_STORAGE_KEY);
  } catch {
    // ignore storage errors while clearing debug log
  }
}
