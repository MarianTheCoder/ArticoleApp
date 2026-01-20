import axios from "axios";

// Create an Axios instance with the base URL
const api = axios.create({
  baseURL: "http://localhost:3000",
  // baseURL: 'https://api.balytrust.fr',
  // baseURL: 'http://192.168.1.111:3000',
  timeout: 15000, // 15 secunde
});

export default api;
