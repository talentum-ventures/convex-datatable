import { useEffect, useState, type CSSProperties } from "react";

const DROPDOWN_GAP_PX = 4;
const VIEWPORT_PADDING_PX = 8;

export type NodeContainerRef = {
  current: Node | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function equalPosition(current: CSSProperties, next: CSSProperties): boolean {
  return current.left === next.left && current.top === next.top && current.opacity === next.opacity;
}

export function useDropdownPosition(
  anchorRef: NodeContainerRef,
  dialogRef?: NodeContainerRef
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({
    left: 0,
    top: 0,
    opacity: 0
  });

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!(anchor instanceof HTMLElement)) {
      return;
    }

    const ownerWindow = anchor.ownerDocument.defaultView;
    const grid = anchor.closest<HTMLElement>("[role='grid']");
    let frameId = 0;

    const updatePosition = (): void => {
      const nextAnchor = anchorRef.current;
      if (!(nextAnchor instanceof HTMLElement)) {
        return;
      }
      const nextOwnerWindow = nextAnchor.ownerDocument.defaultView;
      if (!nextOwnerWindow) {
        return;
      }

      const rect = nextAnchor.getBoundingClientRect();
      const nextDialog = dialogRef?.current;
      const dialogRect =
        nextDialog instanceof HTMLElement
          ? nextDialog.getBoundingClientRect()
          : { height: 0, width: 0 };
      const maxLeft = Math.max(
        VIEWPORT_PADDING_PX,
        nextOwnerWindow.innerWidth - VIEWPORT_PADDING_PX - dialogRect.width
      );
      const belowTop = rect.bottom + DROPDOWN_GAP_PX;
      const aboveTop = rect.top - DROPDOWN_GAP_PX - dialogRect.height;
      const availableBelow = nextOwnerWindow.innerHeight - VIEWPORT_PADDING_PX - belowTop;
      const availableAbove = rect.top - VIEWPORT_PADDING_PX;
      const shouldFlipAbove =
        dialogRect.height > 0 &&
        belowTop + dialogRect.height > nextOwnerWindow.innerHeight - VIEWPORT_PADDING_PX &&
        availableAbove > availableBelow;
      const unclampedTop = shouldFlipAbove ? aboveTop : belowTop;
      const maxTop = Math.max(
        VIEWPORT_PADDING_PX,
        nextOwnerWindow.innerHeight - VIEWPORT_PADDING_PX - dialogRect.height
      );
      const nextStyle = {
        left: clamp(rect.left, VIEWPORT_PADDING_PX, maxLeft),
        top: clamp(unclampedTop, VIEWPORT_PADDING_PX, maxTop),
        opacity: 1
      };

      setStyle((current) => (equalPosition(current, nextStyle) ? current : nextStyle));
    };

    const schedulePositionUpdate = (): void => {
      if (!ownerWindow) {
        updatePosition();
        return;
      }

      ownerWindow.cancelAnimationFrame(frameId);
      frameId = ownerWindow.requestAnimationFrame(updatePosition);
    };

    schedulePositionUpdate();

    grid?.addEventListener("scroll", schedulePositionUpdate, { passive: true });
    ownerWindow?.addEventListener("resize", schedulePositionUpdate);
    ownerWindow?.addEventListener("scroll", schedulePositionUpdate, true);

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => schedulePositionUpdate());
    resizeObserver?.observe(anchor);
    if (dialogRef?.current instanceof HTMLElement) {
      resizeObserver?.observe(dialogRef.current);
    }

    return () => {
      if (ownerWindow) {
        ownerWindow.cancelAnimationFrame(frameId);
        ownerWindow.removeEventListener("resize", schedulePositionUpdate);
        ownerWindow.removeEventListener("scroll", schedulePositionUpdate, true);
      }
      grid?.removeEventListener("scroll", schedulePositionUpdate);
      resizeObserver?.disconnect();
    };
  }, [anchorRef, dialogRef]);

  return style;
}
