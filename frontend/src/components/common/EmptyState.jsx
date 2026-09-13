import { Link } from 'react-router-dom';
import { BiLayer } from 'react-icons/bi';

/**
 * Enterprise Empty State Display
 */
export default function EmptyState({
  icon = null,
  title = 'No records found',
  description = 'There are currently no items available to display in this view.',
  actionText = null,
  actionLink = null,
  onAction = null,
  className = '',
}) {
  return (
    <div
      className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center my-6 ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
        {icon || <BiLayer size={32} />}
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
        {title}
      </h3>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
        {description}
      </p>

      {(actionText && (actionLink || onAction)) && (
        <div className="mt-6">
          {actionLink ? (
            <Link
              to={actionLink}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]"
            >
              {actionText}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
