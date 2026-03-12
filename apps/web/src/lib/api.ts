import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/v1`
    : "https://moneymind-production.up.railway.app/api/v1",
  withCredentials: true, // send session cookies automatically
});

// Response interceptor - no longer redirecting to /login in offline mode
api.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject(error),
);

export default api;
