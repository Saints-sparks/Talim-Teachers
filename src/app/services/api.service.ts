import axios from 'axios';
import { API_BASE_URL } from '../lib/api/config';
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

  export const fetchStudent = async (id: string, token: string): Promise<Student | null> => {
    if (!id) throw new Error("Student ID is missing.");
    if (!token) throw new Error("Unauthorized: No token found.");
  
    try {
      const response = await axios.get(`${API_BASE_URL}/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      return response.data.data[0] || null; // Assuming student is in `data.data[0]`
    } catch (err) {
      throw new Error((err as any).response?.data?.message || "Failed to fetch student data.");
    }
  };

