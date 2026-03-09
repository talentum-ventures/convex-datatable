import { useLayoutEffect } from "react";

function focusListbox(node: HTMLDivElement | null): void {
  if (!node) {
    return;
  }

  node.focus({ preventScroll: true });
}

export function usePortaledListboxFocus(listRef: { current: HTMLDivElement | null }): void {
  useLayoutEffect(() => {
    const node = listRef.current;
    if (!node) {
      return;
    }

    focusListbox(node);

    const ownerWindow = node.ownerDocument.defaultView;
    if (!ownerWindow) {
      return;
    }

    const frameId = ownerWindow.requestAnimationFrame(() => {
      focusListbox(node);
    });

    return () => {
      ownerWindow.cancelAnimationFrame(frameId);
    };
  }, [listRef]);
}
