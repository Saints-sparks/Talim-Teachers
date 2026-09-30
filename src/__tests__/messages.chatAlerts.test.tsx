/**
 * @jest-environment jsdom
 *
 * The app-wide chat alerts: a message in another conversation shows a
 * banner and (with "Sound for new messages" on and the page visible) plays
 * the chime; the conversation open in a focused window gets neither.
 */
import { renderHook } from "@testing-library/react";
import { useChatAlerts } from "@/app/hooks/useChatAlerts";
import { toast } from "@/components/CustomToast";
import { playMessageSound, unlockMessageSound } from "@/lib/messageSound";
import type { ChatRoomActivityData } from "@/app/hooks/useWebSocket";

let pathname = "/dashboard";
let emitActivity: (data: ChatRoomActivityData) => void = () => undefined;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => pathname,
}));
jest.mock("@/components/CustomToast", () => ({ toast: { info: jest.fn(), warning: jest.fn() } }));
jest.mock("@/lib/messageSound", () => ({ playMessageSound: jest.fn(), unlockMessageSound: jest.fn() }));
jest.mock("@/app/context/WebSocketContext", () => ({
  useWebSocketContextSafe: () => ({
    onChatRoomActivity: (cb: (data: ChatRoomActivityData) => void) => {
      emitActivity = cb;
      return () => undefined;
    },
    onNotification: () => () => undefined,
  }),
}));

const ME = "u-teacher";
const activity = (roomId: string, senderId = "u-parent"): ChatRoomActivityData =>
  ({ roomId, lastMessage: { senderId, senderName: "Mrs. Adaobi Obi", preview: "Good morning", type: "text", createdAt: "2026-09-25T06:52:00Z" } }) as unknown as ChatRoomActivityData;

/**
 * Sets what the page reports about itself.
 *
 * @param visible - `document.visibilityState` is "visible".
 * @param focused - `document.hasFocus()`.
 */
function setPage(visible: boolean, focused: boolean) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (visible ? "visible" : "hidden") });
  jest.spyOn(document, "hasFocus").mockReturnValue(focused);
}

/**
 * Mounts the hook the way the chat provider does.
 *
 * @param options - The open room and the sound preference.
 * @param options.openRoom - The room open in the chat, if any.
 * @param options.soundEnabled - "Sound for new messages".
 */
function mount({ openRoom = null, soundEnabled = true }: { openRoom?: string | null; soundEnabled?: boolean } = {}) {
  renderHook(() => useChatAlerts({ currentUserId: ME, totalUnread: 0, isRoomOpen: (id) => id === openRoom, soundEnabled }));
}

beforeEach(() => {
  jest.clearAllMocks();
  pathname = "/dashboard";
  setPage(true, true);
});

describe("the new-message sound and banner", () => {
  it("chimes and shows a banner for a message elsewhere, and arms audio once sound is on", () => {
    mount();
    expect(unlockMessageSound).toHaveBeenCalled();
    emitActivity(activity("room-obi"));
    expect(playMessageSound).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith("Mrs. Adaobi Obi: Good morning", expect.any(Object));
  });

  it("stays silent and shows no banner for the conversation open in a focused window", () => {
    pathname = "/messages";
    mount({ openRoom: "room-obi" });
    emitActivity(activity("room-obi"));
    expect(playMessageSound).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("still alerts for the open conversation when its window is in the background", () => {
    pathname = "/messages";
    setPage(true, false);
    mount({ openRoom: "room-obi" });
    emitActivity(activity("room-obi"));
    expect(playMessageSound).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it("alerts for a different conversation while one is open", () => {
    pathname = "/messages";
    mount({ openRoom: "room-c2" });
    emitActivity(activity("room-obi"));
    expect(playMessageSound).toHaveBeenCalledTimes(1);
  });

  it("makes no sound on a hidden page or with the preference off", () => {
    setPage(false, false);
    mount();
    emitActivity(activity("room-obi"));
    expect(playMessageSound).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    setPage(true, true);
    mount({ soundEnabled: false });
    emitActivity(activity("room-obi"));
    expect(playMessageSound).not.toHaveBeenCalled();
    expect(unlockMessageSound).not.toHaveBeenCalled();
  });

  it("ignores my own messages from another tab or device", () => {
    mount();
    emitActivity(activity("room-obi", ME));
    expect(playMessageSound).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});
