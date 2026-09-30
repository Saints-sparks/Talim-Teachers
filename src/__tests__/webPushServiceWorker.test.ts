import { readFileSync } from "fs";
import { join } from "path";
import vm from "vm";

/**
 * Runs `public/sw.js` in a sandbox that looks like a service worker scope, and
 * fires `pushsubscriptionchange` at it. This checks the worker's logic; it does
 * not talk to a real push service.
 */
const SOURCE = readFileSync(join(__dirname, "../../public/sw.js"), "utf8");
const PENDING = "/__talim_push__/pending";
const CONFIG = "/__talim_push__/config";

interface Scope {
  fire: (event: Record<string, unknown>) => Promise<void>;
  /** Delivers a push with this JSON payload. */
  push: (payload: Record<string, unknown>) => Promise<void>;
  showNotification: jest.Mock;
  notes: Map<string, string>;
  subscribe: jest.Mock;
  postMessage: jest.Mock;
  fetch: jest.Mock;
}

/**
 * Builds the sandbox and loads the worker into it.
 *
 * @param options - What the worker's registration and clients do.
 * @returns Handles to drive and inspect the worker.
 */
function loadWorker(
  options: { subscribeFails?: boolean; currentSubscription?: unknown; windows?: { url: string; focused: boolean }[] } = {},
): Scope {
  const notes = new Map<string, string>();
  const cache = {
    match: async (url: string) => (notes.has(url) ? new Response(notes.get(url)) : undefined),
    put: async (url: string, response: Response) => void notes.set(url, await response.text()),
  };
  const subscribe = jest.fn(async () => {
    if (options.subscribeFails) throw new Error("permission gone");
    return { endpoint: "https://push.example/new" };
  });
  const postMessage = jest.fn();
  const fetchMock = jest.fn();
  const handlers: Record<string, (event: unknown) => void> = {};
  const showNotification = jest.fn();
  const self = {
    location: { origin: "https://app.example" },
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      handlers[type] = handler;
    },
    registration: {
      pushManager: { getSubscription: async () => options.currentSubscription ?? null, subscribe },
      showNotification,
    },
  };
  const sandbox = {
    self,
    caches: { open: async () => cache },
    clients: {
      matchAll: async () => (options.windows ? options.windows.map((w) => ({ ...w, postMessage })) : [{ postMessage }]),
      openWindow: jest.fn(),
    },
    fetch: fetchMock,
    atob: (value: string) => Buffer.from(value, "base64").toString("binary"),
    Response,
    Uint8Array,
    URL,
    Set,
    Date,
    JSON,
    Promise,
    Array,
  };
  vm.runInNewContext(SOURCE, sandbox);

  return {
    notes,
    subscribe,
    postMessage,
    fetch: fetchMock,
    showNotification,
    fire: async (event) => {
      let pending: Promise<unknown> = Promise.resolve();
      handlers.pushsubscriptionchange({ ...event, waitUntil: (promise: Promise<unknown>) => (pending = promise) });
      await pending;
    },
    push: async (payload) => {
      let pending: Promise<unknown> = Promise.resolve();
      handlers.push({ data: { json: () => payload, text: () => JSON.stringify(payload) }, waitUntil: (promise: Promise<unknown>) => (pending = promise) });
      await pending;
    },
  };
}

const note = (scope: Scope, url: string) => JSON.parse(scope.notes.get(url) ?? "null");

