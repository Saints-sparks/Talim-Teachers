/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useWebSocket } from "@/app/hooks/useWebSocket";
import { authService } from "@/app/services/auth.service";

/** A stand-in for a Socket.IO client that records listeners and lets a test fire events. */
class FakeSocket {
  connected = false;
  listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  emitted: Array<[string, unknown]> = [];

  on(event: string, cb: (...args: unknown[]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)?.add(cb);
    return this;
  }
  off(event: string, cb: (...args: unknown[]) => void) {
    this.listeners.get(event)?.delete(cb);
    return this;
  }
  emit(event: string, payload?: unknown) {
    this.emitted.push([event, payload]);
    return true;
  }
  removeAllListeners() {
    this.listeners.clear();
  }
  connect() {
    return this;
  }
  disconnect() {
    this.connected = false;
  }
  timeout() {
    return { emit: jest.fn() };
  }
  /** Delivers an event to whoever is listening. */
  fire(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }
}

let socket: FakeSocket;
jest.mock("socket.io-client", () => ({
  io: () => {
    socket = new FakeSocket();
    return socket;
  },
}));
jest.mock("@/app/services/auth.service", () => ({ authService: { refreshSession: jest.fn().mockResolvedValue("new-token") } }));

describe("useWebSocket", () => {
  it("attaches listeners registered before the socket existed, once it connects", () => {
    const { result } = renderHook(() => useWebSocket());
    const received = jest.fn();
    act(() => {
      result.current.onNotification(received);
    });

    act(() => result.current.connect("u1"));
    act(() => socket.fire("notification", { _id: "n1", title: "Hi", type: "x", createdAt: "" }));

    expect(received).toHaveBeenCalledWith(expect.objectContaining({ _id: "n1" }));
  });

  it("removes exactly the listener that was unsubscribed", () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("u1"));
    const first = jest.fn();
    const second = jest.fn();
    let off: () => void = () => undefined;
    act(() => {
      off = result.current.onNotification(first);
      result.current.onNotification(second);
    });

    off();
    act(() => socket.fire("notification", { _id: "n1", title: "Hi", type: "x", createdAt: "" }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("answers an emit made while disconnected with an OFFLINE ack instead of hanging", async () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("u1"));

    await expect(result.current.joinChatRoom("room1")).resolves.toEqual({
      ok: false,
      error: { code: "OFFLINE", message: "You're offline." },
    });
  });

  it("tracks connection status from the socket's own events", () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("u1"));
    expect(result.current.connectionStatus).toBe("connecting");

    act(() => socket.fire("connect"));
    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionStatus).toBe("connected");

    act(() => socket.fire("disconnect", "io client disconnect"));
    expect(result.current.connectionStatus).toBe("disconnected");
  });

  it("refreshes the token once, then reconnects, when the server refuses it", async () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("u1"));
    const connect = jest.spyOn(socket, "connect");

    await act(async () => {
      socket.fire("connect_error", Object.assign(new Error("nope"), { data: { code: "UNAUTHENTICATED" } }));
    });

    expect(authService.refreshSession).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
