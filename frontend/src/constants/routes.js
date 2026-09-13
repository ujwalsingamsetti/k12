/**
 * Centralized Route Paths for K12 Answer Sheet Evaluator
 */

export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    PARENT_LOGIN: '/parent/login',
  },
  TEACHER: {
    DASHBOARD: '/teacher',
    CREATE_PAPER: '/teacher/create-paper',
    EDIT_PAPER: (id = ':paperId') => `/teacher/papers/${id}/edit`,
    SUBMISSIONS: (id = ':paperId') => `/teacher/papers/${id}/submissions`,
    ANALYTICS: (id = ':paperId') => `/teacher/papers/${id}/analytics`,
    ASSIGN: (id = ':paperId') => `/teacher/papers/${id}/assign`,
    SECTIONS: '/teacher/sections',
  },
  STUDENT: {
    DASHBOARD: '/student',
    PROFILE: '/student/profile',
    SUBMIT: (id = ':paperId') => `/student/submit/${id}`,
    RESULTS: (id = ':submissionId') => `/student/submissions/${id}`,
  },
  PARENT: {
    DASHBOARD: '/parent/dashboard',
    RESULTS: (id = ':submissionId') => `/parent/submissions/${id}`,
  },
  SHARED: {
    LEADERBOARD: (id = ':paperId') => `/leaderboard/${id}`,
  },
};

export const getDefaultRouteForRole = (role) => {
  switch (role?.toLowerCase()) {
    case 'teacher':
      return ROUTES.TEACHER.DASHBOARD;
    case 'parent':
      return ROUTES.PARENT.DASHBOARD;
    case 'student':
    default:
      return ROUTES.STUDENT.DASHBOARD;
  }
};
