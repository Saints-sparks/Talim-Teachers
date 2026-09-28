import { REMARK_DEBOUNCE_MS, RemarkAutosaver, type AutosaveState, type RemarkEdit } from "@/hooks/grading/remarkAutosave";

/**
 * A saver with a controllable `save`.
 *
 * @param save - What the PUT does.
 * @returns The saver, the calls and the states it reported.
 */
function setup(save: (remarks: RemarkEdit[]) => Promise<void> = async () => undefined) {
  const calls: RemarkEdit[][] = [];
  const states: AutosaveState[] = [];
  const saver = new RemarkAutosaver({
    save: async (remarks) => {
      calls.push(remarks);
      await save(remarks);
    },
    onState: (s) => states.push(s),
    isLocked: (error) => (error as { status?: number })?.status === 409,
    message: () => "Not saved",
    now: () => 42,
  });
  return { saver, calls, states };
}

/**
 * Lets pending promises settle.
 *
 * @returns Resolves after the microtask queue drains.
 */
const settle = () => new Promise<void>((resolve) => jest.requireActual<typeof globalThis>("timers").setImmediate(resolve));

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("remark autosave", () => {
  it("waits for a pause in typing, then sends every changed remark in one PUT", async () => {
    const { saver, calls, states } = setup();
    saver.edit("s1", "A");
    jest.advanceTimersByTime(REMARK_DEBOUNCE_MS - 100);
    saver.edit("s1", "A careful");
    saver.edit("s2", "Works hard");
    jest.advanceTimersByTime(REMARK_DEBOUNCE_MS - 1);
    expect(calls).toHaveLength(0);
    expect(states.at(-1)).toEqual({ kind: "pending" });
    jest.advanceTimersByTime(1);
    await settle();
    expect(calls).toEqual([
      [
        { studentId: "s1", classTeacherRemark: "A careful" },
        { studentId: "s2", classTeacherRemark: "Works hard" },
      ],
    ]);
    expect(states.at(-1)).toEqual({ kind: "saved", at: 42 });
  });

  it("caps a remark at 500 characters", async () => {
    const { saver, calls } = setup();
    saver.edit("s1", "x".repeat(600));
    jest.advanceTimersByTime(REMARK_DEBOUNCE_MS);
    await settle();
    expect(calls[0][0].classTeacherRemark).toHaveLength(500);
  });

  it("never overlaps saves: text typed during a save goes in the next one", async () => {
    let release: () => void = () => undefined;
    const { saver, calls } = setup(
      (remarks) => (remarks[0].classTeacherRemark === "first" ? new Promise<void>((resolve) => (release = resolve)) : Promise.resolve()),
    );
    saver.edit("s1", "first");
    jest.advanceTimersByTime(REMARK_DEBOUNCE_MS);
    await settle();
    saver.edit("s1", "second");
    jest.advanceTimersByTime(REMARK_DEBOUNCE_MS);
    await settle();
    expect(calls).toHaveLength(1);
    release();
    await settle();
    await settle();
    expect(calls.map((c) => c[0].classTeacherRemark)).toEqual(["first", "second"]);
  });

  it("keeps the text for Retry after a failure", async () => {
    let fail = true;
    const { saver, calls, states } = setup(async () => {
      if (fail) throw new Error("offline");
    });
    saver.edit("s1", "Good term");
    jest.advanceTimersByTime(REMARK_DEBOUNCE_MS);
    await settle();
    expect(states.at(-1)).toEqual({ kind: "error", message: "Not saved" });
    fail = false;
    await saver.flush();
    expect(calls.map((c) => c[0].classTeacherRemark)).toEqual(["Good term", "Good term"]);
    expect(states.at(-1)).toEqual({ kind: "saved", at: 42 });
  });

  it("locks on a 409 and ignores typing from then on", async () => {
    const { saver, calls, states } = setup(async () => {
      throw { status: 409 };
    });
    saver.edit("s1", "Late remark");
    jest.advanceTimersByTime(REMARK_DEBOUNCE_MS);
    await settle();
    expect(states.at(-1)).toEqual({ kind: "locked" });
    expect(saver.edit("s1", "More")).toBe(false);
    jest.advanceTimersByTime(REMARK_DEBOUNCE_MS);
    await settle();
    expect(calls).toHaveLength(1);
  });

  it("drops the queue and sends nothing while locked by a submission, and accepts edits again once unlocked", async () => {
    const { saver, calls, states } = setup();
    saver.edit("s1", "Queued");
    saver.setLocked(true);
    expect(states.at(-1)).toEqual({ kind: "locked" });
    jest.advanceTimersByTime(REMARK_DEBOUNCE_MS * 2);
    await settle();
    expect(calls).toHaveLength(0);
    expect(saver.edit("s1", "Nope")).toBe(false);
    saver.setLocked(false);
    expect(saver.edit("s1", "Back again")).toBe(true);
    jest.advanceTimersByTime(REMARK_DEBOUNCE_MS);
    await settle();
    expect(calls).toEqual([[{ studentId: "s1", classTeacherRemark: "Back again" }]]);
  });

  it("sends what is queued at once on flush (leaving the tab)", async () => {
    const { saver, calls } = setup();
    saver.edit("s3", "Quiet but thoughtful");
    expect(saver.busy).toBe(true);
    await saver.flush();
    expect(calls).toHaveLength(1);
    saver.dispose();
    expect(saver.edit("s3", "after")).toBe(false);
  });
});
