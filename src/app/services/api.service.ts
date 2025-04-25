import axios from "axios";
import { API_BASE_URL } from "../lib/api/config";
import { Student } from "@/types/student";

// Fetch classes assigned to a teacher
export const getAssignedClasses = async (userId: string, token: string) => {
  try {
    const teacherResponse = await axios.get(
      `${API_BASE_URL}/teachers/${userId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const assignedClassIds = teacherResponse.data.assignedClasses || [];
    if (!Array.isArray(assignedClassIds) || assignedClassIds.length === 0) {
      return [];
    }

    const classPromises = assignedClassIds.map((classId) =>
      axios
        .get(`${API_BASE_URL}/classes/${classId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => res.data)
    );

    return await Promise.all(classPromises);
  } catch (error) {
    console.error("Error fetching assigned classes:", error);
    return [];
  }
};

// Fetch students by class
export const getStudentsByClass = async (classId: string, token: string) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/students/by-class/${classId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: 1,
          limit: 10,
        },
      }
    );
    return response.data.data || [];
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
};

export const fetchStudent = async (
  id: string,
  token: string
): Promise<Student | null> => {
  if (!id) throw new Error("Student ID is missing.");
  if (!token) throw new Error("Unauthorized: No token found.");

  try {
    const response = await axios.get(`${API_BASE_URL}/students/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.data[0] || null; // Assuming student is in `data.data[0]`
  } catch (err) {
    throw new Error(
      (err as any).response?.data?.message || "Failed to fetch student data."
    );
  }
};

export const fetchTeacherDetails = async (id: string, token: string) => {
  if (!id) throw new Error("Teacher ID is missing.");
  if (!token) throw new Error("Unauthorized: No token found.");

  try {
    const response = await axios.get(`${API_BASE_URL}/teachers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data || null;
  } catch (err) {
    throw new Error(
      (err as any).response?.data?.message || "Failed to fetch teacher data."
    );
  }
};

export const fetchResources = async (token: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/resources`, {
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
    await axios.delete(`${API_BASE_URL}/resources/${id}`, {
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
    const response = await fetch(
      `${API_BASE_URL}/academic-year-term/term/current`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) throw new Error("Failed to fetch current term");
    return await response.json();
  } catch (error) {
    console.error("Error fetching current term:", error);
    throw error;
  }
};

export const uploadResource = async (data: any, token: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/resources`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to upload resource");
    return await response.json();
  } catch (error) {
    console.error("Error uploading resource:", error);
    throw error;
  }
};

// api.service.ts
export const updateResource = async (
  resourceId: string,
  data: any,
  token: string
) => {
  const response = await fetch(`${API_BASE_URL}/resources/${resourceId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to update resource");
  }
  return response.json();
};

export const submitAttendance = async (
  payload: {
    studentId: string;
    classId: string;
    recordedBy: string;
    date: string;
    status: string;
    termId: string;
  },
  token: string
) => {
  const res = await fetch(`${API_BASE_URL}/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to submit attendance");
  }

  return await res.json();
};

export const getTeacherTimetable = async (teacherId: string, token: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/timetable/teacher/${teacherId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch timetable");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching timetable:", error);
    throw error;
  }
};

// Fetch a single course (subject) by its ID
export const fetchCourseById = async (courseId: string, token: string) => {
  const res = await axios.get(
    `${API_BASE_URL}/courses/${courseId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.data; // adjust if your API wraps differently
};

