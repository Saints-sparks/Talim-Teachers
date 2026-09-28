/**
 * The Remarks tab's autosave, without React: every change is queued, and the
 * queue is sent in one `PUT` a moment after the last keystroke. A save never
 * overlaps another; text typed while one is in flight goes in the next. A
 * 409 (the term results are with the office, or published) locks the saver;
 * any other failure keeps the text queued for Retry.
 */
import { clampRemark } from "./grading.logic";

/** How long after the last keystroke the remarks are saved. */
export const REMARK_DEBOUNCE_MS = 800;

/** Where the autosave stands, for the indicator. */
export type AutosaveState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string }
  | { kind: "locked" };

/** One remark as the `PUT` sends it. */
export interface RemarkEdit {
  studentId: string;
  classTeacherRemark: string;
}

/** What {@link RemarkAutosaver} needs from its owner. */
export interface RemarkAutosaverOptions {
  /** Sends the remarks (the owner updates its cache from the response). */
  save: (remarks: RemarkEdit[]) => Promise<void>;
  /** Called on every state change. */
  onState: (state: AutosaveState) => void;
  /** Whether an error means the remarks are locked (a 409). */
  isLocked: (error: unknown) => boolean;
  /** A teacher-facing message for any other error. */
  message: (error: unknown) => string;
  /** Debounce; defaults to {@link REMARK_DEBOUNCE_MS}. */
  delayMs?: number;
  /** For tests: the clock. */
  now?: () => number;
}

/** Queues remark edits and saves them in batches. */
export class RemarkAutosaver {
  private readonly pending = new Map<string, string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private locked = false;
  private disposed = false;

  /**
   * @param options - See {@link RemarkAutosaverOptions}.
   */
  constructor(private readonly options: RemarkAutosaverOptions) {}

  /**
   * Locks or unlocks the saver (from the submission status). Locking drops
   * the queue: the server would refuse it.
   *
   * @param locked - Whether remarks are locked.
   */
  setLocked(locked: boolean): void {
    if (locked === this.locked) return;
    this.locked = locked;
    if (locked) {
      this.clearTimer();
      this.pending.clear();
      this.options.onState({ kind: "locked" });
    } else {
      this.options.onState({ kind: "idle" });
    }
  }

  /**
   * Queues a remark and restarts the debounce.
   *
   * @param studentId - The student.
   * @param text - The remark (clamped to 500 characters).
   * @returns False when locked (nothing is queued).
   */
  edit(studentId: string, text: string): boolean {
    if (this.locked || this.disposed) return false;
    this.pending.set(studentId, clampRemark(text));
    this.clearTimer();
    this.options.onState({ kind: "pending" });
    this.timer = setTimeout(() => void this.flush(), this.options.delayMs ?? REMARK_DEBOUNCE_MS);
    return true;
  }

  /** Whether edits are waiting or being sent. */
  get busy(): boolean {
    return this.pending.size > 0 || this.inFlight !== null;
  }

  /**
   * Sends everything queued now (the debounce's end, Retry, leaving the tab).
   *
   * @returns Resolves when the queue has been sent (or failed).
   */
  async flush(): Promise<void> {
    this.clearTimer();
    if (this.inFlight) {
      await this.inFlight;
      if (this.timer === null && this.pending.size) return this.flush();
      return;
    }
    if (this.locked || this.pending.size === 0) return;
    const batch = [...this.pending].map(([studentId, classTeacherRemark]) => ({ studentId, classTeacherRemark }));
    this.pending.clear();
    this.options.onState({ kind: "saving" });
    this.inFlight = (async () => {
      try {
        await this.options.save(batch);
        if (!this.disposed) this.options.onState(this.pending.size ? { kind: "pending" } : { kind: "saved", at: (this.options.now ?? Date.now)() });
      } catch (error) {
        if (this.options.isLocked(error)) {
          this.locked = true;
          this.pending.clear();
          this.options.onState({ kind: "locked" });
        } else {
          // Put the batch back, unless the teacher has typed something newer since.
          for (const edit of batch) if (!this.pending.has(edit.studentId)) this.pending.set(edit.studentId, edit.classTeacherRemark);
          if (!this.disposed) this.options.onState({ kind: "error", message: this.options.message(error) });
        }
      } finally {
        this.inFlight = null;
      }
    })();
    await this.inFlight;
    // Edits made while saving: save them after their own debounce (already scheduled by edit()).
  }

  /**
   * Stops the debounce. The owner calls `flush()` first when the edits should still go out.
   */
  dispose(): void {
    this.disposed = true;
    this.clearTimer();
  }

  /**
   * Clears the debounce timer.
   */
  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
