import { useState, useEffect } from "react";
import { getTeacherDashboardKPIs } from "../services/api.service";
import { useAuth } from "./useAuth";
import { useAppContext } from "../context/AppContext";
import type { TeacherKPIs } from "@/types/dashboard";

export const useTeacherKPIs = () => {
  const [kpis, setKpis] = useState<TeacherKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getAccessToken } = useAuth();
  const { user } = useAppContext();

  const fetchKPIs = async () => {
    if (!user?.userId) {
      setError("User information not available");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        throw new Error("Authentication token not available");
      }

      const kpiData = await getTeacherDashboardKPIs(user.userId, token);

      if (kpiData) {
        // Ensure all numeric fields have default values
        const sanitizedKpis: TeacherKPIs = {
          ...kpiData,
          assignedSubjects: kpiData.assignedSubjects || 0,
          addedResources: kpiData.addedResources || 0,
          recordedAttendance: kpiData.recordedAttendance || 0,
          assignedClasses: kpiData.assignedClasses || 0,
          totalStudents: kpiData.totalStudents || 0,
          yearsOfExperience: kpiData.yearsOfExperience || 0,
          specialization: kpiData.specialization || "Not specified",
        };
        setKpis(sanitizedKpis);
      } else {
        throw new Error("No KPI data received from server");
      }
    } catch (err: any) {
      console.error("Error fetching teacher KPIs:", err);
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.userId) {
      fetchKPIs();
    }
  }, [user?.userId]);

  const refreshKPIs = () => {
    fetchKPIs();
  };

  return {
    kpis,
    loading,
    error,
    refreshKPIs,
  };
};
