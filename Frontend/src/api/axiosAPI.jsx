import axios from 'axios';

// Create an Axios instance with the base URL
const api = axios.create({
    // baseURL: 'https://balyenergies.fr',
    baseURL: 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;
