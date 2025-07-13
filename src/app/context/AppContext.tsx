"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchTeacherDetails } from "../services/api.service";
import { useAuth } from "../hooks/useAuth";

type AppContextType = {
  user: any;
  teacherData: any;
  classes: any[];
  refreshClasses: () => Promise<void>;
  isLoading: boolean;
};

const AppContext = createContext<AppContextType>({
  user: null,
  teacherData: null,
  classes: [],
  refreshClasses: async () => {},
  isLoading: false,
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { getUser, getAccessToken } = useAuth();

  const [user, setUser] = useState<any>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const fetchTeacherAndClasses = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const token = getAccessToken();
      if (!token) return;
      
      const teacherDetails = await fetchTeacherDetails(user.userId, token);
      console.log("Teacher details:", teacherDetails);
      
      setTeacherData(teacherDetails);
      
      // Extract classes from teacher data - use classTeacherClasses or assignedClasses
      const teacherClasses = teacherDetails?.classTeacherClasses || teacherDetails?.assignedClasses || [];
      console.log("Extracted teacher classes:", teacherClasses);
      setClasses(teacherClasses);
    } catch (error) {
      console.error("Error fetching teacher data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTeacherAndClasses();
    }
  }, [user]);

  return (
    <AppContext.Provider
      value={{ 
        user, 
        teacherData, 
        classes, 
        refreshClasses: fetchTeacherAndClasses,
        isLoading
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
