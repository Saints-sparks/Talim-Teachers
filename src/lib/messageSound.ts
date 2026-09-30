/**
 * The short, subtle chime for a new message (Settings → Messages → "Sound
 * for new messages"). Synthesised with WebAudio, so there is no file to
 * download: two soft sine notes, about a quarter of a second in all.
 *
 * Browsers only let a page make sound after the user has interacted with
 * it. {@link unlockMessageSound} creates (or resumes) the audio context on
 * the first pointer or key press; until then, and wherever WebAudio is
 * missing, {@link playMessageSound} does nothing and never throws.
 */

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;
let unlockInstalled = false;

/**
 * The browser's AudioContext constructor, if it has one.
 *
 * @returns The constructor, or null (server, old browser, jsdom).
 */
function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Creates or resumes the audio context. Only works inside a user gesture.
 *
 * @returns Nothing.
 */
function unlock(): void {
  const Ctor = audioContextCtor();
  if (!Ctor) return;
  try {
    context ??= new Ctor();
    if (context.state === "suspended") void context.resume().catch(() => undefined);
  } catch {
    context = null;
  }
}

/**
 * Arms the sound: the first pointer or key press on the page unlocks audio
 * (the autoplay rule). Safe to call more than once.
 *
 * @returns Nothing.
 */
export function unlockMessageSound(): void {
  if (unlockInstalled || typeof document === "undefined" || !audioContextCtor()) return;
  unlockInstalled = true;
  const handler = () => {
    unlock();
    if (context && context.state !== "suspended") {
      document.removeEventListener("pointerdown", handler, true);
      document.removeEventListener("keydown", handler, true);
    }
  };
  document.addEventListener("pointerdown", handler, true);
  document.addEventListener("keydown", handler, true);
}

/**
 * Plays the chime, if audio has been unlocked. Never throws.
 *
 * @returns Whether a sound was scheduled.
 */
export function playMessageSound(): boolean {
  const ctx = context;
  if (!ctx || ctx.state !== "running") return false;
  try {
    const start = ctx.currentTime + 0.01;
    const notes: [number, number][] = [
      [880, 0],
      [1318.5, 0.09],
    ];
    for (const [frequency, offset] of notes) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const t = start + offset;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.06, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(t);
      oscillator.stop(t + 0.18);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Forgets the audio context and the unlock listeners' flag (tests).
 *
 * @returns Nothing.
 */
export function resetMessageSoundForTests(): void {
  context = null;
  unlockInstalled = false;
}
