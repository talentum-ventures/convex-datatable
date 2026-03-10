import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPresenceEntry,
  resolvePresenceColor,
  toCollaboratorPresence,
  useConvexPresence
} from "./use-convex-presence";

describe("useConvexPresence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("respects explicit collaborator colors and keeps palette colors stable", () => {
    expect(resolvePresenceColor("user-1", "#123456")).toBe("#123456");
    expect(resolvePresenceColor("user-2")).toBe(resolvePresenceColor("user-2"));
    expect(resolvePresenceColor("user-2")).not.toHaveLength(0);
  });

  it("filters the local user and maps active cells", () => {
    expect(
      toCollaboratorPresence(
        [
          {
            tableId: "tasks",
            userId: "local-user",
            userName: "Local",
            userColor: "#111111",
            activeRowId: "row-1",
            activeColumnId: "title",
            lastSeen: Date.now()
          },
          {
            tableId: "tasks",
            userId: "remote-user",
            userName: "Remote",
            userColor: "#222222",
            activeRowId: "row-2",
            activeColumnId: "status",
            lastSeen: Date.now()
          }
        ],
        "local-user"
      )
    ).toEqual([
      {
        userId: "remote-user",
        name: "Remote",
        color: "#222222",
        activeCell: {
          rowId: "row-2",
          columnId: "status"
        }
      }
    ]);
  });

  it("builds heartbeat entries from the active cell state", () => {
    expect(
      buildPresenceEntry({
        tableId: "tasks",
        userId: "local-user",
        userName: "Local",
        userColor: undefined,
        activeCell: {
          rowId: "row-3",
          columnId: "amount"
        }
      })
    ).toEqual({
      tableId: "tasks",
      userId: "local-user",
      userName: "Local",
      userColor: resolvePresenceColor("local-user"),
      activeRowId: "row-3",
      activeColumnId: "amount",
      lastSeen: Date.now()
    });
  });

  it("debounces active cell heartbeats", () => {
    const sendHeartbeat = vi.fn<(entry: ReturnType<typeof buildPresenceEntry>) => void>();
    const { result } = renderHook(() =>
      useConvexPresence({
        tableId: "tasks",
        userId: "local-user",
        userName: "Local",
        usePresenceData: () => [],
        sendHeartbeat,
        debounceMs: 150,
        heartbeatIntervalMs: 10_000
      })
    );

    expect(sendHeartbeat).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.onActiveCellChange({ rowId: "row-1", columnId: "title" });
      result.current.onActiveCellChange({ rowId: "row-1", columnId: "status" });
      vi.advanceTimersByTime(149);
    });

    expect(sendHeartbeat).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(sendHeartbeat).toHaveBeenCalledTimes(2);
    expect(sendHeartbeat).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeRowId: "row-1",
        activeColumnId: "status"
      })
    );
  });

  it("does not restart the debounce window when the active cell is unchanged", () => {
    const sendHeartbeat = vi.fn<(entry: ReturnType<typeof buildPresenceEntry>) => void>();
    const { result } = renderHook(() =>
      useConvexPresence({
        tableId: "tasks",
        userId: "local-user",
        userName: "Local",
        usePresenceData: () => [],
        sendHeartbeat,
        debounceMs: 150,
        heartbeatIntervalMs: 10_000
      })
    );

    expect(sendHeartbeat).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.onActiveCellChange({ rowId: "row-1", columnId: "title" });
      vi.advanceTimersByTime(149);
      result.current.onActiveCellChange({ rowId: "row-1", columnId: "title" });
      vi.advanceTimersByTime(1);
    });

    expect(sendHeartbeat).toHaveBeenCalledTimes(2);
    expect(sendHeartbeat).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeRowId: "row-1",
        activeColumnId: "title"
      })
    );
  });

  it("sends periodic heartbeats even when the cell does not change", () => {
    const sendHeartbeat = vi.fn<(entry: ReturnType<typeof buildPresenceEntry>) => void>();

    renderHook(() =>
      useConvexPresence({
        tableId: "tasks",
        userId: "local-user",
        userName: "Local",
        usePresenceData: () => [],
        sendHeartbeat,
        heartbeatIntervalMs: 10_000
      })
    );

    expect(sendHeartbeat).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(sendHeartbeat).toHaveBeenCalledTimes(2);
  });

  it("keeps the same collaborators reference when only lastSeen changes", () => {
    const sendHeartbeat = vi.fn<(entry: ReturnType<typeof buildPresenceEntry>) => void>();
    let entries = [
      {
        tableId: "tasks",
        userId: "remote-user",
        userName: "Remote",
        userColor: "#222222",
        activeRowId: "row-2",
        activeColumnId: "status",
        lastSeen: Date.now()
      }
    ];

    const { result, rerender } = renderHook(() =>
      useConvexPresence({
        tableId: "tasks",
        userId: "local-user",
        userName: "Local",
        usePresenceData: () => entries,
        sendHeartbeat,
        heartbeatIntervalMs: 10_000
      })
    );

    const initialCollaborators = result.current.collaborators;

    entries = [
      {
        tableId: "tasks",
        userId: "remote-user",
        userName: "Remote",
        userColor: "#222222",
        activeRowId: "row-2",
        activeColumnId: "status",
        lastSeen: Date.now() + 10_000
      }
    ];

    rerender();

    expect(result.current.collaborators).toBe(initialCollaborators);
  });
});
