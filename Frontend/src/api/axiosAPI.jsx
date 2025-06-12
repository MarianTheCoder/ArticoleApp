import axios from 'axios';

// Create an Axios instance with the base URL
const api = axios.create({
    baseURL: 'https://balyenergies.fr/api',
    // baseURL: 'http://localhost:3000/api',
    // baseURL: 'http://192.168.1.111:3000/api',
});

export default api;
