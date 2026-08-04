import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests (check both localStorage and sessionStorage)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.patch('/auth/profile', data);

// Teacher
export const createPaper = (data) => api.post('/teacher/papers', data);
export const updatePaper = (id, data) => api.put(`/teacher/papers/${id}`, data);
export const createPaperFromImage = (files, title, subject, class_level, duration) => {
  const formData = new FormData();
  if (Array.isArray(files)) {
    files.forEach((file) => formData.append('files', file));
  } else {
    formData.append('files', files);
  }
  if (title) formData.append('title', title);
  if (subject) formData.append('subject', subject);
  if (class_level) formData.append('class_level', class_level);
  if (duration) formData.append('duration_minutes', duration);
  return api.post('/teacher/papers/from-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getStudents = () => api.get('/teacher/students');
export const teacherSubmitAnswer = (paperId, studentId, files) => {
  const formData = new FormData();
  if (Array.isArray(files)) {
    files.forEach((file) => formData.append('files', file));
  } else {
    formData.append('files', files);
  }
  return api.post(`/teacher/papers/${paperId}/submit-for-student/${studentId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const extractQuestionsFromImage = (files) => {
  const formData = new FormData();
  if (Array.isArray(files)) {
    files.forEach((file) => formData.append('files', file));
  } else {
    formData.append('files', files);
  }
  return api.post('/teacher/extract-questions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getMyPapers = () => api.get('/teacher/papers');
export const getPaper = (id) => api.get(`/teacher/papers/${id}`);
export const getPaperSubmissions = (id) => api.get(`/teacher/papers/${id}/submissions`);
export const deletePaper = (id) => api.delete(`/teacher/papers/${id}`);
export const uploadTextbook = (file, title, subject, class_level) => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (subject) formData.append('subject', subject);
  if (class_level) formData.append('class_level', class_level);
  return api.post('/teacher/textbooks', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getMyTextbooks = () => api.get('/teacher/textbooks');
export const deleteTextbook = (id) => api.delete(`/teacher/textbooks/${id}`);

// Student
export const getTeachers = () => api.get('/student/teachers');
export const getAvailablePapers = (teacherId = null) => {
  const params = teacherId ? { teacher_id: teacherId } : {};
  return api.get('/student/papers', { params });
};
export const getPaperDetails = (id) => api.get(`/student/papers/${id}`);
export const submitAnswer = (paperId, files) => {
  const formData = new FormData();
  // Handle both single file and multiple files
  if (Array.isArray(files)) {
    files.forEach((file) => {
      formData.append('files', file);
    });
  } else {
    formData.append('files', files);
  }
  return api.post(`/student/submit/${paperId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getMySubmissions = () => api.get('/student/submissions');
export const getSubmissionDetails = (id) => api.get(`/student/submissions/${id}`);
export const getSubmissionImage = (submissionId, page = 1) => {
  return `${API_URL}/student/submissions/${submissionId}/image?page=${page}`;
};

// --- Parent Portal Endpoints ---
export const parentLogin = (data) => api.post('/auth/parent-login', data);
export const generateParentCode = () => api.post('/student/parent-code');
export const getParentCode = () => api.get('/student/parent-code');
export const getParentStudentInfo = () => api.get('/parent/student-info');
export const getParentProgress = () => api.get('/parent/progress');
export const getParentSubmissions = () => api.get('/parent/submissions');
export const getParentSubmissionDetails = (id) => api.get(`/parent/submissions/${id}`);

export default api;
