"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { Avatar } from "@/components/tl/Avatar";
import { StatTile } from "@/components/tl/StatTile";
import { card, cardTitle, focusRing, ghostButton, pagePad, pageTitle, primaryButton } from "@/components/tl/styles";
import { downloadCsv } from "@/app/services/grading-workspace/grade-csv";
import { useMyClasses } from "@/hooks/attendance/useRegister";
import { filterRoster, rosterCsv, rosterTiles } from "@/hooks/students/students.logic";
import { useClassRoster } from "@/hooks/students/useClassroomStudents";
import { getErrorMessage } from "@/lib/apiError";

/** Props for {@link StudentsScreen}. */
export interface StudentsScreenProps {
  /** `?classId=`: which tab to open. */
  initialClassId?: string;
}

/**
 * The link to a student's record.
 *
 * @param id - The student.
 * @returns The href.
 */
export function studentHref(id: string): string {
  return `/students/${encodeURIComponent(id)}`;
}

/**
 * The redesigned Students list: one tab per class (with the teacher's role),
 * four stat tiles, search, and the roster as a table (cards on phones). Each
 * row opens the student's record; Export CSV downloads the class list.
 *
 * @param props - See {@link StudentsScreenProps}.
 * @returns The screen.
 */
export function StudentsScreen({ initialClassId }: StudentsScreenProps) {
  const router = useRouter();
  const classes = useMyClasses();
  const [classId, setClassId] = useState<string | undefined>(initialClassId);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (initialClassId) setClassId(initialClassId);
  }, [initialClassId]);

  const activeClassId = classId ?? classes.data?.[0]?.id;
  const roster = useClassRoster(activeClassId);
  const rows = useMemo(() => filterRoster(roster.data?.students ?? [], search), [roster.data, search]);

  useEffect(() => {
    if (!activeClassId || typeof window === "undefined") return;
    const target = `/students?classId=${encodeURIComponent(activeClassId)}`;
    if (`${window.location.pathname}${window.location.search}` !== target) router.replace(target, { scroll: false });
  }, [activeClassId, router]);

  const pick = (id: string) => {
    setClassId(id);
    setSearch("");
  };

  const exportCsv = () => {
    if (!roster.data) return;
    const { filename, csv } = rosterCsv(roster.data);
    downloadCsv(filename, csv);
    toast.success(`Class list for ${roster.data.class.name} downloaded.`);
  };

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3.5">
      <div>
        <h1 className={pageTitle}>Students</h1>
        <p className="mt-[5px] text-[15px] text-tl-muted">Everyone in the classes you teach. Open a student for their full record.</p>
      </div>
      {activeClassId ? (
        <button
          type="button"
          className={ghostButton}
          onClick={exportCsv}
          disabled={!roster.data || roster.data.students.length === 0}
          title="Download this class list as a spreadsheet"
          data-guide="students-export"
        >
          Export CSV
        </button>
      ) : null}
    </div>
  );

  if (classes.isPending) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`}>
        {header}
        <div className="h-[420px] animate-pulse rounded-[22px] bg-tl-line/70" role="status" aria-label="Loading your classes" />
      </div>
    );
  }

  if (classes.isError && !classes.data) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`}>
        {header}
        <div className={card} role="alert">
          <h2 className={cardTitle}>We could not load your classes</h2>
          <p className="mt-1.5 text-sm text-tl-muted">{getErrorMessage(classes.error, "Check your connection and try again.")}</p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => void classes.refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!activeClassId) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`}>
        {header}
        <section className={card}>
          <h2 className={cardTitle}>No classes yet</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
            When the school office makes you a class teacher, or assigns you a subject, its students show here.
          </p>
        </section>
      </div>
    );
  }

  const tabs = classes.data ?? [];
  const data = roster.data;

  return (
    <div className={`${pagePad} flex flex-col gap-[18px]`}>
      {header}

      <div className="flex flex-wrap gap-2.5" role="group" aria-label="Class" data-guide="students-tabs">
        {tabs.map((c) => {
          const on = c.id === activeClassId;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(c.id)}
              title={`${c.studentCount} ${c.studentCount === 1 ? "student" : "students"}`}
              className={`flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl border px-[15px] py-2.5 text-sm font-bold ${focusRing} ${
                on ? "border-tl-control bg-tl-select text-tl-brand" : "border-tl-line bg-tl-surface text-tl-muted hover:text-tl-ink"
              }`}
            >
              <span>{c.name}</span>
              <span className="text-xs font-bold opacity-90">{c.role === "class_teacher" ? "Class teacher" : "Subject teacher"}</span>
            </button>
          );
        })}
      </div>

      {roster.isPending ? (
        <div className="flex flex-col gap-[18px]" role="status" aria-label="Loading the class">
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[78px] animate-pulse rounded-[18px] bg-tl-line/70" />
            ))}
          </div>
          <div className="h-[360px] animate-pulse rounded-[22px] bg-tl-line/70" />
        </div>
      ) : !data ? (
        <div className={card} role="alert">
          <h2 className={cardTitle}>We could not load this class</h2>
          <p className="mt-1.5 text-sm text-tl-muted">{getErrorMessage(roster.error, "Check your connection and try again.")}</p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => void roster.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]" data-guide="students-stats">
            {rosterTiles(data).map((tile) => (
              <StatTile key={tile.label} label={tile.label} value={tile.value} tip={tile.tip || undefined} valueClass="text-xl text-tl-ink" />
            ))}
          </div>

          <section className="rounded-[22px] border border-tl-line bg-tl-surface shadow-[0_1px_2px_rgba(15,27,46,0.04)] dark:shadow-none" aria-label={`Students in ${data.class.name}`}>
            <div className="border-b border-tl-line-soft px-[18px] py-3.5">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, admission number, email or guardian"
                aria-label="Search students by name, admission number, email or guardian"
                data-guide="students-search"
                className={`min-h-[44px] w-full rounded-[13px] border border-tl-control bg-tl-surface px-3.5 font-semibold text-tl-ink placeholder:text-tl-faint ${focusRing}`}
              />
            </div>

            <div data-guide="students-table">
              {data.students.length === 0 ? (
                <p className="px-5 py-5 text-sm text-tl-muted">There are no students in {data.class.name} yet. The school office adds them, and they will show here.</p>
              ) : rows.length === 0 ? (
                <p className="px-5 py-5 text-sm text-tl-muted">No students match that search.</p>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[820px] border-collapse text-left">
                      <thead>
                        <tr className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">
                          <th scope="col" className="px-5 py-3 font-extrabold">Student</th>
                          <th scope="col" className="w-[130px] px-3.5 py-3 font-extrabold">Admission no.</th>
                          <th scope="col" className="px-3.5 py-3 font-extrabold">Email address</th>
                          <th scope="col" className="px-3.5 py-3 font-extrabold">Guardian</th>
                          <th scope="col" className="w-[56px] px-3.5 py-3">
                            <span className="sr-only">Open</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((s) => (
                          <tr
                            key={s.id}
                            onClick={() => router.push(studentHref(s.id))}
                            title={`Open ${s.name}'s record`}
                            className="cursor-pointer border-t border-tl-line-soft hover:bg-tl-subtle"
                          >
                            <td className="px-5 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar id={s.id} name={s.name} src={s.avatarUrl} size={38} />
                                <Link href={studentHref(s.id)} className={`rounded text-[15px] font-bold text-tl-ink hover:underline ${focusRing}`} onClick={(event) => event.stopPropagation()}>
                                  {s.name}
                                </Link>
                              </div>
                            </td>
                            <td className="px-3.5 py-3 text-sm text-tl-muted">{s.admissionNumber ?? "—"}</td>
                            <td className="max-w-[280px] truncate px-3.5 py-3 text-sm text-tl-body">{s.email ?? "—"}</td>
                            <td className="px-3.5 py-3">
                              {s.guardian ? (
                                <>
                                  <div className="text-sm font-bold text-tl-ink">{s.guardian.name}</div>
                                  <div className="mt-0.5 text-xs text-tl-faint">{s.guardian.relationship ?? "Guardian"}</div>
                                </>
                              ) : (
                                <span className="text-sm text-tl-muted">No guardian on record</span>
                              )}
                            </td>
                            <td className="px-3.5 py-3">
                              <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-tl-line">
                                <ChevronRight className="h-3.5 w-3.5 text-tl-muted" />
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <ul className="md:hidden" aria-label={`Students in ${data.class.name}`}>
                    {rows.map((s) => (
                      <li key={s.id} className="border-t border-tl-line-soft first:border-t-0">
                        <Link href={studentHref(s.id)} className={`flex min-h-[64px] items-center gap-3 px-[18px] py-3 hover:bg-tl-subtle ${focusRing}`}>
                          <Avatar id={s.id} name={s.name} src={s.avatarUrl} size={38} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-bold text-tl-ink">{s.name}</span>
                            <span className="mt-0.5 block text-[13px] text-tl-muted">{s.admissionNumber ?? "No admission number"}</span>
                            <span className="mt-0.5 block truncate text-[13px] text-tl-faint">
                              {s.guardian ? `${s.guardian.name}${s.guardian.relationship ? ` · ${s.guardian.relationship}` : ""}` : "No guardian on record"}
                            </span>
                          </span>
                          <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-tl-muted" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
