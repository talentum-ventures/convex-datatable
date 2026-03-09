import { useEffect, useState, type CSSProperties } from "react";

export type NodeContainerRef = {
  current: Node | null;
};

export function useDropdownPosition(anchorRef: NodeContainerRef): CSSProperties {
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

      const rect = nextAnchor.getBoundingClientRect();
      setStyle({
        left: rect.left,
        top: rect.bottom + 4,
        opacity: 1
      });
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

    return () => {
      if (ownerWindow) {
        ownerWindow.cancelAnimationFrame(frameId);
        ownerWindow.removeEventListener("resize", schedulePositionUpdate);
        ownerWindow.removeEventListener("scroll", schedulePositionUpdate, true);
      }
      grid?.removeEventListener("scroll", schedulePositionUpdate);
      resizeObserver?.disconnect();
    };
  }, [anchorRef]);

  return style;
}
