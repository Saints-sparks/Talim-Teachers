/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import MessageBubble from "@/components/messages/MessageBubble";
import type { ChatMessageView } from "@/app/lib/chat/normalizeMessage";

jest.mock("@/components/messages/BubbleMenu", () => ({ __esModule: true, default: () => null }));

const message = (over: Partial<ChatMessageView> = {}): ChatMessageView => ({
  _id: "m1",
  roomId: "r1",
  senderId: "u1",
  senderName: "Tolu Teacher",
  senderAvatar: null,
  text: "Homework is on page 12.",
  type: "text",
  attachments: [],
  readBy: [],
  createdAt: "2026-09-30T09:00:00.000Z",
  status: "sent",
  ...over,
});

describe("MessageBubble time line", () => {
  it("is not dimmed on my own bubble in dark mode (75% white on the blue fill fails 4.5:1)", () => {
    render(<MessageBubble message={message()} isOwn showSender={false} time="10:00am" receipt="sent" />);
    const line = screen.getByText("10:00am").parentElement!;
    expect(line.className).toMatch(/(^|\s)opacity-75(\s|$)/);
    expect(line.className).toMatch(/(^|\s)dark:opacity-100(\s|$)/);
  });

  it("stays dimmed on a bubble from someone else", () => {
    render(<MessageBubble message={message({ senderId: "u2", senderName: "Sola Second" })} isOwn={false} showSender time="10:01am" />);
    const line = screen.getByText("10:01am").parentElement!;
    expect(line.className).toMatch(/(^|\s)opacity-75(\s|$)/);
    expect(line.className).not.toMatch(/dark:opacity-100/);
  });
});
