"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getAssignedClasses } from "../services/api.service";
import { useAuth } from "../hooks/useAuth";

type AppContextType = {
  user: any;
  classes: any[];
  refreshClasses: () => Promise<void>;
};

const AppContext = createContext<AppContextType>({
  user: null,
  classes: [],
  refreshClasses: async () => {},
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getUser, getAccessToken } = useAuth();

  const [user, setUser] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const fetchClasses = async () => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    const fetchedClasses = await getAssignedClasses(user.userId, token);
    console.log(fetchedClasses);
    
    setClasses(fetchedClasses);
  };

  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  return (
    <AppContext.Provider value={{ user, classes, refreshClasses: fetchClasses }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
