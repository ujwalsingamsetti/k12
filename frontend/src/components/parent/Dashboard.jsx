import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getParentStudentInfo, getParentProgress, getParentSubmissions } from '../../services/api';
import Navbar from '../common/Navbar';
import {
    MdHistory, MdTrendingUp, MdTrendingDown,
    MdCheckCircle, MdHourglassBottom, MdInfoOutline,
    MdBarChart, MdKeyboardArrowRight, MdStars, MdFamilyRestroom
} from 'react-icons/md';
import { BiLoaderAlt, BiTrophy } from 'react-icons/bi';

// ── IST formatter ─────────────────────────────────────────────────────────────
function toIST(dateStr) {
    return new Date(dateStr).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit',
        year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });
}

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS = {
    evaluated: { icon: <MdCheckCircle className="text-emerald-500" size={24} />, cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' },
    evaluating: { icon: <BiLoaderAlt className="text-amber-500 animate-spin" size={24} />, cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800' },
    pending: { icon: <MdHourglassBottom className="text-slate-300 dark:text-slate-600" size={24} />, cls: 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700' },
    failed: { icon: <MdInfoOutline className="text-red-500" size={24} />, cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800' },
};

// ── Mini bar ──────────────────────────────────────────────────────────────────
function MiniBar({ value, max, color }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden border border-white dark:border-slate-800">
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
    );
}

// ── Progress Card ─────────────────────────────────────────────────────────────
function ProgressCard({ progress }) {
    if (!progress || progress.total_submissions === 0) return (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-700 mx-auto mb-6 shadow-inner">
                <MdBarChart size={32} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest leading-relaxed">Intelligence Insights Appear After The First Graded Paper</p>
        </div>
    );

    const trend = t => t === 'improving' ? <MdTrendingUp className="text-emerald-500" />
        : t === 'declining' ? <MdTrendingDown className="text-red-500" />
            : <span className="text-slate-400 dark:text-slate-500">→</span>;

    return (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-xl dark:shadow-none animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center mb-10">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
                    <MdStars className="text-amber-500" /> Student Progress
                </h2>
                <span className="text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg text-slate-400">{progress.total_submissions} Attempts</span>
            </div>

            <div className="text-center mb-8 pb-8 border-b border-slate-50 dark:border-slate-700/50">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Mastery Overview</p>
                <div className="relative inline-flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 rounded-full border-4 border-white dark:border-slate-800 shadow-inner">
                    <p className={`text-5xl font-black ${progress.overall_average >= 70 ? 'text-emerald-500' : progress.overall_average >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                        {progress.overall_average}<span className="text-2xl opacity-60">%</span>
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {progress.subject_stats.map(stat => (
                    <div key={stat.subject} className="group cursor-default">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{stat.subject.replace('_', ' ')}</span>
                            <div className="flex items-center gap-2">
                                {trend(stat.trend)}
                                <span className="text-sm font-black text-slate-900 dark:text-slate-100">{stat.average}%</span>
                            </div>
                        </div>
                        <MiniBar value={stat.average} max={100} color={progress.overall_average >= 70 ? '#10b981' : '#6366f1'} />
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-tight flex justify-between">
                            <span>Best: {stat.best}%</span>
                            <span>{stat.attempts} Rounds</span>
                        </p>
                    </div>
                ))}
            </div>

            {progress.timeline.length > 0 && (
                <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-700/50">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Recent Evaluations</p>
                    <div className="space-y-3">
                        {[...progress.timeline].reverse().slice(0, 4).map(e => (
                            <Link key={e.submission_id} to={`/parent/submissions/${e.submission_id}`}
                                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/40 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm group">
                                <div className="min-w-0 flex-1 pr-4">
                                    <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors">{e.paper_title}</p>
                                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-tighter">{toIST(e.submitted_at)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-black ${e.percentage >= 70 ? 'text-emerald-500' : e.percentage >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                        {e.percentage}%
                                    </span>
                                    <MdKeyboardArrowRight size={18} className="text-slate-200 group-hover:text-indigo-500 transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Submissions List ──────────────────────────────────────────────────────────
function SubmissionRow({ sub }) {
    const st = STATUS[sub.status] || STATUS.pending;
    const pct = sub.max_marks > 0 ? ((sub.total_marks / sub.max_marks) * 100).toFixed(0) : null;
    return (
        <Link to={`/parent/submissions/${sub.id}`}
            className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl dark:shadow-indigo-500/5 transition-all group overflow-hidden relative">
            <div className="flex items-center gap-5 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                    {st.icon}
                </div>
                <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{sub.paper_title || 'Answer Sheet'}</p>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">{toIST(sub.submitted_at)}</p>
                </div>
            </div>
            <div className="text-right shrink-0 ml-4">
                <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${st.cls}`}>{sub.status}</span>
                {sub.status === 'evaluated' && pct !== null && (
                    <div className="flex items-baseline justify-end gap-1 mt-3">
                        <span className={`text-xl font-black ${pct >= 70 ? 'text-emerald-500' : pct >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                            {sub.total_marks}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600">/{sub.max_marks}</span>
                    </div>
                )}
            </div>
        </Link>
    );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function ParentDashboard() {
    const [studentInfo, setStudentInfo] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getParentStudentInfo(), getParentSubmissions(), getParentProgress()])
            .then(([info, s, pr]) => { setStudentInfo(info.data); setSubmissions(s.data); setProgress(pr.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const evaluatedCount = submissions.filter(s => s.status === 'evaluated').length;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-12 page-enter">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-4">
                            Parent Dashboard <span className="w-12 h-1 bg-indigo-600 rounded-full" />
                        </h1>
                        <div className="flex items-center gap-3 mt-2">
                            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                                <MdFamilyRestroom className="text-indigo-500" /> Viewing {studentInfo?.full_name || 'Student'}'s Record
                            </p>
                            {studentInfo?.grade && (
                                <span className="text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/50">
                                    {studentInfo.grade}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-6 px-8 py-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-[0.05] group-hover:scale-125 transition-transform duration-700">
                            <BiTrophy size={64} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Graded Performance</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{evaluatedCount}</span>
                                <span className="text-xs font-bold text-slate-400 uppercase">Evaluations</span>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-6 text-slate-400">
                        <div className="relative">
                            <BiLoaderAlt className="animate-spin text-indigo-500" size={48} />
                            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-10 animate-pulse" />
                        </div>
                        <p className="text-sm font-black uppercase tracking-[0.3em]">Loading student data...</p>
                    </div>
                ) : (
                    <div className="grid xl:grid-cols-4 gap-10">

                        {/* Left/Middle: Submissions */}
                        <div className="xl:col-span-3 space-y-8">
                            {/* Modern Navigation Header */}
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                                <div className="flex gap-10">
                                    <div
                                        className={`relative pb-6 text-xs font-black uppercase tracking-widest flex items-center gap-2 text-indigo-600 dark:text-indigo-400`}
                                    >
                                        <MdHistory /> Evaluation History
                                        {submissions.length > 0 && (
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50`}>
                                                {submissions.length}
                                            </span>
                                        )}
                                        <div className="absolute bottom-[-1px] left-0 w-full h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-in fade-in zoom-in-95 duration-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="min-h-[500px]">
                                {submissions.length === 0 ? (
                                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] p-24 text-center animate-in fade-in slide-in-from-bottom-6 duration-700">
                                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-700 mx-auto mb-8 shadow-inner">
                                            <MdHistory size={56} />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Empty Records</h3>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">{studentInfo?.full_name} hasn't submitted any answer sheets yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                        {[...submissions].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                                            .map(sub => <SubmissionRow key={sub.id} sub={sub} />)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Analytics Panel */}
                        <div className="xl:col-span-1">
                            <div className="sticky top-28">
                                <ProgressCard progress={progress} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
