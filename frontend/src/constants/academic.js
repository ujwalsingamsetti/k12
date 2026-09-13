/**
 * Centralized Academic Constants for K12 Answer Sheet Evaluator
 */

export const SUBJECT_CATEGORIES = [
  {
    group: 'Sciences',
    options: [
      { value: 'science', label: 'Science (General)' },
      { value: 'physics', label: 'Physics' },
      { value: 'chemistry', label: 'Chemistry' },
      { value: 'biology', label: 'Biology' },
      { value: 'environmental_science', label: 'Environmental Science' },
    ],
  },
  {
    group: 'Mathematics',
    options: [{ value: 'mathematics', label: 'Mathematics' }],
  },
  {
    group: 'Languages',
    options: [
      { value: 'english', label: 'English' },
      { value: 'hindi', label: 'Hindi' },
      { value: 'sanskrit', label: 'Sanskrit' },
    ],
  },
  {
    group: 'Social Studies',
    options: [
      { value: 'social_science', label: 'Social Science (General)' },
      { value: 'history', label: 'History' },
      { value: 'geography', label: 'Geography' },
      { value: 'civics', label: 'Civics / Political Science' },
      { value: 'economics', label: 'Economics' },
    ],
  },
  {
    group: 'Commerce & Humanities',
    options: [
      { value: 'accountancy', label: 'Accountancy' },
      { value: 'business_studies', label: 'Business Studies' },
      { value: 'psychology', label: 'Psychology' },
      { value: 'sociology', label: 'Sociology' },
    ],
  },
  {
    group: 'Other',
    options: [{ value: 'general', label: 'General Knowledge / Other' }],
  },
];

// Flat list of subject values
export const ALL_SUBJECTS = SUBJECT_CATEGORIES.flatMap((c) => c.options);

export const CLASS_LEVELS = [
  { value: 'kg', label: 'Kindergarten (KG)' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `Grade ${i + 1}`,
  })),
];

export const SUBJECT_COLOR_MAP = {
  mathematics: {
    bg: 'bg-indigo-500',
    light: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    glow: 'rgba(99, 102, 241, 0.3)',
    hex: '#6366f1',
  },
  science: {
    bg: 'bg-emerald-500',
    light: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    glow: 'rgba(16, 185, 129, 0.3)',
    hex: '#10b981',
  },
  physics: {
    bg: 'bg-blue-500',
    light: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    glow: 'rgba(59, 130, 246, 0.3)',
    hex: '#3b82f6',
  },
  chemistry: {
    bg: 'bg-amber-500',
    light: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    glow: 'rgba(245, 158, 11, 0.3)',
    hex: '#f59e0b',
  },
  biology: {
    bg: 'bg-teal-600',
    light: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
    glow: 'rgba(13, 148, 136, 0.3)',
    hex: '#0d9488',
  },
  english: {
    bg: 'bg-violet-500',
    light: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
    glow: 'rgba(139, 92, 246, 0.3)',
    hex: '#8b5cf6',
  },
  hindi: {
    bg: 'bg-pink-500',
    light: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800',
    glow: 'rgba(236, 72, 153, 0.3)',
    hex: '#ec4899',
  },
  history: {
    bg: 'bg-orange-500',
    light: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    glow: 'rgba(249, 115, 22, 0.3)',
    hex: '#f97316',
  },
  geography: {
    bg: 'bg-cyan-500',
    light: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
    glow: 'rgba(6, 182, 212, 0.3)',
    hex: '#06b6d4',
  },
  social_science: {
    bg: 'bg-lime-500',
    light: 'bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-400 border-lime-200 dark:border-lime-800',
    glow: 'rgba(132, 204, 22, 0.3)',
    hex: '#84cc16',
  },
};

export const getSubjectLabel = (val) => {
  if (!val) return '—';
  const found = ALL_SUBJECTS.find((s) => s.value === val.toLowerCase());
  return found ? found.label : val.charAt(0).toUpperCase() + val.slice(1).replace('_', ' ');
};

export const getClassLabel = (val) => {
  if (!val) return '—';
  const found = CLASS_LEVELS.find((c) => c.value === String(val).toLowerCase());
  return found ? found.label : `Grade ${val}`;
};

export const getSubjectColor = (subject) => {
  const key = subject?.toLowerCase();
  return SUBJECT_COLOR_MAP[key] || {
    bg: 'bg-slate-500',
    light: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    glow: 'rgba(100, 116, 139, 0.3)',
    hex: '#64748b',
  };
};

export const GRADE_THRESHOLDS = [
  { min: 90, grade: 'A+', label: 'Outstanding', color: '#10b981', badgeCls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' },
  { min: 80, grade: 'A', label: 'Excellent', color: '#34d399', badgeCls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  { min: 70, grade: 'B', label: 'Very Good', color: '#3b82f6', badgeCls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { min: 60, grade: 'C', label: 'Good', color: '#f59e0b', badgeCls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  { min: 50, grade: 'D', label: 'Needs Improvement', color: '#f97316', badgeCls: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  { min: 0, grade: 'F', label: 'Remedial Required', color: '#ef4444', badgeCls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
];

export const getGradeInfo = (percentage) => {
  const pct = Math.max(0, Math.min(100, Number(percentage) || 0));
  for (const t of GRADE_THRESHOLDS) {
    if (pct >= t.min) return { ...t, percentage: pct };
  }
  return GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
};

export const getDifficultyInfo = (percentage) => {
  const pct = Number(percentage) || 0;
  if (pct >= 70) {
    return {
      label: 'Accessible',
      badgeCls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    };
  }
  if (pct >= 40) {
    return {
      label: 'Moderate',
      badgeCls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    };
  }
  return {
    label: 'Challenging',
    badgeCls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  };
};

export const SUBMISSION_STATUSES = {
  evaluated: {
    label: 'Evaluated',
    variant: 'success',
    badgeCls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  evaluating: {
    label: 'Evaluating',
    variant: 'warning',
    badgeCls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  pending: {
    label: 'Pending',
    variant: 'info',
    badgeCls: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  },
  failed: {
    label: 'Failed',
    variant: 'danger',
    badgeCls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  },
};
