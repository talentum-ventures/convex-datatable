function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function scrollCellIntoView(args: {
  containerNode: HTMLDivElement;
  cellNode: HTMLElement;
  stickyHeaderHeight: number;
  leftPinnedWidth: number;
  rightPinnedWidth: number;
}): void {
  const {
    containerNode,
    cellNode,
    stickyHeaderHeight,
    leftPinnedWidth,
    rightPinnedWidth
  } = args;

  const parentCell = cellNode.closest("td");
  const targetNode = parentCell instanceof HTMLElement ? parentCell : cellNode;
  const containerRect = containerNode.getBoundingClientRect();
  const cellRect = targetNode.getBoundingClientRect();
  const pinnedState = targetNode.getAttribute("data-pinned-state") ?? "center";
  const minVisibleTop = containerRect.top + stickyHeaderHeight;
  const maxVisibleBottom = containerRect.bottom;
  let nextScrollTop = containerNode.scrollTop;

  if (cellRect.top < minVisibleTop) {
    nextScrollTop -= minVisibleTop - cellRect.top;
  } else if (cellRect.bottom > maxVisibleBottom) {
    nextScrollTop += cellRect.bottom - maxVisibleBottom;
  }

  let nextScrollLeft = containerNode.scrollLeft;
  if (pinnedState === "center") {
    const minVisibleLeft = containerRect.left + leftPinnedWidth;
    const maxVisibleRight = containerRect.right - rightPinnedWidth;

    if (cellRect.left < minVisibleLeft) {
      nextScrollLeft -= minVisibleLeft - cellRect.left;
    } else if (cellRect.right > maxVisibleRight) {
      nextScrollLeft += cellRect.right - maxVisibleRight;
    }
  }

  const maxScrollTop = Math.max(0, containerNode.scrollHeight - containerNode.clientHeight);
  const maxScrollLeft = Math.max(0, containerNode.scrollWidth - containerNode.clientWidth);
  const finalScrollTop = clamp(Math.round(nextScrollTop), 0, maxScrollTop);
  const finalScrollLeft = clamp(Math.round(nextScrollLeft), 0, maxScrollLeft);

  if (finalScrollTop !== containerNode.scrollTop) {
    containerNode.scrollTop = finalScrollTop;
  }
  if (finalScrollLeft !== containerNode.scrollLeft) {
    containerNode.scrollLeft = finalScrollLeft;
  }
}
