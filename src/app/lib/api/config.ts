// export const API_BASE_URL = "https://talim-be-dev.onrender.com";
export const API_BASE_URL = "https://talim-be-dev.onrender.com";

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
  REFRESH: `${API_BASE_URL}/auth/refresh`,
  // Add other endpoints as needed
} as const;
