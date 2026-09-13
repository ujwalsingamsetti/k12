import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES, getDefaultRouteForRole } from '../../constants/routes';
import { BiLoaderAlt } from 'react-icons/bi';
import { TbSchool } from 'react-icons/tb';

/**
 * Enterprise Protected Route Wrapper
 * Verifies authentication status, enforces role boundaries, and renders an executive loader
 */
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-400 gap-4 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 animate-pulse">
          <TbSchool size={28} />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          <BiLoaderAlt size={16} className="animate-spin text-indigo-500" />
          <span>Authenticating Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.AUTH.LOGIN} replace />;
  }

  // If role is specified and does not match, route to user's designated portal
  if (role && user.role?.toLowerCase() !== role.toLowerCase()) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return children;
}
