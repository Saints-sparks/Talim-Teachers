/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { useOnboardingSync } from "@/app/hooks/useOnboardingSync";
import * as api from "@/app/services/api.service";
import * as curriculum from "@/app/services/curriculum.services";
import * as chat from "@/app/services/chat.service";
import * as notifications from "@/app/services/notifications.service";

const markStepComplete = jest.fn();
const teacher = { userId: "u1", _id: "u1", firstName: "Ada", lastName: "Bello" };
let signedIn: typeof teacher & { mustChangePassword?: boolean } = teacher;

jest.mock("@/app/context/OnboardingContext", () => ({ useTeacherOnboarding: () => ({ markStepComplete }) }));
jest.mock("@/app/context/AppContext", () => ({ useAppContext: () => ({ user: signedIn, classes: [{ _id: "c1" }] }) }));
jest.mock("@/app/services/api.service");
jest.mock("@/app/services/curriculum.services");
jest.mock("@/app/services/chat.service");
jest.mock("@/app/services/notifications.service", () => ({
  ...jest.requireActual("@/app/services/notifications.service"),
  listAnnouncements: jest.fn(),
  listNotifications: jest.fn(),
}));

const mocked = {
  resources: api.fetchResources as jest.Mock,
  attendance: api.getClassAttendanceStatus as jest.Mock,
  curricula: curriculum.getCurricula as jest.Mock,
  rooms: chat.getChatRooms as jest.Mock,
  announcements: notifications.listAnnouncements as jest.Mock,
  notifications: notifications.listNotifications as jest.Mock,
};

/**
 * Runs one sync and returns the steps that were ticked.
 *
 * @returns The step ids passed to `markStepComplete`.
 */
async function ticked(): Promise<string[]> {
  const { result } = renderHook(() => useOnboardingSync());
  await result.current.syncProgress();
  return markStepComplete.mock.calls.map(([step]) => step);
}

beforeEach(() => {
  jest.clearAllMocks();
  signedIn = teacher;
  mocked.resources.mockResolvedValue([]);
  mocked.curricula.mockResolvedValue([]);
  mocked.rooms.mockResolvedValue([]);
  mocked.attendance.mockResolvedValue(null);
  mocked.announcements.mockResolvedValue({ data: [], meta: { total: 0 } });
  mocked.notifications.mockResolvedValue({ data: [], meta: { total: 0 } });
});

describe("useOnboardingSync", () => {
  it("asks for nothing while a temporary password is still in use", async () => {
    signedIn = { ...teacher, mustChangePassword: true };
    expect(await ticked()).toEqual([]);
    for (const probe of Object.values(mocked)) expect(probe).not.toHaveBeenCalled();
  });

  it("ticks only the profile step for a teacher who has done nothing else", async () => {
    expect(await ticked()).toEqual(["teacher-profile"]);
  });

  it("ticks each step from the data that proves it, asking only for the teacher's own", async () => {
    mocked.resources.mockResolvedValue([{ _id: "r1" }]);
    mocked.curricula.mockResolvedValue([{ _id: "cu1" }]);
    mocked.rooms.mockResolvedValue([{ _id: "room1", type: "class_group" }]);
    mocked.announcements.mockResolvedValue({ data: [{ _id: "a1" }], meta: { total: 1 } });
    mocked.attendance.mockResolvedValue({ students: [{ attendanceMarked: true }] });

    expect((await ticked()).sort()).toEqual(
      ["create-curriculum", "create-group-chat", "mark-attendance", "teacher-profile", "upload-resource", "view-notifications"].sort(),
    );
    expect(mocked.resources).toHaveBeenCalledWith(undefined, "u1");
    expect(mocked.curricula).toHaveBeenCalledWith({ teacherId: "u1" });
  });

  it("does not count a one-to-one chat as a group chat", async () => {
    mocked.rooms.mockResolvedValue([{ _id: "room1", type: "one_to_one" }]);
    expect(await ticked()).not.toContain("create-group-chat");
  });

  it("leaves a step unticked, without failing the sync, when its check cannot be read", async () => {
    mocked.curricula.mockRejectedValue(new Error("boom"));
    mocked.rooms.mockRejectedValue(new Error("boom"));
    mocked.notifications.mockRejectedValue(new Error("boom"));
    mocked.announcements.mockRejectedValue(new Error("boom"));

    await expect(ticked()).resolves.toEqual(["teacher-profile"]);
  });
});
