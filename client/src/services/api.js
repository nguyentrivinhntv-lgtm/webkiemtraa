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

// Auto attach JWT token to all requests if logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Auth APIs
export const loginApi = (email, password) => api.post('/auth/login', { email, password });
export const registerApi = (data) => api.post('/auth/register', data);
export const getMeApi = () => api.get('/auth/me');
export const updateProfileApi = (data) => api.put('/auth/profile', data);
export const changePasswordApi = (data) => api.put('/auth/change-password', data);

// Upload Word or Excel
export const uploadWordFile = (file) => {
  const formData = new FormData();
  formData.append('wordFile', file);
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const downloadExcelTemplateApi = () => {
  return api.get('/upload/template/excel', { responseType: 'blob' });
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
export const getUserSubmissions = () => api.get('/quiz/user/submissions');
export const getAiExplanationApi = (data) => {
  const savedKey = localStorage.getItem('ai_api_key') || localStorage.getItem('gemini_api_key') || '';
  const savedProvider = localStorage.getItem('ai_provider') || 'auto';
  return api.post('/quiz/ai-explain', {
    ...data,
    apiKey: savedKey,
    provider: savedProvider
  }, {
    headers: savedKey ? { 'x-gemini-key': savedKey } : {}
  });
};
export const testAiKeyApi = (apiKey, provider = 'auto') => api.post('/quiz/test-ai-key', { apiKey, provider });

// Study APIs (Bookmarks, Progress, Spaced Repetition)
export const getBookmarksApi = () => api.get('/study/bookmarks');
export const toggleBookmarkApi = (data) => api.post('/study/bookmarks/toggle', data);
export const updateBookmarkNoteApi = (id, note) => api.put(`/study/bookmarks/${id}/note`, { note });
export const getQuizProgressApi = (quizId) => api.get(`/study/progress/${quizId}`);
export const saveQuizProgressApi = (quizId, data) => api.post(`/study/progress/${quizId}`, data);
export const getDueSpacedRepApi = (quizId) => api.get('/study/spaced-rep/due', { params: { quizId } });
export const submitSpacedRepReviewApi = (cardData, quality) => api.post('/study/spaced-rep/review', { cardData, quality });

// Teacher APIs
export const getTeacherOverviewApi = () => api.get('/teacher/overview');
export const getQuizAnalyticsApi = (quizId) => api.get(`/teacher/analytics/${quizId}`);
export const exportQuizExcelApi = (quizId) => api.get(`/teacher/export/${quizId}`, { responseType: 'blob' });

// Gamification APIs
export const getLeaderboardApi = (quizId, timeframe = 'all') => api.get('/gamification/leaderboard', { params: { quizId, timeframe } });
export const getUserBadgesApi = () => api.get('/gamification/badges');
export const getChallengeApi = (quizId, mode = 'speed') => api.get(`/gamification/challenge/${quizId}`, { params: { mode } });
export const getSpeedChallengeApi = (quizId) => getChallengeApi(quizId, 'speed');

// Classroom APIs
export const createClassroomApi = (data) => api.post('/classroom', data);
export const getTeacherClassroomsApi = () => api.get('/classroom/teacher');
export const getStudentClassroomsApi = () => api.get('/classroom/student');
export const joinClassroomApi = (code) => api.post('/classroom/join', { code });
export const getClassroomDetailApi = (id) => api.get(`/classroom/${id}`);
export const assignQuizToClassApi = (classId, data) => api.post(`/classroom/${classId}/assign`, data);
export const getClassroomProgressApi = (classId) => api.get(`/classroom/${classId}/progress`);
export const deleteClassroomApi = (classId) => api.delete(`/classroom/${classId}`);

export default api;
