/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

const MESSAGE = "You have unsaved scores. Leave this page and lose them?";

/** Stands in for the App Router's own `popstate` listener, registered (as Next does) before the page mounts. */
const router = jest.fn();
let confirm: jest.SpyInstance<boolean, [message?: string]>;

/**
 * Puts the history in a known place: the dashboard, then the grading page on top.
 *
 * @param gradingUrl - The grading page's address.
 */
function startOnGrading(gradingUrl = "/grading?courseId=k1"): void {
  window.history.replaceState({ __NA: true, page: "dashboard" }, "", "/dashboard");
  window.history.pushState({ __NA: true, page: "grading" }, "", gradingUrl);
}

/**
 * Presses the browser's Back and lets jsdom fire `popstate`.
 */
async function back(): Promise<void> {
  await act(async () => {
    window.history.back();
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}

/**
 * A link on the page (next/link renders a plain anchor).
 *
 * @param href - Where it goes.
 * @param attrs - Extra attributes.
 * @returns The anchor, in the document.
 */
function link(href: string, attrs: Record<string, string> = {}): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = "Go";
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
  document.body.appendChild(a);
  return a;
}

/**
 * Clicks an element the way a person does, and reports whether next/link (a
 * listener on the document, like React's root) would have seen it. The stand-in
 * for next/link then takes the navigation over, as the real one does (jsdom
 * cannot navigate).
 *
 * @param el - What to click.
 * @param init - Modifier keys and button.
 * @returns Whether the guard cancelled the click and whether it reached the page.
 */
function click(el: Element, init: MouseEventInit = {}): { prevented: boolean; reached: boolean } {
  let reached = false;
  let preventedByGuard = false;
  const onClick = (event: Event) => {
    reached = true;
    preventedByGuard = event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener("click", onClick);
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
  el.dispatchEvent(event);
  document.removeEventListener("click", onClick);
  return { prevented: reached ? preventedByGuard : event.defaultPrevented, reached };
}

/**
 * Fires a `beforeunload` (reload, close, typed address).
 *
 * @returns Whether the page asked the browser to prompt.
 */
function unload(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

beforeAll(() => window.addEventListener("popstate", router));
afterAll(() => window.removeEventListener("popstate", router));

beforeEach(() => {
  router.mockClear();
  confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  document.body.innerHTML = "";
});

afterEach(() => confirm.mockRestore());

describe("useUnsavedChangesGuard", () => {
  it("does nothing while there is no unsaved work", async () => {
    startOnGrading();
    const length = window.history.length;
    renderHook(() => useUnsavedChangesGuard(false, MESSAGE));
    expect(unload()).toBe(false);
    expect(click(link("/students"))).toEqual({ prevented: false, reached: true });
    expect(window.history.length).toBe(length);
    await back();
    expect(confirm).not.toHaveBeenCalled();
    expect(router).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/dashboard");
  });

  it("asks the browser to prompt on reload or close while there is unsaved work", () => {
    startOnGrading();
    renderHook(() => useUnsavedChangesGuard(true, MESSAGE));
    expect(unload()).toBe(true);
  });

  it("asks before an in-app link to another page: Stay keeps the page, Leave lets the link go", () => {
    startOnGrading();
    renderHook(() => useUnsavedChangesGuard(true, MESSAGE));
    const students = link("/students");
    expect(click(students)).toEqual({ prevented: true, reached: false });
    expect(confirm).toHaveBeenCalledWith(MESSAGE);
    confirm.mockReturnValue(true);
    expect(click(students)).toEqual({ prevented: false, reached: true });
  });

  it("lets through modified clicks, new tabs, downloads, other sites and links to the same page", () => {
    startOnGrading();
    renderHook(() => useUnsavedChangesGuard(true, MESSAGE));
    expect(click(link("/students"), { metaKey: true }).prevented).toBe(false);
    expect(click(link("/students"), { ctrlKey: true }).prevented).toBe(false);
    expect(click(link("/students"), { button: 1 }).prevented).toBe(false);
    expect(click(link("/students", { target: "_blank" })).prevented).toBe(false);
    expect(click(link("/students", { download: "" })).prevented).toBe(false);
    expect(click(link("https://example.com/elsewhere")).prevented).toBe(false);
    expect(click(link("/grading?courseId=k2")).prevented).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks on Back to another page; Stay puts the page's entry back without the router moving", async () => {
    startOnGrading();
    const length = window.history.length;
    renderHook(() => useUnsavedChangesGuard(true, MESSAGE));
    await back();
    expect(confirm).toHaveBeenCalledWith(MESSAGE);
    expect(router).not.toHaveBeenCalled();
    expect(`${window.location.pathname}${window.location.search}`).toBe("/grading?courseId=k1");
    expect(window.history.state).toEqual({ __NA: true, page: "grading" });
    // No extra entry: Back from here still goes to the dashboard.
    expect(window.history.length).toBe(length);

    // Asked again on the next Back.
    await back();
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("hands the Back to the router when the teacher chooses to leave", async () => {
    startOnGrading();
    renderHook(() => useUnsavedChangesGuard(true, MESSAGE));
    confirm.mockReturnValue(true);
    await back();
    expect(router).toHaveBeenCalledTimes(1);
    expect((router.mock.calls[0][0] as PopStateEvent).state).toEqual({ __NA: true, page: "dashboard" });
    expect(window.location.pathname).toBe("/dashboard");
    // Leaving is not asked about twice (no browser prompt on the way out).
    expect(unload()).toBe(false);
  });

  it("lets Back through between addresses of the same page, which keeps its work", async () => {
    startOnGrading("/grading?courseId=k1");
    window.history.pushState({ __NA: true, page: "grading-k2" }, "", "/grading?courseId=k2");
    renderHook(() => useUnsavedChangesGuard(true, MESSAGE));
    await back();
    expect(confirm).not.toHaveBeenCalled();
    expect(router).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("?courseId=k1");
    // Still guarded from its new address.
    await back();
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("follows the page's address as it changes, and puts back the latest one", async () => {
    startOnGrading("/grading?courseId=k1");
    const { rerender } = renderHook(({ dirty }) => useUnsavedChangesGuard(dirty, MESSAGE), { initialProps: { dirty: true } });
    // The page keeps its address in step with router.replace, then re-renders.
    window.history.replaceState({ __NA: true, page: "grading-a2" }, "", "/grading?courseId=k1&assessmentId=a2");
    rerender({ dirty: true });
    await back();
    expect(`${window.location.pathname}${window.location.search}`).toBe("/grading?courseId=k1&assessmentId=a2");
    expect(window.history.state).toEqual({ __NA: true, page: "grading-a2" });
  });

  it("once the scores are saved, removes every listener and leaves no history entry behind", async () => {
    startOnGrading();
    const length = window.history.length;
    const { rerender } = renderHook(({ dirty }) => useUnsavedChangesGuard(dirty, MESSAGE), { initialProps: { dirty: true } });
    rerender({ dirty: false });
    expect(window.history.length).toBe(length);
    expect(unload()).toBe(false);
    expect(click(link("/students")).prevented).toBe(false);
    await back();
    expect(confirm).not.toHaveBeenCalled();
    expect(router).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/dashboard");
  });

  it("removes its listeners when the page unmounts", async () => {
    startOnGrading();
    const { unmount } = renderHook(() => useUnsavedChangesGuard(true, MESSAGE));
    unmount();
    expect(unload()).toBe(false);
    await back();
    expect(confirm).not.toHaveBeenCalled();
    expect(router).toHaveBeenCalledTimes(1);
  });
});
