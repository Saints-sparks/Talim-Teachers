/**
 * @jest-environment jsdom
 */
import {
  getNotification,
  listAnnouncements,
  listNotifications,
  markAnnouncementRead,
  markNotificationRead,
} from "@/app/services/notifications.service";
import { apiClient } from "@/lib/apiClient";
import { sessionStore } from "@/lib/session";

const fetchMock = jest.fn();

/**
 * A JSON `fetch` response.
 *
 * @param status - HTTP status.
 * @param body - Body to serialise.
 * @returns The response.
 */
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  sessionStore._resetForTests();
  apiClient.setAccessToken("session-token");
});

describe("notifications.service", () => {
  it("reads both inbox lists with paging and the recipient the API expects", async () => {
    fetchMock.mockResolvedValue(json(200, { data: [], meta: { total: 0 } }));

    await listAnnouncements("u1");
    await listNotifications("u1", { limit: 1 });

    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/notifications/announcements/receiver/u1?page=1&limit=50");
    expect(fetchMock.mock.calls[1][0]).toBe("http://api.test/notifications?recipientId=u1&page=1&limit=1");
  });

  it("marks read with PUT and no body: the server reads the reader from the token", async () => {
    fetchMock.mockResolvedValue(json(200, { _id: "n1" }));

    await markNotificationRead("n1");
    await markAnnouncementRead("a1");

    expect(fetchMock.mock.calls.map(([url, config]) => [config.method, url])).toEqual([
      ["PUT", "http://api.test/notifications/n1/read"],
      ["PUT", "http://api.test/notifications/announcements/a1/read"],
    ]);
    for (const [, config] of fetchMock.mock.calls) expect(config.body).toBeUndefined();
  });

  it("raises NOT_FOUND for a notification that is not the caller's", async () => {
    fetchMock.mockResolvedValueOnce(json(404, { success: false, error: { code: "NOT_FOUND", message: "Notification not found" } }));

    await expect(getNotification("64aef4d2c7d2b7a91d12eabc")).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("unwraps the success envelope so callers see the list, not { success, data }", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { success: true, data: [{ _id: "n1" }] }));

    await expect(listNotifications("u1")).resolves.toEqual([{ _id: "n1" }]);
  });
});
