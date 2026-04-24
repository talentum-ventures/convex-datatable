import "@testing-library/jest-dom";
import { afterEach } from "vitest";

function installLocalStorageShim(): void {
  if (typeof window === "undefined") {
    return;
  }

  const storage = window.localStorage as Partial<Storage> | undefined;
  if (
    typeof storage?.getItem === "function" &&
    typeof storage.setItem === "function" &&
    typeof storage.removeItem === "function" &&
    typeof storage.clear === "function"
  ) {
    return;
  }

  const backingStore = new Map<string, string>();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => backingStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        backingStore.set(key, value);
      },
      removeItem: (key: string) => {
        backingStore.delete(key);
      },
      clear: () => {
        backingStore.clear();
      }
    }
  });
}

installLocalStorageShim();

afterEach(() => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.clear();
});
