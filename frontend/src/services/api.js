import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS } from '../constants/config';

/**
 * Enterprise Axios Instance
 * Supports VITE_API_BASE_URL with graceful fallback to '/api'
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor: Attach Bearer token from localStorage or sessionStorage
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Parse FastAPI error details gracefully
 */
export const formatErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') return error;

  const response = error.response;
  if (!response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Request timed out. Please verify your connection and try again.';
    }
    return 'Unable to connect to the server. Please ensure the backend is running.';
  }

  const data = response.data;
  if (data) {
    if (typeof data.detail === 'string') {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      // Pydantic validation errors: [{loc: [...], msg: "field required"}]
      return data.detail
        .map((err) => `${err.loc ? err.loc.slice(-1)[0] + ': ' : ''}${err.msg}`)
        .join('; ');
    }
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }
  }

  switch (response.status) {
    case 400:
      return 'Invalid request data. Please check your inputs.';
    case 401:
      return 'Authentication required or session expired. Please sign in again.';
    case 403:
      return 'Access denied. You do not have permission for this resource.';
    case 404:
      return 'The requested resource was not found.';
    case 422:
      return 'Validation error. Please verify the submitted form values.';
    case 500:
    case 502:
    case 503:
      return 'Internal server error. The engineering team has been notified.';
    default:
      return `Request failed with status code ${response.status}.`;
  }
};

