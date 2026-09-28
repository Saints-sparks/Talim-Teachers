/**
 * @jest-environment jsdom
 */
import { classroomService } from "@/app/services/classroom/classroom.service";
import { startDirectChat } from "@/app/services/chat.service";
import { missingFromError } from "@/hooks/attendance/register.logic";
import { apiClient } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { sessionStore } from "@/lib/session";
import { makeRegisterFixture, makeRosterFixture } from "@/lib/fixtures/classroom.fixture";

const fetchMock = jest.fn();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  sessionStore._resetForTests();
  apiClient.setAccessToken("session-token");
});

describe("classroom.service against the API", () => {
  it("reads a register for a date, and today without one", async () => {
    fetchMock.mockResolvedValue(json(200, makeRegisterFixture("c1")));
    await classroomService.getRegister("c1", "2026-09-24");
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/registers/c1?date=2026-09-24");
    await classroomService.getRegister("c1");
    expect(fetchMock.mock.calls[1][0]).toBe("http://api.test/registers/c1");
  });

  it("unwraps the success envelope", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { success: true, data: makeRosterFixture("c2") }));
    const roster = await classroomService.getRoster("c2");
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/teachers/me/classes/c2/students");
    expect(roster.class.name).toBe("JSS2 B");
  });

  it("PUTs marks with submit and surfaces the 409 `missing` count", async () => {
    fetchMock.mockResolvedValueOnce(
      json(409, { success: false, statusCode: 409, message: "2 students are not marked", error: { code: "CONFLICT", message: "2 students are not marked" }, missing: 2 }),
    );
    const body = { marks: [{ studentId: "s1", status: "present" as const }], submit: true };
    const error = await classroomService.saveRegister("c1", "2026-09-25", body).catch((e: unknown) => e);
    const [url, config] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/registers/c1?date=2026-09-25");
    expect(config.method).toBe("PUT");
    expect(JSON.parse(config.body)).toEqual(body);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("CONFLICT");
    expect(missingFromError(error)).toBe(2);
  });

  it("encodes ids in paths", async () => {
    fetchMock.mockResolvedValueOnce(json(200, {}));
    await classroomService.getStudentRecord("a/b");
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/teachers/me/students/a%2Fb");
  });
});

describe("startDirectChat", () => {
  it("POSTs a one-to-one room with both user ids and returns its id", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { _id: "room-7", type: "one_to_one", participants: ["me", "g1"], reused: true }));
    await expect(startDirectChat("g1", "me")).resolves.toBe("room-7");
    const [url, config] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/chat/rooms");
    expect(JSON.parse(config.body)).toEqual({ type: "one_to_one", participants: ["me", "g1"] });
  });
});

describe("classroom.service on fixtures (NEXT_PUBLIC_USE_FIXTURES)", () => {
  const previous = process.env.NEXT_PUBLIC_USE_FIXTURES;
  beforeAll(() => {
    process.env.NEXT_PUBLIC_USE_FIXTURES = "true";
  });
  afterAll(() => {
    process.env.NEXT_PUBLIC_USE_FIXTURES = previous;
  });

  it("answers an incomplete submit with the same 409 shape as the API, and never calls fetch", async () => {
    const error = await classroomService.saveRegister("c1", undefined, { marks: [{ studentId: "s1", status: "present" }], submit: true }).catch((e: unknown) => e);
    expect(missingFromError(error)).toBe(10);
    const draft = await classroomService.saveRegister("c1", undefined, { marks: [{ studentId: "s2", status: "late" }], submit: false });
    expect(draft.students.find((s) => s.id === "s2")?.status).toBe("late");
    const reloaded = await classroomService.getRegister("c1");
    expect(reloaded.students.find((s) => s.id === "s1")?.status).toBe("present");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
