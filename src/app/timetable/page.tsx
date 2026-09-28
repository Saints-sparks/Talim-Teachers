"use client";

import Layout from "@/components/Layout";
import { TimetableScreen } from "@/components/timetable/TimetableScreen";

/**
 * The teacher's timetable, week by week (`GET /timetable/me`).
 *
 * @returns The page.
 */
const TimetablePage: React.FC = () => {
  return (
    <Layout>
      <TimetableScreen />
    </Layout>
  );
};
export default TimetablePage;
