/**
 * Centralized Application and Network Configuration
 */

// VITE_API_BASE_URL fallback to '/api'
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

// Request Timeout (30 seconds)
export const API_TIMEOUT_MS = 30000;

// Polling intervals
export const NOTIFICATION_POLL_INTERVAL_MS = 15000;

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  THEME: 'theme',
  USER_PREFS: 'user_preferences',
};

// Toast configurations
export const TOAST_DURATION = {
  SHORT: 2500,
  DEFAULT: 4000,
  LONG: 6500,
};

// Accepted File Formats
export const ACCEPTED_ANSWER_FILE_TYPES = ['.png', '.jpg', '.jpeg', '.pdf', '.webp'];
export const ACCEPTED_TEXTBOOK_FILE_TYPES = ['.pdf'];
export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
