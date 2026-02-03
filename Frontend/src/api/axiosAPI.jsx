import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000",
  // baseURL: 'https://api.balytrust.fr',
  // baseURL: 'http://192.168.1.111:3000',
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. REQUEST INTERCEPTOR (Inject Token)
api.interceptors.request.use(
  (config) => {
    // Retrieve token from LocalStorage (or Cookies)
    // Ensure this matches where you save it during Login
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. RESPONSE INTERCEPTOR (Handle Expiry)
api.interceptors.response.use(
  (response) => response, // If success, just return data
  (error) => {
    // Check if error is 401 (Unauthorized)
    if (error.response && error.response.status === 401) {

      // OPTIONAL: Prevent infinite loops if the login endpoint itself returns 401
      if (!error.config.url.includes('/login')) {
        // a) Clear stored data
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // b) Force redirect to login
        // Using window.location is safer than React Router here 
        // because this file is outside the React Component Tree
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;