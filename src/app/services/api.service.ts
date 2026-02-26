import { API_BASE_URL } from "../lib/api/config";
import { Student } from "@/types/student";
import { apiClient } from "../lib/api/apiClient";

// Simple cache for current term to prevent repeated requests
let currentTermCache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to clear the current term cache
export const clearCurrentTermCache = () => {
  currentTermCache = null;
 
};

// Fetch classes assigned to a teacher
export const getAssignedClasses = async (userId: string, token: string) => {
  try {
    const teacherResponse = await apiClient.get(
      `${API_BASE_URL}/teachers/${userId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const assignedClassIds = teacherResponse.data.assignedClasses || [];
    if (!Array.isArray(assignedClassIds) || assignedClassIds.length === 0) {
      return [];
    }

    const classPromises = assignedClassIds.map((classId) =>
      apiClient
        .get(`${API_BASE_URL}/classes/${classId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => res.data),
    );

    return await Promise.all(classPromises);
  } catch (error) {
   
    return [];
  }
};

// Fetch courses assigned to a teacher
export const getTeacherCourses = async (teacherId: string, token: string) => {
  try {
    const teacherData = await fetchTeacherDetails(teacherId, token);

    if (
      !teacherData.assignedCourses ||
      !Array.isArray(teacherData.assignedCourses)
    ) {
     
      return [];
    }

    // Map the assignedCourses to the expected format
    const courses = teacherData.assignedCourses.map((course: any) => ({
      _id: course._id,
      title: course.title,
      courseCode: course.courseCode,
      description: course.description,
      classId: course.classId,
      timetable: course.timetable || [],
    }));

    return courses;
  } catch (error) {
    console.error("Error fetching teacher courses:", error);
    return [];
  }
};

// Fetch students by class
export const getStudentsByClass = async (classId: string, token: string) => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/students/by-class/${classId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: 1,
          limit: 10,
        },
      },
    );
    return response.data.data || [];
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
};

export const fetchStudent = async (
  id: string,
  token: string,
): Promise<Student | null> => {
  if (!id) throw new Error("Student ID is missing.");
  if (!token) throw new Error("Unauthorized: No token found.");

  try {
    const response = await apiClient.get(`${API_BASE_URL}/students/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.data[0] || null; // Assuming student is in `data.data[0]`
  } catch (err) {
    throw new Error(
      (err as any).response?.data?.message || "Failed to fetch student data.",
    );
  }
};

export const fetchTeacherDetails = async (id: string, token: string) => {
  if (!id) throw new Error("Teacher ID is missing.");
  if (!token) throw new Error("Unauthorized: No token found.");

  try {
    const response = await apiClient.get(`${API_BASE_URL}/teachers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data || null;
  } catch (err) {
    throw new Error(
      (err as any).response?.data?.message || "Failed to fetch teacher data.",
    );
  }
};

export const fetchResources = async (token: string, teacherId?: string) => {
  try {
    // If teacherId is provided, fetch only resources uploaded by that teacher
    const endpoint = teacherId
      ? `${API_BASE_URL}/resources/user/${teacherId}`
      : `${API_BASE_URL}/resources`;

    const response = await apiClient.get(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching resources:", error);
    return [];
  }
};

export const deleteResource = async (id: string, token: string) => {
  try {
    await apiClient.delete(`${API_BASE_URL}/resources/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch (error) {
    console.error("Error deleting resource:", error);
    return false;
  }
};

export const getCurrentTerm = async (token: string) => {
  try {
    // Check cache first
    if (
      currentTermCache &&
      Date.now() - currentTermCache.timestamp < CACHE_DURATION
    ) {
   
      return currentTermCache.data;
    }

    const response = await apiClient.get(
      `${API_BASE_URL}/academic-year-term/term/current`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data = response.data;

    // Update cache
    currentTermCache = {
      data,
      timestamp: Date.now(),
    };

  
    return data;
  } catch (error) {
   
    // Return cached data if available, even if expired
    if (currentTermCache) {
     
      return currentTermCache.data;
    }
    throw error;
  }
};

export const uploadResource = async (data: any, token: string) => {
  try {
    const response = await apiClient.post(`${API_BASE_URL}/resources`, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading resource:", error);
    throw error;
  }
};

export const createResource = async (resourceData: any, token: string) => {
  try {
    const response = await apiClient.post(
      `${API_BASE_URL}/resources`,
      resourceData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error creating resource:", error);
    throw error;
  }
};

// api.service.ts
export const updateResource = async (
  resourceId: string,
  data: any,
  token: string,
) => {
  const response = await apiClient.put(
    `${API_BASE_URL}/resources/${resourceId}`,
    data,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

export const submitAttendance = async (
  payload: {
    studentId: string;
    classId: string;
    date: string;
    status: string;
    termId: string;
    absenceReason?: string;
  },
  token: string,
) => {
  const res = await apiClient.post(`${API_BASE_URL}/attendance`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

export const getTeacherTimetable = async (teacherId: string, token: string) => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/timetable/teacher/${teacherId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching timetable:", error);
    throw error;
  }
};

// Fetch a single course (subject) by its ID
export const fetchCourseById = async (courseId: string, token: string) => {
  const res = await apiClient.get(`${API_BASE_URL}/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data; // adjust if your API wraps differently
};

// Get active assessments by term
export const getActiveAssessmentsByTerm = async (
  termId: string,
  token: string,
) => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/assessments/term/${termId}/active`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data || [];
  } catch (error) {
    console.error("Error fetching active assessments:", error);
    return [];
  }
};

// Get class attendance status for a specific date
export const getClassAttendanceStatus = async (
  classId: string,
  token: string,
  date?: string,
) => {
  try {
    const dateQuery = date ? `?date=${date}` : "";
    const response = await apiClient.get(
      `${API_BASE_URL}/attendance/class/${classId}/status${dateQuery}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching class attendance status:", error);
    return null;
  }
};

// Get student attendance KPIs
export const getStudentAttendanceKPIs = async (
  studentId: string,
  token: string,
  options?: {
    termId?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  try {
    const queryParams = new URLSearchParams();
    if (options?.termId) queryParams.append("termId", options.termId);
    if (options?.startDate) queryParams.append("startDate", options.startDate);
    if (options?.endDate) queryParams.append("endDate", options.endDate);

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/attendance/student/${studentId}/kpis${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await apiClient.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching student attendance KPIs:", error);
    return null;
  }
};

// Fetch teacher dashboard KPIs
export const getTeacherDashboardKPIs = async (
  teacherId: string,
  token: string,
) => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/teachers/${teacherId}/dashboard/kpis`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching teacher dashboard KPIs:", error);
    return null;
  }
};

// Fetch all teachers dashboard KPIs
export const getAllTeachersDashboardKPIs = async (token: string) => {
  try {
    const response = await apiClient.get(
      `${API_BASE_URL}/teachers/dashboard/kpis/all`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching all teachers dashboard KPIs:", error);
    return null;
  }
};
