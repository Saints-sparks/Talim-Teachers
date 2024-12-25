"use client";

import Header from "@/components/Header";
import Search from "@/components/Search";
import StudentProfile from "@/components/StudentProfile";


const StudentPage: React.FC = () => {
    const greeting = "Student Profile";
    const tent = "View detailed information and progress for each student.";
    const mogi = "👩‍🎓";
    const SearchComponent = <Search placeholder="Search for students"  />;
    return (
        <div className="p-6 space-y-1 bg-[F8F8F8]">
        <Header greeting={greeting} tent={tent} mogi={mogi} SearchComponent={SearchComponent}/>
        <StudentProfile/>
 
        </div>
    );
    };
    export default StudentPage;