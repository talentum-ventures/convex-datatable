import { createContext, useContext, useSyncExternalStore } from "react";
import type { ColumnId, CollaboratorPresence, RowId } from "./types";

const EMPTY_COLLABORATORS: ReadonlyArray<CollaboratorPresence> = [];

type CollaboratorListener = () => void;

function collaboratorCellKey(rowId: RowId, columnId: ColumnId): string {
  return `${String(rowId)}\u001f${columnId}`;
}

function isSameActiveCell(
  left: CollaboratorPresence["activeCell"],
  right: CollaboratorPresence["activeCell"]
): boolean {
  return left?.rowId === right?.rowId && left?.columnId === right?.columnId;
}

function isSameCollaborator(left: CollaboratorPresence, right: CollaboratorPresence): boolean {
  return (
    left.userId === right.userId &&
    left.name === right.name &&
    left.color === right.color &&
    isSameActiveCell(left.activeCell, right.activeCell)
  );
}

function areSameCollaborators(
  left: ReadonlyArray<CollaboratorPresence>,
  right: ReadonlyArray<CollaboratorPresence>
): boolean {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const leftCollaborator = left[index];
    const rightCollaborator = right[index];
    if (!leftCollaborator || !rightCollaborator || !isSameCollaborator(leftCollaborator, rightCollaborator)) {
      return false;
    }
  }

  return true;
}

export class CollaboratorStore {
  private listeners = new Set<CollaboratorListener>();

  private collaboratorsByCell = new Map<string, ReadonlyArray<CollaboratorPresence>>();

  constructor(collaborators: ReadonlyArray<CollaboratorPresence> = EMPTY_COLLABORATORS) {
    this.collaboratorsByCell = this.buildCellMap(collaborators, new Map());
  }

  subscribe = (listener: CollaboratorListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getForCell(rowId: RowId, columnId: ColumnId): ReadonlyArray<CollaboratorPresence> {
    return this.collaboratorsByCell.get(collaboratorCellKey(rowId, columnId)) ?? EMPTY_COLLABORATORS;
  }

  update(collaborators: ReadonlyArray<CollaboratorPresence>): void {
    const nextCollaboratorsByCell = this.buildCellMap(collaborators, this.collaboratorsByCell);
    if (this.isSameCellMap(this.collaboratorsByCell, nextCollaboratorsByCell)) {
      return;
    }

    this.collaboratorsByCell = nextCollaboratorsByCell;
    this.emit();
  }

  private buildCellMap(
    collaborators: ReadonlyArray<CollaboratorPresence>,
    previous: ReadonlyMap<string, ReadonlyArray<CollaboratorPresence>>
  ): Map<string, ReadonlyArray<CollaboratorPresence>> {
    const nextDrafts = new Map<string, CollaboratorPresence[]>();

    for (const collaborator of collaborators) {
      const activeCell = collaborator.activeCell;
      if (!activeCell) {
        continue;
      }

      const key = collaboratorCellKey(activeCell.rowId, activeCell.columnId);
      const current = nextDrafts.get(key);
      if (current) {
        current.push(collaborator);
        continue;
      }

      nextDrafts.set(key, [collaborator]);
    }

    const next = new Map<string, ReadonlyArray<CollaboratorPresence>>();
    for (const [key, value] of nextDrafts) {
      const previousValue = previous.get(key) ?? EMPTY_COLLABORATORS;
      next.set(key, areSameCollaborators(previousValue, value) ? previousValue : value);
    }

    return next;
  }

  private isSameCellMap(
    left: ReadonlyMap<string, ReadonlyArray<CollaboratorPresence>>,
    right: ReadonlyMap<string, ReadonlyArray<CollaboratorPresence>>
  ): boolean {
    if (left.size !== right.size) {
      return false;
    }

    for (const [key, value] of left) {
      if (right.get(key) !== value) {
        return false;
      }
    }

    return true;
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const CollaboratorStoreContext = createContext<CollaboratorStore | null>(null);

export function useCollaboratorStore(): CollaboratorStore {
  const store = useContext(CollaboratorStoreContext);
  if (!store) {
    throw new Error("CollaboratorStoreContext is missing.");
  }
  return store;
}

export function useCollaboratorsForCell(
  store: CollaboratorStore,
  rowId: RowId,
  columnId: ColumnId
): ReadonlyArray<CollaboratorPresence> {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getForCell(rowId, columnId),
    () => EMPTY_COLLABORATORS
  );
}
