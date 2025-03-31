"use client";

import { Header } from "@/components/HeaderTwo";
import Layout from "@/components/Layout";
import StudentProfile from "@/components/students/StudentProfile";

const StudentPage: React.FC = () => {
  return (
    <Layout >
     
      <StudentProfile />
    </Layout>
  );
};
export default StudentPage;
