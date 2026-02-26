"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import nookies from "nookies";
import { authService } from "../services/auth.service";
import { LoginCredentials, User } from "../../types/auth";
import { API_BASE_URL } from "../lib/api/config";
import { apiClient } from "../lib/api/apiClient";

export interface UseAuthReturn {
  login: (credentials: LoginCredentials) => Promise<any>;
  logout: () => void;
  getUser: () => User | null;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
}

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Check authentication status on mount and when cookies change
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      const userData = getUser();

    

      if (!token) {
      
        toast.error(
          "Authentication token not available. Please try logging in again."
        );
      }
      if (token && userData) {
        setIsAuthenticated(true);
        setUser(userData);
       
      } else {
        setIsAuthenticated(false);
        setUser(null);
       
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const syncUser = () => {
      const userData = getUser();
      const token = getAccessToken();
      if (token && userData) {
        setIsAuthenticated(true);
        setUser(userData);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "user") syncUser();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("user-updated", syncUser as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("user-updated", syncUser as EventListener);
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    // Clear old auth cookies before setting new ones
    nookies.destroy(undefined, "access_token", { path: "/" });
    nookies.destroy(undefined, "refresh_token", { path: "/" });
    nookies.destroy(undefined, "refreshToken", { path: "/" });
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);

     
      nookies.set(undefined, "access_token", response.access_token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
        sameSite: "lax",
        secure: false,
      });

     
      nookies.set(undefined, "refresh_token", response.refresh_token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
        sameSite: "lax",
        secure: false,
      });
      nookies.set(undefined, "refreshToken", response.refresh_token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
        sameSite: "lax",
        secure: false,
      });

      // Immediately check if cookies are set
      const cookiesAfterSet = nookies.get(undefined);
     
      if (!cookiesAfterSet.access_token) {
        
        toast.error("Login failed: Token not saved.");
        throw new Error("Login failed: Token not saved.");
      }

      const introspection = await apiClient.post(
        `${API_BASE_URL}/auth/introspect`,
        {
          token: response.access_token,
        }
      );

      if (!introspection.data.active) {
        throw new Error("Token is invalid");
      }

      const userData = introspection.data.user;

     

      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(userData));

      // Update state
      setIsAuthenticated(true);
      setUser(userData);

    
      toast.success("Login successful!");

      // Ensure cookies are set before redirecting
      setTimeout(() => {
        try {
          router.push("/dashboard");
          if (window.location.pathname !== "/dashboard") {
          
            window.location.href = "/dashboard";
          }
        } catch (navError) {
        
          window.location.href = "/dashboard";
        }
      }, 300); // Slight delay to ensure cookies are set

      return response;
    } catch (error) {
     
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      toast.error(errorMessage);

      // Update state on login failure
      setIsAuthenticated(false);
      setUser(null);

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear cookies
    nookies.destroy(undefined, "access_token", { path: "/" });
    nookies.destroy(undefined, "refresh_token", { path: "/" });
    nookies.destroy(undefined, "refreshToken", { path: "/" });

    // Clear local storage
    localStorage.removeItem("user");

    // Update state
    setIsAuthenticated(false);
    setUser(null);

    // Use both navigation methods for logout as well
    router.push("/");
    window.location.href = "/";
  };

  const getUser = (): User | null => {
    if (typeof window === "undefined") return null;

    const userStr = localStorage.getItem("user");
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  const getAccessToken = (): string | null => {
    const cookies = nookies.get(undefined);
    return cookies.access_token || null;
  };

  const getRefreshToken = (): string | null => {
    const cookies = nookies.get(undefined);
    return cookies.refreshToken || cookies.refresh_token || null;
  };

  return {
    login,
    logout,
    getUser,
    getAccessToken,
    getRefreshToken,
    isLoading,
    isAuthenticated,
    user,
  };
};
