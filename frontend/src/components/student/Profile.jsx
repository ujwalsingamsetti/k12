import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Navbar from '../common/Navbar';
import { MdPerson, MdSchool, MdSave, MdArrowBack, MdKey, MdContentCopy } from 'react-icons/md';
import { generateParentCode, getParentCode } from '../../services/api';

const GRADES = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
    'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
    'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];

export default function Profile() {
    const { user, updateProfileApi } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        grade: ''
    });
    const [parentCode, setParentCode] = useState(null);
    const [codeLoading, setCodeLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                grade: user.grade || ''
            });
            if (user.role === 'student') {
                getParentCode().then(res => {
                    setParentCode(res.data.parent_access_code);
                }).catch(() => { });
            }
        }
    }, [user]);

    const handleGenerateCode = async () => {
        setCodeLoading(true);
        try {
            const res = await generateParentCode();
            setParentCode(res.data.parent_access_code);
            toast.success('Parent access code generated successfully!');
        } catch (_err) {
            toast.error('Failed to generate code');
        } finally {
            setCodeLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (parentCode) {
            navigator.clipboard.writeText(parentCode);
            toast.success('Code copied to clipboard!');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateProfileApi({
                full_name: formData.full_name,
                grade: formData.grade || null
            });
            toast.success('Profile updated successfully!');
            // Go back to dashboard based on role
            navigate(user?.role === 'teacher' ? '/teacher' : '/student');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 py-12 page-enter">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-8 transition"
                >
                    <MdArrowBack size={20} /> Back
                </button>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-10 shadow-xl dark:shadow-none">
                    <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100 dark:border-slate-700">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                            <MdPerson size={32} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Your Profile</h1>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Manage your account details</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all font-medium"
                                placeholder="Enter your full name"
                            />
                        </div>

                        {user?.role === 'student' && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <MdSchool size={18} className="text-indigo-500" /> Grade Level
                                </label>
                                <div className="relative">
                                    <select
                                        value={formData.grade}
                                        onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl appearance-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all font-medium"
                                    >
                                        <option value="">Select your grade...</option>
                                        {GRADES.map((g) => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <MdSave size={20} /> Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {user?.role === 'student' && (
                    <div className="mt-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-10 shadow-xl dark:shadow-none">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center border border-purple-100 dark:border-purple-800">
                                <MdKey size={24} className="text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Parent Portal Access</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Generate a code for your parents to view your progress.</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex-1 w-full">
                                {parentCode ? (
                                    <div className="flex items-center gap-3">
                                        <div className="text-3xl font-mono font-black tracking-widest text-indigo-600 dark:text-indigo-400">
                                            {parentCode}
                                        </div>
                                        <button
                                            onClick={copyToClipboard}
                                            className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 transition-colors"
                                            title="Copy to clipboard"
                                        >
                                            <MdContentCopy size={20} />
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-slate-500 dark:text-slate-400 italic">No access code generated yet.</p>
                                )}
                            </div>
                            <button
                                onClick={handleGenerateCode}
                                disabled={codeLoading}
                                className="whitespace-nowrap px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                {codeLoading ? 'Generating...' : parentCode ? 'Regenerate Code' : 'Generate Code'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
