import { TbSchool } from 'react-icons/tb';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <TbSchool size={15} />
          </div>
          <span>K12 Evaluator Enterprise · Precision AI Answer Grading</span>
        </div>

        <div className="flex items-center gap-6 text-xs font-medium text-slate-400 dark:text-slate-500">
          <span>FastAPI 2.0 Backend</span>
          <span className="w-1 h-1 rounded-full bg-emerald-500" />
          <span>System Healthy</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
