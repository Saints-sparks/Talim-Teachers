"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  BookOpen,
  FileText,
  Upload,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesTable } from "@/components/resorces/ResourceTable";
import { UploadModal } from "@/components/resorces/uploadmodal";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import {
  fetchResources,
  fetchTeacherDetails,
  getAssignedClasses,
} from "../services/api.service";
import { useAuth } from "../hooks/useAuth";
import { Resource } from "@/types/student";
import { useAppContext } from "../context/AppContext";
import LoadingCard from "@/components/LoadingCard";

export default function ResourcePage() {
  const { user, classes, teacherData } = useAppContext(); // Use teacherData from context instead
  const { getAccessToken } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasLoadedData, setHasLoadedData] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.userId || hasLoadedData) return;

    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) throw new Error("No token found");

      console.log("Fetching resources for teacher:", user.userId);

      const resourceData = await fetchResources(token, user.userId);
      console.log("Fetched resources:", resourceData);

      setResources(resourceData);
      setHasLoadedData(true);
    } catch (err) {
      setError("Failed to load data");
      console.error("Error loading resources:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.userId, getAccessToken, hasLoadedData]);

  useEffect(() => {
    // Load resources data when user is available
    if (user?.userId && !hasLoadedData) {
      loadData();
    }
  }, [user?.userId, hasLoadedData, loadData]);

  // Calculate KPIs with better error handling - memoized for performance
  const kpiData = useMemo(() => {
    const totalResources = resources.length;

    const thisMonthResources = resources.filter((resource) => {
      try {
        const uploadDate = new Date(resource.uploadDate);
        const currentDate = new Date();
        return (
          uploadDate.getMonth() === currentDate.getMonth() &&
          uploadDate.getFullYear() === currentDate.getFullYear()
        );
      } catch (error) {
        console.warn("Error parsing upload date:", resource.uploadDate);
        return false;
      }
    }).length;

    // Use teacher's assigned classes from context
    const assignedClasses =
      teacherData?.assignedClasses ||
      teacherData?.classTeacherClasses ||
      classes;

    const uniqueClasses = new Set(
      resources
        .map((resource) => {
          try {
            // Handle both populated and non-populated classId
            if (
              typeof resource.classId === "object" &&
              resource.classId !== null
            ) {
              return (
                (resource.classId as any)._id ||
                (resource.classId as any).toString()
              );
            }
            return resource.classId as string;
          } catch (error) {
            console.warn("Error processing classId:", resource.classId);
            return null;
          }
        })
        .filter(Boolean)
    ).size;

    const thisWeekResources = resources.filter((resource) => {
      try {
        const uploadDate = new Date(resource.uploadDate);
        const currentDate = new Date();
        const weekAgo = new Date(
          currentDate.getTime() - 7 * 24 * 60 * 60 * 1000
        );
        return uploadDate >= weekAgo && uploadDate <= currentDate;
      } catch (error) {
        console.warn(
          "Error parsing upload date for week calculation:",
          resource.uploadDate
        );
        return false;
      }
    }).length;

    const recentResources = resources.filter((resource) => {
      try {
        const uploadDate = new Date(resource.uploadDate);
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        return uploadDate >= threeDaysAgo;
      } catch (error) {
        return false;
      }
    }).length;

    return {
      totalResources,
      thisMonthResources,
      uniqueClasses,
      thisWeekResources,
      recentResources,
      totalAssignedClasses: assignedClasses.length,
    };
  }, [resources, teacherData, classes]);

  // Memoize filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter((resource) =>
      resource.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [resources, searchTerm]);

  const handleNewResourceUpload = (newResource: Resource) => {
    setResources((prevResources) => [...prevResources, newResource]);
  };

  const handleResourceDelete = (resourceId: string) => {
    setResources((prevResources) =>
      prevResources.filter((resource) => resource._id !== resourceId)
    );
  };

  // Function to manually refresh data
  const refreshData = useCallback(() => {
    setHasLoadedData(false);
    setError("");
    loadData();
  }, [loadData]);

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 bg-[#F8F8F8] min-h-screen p-3 sm:p-6">
        <div className="bg-white rounded-lg shadow-none border border-[#F0F0F0] p-3 sm:p-6">
          {/* Header Section */}
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#003366] rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-medium text-[#030E18]">
                  My Resources
                </h1>
                <p className="text-sm sm:text-base text-[#6F6F6F]">
                  Share your lessons and educational materials
                </p>
              </div>
            </div>

            {/* Action Section */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex items-center border border-[#F0F0F0] rounded-lg px-3  bg-white w-full">
                <Search className="text-[#878787]" size={18} />
                <Input
                  className="border-0 shadow-none focus-visible:ring-0 focus:outline-none flex-1 ml-2 text-sm sm:text-base"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-[#003366] hover:bg-[#002244] text-white shadow-none transition-all duration-300 w-full sm:w-auto sm:self-start"
              >
                <Upload className="h-4 w-4 mr-2" />
                <span className="text-sm sm:text-base">Upload Resource</span>
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Card className="border-0 shadow-none bg-white border border-[#F0F0F0]">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-[#6F6F6F] truncate">
                      Total Resources
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-[#030E18]">
                      {kpiData.totalResources}
                    </p>
                    <p className="text-xs text-[#878787] mt-1">
                      All time uploads
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F0F0F0] rounded-lg flex items-center justify-center ml-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#6F6F6F]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-none bg-white border border-[#F0F0F0]">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-[#6F6F6F] truncate">
                      This Week
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-[#030E18]">
                      {kpiData.thisWeekResources}
                    </p>
                    <p className="text-xs text-[#878787] mt-1 truncate">
                      {kpiData.recentResources > 0
                        ? `${kpiData.recentResources} in last 3 days`
                        : "Recent activity"}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F0F0F0] rounded-lg flex items-center justify-center ml-2">
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-[#6F6F6F]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-none bg-white border border-[#F0F0F0]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#6F6F6F]">
                      Classes Covered
                    </p>
                    <p className="text-2xl font-bold text-[#030E18]">
                      {kpiData.uniqueClasses}
                    </p>
                    <p className="text-xs text-[#878787] mt-1">
                      {kpiData.totalAssignedClasses > 0
                        ? `out of ${kpiData.totalAssignedClasses} assigned`
                        : "Active classes"}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-[#F0F0F0] rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-[#6F6F6F]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Resources Content */}
        <div className="bg-white rounded-lg shadow-none border border-[#F0F0F0] p-6">
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <LoadingCard key={i} height="h-32" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#F0F0F0] rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-[#878787]" />
              </div>
              <h3 className="text-lg font-semibold text-[#030E18] mb-2">
                Failed to load resources
              </h3>
              <p className="text-[#6F6F6F] mb-4">{error}</p>
              <Button
                onClick={refreshData}
                variant="outline"
                className="border-[#F0F0F0] text-[#030E18] hover:bg-[#F0F0F0]"
              >
                Try Again
              </Button>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#F0F0F0] rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-[#878787]" />
              </div>
              <h3 className="text-lg font-semibold text-[#030E18] mb-2">
                {searchTerm ? "No resources found" : "No resources yet"}
              </h3>
              <p className="text-[#6F6F6F] mb-4">
                {searchTerm
                  ? `No resources match "${searchTerm}". Try a different search term.`
                  : "Start by uploading your first educational resource."}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="bg-[#003366] hover:bg-[#002244] text-white shadow-none"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Resource
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#030E18]">
                  {searchTerm
                    ? `Search Results (${filteredResources.length})`
                    : `All Resources (${resources.length})`}
                </h2>
              </div>
              <ResourcesTable
                resources={filteredResources}
                classes={classes}
                onResourceDelete={handleResourceDelete}
              />
            </div>
          )}
        </div>
        {/* Debug Panel - Remove in production
        {process.env.NODE_ENV === "development" && (
          <div className="bg-[#F0F0F0]/30 border border-[#F0F0F0] rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-[#030E18] mb-2">
              Debug Info
            </h3>
            <div className="text-xs text-[#6F6F6F] space-y-1">
              <p>
                <strong>User ID:</strong> {user?.userId || "Not found"}
              </p>
              <p>
                <strong>Teacher ID:</strong> {user?.teacherId || "Not found"}
              </p>
              <p>
                <strong>Teacher Data Available:</strong>{" "}
                {teacherData ? "Yes" : "No"}
              </p>
              <p>
                <strong>Assigned Classes:</strong>{" "}
                {teacherData?.assignedClasses?.length ||
                  teacherData?.classTeacherClasses?.length ||
                  0}{" "}
                classes
              </p>
              <p>
                <strong>Classes from Context:</strong> {classes.length} classes
              </p>
              <p>
                <strong>Resources Loaded:</strong> {resources.length} resources
              </p>
              <p>
                <strong>Loading State:</strong> {loading ? "Yes" : "No"}
              </p>
              <p>
                <strong>Error:</strong> {error || "None"}
              </p>
            </div>
          </div>
        )} */}
        {/* Upload Modal */}
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onNewResourceUpload={handleNewResourceUpload}
        />
 
      </div>
    </Layout>
  );
}
