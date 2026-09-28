/**
 * Dev and test fixtures for the Grading page (Round 3, §15–23), in the
 * hand-written contract shape of `src/types/grading.ts`. Mirrors the seed of
 * `TALIM Redesign/Talim Teacher Portal.dc.html`; see `classroom.fixture.ts`
 * for the classes and students.
 */
import type { SchoolTerm } from "@/hooks/academic/useSchoolTerms";
import { FIXTURE_TERM } from "@/lib/fixtures/classroom.fixture";

/**
 * `GET /academic-year-term/term/school`: this year's terms, the first one current.
 *
 * @returns The terms.
 */
export function makeTermsFixture(): SchoolTerm[] {
  return [
    { _id: FIXTURE_TERM.id, name: FIXTURE_TERM.name, isActive: true, academicYearName: "2026/2027", startDate: FIXTURE_TERM.startDate, endDate: FIXTURE_TERM.endDate },
    { _id: "term-0", name: "Third term", isActive: false, academicYearName: "2025/2026", startDate: "2026-04-20", endDate: "2026-07-24" },
  ];
}
