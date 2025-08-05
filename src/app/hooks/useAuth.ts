"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import nookies from "nookies";
import { authService } from "../services/auth.service";
import { LoginCredentials, User } from "../../types/auth";
import { API_BASE_URL } from "../lib/api/config";
import axios from "axios";

export const useAuth = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Check authentication status on mount and when cookies change
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      const userData = getUser();
      
      console.log('🔍 Auth checkAuth:', { 
        hasToken: !!token, 
        hasUserData: !!userData, 
        userData: userData 
      });
      
      if (token && userData) {
        setIsAuthenticated(true);
        setUser(userData);
        console.log('🔍 Auth state set:', { 
          isAuthenticated: true, 
          userId: userData._id,
          userObject: userData 
        });
      } else {
        setIsAuthenticated(false);
        setUser(null);
        console.log('🔍 Auth state cleared - missing token or userData');
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);

      // Save tokens in cookies
      nookies.set(null, "access_token", response.access_token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });

      nookies.set(null, "refresh_token", response.refresh_token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });

      const introspection = await axios.post(
        `${API_BASE_URL}/auth/introspect`,
        {
          token: response.access_token,
        }
      );

      if (!introspection.data.active) {
        throw new Error("Token is invalid");
      }

      const userData = introspection.data.user;

      console.log('🔍 Login - userData from introspection:', userData);
      console.log('🔍 Login - User ID fields:', {
        _id: userData._id,
        userId: userData.userId,
        preferredId: userData.userId || userData._id
      });

      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(userData));
      
      // Update state
      setIsAuthenticated(true);
      setUser(userData);

      console.log('🔍 Login - Auth state updated:', { 
        isAuthenticated: true, 
        userId: userData._id,
        userObject: userData 
      });

      toast.success("Login successful!");

      // Try multiple navigation approaches
      try {
        router.push("/dashboard");

        // If router.push doesn't work, try window.location after a short delay
        setTimeout(() => {
          if (window.location.pathname !== "/dashboard") {
            console.log("Fallback to window.location...");
            window.location.href = "/dashboard";
          }
        }, 500);
      } catch (navError) {
        console.error("Navigation error:", navError);
        // Fallback to window.location
        window.location.href = "/dashboard";
      }

      return response;
    } catch (error) {
      console.error("Login error:", error);
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
    nookies.destroy(null, "access_token");
    nookies.destroy(null, "refresh_token");

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
    const cookies = nookies.get(null);
    return cookies.access_token || null;
  };

  const getRefreshToken = (): string | null => {
    const cookies = nookies.get(null);
    return cookies.refresh_token || null;
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