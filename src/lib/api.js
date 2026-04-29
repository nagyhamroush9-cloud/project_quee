import axios from "axios";

const baseURL = import.meta.env.DEV ? "http://localhost:4000/api" : "/api";

export const api = axios.create({
  baseURL,
  timeout: 20000,
  withCredentials: false
});

api.interceptors.request.use((config) => {
  const remember = localStorage.getItem("hqms_remember") === "1";
  const token = sessionStorage.getItem("hqms_token") || (remember ? localStorage.getItem("hqms_token") : null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      sessionStorage.removeItem("hqms_token");
      sessionStorage.removeItem("hqms_user");
      localStorage.removeItem("hqms_token");
      localStorage.removeItem("hqms_user");
      window.dispatchEvent(new Event("hqms:auth:changed"));
    }
    return Promise.reject(err);
  }
);

