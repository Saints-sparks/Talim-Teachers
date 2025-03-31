import { API_ENDPOINTS } from '../lib/api/config';
import { AuthResponse, LoginCredentials } from '../types/auth';

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      return data;
    } catch (error) {
      throw error instanceof Error 
        ? error 
        : new Error('An unexpected error occurred');
    }
  }
}

export const authService = new AuthService(); 