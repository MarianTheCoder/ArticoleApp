import axios from 'axios';

// Create an Axios instance with the base URL
const api = axios.create({
    // baseURL: 'https://balyenergies.fr',
    baseURL: 'http://localhost:3000',
    // baseURL: 'http://192.168.1.119:3000',
});

export default api;
