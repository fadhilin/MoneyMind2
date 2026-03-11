import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  withCredentials: true, // send session cookies automatically
});

// Redirect to /login on unauthenticated responses
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
