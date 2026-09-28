/**
 * The teachers redesign's endpoints: the Today aggregate, the teacher's
 * timetable week and the scheme-of-work "taught" toggle. Shapes are in
 * `src/types/today.ts`, aliases of the generated contract (`npm run types:api`).
 *
 * Every call goes through the typed client, which unwraps the success
 * envelope whether `API_ENVELOPE_SUCCESS` is on or off. With
 * `NEXT_PUBLIC_USE_FIXTURES=true` in a dev build the calls answer from
 * `src/lib/fixtures/today.fixture.ts` instead.
 */
import { api } from "@/lib/apiClient";
import { fixturesEnabled } from "@/lib/fixtures/flag";
import type { TeacherPreferencesPayload } from "@/types/apiPayloads";
import type { MarkTaughtBody, MarkTaughtResponse, TeacherToday, TimetableWeek } from "@/types/today";

/** Taught weeks toggled while running on fixtures, keyed `courseId:week`. */
const fixtureTaught = new Map<string, string | null>();

/**
 * Applies the fixture-mode taught toggles to a list of lessons.
 *
 * @param lessons - Lessons from a fixture.
 * @returns The same lessons with their `topic.taughtAt` overridden.
 */
function withFixtureTaught<T extends { course: { id: string }; topic: { week: number; taughtAt: string | null } | null }>(lessons: T[]): T[] {
  return lessons.map((lesson) => {
    if (!lesson.topic) return lesson;
    const key = `${lesson.course.id}:${lesson.topic.week}`;
    return fixtureTaught.has(key) ? { ...lesson, topic: { ...lesson.topic, taughtAt: fixtureTaught.get(key) ?? null } } : lesson;
  });
}

export const todayService = {
  /**
   * `GET /teachers/today`: everything the Today screen shows, computed in the
   * school's timezone.
   *
   * @returns The aggregate.
   * @throws ApiError when it cannot be read.
   */
  getToday: async (): Promise<TeacherToday> => {
    if (fixturesEnabled()) {
      const { makeTodayFixture } = await import("@/lib/fixtures/today.fixture");
      const today = makeTodayFixture();
      return { ...today, lessons: withFixtureTaught(today.lessons) };
    }
    return api.get<TeacherToday>("/teachers/today");
  },

  /**
   * `GET /timetable/me`: the signed-in teacher's lessons for one week.
   *
   * @param weekStart - Any date in the wanted week; omitted for the current week (next week at weekends).
   * @returns The week.
   * @throws ApiError when it cannot be read.
   */
  getMyWeek: async (weekStart?: string): Promise<TimetableWeek> => {
    if (fixturesEnabled()) {
      const { timetableWeekFixtureFor } = await import("@/lib/fixtures/today.fixture");
      const week = timetableWeekFixtureFor(weekStart);
      return { ...week, lessons: withFixtureTaught(week.lessons) };
    }
    return api.get<TimetableWeek>("/timetable/me", { params: { weekStart } });
  },

  /**
   * `POST /scheme-of-work/course/:courseId/weeks/:week/taught`.
   *
   * @param courseId - The course.
   * @param week - The scheme-of-work week.
   * @param body - `{ taught, termId? }`; the term defaults to the current one.
   * @returns `{ week, taughtAt }` (callers also refetch).
   * @throws ApiError when the toggle is refused.
   */
  setTaught: async (courseId: string, week: number, body: MarkTaughtBody): Promise<MarkTaughtResponse> => {
    if (fixturesEnabled()) {
      const taughtAt = body.taught ? new Date().toISOString() : null;
      fixtureTaught.set(`${courseId}:${week}`, taughtAt);
      return { week, taughtAt };
    }
    return api.post<MarkTaughtResponse>(
      `/scheme-of-work/course/${encodeURIComponent(courseId)}/weeks/${week}/taught`,
      body,
    );
  },

  /**
   * Stamps the portal tour as finished: `PATCH /teacher/settings/preferences`
   * with `{ guides: { tourCompleted: true } }`, which the backend turns into
   * `guides.tourCompletedAt`; the server merges into `guides`, so
   * `showAppTips` is kept. Sent on its own, never through the preferences
   * mutation (which would echo whole sections back).
   *
   * @returns Resolves once stored.
   * @throws ApiError when refused.
   */
  completeTour: async (): Promise<void> => {
    if (fixturesEnabled()) return;
    const body: TeacherPreferencesPayload = { guides: { tourCompleted: true } };
    await api.patch("/teacher/settings/preferences", body);
  },
};
