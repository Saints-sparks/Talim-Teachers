// export const API_BASE_URL = "https://talimbe-v2-li38.onrender.com";
export const API_BASE_URL = "http://localhost:5005";

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
  // Add other endpoints as needed
} as const;