describe("service worker: pushsubscriptionchange", () => {
  it("keeps the browser's new subscription, notes the old endpoint and pings open tabs", async () => {
    const worker = loadWorker();

    await worker.fire({
      oldSubscription: { endpoint: "https://push.example/old" },
      newSubscription: { endpoint: "https://push.example/new" },
    });

    expect(worker.subscribe).not.toHaveBeenCalled();
    expect(note(worker, PENDING).staleEndpoints).toEqual(["https://push.example/old"]);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "PUSH_SUBSCRIPTION_CHANGED" });
  });

  it("re-subscribes with the old subscription's key when the browser gave no new one", async () => {
    const worker = loadWorker();
    const key = new Uint8Array([1, 2, 3]);

    await worker.fire({ oldSubscription: { endpoint: "https://push.example/old", options: { applicationServerKey: key } } });

    expect(worker.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: key });
    expect(note(worker, PENDING).staleEndpoints).toEqual(["https://push.example/old"]);
  });

  it("falls back to the key the page saved, when the old subscription carries none", async () => {
    const worker = loadWorker();
    worker.notes.set(CONFIG, JSON.stringify({ vapidKey: "AQID" })); // bytes 1, 2, 3

    await worker.fire({});

    const [{ applicationServerKey }] = worker.subscribe.mock.calls[0] as unknown as [{ applicationServerKey: Uint8Array }];
    expect(Array.from(applicationServerKey)).toEqual([1, 2, 3]);
  });

  it("fetches the public key from the API as a last resort, plain or enveloped", async () => {
    const worker = loadWorker();
    worker.notes.set(CONFIG, JSON.stringify({ apiBaseUrl: "https://api.example" }));
    worker.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { publicKey: "AQID" } }) });

    await worker.fire({});

    expect(worker.fetch).toHaveBeenCalledWith("https://api.example/notifications/web-push/vapid-public-key");
    expect(worker.subscribe).toHaveBeenCalled();
  });

  it("still leaves a note and pings tabs when re-subscribing fails, so the page can finish on load", async () => {
    const worker = loadWorker({ subscribeFails: true });

    await expect(
      worker.fire({ oldSubscription: { endpoint: "https://push.example/old", options: { applicationServerKey: new Uint8Array([1]) } } }),
    ).resolves.toBeUndefined();

    expect(note(worker, PENDING).staleEndpoints).toEqual(["https://push.example/old"]);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "PUSH_SUBSCRIPTION_CHANGED" });
  });

  it("does not lose an earlier unfinished rotation, and never lists the live endpoint as stale", async () => {
    const worker = loadWorker();
    worker.notes.set(PENDING, JSON.stringify({ staleEndpoints: ["https://push.example/first", "https://push.example/new"] }));

    await worker.fire({
      oldSubscription: { endpoint: "https://push.example/second" },
      newSubscription: { endpoint: "https://push.example/new" },
    });

    expect(note(worker, PENDING).staleEndpoints.sort()).toEqual(["https://push.example/first", "https://push.example/second"]);
  });
});

describe("service worker: push for a chat message", () => {
  const message = { title: "Mrs. Adaobi Obi", body: "Good morning", data: { roomId: "room-obi", url: "/messages?room=room-obi" } };

  it("stays quiet when that room is open in a focused window", async () => {
    const worker = loadWorker({ windows: [{ url: "https://app.example/messages?room=room-obi", focused: true }] });
    await worker.push(message);
    expect(worker.showNotification).not.toHaveBeenCalled();
  });

  it("matches the room whatever else is in the url", async () => {
    const worker = loadWorker({ windows: [{ url: "https://app.example/messages?tab=x&room=room-obi", focused: true }] });
    await worker.push(message);
    expect(worker.showNotification).not.toHaveBeenCalled();
  });

  it("still notifies when the room is open but the window is not focused", async () => {
    const worker = loadWorker({ windows: [{ url: "https://app.example/messages?room=room-obi", focused: false }] });
    await worker.push(message);
    expect(worker.showNotification).toHaveBeenCalledWith("Mrs. Adaobi Obi", expect.objectContaining({ body: "Good morning" }));
  });

  it("still notifies when a different room, or another page, is focused", async () => {
    const other = loadWorker({ windows: [{ url: "https://app.example/messages?room=room-c2", focused: true }] });
    await other.push(message);
    expect(other.showNotification).toHaveBeenCalledTimes(1);
    const dashboard = loadWorker({ windows: [{ url: "https://app.example/dashboard", focused: true }] });
    await dashboard.push(message);
    expect(dashboard.showNotification).toHaveBeenCalledTimes(1);
  });

  it("reads a top-level roomId too, and notifies for a push without one", async () => {
    const focused = [{ url: "https://app.example/messages?room=room-obi", focused: true }];
    const topLevel = loadWorker({ windows: focused });
    await topLevel.push({ title: "New message", roomId: "room-obi" });
    expect(topLevel.showNotification).not.toHaveBeenCalled();
    const plain = loadWorker({ windows: focused });
    await plain.push({ title: "Scores published", data: { url: "/grading" } });
    expect(plain.showNotification).toHaveBeenCalledTimes(1);
  });
});
