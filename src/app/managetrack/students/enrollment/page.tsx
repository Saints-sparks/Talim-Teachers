"use client";

import Header from "@/components/Header";
import Search from "@/components/Search";
import StudentProfile from "@/components/StudentProfile";


const EnrollmentPage: React.FC = () => {
    const greeting = "Enrollment";
    const tent = "Add and Manage Your Students with Ease";
    const mogi = "👩‍🎓";
    const SearchComponent = <Search placeholder="Search"  />;
    return (
        <div className="p-6 space-y-1 bg-[F8F8F8]">
        <Header greeting={greeting} tent={tent} mogi={mogi} SearchComponent={SearchComponent}/>
        
 
        </div>
    );
    };
    export default EnrollmentPage;