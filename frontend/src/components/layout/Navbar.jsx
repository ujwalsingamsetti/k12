import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import {
  MdNotifications,
  MdNotificationsNone,
  MdDoneAll,
  MdDeleteSweep,
  MdCircle,
} from 'react-icons/md';
import { HiSun, HiMoon } from 'react-icons/hi2';
import { RiLogoutBoxLine } from 'react-icons/ri';
import { FiUser, FiChevronDown } from 'react-icons/fi';
import { TbSchool } from 'react-icons/tb';
import { ROUTES, getDefaultRouteForRole } from '../../constants/routes';

// Role style mappings
const ROLE_STYLE = {
  teacher: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  student: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  parent: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
};

// Avatar Initials
function Avatar({ name, role }) {
  const initials =
    name
      ?.split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  const color =
    role === 'teacher'
      ? 'bg-gradient-to-tr from-indigo-600 to-violet-500'
      : role === 'parent'
      ? 'bg-gradient-to-tr from-amber-500 to-orange-500'
      : 'bg-gradient-to-tr from-emerald-600 to-teal-500';

  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shadow-sm select-none ${color}`}
    >
      {initials}
    </span>
  );
}

// Notification Bell Component
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { unreadCount, notifications, markAsRead, markAll, clearAll } = useNotifications(true);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (n) => {
    if (!n.is_read) await markAsRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <MdNotifications size={20} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
        ) : (
          <MdNotificationsNone size={20} />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-black min-w-[17px] h-[17px] flex items-center justify-center rounded-full px-1 shadow-sm leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {unreadCount > 0 && (
                <button
                  onClick={markAll}
                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold transition"
                >
                  <MdDoneAll size={14} /> Read all
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition ml-2"
                  title="Clear all notifications"
                >
                  <MdDeleteSweep size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                <MdNotificationsNone size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold">No notifications right now</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 flex gap-3 text-left transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    !n.is_read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="mt-1">
                    {!n.is_read ? (
                      <MdCircle size={8} className="text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <MdCircle size={8} className="text-transparent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {n.body}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium block mt-1.5">
                      {new Date(n.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// User Profile Menu
function UserMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleBadgeStyle =
    ROLE_STYLE[user.role?.toLowerCase()] ||
    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200';

  const profileLink =
    user.role === 'teacher'
      ? ROUTES.TEACHER.DASHBOARD
      : user.role === 'parent'
      ? ROUTES.PARENT.DASHBOARD
      : ROUTES.STUDENT.PROFILE;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      >
        <Avatar name={user.full_name} role={user.role} />
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {user.full_name}
          </p>
          <span
            className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold border mt-0.5 inline-block ${roleBadgeStyle}`}
          >
            {user.role}
          </span>
        </div>
        <FiChevronDown
          size={14}
          className={`text-slate-400 hidden sm:block transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <Avatar name={user.full_name} role={user.role} />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user.full_name}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="p-2 space-y-1">
            <Link
              to={profileLink}
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition"
            >
              <FiUser size={15} className="text-slate-400" />
              <span>{user.role === 'student' ? 'My Profile & Code' : 'Portal Dashboard'}</span>
            </Link>

            <button
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition"
            >
              <RiLogoutBoxLine size={15} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Navbar
export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const handleBrandClick = () => {
    if (!user) {
      navigate(ROUTES.AUTH.LOGIN);
    } else {
      navigate(getDefaultRouteForRole(user.role));
    }
  };

  return (
    <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <button onClick={handleBrandClick} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-teal-400 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300">
              <TbSchool size={20} className="text-white" />
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              K12 <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">Evaluator</span>
            </span>
          </button>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggle}
              title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle dark mode"
            >
              {dark ? <HiSun size={20} className="text-amber-400" /> : <HiMoon size={20} className="text-indigo-600" />}
            </button>

            {user ? (
              <>
                <NotificationBell />
                <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
                <UserMenu user={user} logout={logout} />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to={ROUTES.AUTH.LOGIN}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <FiUser size={14} /> Sign in
                </Link>
                <Link
                  to={ROUTES.AUTH.REGISTER}
                  className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