/**
 * Response Interceptor: Error parsing and event dispatching for toast listeners
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = formatErrorMessage(error);
    const status = error.response?.status;

    // Dispatch global event for toast notification (unless skipToast is set)
    if (!error.config?.skipToast && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app:api-error', {
          detail: { message, status, error },
        })
      );
    }

    // Auto-clear invalid credentials on 401
    if (status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
    }

    return Promise.reject(error);
  }
);

/* ─────────────────────────────────────────────────────────────────────────────
 * AUTHENTICATION ENDPOINTS (/api/auth)
 * ───────────────────────────────────────────────────────────────────────────── */
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const parentLogin = (data) => api.post('/auth/parent-login', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.patch('/auth/profile', data);

/* ─────────────────────────────────────────────────────────────────────────────
 * TEACHER PORTAL ENDPOINTS (/api/teacher)
 * ───────────────────────────────────────────────────────────────────────────── */
export const getMyPapers = () => api.get('/teacher/papers');
export const getPaper = (paperId) => api.get(`/teacher/papers/${paperId}`);
export const createPaper = (data) => api.post('/teacher/papers', data);
export const updatePaper = (paperId, data) => api.put(`/teacher/papers/${paperId}`, data);
export const deletePaper = (paperId) => api.delete(`/teacher/papers/${paperId}`);
export const getPaperSubmissions = (paperId) => api.get(`/teacher/papers/${paperId}/submissions`);

export const extractQuestions = (files) => {
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

// Teacher Manual Override / Re-grading (Feature #3)
export const overrideEvaluation = (evaluationId, marks, comment = '') => {
  return api.patch(`/teacher/evaluations/${evaluationId}/override`, {
    marks: Number(marks),
    comment: comment || '',
  });
};

// Paper Assignment to Students (Feature #4)
export const assignPaper = (paperId, studentIds, dueDate = null) => {
  return api.post(`/teacher/papers/${paperId}/assign`, {
    student_ids: Array.isArray(studentIds) ? studentIds : [studentIds],
    due_date: dueDate || null,
  });
};

export const getPaperAssignments = (paperId) => api.get(`/teacher/papers/${paperId}/assignments`);
export const removeAssignment = (paperId, studentId) =>
  api.delete(`/teacher/papers/${paperId}/assignments/${studentId}`);

// Teacher Analytics (Feature #6)
export const getPaperAnalytics = (paperId) => api.get(`/teacher/papers/${paperId}/analytics`);

// Class Sections Management (Feature #5)
export const createSection = (data) => api.post('/teacher/sections', data);
export const getSections = () => api.get('/teacher/sections');
export const getSectionMembers = (sectionId) => api.get(`/teacher/sections/${sectionId}/members`);
export const updateSectionMembers = (sectionId, studentIds) =>
  api.put(`/teacher/sections/${sectionId}/members`, {
    student_ids: Array.isArray(studentIds) ? studentIds : [studentIds],
  });
export const deleteSection = (sectionId) => api.delete(`/teacher/sections/${sectionId}`);
export const assignSectionPaper = (sectionId, paperId, dueDate = null) => {
  const params = dueDate ? { due_date: dueDate } : {};
  return api.post(`/teacher/sections/${sectionId}/assign-paper/${paperId}`, null, { params });
};

/* ─────────────────────────────────────────────────────────────────────────────
 * STUDENT PORTAL ENDPOINTS (/api/student)
 * ───────────────────────────────────────────────────────────────────────────── */
export const getAvailablePapers = (teacherId = null) => {
  const params = teacherId ? { teacher_id: teacherId } : {};
  return api.get('/student/papers', { params });
};

export const getPaperDetails = (id) => api.get(`/student/papers/${id}`);

export const submitAnswer = (paperId, files) => {
  const formData = new FormData();
  if (Array.isArray(files)) {
    files.forEach((file) => formData.append('files', file));
  } else {
    formData.append('files', files);
  }
  return api.post(`/student/submit/${paperId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getMySubmissions = () => api.get('/student/submissions');
export const getSubmissionDetails = (id) => api.get(`/student/submissions/${id}`);

export const getSubmissionImageBlob = (submissionId, page = 1) => {
  return api.get(`/student/submissions/${submissionId}/image`, {
    params: { page },
    responseType: 'blob',
  });
};

export const getExamStatus = (paperId) => api.get(`/student/papers/${paperId}/exam-status`);
export const getMyProgress = () => api.get('/student/progress');
export const generateParentCode = () => api.post('/student/parent-code');
export const getParentCode = () => api.get('/student/parent-code');

export const getQuestionPaperPdfBlob = (paperId) => {
  return api.get(`/student/papers/${paperId}/pdf`, {
    responseType: 'blob',
  });
};

/* ─────────────────────────────────────────────────────────────────────────────
 * PARENT PORTAL ENDPOINTS (/api/parent)
 * ───────────────────────────────────────────────────────────────────────────── */
export const getParentStudentInfo = () => api.get('/parent/student-info');
export const getParentProgress = () => api.get('/parent/progress');
export const getParentSubmissions = () => api.get('/parent/submissions');
export const getParentSubmissionDetails = (id) => api.get(`/parent/submissions/${id}`);
export const getParentSubmissionImageBlob = (submissionId, page = 1) => {
  return api.get(`/parent/submissions/${submissionId}/image`, {
    params: { page },
    responseType: 'blob',
  });
};

/* ─────────────────────────────────────────────────────────────────────────────
 * SHARED & PHASE 3 ENDPOINTS (/api/v2)
 * ───────────────────────────────────────────────────────────────────────────── */
export const getNotifications = (limit = 30) => api.get('/v2/notifications', { params: { limit } });
export const markNotificationRead = (notificationId) =>
  api.patch(`/v2/notifications/${notificationId}/read`);
export const markAllNotificationsRead = () => api.patch('/v2/notifications/read-all');
export const clearAllNotifications = () => api.delete('/v2/notifications/clear');

export const getLeaderboard = (paperId) => api.get(`/v2/papers/${paperId}/leaderboard`);

export const downloadSubmissionReport = async (submissionId, filename = null) => {
  const response = await api.get(`/v2/submissions/${submissionId}/report`, {
    responseType: 'blob',
  });
  const fname =
    filename ||
    `Report_${submissionId.substring(0, 8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  downloadBlob(response.data, fname);
  return response;
};

/* ─────────────────────────────────────────────────────────────────────────────
 * ASSET & DOWNLOAD HELPERS
 * ───────────────────────────────────────────────────────────────────────────── */
export const getSubmissionImageUrl = (submissionId, page = 1, role = 'student') => {
  const endpoint = role === 'parent' ? 'parent' : 'student';
  return `${API_BASE_URL}/${endpoint}/submissions/${submissionId}/image?page=${page}`;
};

export const getQuestionPaperPdfUrl = (paperId) => {
  return `${API_BASE_URL}/student/papers/${paperId}/pdf`;
};

export const downloadBlob = (blob, filename) => {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 1000);
};

export default api;
