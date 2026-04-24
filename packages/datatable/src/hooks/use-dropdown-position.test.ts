import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useDropdownPosition,
  type NodeContainerRef
} from "./use-dropdown-position";

const originalResizeObserver = globalThis.ResizeObserver;
const originalInnerHeight = window.innerHeight;
const originalInnerWidth = window.innerWidth;

function createRect({
  bottom,
  height,
  left,
  right,
  top,
  width
}: {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}): DOMRect {
  return {
    bottom,
    height,
    left,
    right,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({})
  } as DOMRect;
}

describe("useDropdownPosition", () => {
  beforeEach(() => {
    class ResizeObserverMock implements ResizeObserver {
      disconnect(): void {}

      observe(): void {}

      takeRecords(): ResizeObserverEntry[] {
        return [];
      }

      unobserve(): void {}
    }

    globalThis.ResizeObserver = ResizeObserverMock;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalInnerHeight
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth
    });

    if (originalResizeObserver) {
      globalThis.ResizeObserver = originalResizeObserver;
      return;
    }

    Reflect.deleteProperty(globalThis, "ResizeObserver");
  });

  it("positions the dropdown below the anchor when there is enough space", async () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1200
    });

    const anchor = document.createElement("div");
    const dialog = document.createElement("div");
    document.body.append(anchor, dialog);

    anchor.getBoundingClientRect = () =>
      createRect({
        bottom: 140,
        height: 40,
        left: 120,
        right: 320,
        top: 100,
        width: 200
      });
    dialog.getBoundingClientRect = () =>
      createRect({
        bottom: 0,
        height: 180,
        left: 0,
        right: 240,
        top: 0,
        width: 240
      });

    const anchorRef: NodeContainerRef = { current: anchor };
    const dialogRef: NodeContainerRef = { current: dialog };
    const { result, unmount } = renderHook(() => useDropdownPosition(anchorRef, dialogRef));

    await waitFor(() => {
      expect(result.current.left).toBe(120);
      expect(result.current.top).toBe(144);
      expect(result.current.opacity).toBe(1);
    });

    unmount();
  });

  it("flips the dropdown above the anchor when there is more room above", async () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1200
    });

    const anchor = document.createElement("div");
    const dialog = document.createElement("div");
    document.body.append(anchor, dialog);

    anchor.getBoundingClientRect = () =>
      createRect({
        bottom: 700,
        height: 40,
        left: 160,
        right: 360,
        top: 660,
        width: 200
      });
    dialog.getBoundingClientRect = () =>
      createRect({
        bottom: 0,
        height: 180,
        left: 0,
        right: 240,
        top: 0,
        width: 240
      });

    const anchorRef: NodeContainerRef = { current: anchor };
    const dialogRef: NodeContainerRef = { current: dialog };
    const { result, unmount } = renderHook(() => useDropdownPosition(anchorRef, dialogRef));

    await waitFor(() => {
      expect(result.current.left).toBe(160);
      expect(result.current.top).toBe(476);
      expect(result.current.opacity).toBe(1);
    });

    unmount();
  });
});
