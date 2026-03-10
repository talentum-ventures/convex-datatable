import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { ColumnMenuAnchor } from "./use-table-columns";

const HEADER_MENU_WIDTH_PX = 288;
const HEADER_MENU_GAP_PX = 4;
const VIEWPORT_PADDING_PX = 8;

type HeaderMenuPosition = Pick<CSSProperties, "left" | "opacity" | "position" | "top" | "width">;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hiddenStyle(): HeaderMenuPosition {
  return {
    left: 0,
    opacity: 0,
    position: "fixed",
    top: 0,
    width: HEADER_MENU_WIDTH_PX
  };
}

function equalPosition(
  current: HeaderMenuPosition,
  next: HeaderMenuPosition
): boolean {
  return (
    current.left === next.left &&
    current.opacity === next.opacity &&
    current.position === next.position &&
    current.top === next.top &&
    current.width === next.width
  );
}

export function useHeaderMenuPosition(
  trigger: HTMLElement | null,
  anchor: ColumnMenuAnchor
): HeaderMenuPosition {
  const [style, setStyle] = useState<HeaderMenuPosition>(() => hiddenStyle());
  const triggerRef = useRef<HTMLElement | null>(trigger);
  const anchorRef = useRef<ColumnMenuAnchor>(anchor);
  const frameIdRef = useRef<number | null>(null);

  triggerRef.current = trigger;
  anchorRef.current = anchor;

  const updatePositionRef = useRef<() => void>(() => undefined);
  updatePositionRef.current = () => {
    const nextTrigger = triggerRef.current;
    const ownerWindow = nextTrigger?.ownerDocument.defaultView;
    if (!nextTrigger || !ownerWindow) {
      setStyle((current) => {
        const next = hiddenStyle();
        return equalPosition(current, next) ? current : next;
      });
      return;
    }

    const rect = nextTrigger.getBoundingClientRect();
    const projectedLeft = anchorRef.current === "left"
      ? rect.left
      : rect.right - HEADER_MENU_WIDTH_PX;
    const maxLeft = Math.max(
      VIEWPORT_PADDING_PX,
      ownerWindow.innerWidth - VIEWPORT_PADDING_PX - HEADER_MENU_WIDTH_PX
    );
    const nextStyle: HeaderMenuPosition = {
      left: clamp(projectedLeft, VIEWPORT_PADDING_PX, maxLeft),
      opacity: 1,
      position: "fixed",
      top: rect.bottom + HEADER_MENU_GAP_PX,
      width: HEADER_MENU_WIDTH_PX
    };

    setStyle((current) => (equalPosition(current, nextStyle) ? current : nextStyle));
  };

  const schedulePositionUpdateRef = useRef<() => void>(() => undefined);
  schedulePositionUpdateRef.current = () => {
    const ownerWindow = triggerRef.current?.ownerDocument.defaultView;
    const currentFrameId = frameIdRef.current;
    if (ownerWindow && currentFrameId !== null) {
      ownerWindow.cancelAnimationFrame(currentFrameId);
    }

    if (!ownerWindow) {
      updatePositionRef.current();
      return;
    }

    frameIdRef.current = ownerWindow.requestAnimationFrame(() => {
      frameIdRef.current = null;
      updatePositionRef.current();
    });
  };

  useLayoutEffect(() => {
    schedulePositionUpdateRef.current();
  });

  useEffect(() => {
    if (!trigger) {
      return;
    }

    const ownerWindow = trigger.ownerDocument.defaultView;
    const grid = trigger.closest<HTMLElement>("[role='grid']");
    const schedulePositionUpdate = (): void => {
      schedulePositionUpdateRef.current();
    };

    schedulePositionUpdate();

    grid?.addEventListener("scroll", schedulePositionUpdate, { passive: true });
    ownerWindow?.addEventListener("resize", schedulePositionUpdate);
    ownerWindow?.addEventListener("scroll", schedulePositionUpdate, true);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            schedulePositionUpdate();
          });
    resizeObserver?.observe(trigger);

    return () => {
      const currentFrameId = frameIdRef.current;
      if (ownerWindow && currentFrameId !== null) {
        ownerWindow.cancelAnimationFrame(currentFrameId);
        frameIdRef.current = null;
      }
      grid?.removeEventListener("scroll", schedulePositionUpdate);
      ownerWindow?.removeEventListener("resize", schedulePositionUpdate);
      ownerWindow?.removeEventListener("scroll", schedulePositionUpdate, true);
      resizeObserver?.disconnect();
    };
  }, [trigger]);

  return style;
}
