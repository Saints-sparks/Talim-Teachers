"use client";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesTable } from "@/components/resorces/ResourceTable";
import { UploadModal } from "@/components/resorces/uploadmodal";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { fetchResources, getAssignedClasses } from "../services/api.service";
import { useAuth } from "../hooks/useAuth";
import { Resource } from "@/types/student";

export default function ResourcePage() {
  const { getAccessToken, getUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [classes, setClasses] = useState<any[]>([]); // Store assigned classes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = getAccessToken();
        if (!token) throw new Error("No token found");

        const [resourceData, classData] = await Promise.all([
          fetchResources(token),
          getAssignedClasses(user?.userId, token),
        ]);

        setResources(resourceData);
        setClasses(classData);
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const filteredResources = resources.filter(
    (resource) =>
      resource.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewResourceUpload = (newResource: Resource) => {
    setResources((prevResources) => [...prevResources, newResource]);
  };

  const handleResourceDelete = (resourceId: string) => {
    setResources((prevResources) => prevResources.filter((resource) => resource._id !== resourceId));
  };

  return (
    <Layout>
      <div className="space-y-1 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 gap-2">
          <div className="w-full">
            <h1 className="text-xl font-medium mb-1 text-[#2F2F2F] ">
              Resources
            </h1>
            <p className="text-[#AAAAAA]">Share Your Lessons and Resources</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center border border-[#F0F0F0] shadow-none rounded-lg px-3  bg-white">
              <Search className="text-[#898989]" size={18} />
              <Input
                className="border-0 shadow-none focus-visible:ring-0 focus:outline-none flex-1"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-[#001466] hover:bg-[#003366] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>
        <div className="px-4">
          {loading && <p className="text-center">Loading...</p>}
          {!loading && !error && (
            <ResourcesTable resources={filteredResources} classes={classes} onResourceDelete={handleResourceDelete} />
          )}
        </div>
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onNewResourceUpload={handleNewResourceUpload}
          // classes={classes}
        />
      </div>
    </Layout>
  );
}