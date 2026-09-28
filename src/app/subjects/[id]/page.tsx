"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * The old subject detail address (`/subjects/:id`). The redesigned Subjects
 * page shows a subject in place, so old links and bookmarks land there:
 * `/subjects?courseId=:id`.
 *
 * @returns Nothing; it redirects.
 */
export default function SubjectRedirectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  useEffect(() => {
    router.replace(id ? `/subjects?courseId=${encodeURIComponent(id)}` : "/subjects");
  }, [id, router]);

  return null;
}
