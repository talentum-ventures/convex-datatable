import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHeaderMenuPosition } from "./use-header-menu-position";

const originalResizeObserver = globalThis.ResizeObserver;
const originalInnerWidth = window.innerWidth;

describe("useHeaderMenuPosition", () => {
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

  it("clamps a right-aligned menu within the viewport when the trigger is near the edge", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 400
    });

    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.getBoundingClientRect = () => ({
      bottom: 36,
      height: 20,
      left: 360,
      right: 400,
      top: 16,
      width: 40,
      x: 360,
      y: 16,
      toJSON: () => ({})
    });

    const { result, unmount } = renderHook(() => useHeaderMenuPosition(trigger, "right"));

    await waitFor(() => {
      expect(result.current.left).toBe(104);
      expect(result.current.top).toBe(40);
      expect(result.current.width).toBe(288);
      expect(result.current.position).toBe("fixed");
      expect(result.current.opacity).toBe(1);
    });

    unmount();
    trigger.remove();
  });
});
