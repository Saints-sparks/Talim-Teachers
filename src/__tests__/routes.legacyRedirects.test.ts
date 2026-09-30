/**
 * The pages Subjects replaced: `/resources` redirects to the Subjects page's
 * Resources tab keeping the course, the week and the upload sheet, and
 * nothing links to it any more.
 */
import ResourcesRedirect from "@/app/resources/page";
import { curriculumHref, resourcesRedirectHref } from "@/hooks/subjects/legacyRoutes";
import { parseSubjectsParams } from "@/hooks/subjects/scheme.logic";
import { uploadResourceRoute } from "@/hooks/today/today.routes";
import { navGroups } from "@/components/Sidebar";
import { TEACHER_ONBOARDING_STEPS } from "@/app/context/OnboardingContext";
import { guideConfigs } from "@/components/onboarding/guideSteps";

const redirect = jest.fn();
jest.mock("next/navigation", () => ({
  redirect: (to: string) => redirect(to),
  usePathname: () => "/",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

beforeEach(() => redirect.mockClear());

describe("resourcesRedirectHref", () => {
  it.each([
    [{}, "/subjects?tab=resources"],
    [{ courseId: "c1" }, "/subjects?courseId=c1&tab=resources"],
    [{ courseId: "c1", upload: "1", week: "4" }, "/subjects?courseId=c1&tab=resources&upload=1&week=4"],
    [{ upload: "true" }, "/subjects?tab=resources&upload=1"],
    [{ courseId: " c1 ", week: "04" }, "/subjects?courseId=c1&tab=resources&week=4"],
    [{ courseId: ["c1", "c2"], week: ["3", "9"] }, "/subjects?courseId=c1&tab=resources&week=3"],
  ])("keeps what Subjects understands: %j → %s", (params, href) => {
    expect(resourcesRedirectHref(params)).toBe(href);
  });

  it.each([
    [{ week: "0" }],
    [{ week: "31" }],
    [{ week: "three" }],
    [{ week: "2.5" }],
    [{ upload: "yes" }],
    [{ courseId: "  " }],
    [{ search: "fractions", tab: "plan" }],
  ])("drops what it does not: %j", (params) => {
    expect(resourcesRedirectHref(params)).toBe("/subjects?tab=resources");
  });

  it("lands on what the Subjects page reads back", () => {
    const href = resourcesRedirectHref({ courseId: "c1", upload: "1", week: "7" });
    const query = new URLSearchParams(href.split("?")[1]);
    expect(
      parseSubjectsParams({ courseId: query.get("courseId"), tab: query.get("tab"), week: query.get("week"), upload: query.get("upload") }),
    ).toEqual({ courseId: "c1", tab: "resources", week: 7, upload: true });
    // The same address every "Upload" in the app builds.
    expect(href).toBe(uploadResourceRoute("c1", 7));
  });
});

describe("the /resources page", () => {
  it("redirects with the parameters kept", async () => {
    await ResourcesRedirect({ searchParams: Promise.resolve({ courseId: "c9", week: "12", upload: "1" }) });
    expect(redirect).toHaveBeenCalledWith("/subjects?courseId=c9&tab=resources&upload=1&week=12");
  });

  it("redirects a bare visit to the Resources tab", async () => {
    await ResourcesRedirect({ searchParams: Promise.resolve({}) });
    expect(redirect).toHaveBeenCalledWith("/subjects?tab=resources");
  });
});

describe("what still points at /resources", () => {
  it("the sidebar no longer lists it; Curriculum stays as Subjects' secondary item", () => {
    const hrefs = navGroups({ pendingRegisters: 0, unreadMessages: 0, unreadNotifications: 0 }).flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain("/resources");
    const classes = navGroups({ pendingRegisters: 0, unreadMessages: 0, unreadNotifications: 0 }).find((g) => g.title === "Classes")!;
    expect(classes.items.map((i) => [i.label, i.secondary ?? false])).toEqual([
      ["Students", false],
      ["Subjects", false],
      ["Curriculum", true],
    ]);
  });

  it("the onboarding step opens the Subjects upload sheet", () => {
    expect(TEACHER_ONBOARDING_STEPS.find((s) => s.id === "upload-resource")?.href).toBe("/subjects?tab=resources&upload=1");
  });

  it("no page guide is left for it", () => {
    expect(guideConfigs.some((g) => g.pathMatchers.includes("/resources"))).toBe(false);
  });
});

describe("curriculumHref", () => {
  it("opens the Curriculum page on the course, and the term when one is given", () => {
    expect(curriculumHref("c1")).toBe("/curriculum?courseId=c1");
    expect(curriculumHref("c1", "t2")).toBe("/curriculum?courseId=c1&termId=t2");
  });
});
