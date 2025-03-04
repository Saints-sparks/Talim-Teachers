"use client";


import { Header } from "@/components/HeaderTwo";
import StudentProfile from "@/components/StudentProfile";


const StudentPage: React.FC = () => {

    return (
        <div className=" space-y-1 bg-[F8F8F8]">
        <Header/>
        <StudentProfile/>
 
        </div>
    );
    };
    export default StudentPage;