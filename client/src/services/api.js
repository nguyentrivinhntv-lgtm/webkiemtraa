import axios from 'axios';

// Use relative URL so it works seamlessly in both dev (via proxy) and production
const API_BASE = '/api';

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
