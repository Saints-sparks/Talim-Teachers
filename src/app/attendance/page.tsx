"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { useAuth } from "../hooks/useAuth";
import { useAppContext } from "../context/AppContext";
import LoadingCard from "@/components/LoadingCard";
import ClassCard from "@/components/ClassCard";
import { useRouter } from "next/navigation";

const AttendancePage: React.FC = () => {
  const { user, classes, refreshClasses } = useAppContext();
  const { getAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      const token = getAccessToken();
      if (!token) return;
      await refreshClasses();
      setLoading(false);
    };

    fetchClasses();
  }, [user]);

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClassSelect = (classItem: any) => {
    router.push(`/attendance/class/${classItem._id}`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#F8F8F8]">
        <div className="p-3 sm:p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 sm:mb-8" data-guide="attendance-header">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#030E18] truncate">
                Attendance
              </h1>
              <p className="text-sm text-[#6F6F6F] mt-1">
                Select a class to manage attendance
              </p>
            </div>
            <div className="flex w-full md:w-auto" data-guide="attendance-search">
              <div className="flex items-center bg-white border border-[#F0F0F0] rounded-xl px-3 py-2 w-full md:w-[320px]">
                <Search className="text-[#878787] mr-2" size={18} />
                <Input
                  className="border-0 focus-visible:ring-0 focus:outline-none flex-1 placeholder:text-[#878787] shadow-none text-sm"
                  placeholder="Search classes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Classes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6" data-guide="attendance-class-grid">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <LoadingCard key={i} height="h-40 sm:h-48" />
                ))
              : filteredClasses.map((c) => (
                  <ClassCard
                    key={c._id}
                    classItem={c}
                    onView={handleClassSelect}
                  />
                ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AttendancePage;
