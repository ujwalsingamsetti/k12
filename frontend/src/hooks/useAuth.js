import { useAuth as useAuthContext } from '../context/AuthContext';

/**
 * Reusable authentication hook with role helpers
 */
export function useAuth() {
  const auth = useAuthContext();
  const role = auth?.user?.role?.toLowerCase();

  return {
    ...auth,
    isTeacher: role === 'teacher',
    isStudent: role === 'student',
    isParent: role === 'parent',
    isAuthenticated: !!auth?.user,
  };
}

export default useAuth;
