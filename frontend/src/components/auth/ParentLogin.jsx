import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { HiSun, HiMoon } from 'react-icons/hi2';
import { MdKey, MdOutlineSchool } from 'react-icons/md';
import { BiLoaderAlt } from 'react-icons/bi';

export default function ParentLogin() {
    const [parentCode, setParentCode] = useState('');
    const [loading, setLoading] = useState(false);
    const { parentLogin } = useAuth();
    const toast = useToast();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!parentCode.trim()) {
            toast.error('Please enter a valid access code.');
            return;
        }
        setLoading(true);
        try {
            const user = await parentLogin(parentCode.trim());
            toast.success(`Welcome! You are viewing the dashboard for ${user.full_name}.`);
            navigate('/parent/dashboard');
        } catch {
            toast.error('Invalid parent access code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors px-4 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-300 dark:bg-indigo-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
            <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-300 dark:bg-purple-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

            {/* Dark toggle */}
            <button
                onClick={toggle}
                className="fixed top-6 right-6 p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all duration-300 z-50"
                aria-label="Toggle theme"
            >
                {dark ? <HiSun size={20} className="text-amber-400" /> : <HiMoon size={20} className="text-indigo-500" />}
            </button>

            <div className="w-full max-w-md page-enter z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl mb-4 transform hover:scale-105 transition-transform duration-300">
                        <MdOutlineSchool size={36} />
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                        Parent <span className="text-indigo-600 dark:text-indigo-400">Portal</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">View your child's performance</p>
                </div>

                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-8 rounded-3xl shadow-2xl dark:shadow-slate-950/50">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-8">Access code</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                                6-Digit Access Code
                            </label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    <MdKey size={20} />
                                </div>
                                <input
                                    type="text"
                                    value={parentCode}
                                    onChange={(e) => setParentCode(e.target.value)}
                                    placeholder="e.g. A1B2C3"
                                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 text-sm font-medium uppercase tracking-widest text-center"
                                    required
                                    autoFocus
                                    maxLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <BiLoaderAlt size={20} className="animate-spin" />
                                    <span>Verifying…</span>
                                </>
                            ) : <span>View Dashboard</span>}
                        </button>
                    </form>

                    <p className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
                        Student or Teacher?{' '}
                        <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold">
                            Return to standard login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
