/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/app/context/AuthContext";
import { makeMockAuthValue, mockTeacher } from "@/test-utils/render";
import { todayService } from "@/app/services/today/today.service";
import { useMarkTaught } from "@/hooks/today/useTeacherToday";
import { queryKeys } from "@/lib/queryKeys";
import { makeTimetableWeekFixture, makeTodayFixture } from "@/lib/fixtures/today.fixture";
import type { MarkTaughtResponse, TeacherToday, TimetableWeek } from "@/types/today";

jest.mock("@/app/services/today/today.service", () => ({
  todayService: { getToday: jest.fn(), getMyWeek: jest.fn(), setTaught: jest.fn(), completeTour: jest.fn() },
}));
const service = todayService as jest.Mocked<typeof todayService>;

const schoolId = mockTeacher.schoolId as string;
const userId = mockTeacher.userId as string;
const todayKey = queryKeys.teacher.today(schoolId, userId);
const weekKey = queryKeys.timetable.myWeek(schoolId, userId, "current");

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  client.setQueryData(todayKey, makeTodayFixture());
  client.setQueryData(weekKey, makeTimetableWeekFixture());
  // Nothing refetches in this test: the invalidation after the mutation must not wipe the assertions.
  service.getToday.mockImplementation(async () => client.getQueryData<TeacherToday>(todayKey)!);
  service.getMyWeek.mockImplementation(async () => client.getQueryData<TimetableWeek>(weekKey)!);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={makeMockAuthValue()}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
  const hook = renderHook(() => useMarkTaught(), { wrapper });
  return { client, hook };
}

const taughtIn = (lessons: { course: { id: string }; topic: { taughtAt: string | null } | null }[], courseId: string) =>
  lessons.filter((l) => l.course.id === courseId).map((l) => Boolean(l.topic?.taughtAt));

describe("useMarkTaught", () => {
  beforeEach(() => jest.clearAllMocks());

  it("marks the week taught in Today and the timetable before the server answers", async () => {
    let resolve: (v: MarkTaughtResponse) => void = () => {};
    service.setTaught.mockImplementation(() => new Promise((r) => (resolve = r)));
    const { client, hook } = setup();

    act(() => hook.result.current.mutate({ courseId: "k1", week: 3, termId: "term-1", taught: true }));

    await waitFor(() => expect(taughtIn(client.getQueryData<TeacherToday>(todayKey)!.lessons, "k1")).toEqual([true, true]));
    expect(taughtIn(client.getQueryData<TimetableWeek>(weekKey)!.lessons, "k1").every(Boolean)).toBe(true);
    expect(taughtIn(client.getQueryData<TeacherToday>(todayKey)!.lessons, "k2")).toEqual([false]);
    expect(service.setTaught).toHaveBeenCalledWith("k1", 3, { taught: true, termId: "term-1" });

    await act(async () => resolve({ week: 3, taughtAt: new Date().toISOString() }));
  });

  it("puts everything back when the server refuses", async () => {
    service.setTaught.mockRejectedValue(new Error("403"));
    const { client, hook } = setup();

    await act(async () => {
      await hook.result.current.mutateAsync({ courseId: "k1", week: 3, taught: true }).catch(() => undefined);
    });

    expect(taughtIn(client.getQueryData<TeacherToday>(todayKey)!.lessons, "k1")).toEqual([false, false]);
    expect(taughtIn(client.getQueryData<TimetableWeek>(weekKey)!.lessons, "k1").some(Boolean)).toBe(false);
  });
});
