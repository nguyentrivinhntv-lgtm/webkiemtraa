import axios from 'axios';

// If deployed separately, read VITE_API_URL (e.g., https://webkiemtra-backend.onrender.com/api)
// If running locally or unified, fallback to relative '/api'
const rawApiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.trim() : '';
const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api`)
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

// Upload Word
export const uploadWordFile = (file) => {
  const formData = new FormData();
  formData.append('wordFile', file);
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const parseTextQuestions = (text, title) => {
  return api.post('/upload/text', { text, title });
};

export const confirmQuiz = (quizData, settings) => {
  return api.post('/upload/confirm', { quizData, settings });
};

// Quiz
export const getQuizList = () => api.get('/quiz');
export const getQuiz = (id) => api.get(`/quiz/${id}`);
export const getQuizAdmin = (id) => api.get(`/quiz/${id}/admin`);
export const submitQuiz = (id, data) => api.post(`/quiz/${id}/submit`, data);
export const deleteQuiz = (id) => api.delete(`/quiz/${id}`);

export default api;
