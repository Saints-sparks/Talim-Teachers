"use client";

import { useParams } from "next/navigation";
import Layout from "@/components/Layout";
import { StudentRecordScreen } from "@/components/students/StudentRecordScreen";

/**
 * One student's record (`/students/:id`): details, guardian, attendance this
 * term and scores in the teacher's subjects. Data:
 * `GET /teachers/me/students/:studentId`.
 *
 * @returns The page.
 */
export default function StudentRecordPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : undefined;
  return (
    <Layout>
      <StudentRecordScreen studentId={id} />
    </Layout>
  );
}
