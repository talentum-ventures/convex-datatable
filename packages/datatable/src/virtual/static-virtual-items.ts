export type StaticVirtualItem = {
  key: number;
  index: number;
  start: number;
  size: number;
  end: number;
  lane: number;
};

export function buildStaticVirtualItems(args: {
  count: number;
  getSize: (index: number) => number;
}): ReadonlyArray<StaticVirtualItem> {
  const items: StaticVirtualItem[] = [];
  let offset = 0;

  for (let index = 0; index < args.count; index += 1) {
    const size = Math.max(0, args.getSize(index));
    const item: StaticVirtualItem = {
      key: index,
      index,
      start: offset,
      size,
      end: offset + size,
      lane: 0
    };

    items.push(item);
    offset = item.end;
  }

  return items;
}

export function getStaticVirtualTotalHeight(items: ReadonlyArray<Pick<StaticVirtualItem, "end">>): number {
  const lastItem = items[items.length - 1];
  return lastItem ? lastItem.end : 0;
}
