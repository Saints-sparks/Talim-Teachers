import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import nookies from "nookies";
import { authService } from "../services/auth.service";
import { LoginCredentials, User } from "../../types/auth";
import { API_BASE_URL } from "../lib/api/config";
import axios from "axios";
import { log } from "console";

export const useAuth = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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

      const user = introspection.data.user;

      // **Store user data in localStorage**
      localStorage.setItem("user", JSON.stringify(user));

      toast.success("Login successful!");

      // Try multiple navigation approaches
      try {
        // console.log('Attempting navigation...');
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
    return cookies.access_token || null; // Replace with your actual cookie name if different
  };

  const getRefreshToken = (): string | null => {
    const cookies = nookies.get(null);
    return cookies.refresh_token || null; // Replace with your actual cookie name if different
  };

  return {
    login,
    logout,
    getUser,
    getAccessToken,
    getRefreshToken,
    isLoading,
  };
};
