import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import nookies from 'nookies';
import { authService } from '../services/auth.service';
import { LoginCredentials, User } from '../../types/auth';
import { API_BASE_URL } from '../lib/api/config';
import axios from 'axios';

export const useAuth = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);

      // Save tokens in cookies
      nookies.set(null, 'access_token', response.access_token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });

      nookies.set(null, 'refresh_token', response.refresh_token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });

      const introspection = await axios.post(`${API_BASE_URL}/auth/introspect`, {
        token: response.access_token,
      });
  
  
      if (!introspection.data.active) {
        throw new Error("Token is invalid");
      }
  
      const user = introspection.data.user;
  
      // **Store user data in localStorage**
      localStorage.setItem("user", JSON.stringify(user));
  

      toast.success('Login successful!');
      
      // Try multiple navigation approaches
      try {
        // console.log('Attempting navigation...');
        router.push('/dashboard');
        
        // If router.push doesn't work, try window.location after a short delay
        setTimeout(() => {
          if (window.location.pathname !== '/dashboard') {
            console.log('Fallback to window.location...');
            window.location.href = '/dashboard';
          }
        }, 500);
      } catch (navError) {
        console.error('Navigation error:', navError);
        // Fallback to window.location
        window.location.href = '/dashboard';
      }
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear cookies
    nookies.destroy(null, 'access_token');
    nookies.destroy(null, 'refresh_token');
    
    // Clear local storage
    localStorage.removeItem('user');
    
    // Use both navigation methods for logout as well
    router.push('/');
    window.location.href = '/';
  };

  const getUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem('user');
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

  const refreshAccessToken = async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token found.");

      // Request a new access token using the refresh token
      const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
        refreshToken,
      });

      const { access_token, refresh_token } = response.data;

      // Save the new access token and refresh token
      nookies.set(null, 'access_token', access_token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
      nookies.set(null, 'refresh_token', refresh_token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });

      // Return the new access token
      return access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };

  // Error handler to intercept 401 and trigger token refresh
  const handleError = async (error: any) => {
    if (error.response?.status === 401) {
      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        // Retry the failed request with the new access token
        error.config.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return axios(error.config);
      }
    }
    throw error;
  };

  // Interceptor to handle token refresh automatically on 401
  axios.interceptors.response.use(
    response => response,
    async error => handleError(error)
  );

  return {
    login,
    logout,
    getUser,
    getAccessToken,
    getRefreshToken,
    isLoading,
  };
}; 