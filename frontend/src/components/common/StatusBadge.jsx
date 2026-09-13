import { SUBMISSION_STATUSES } from '../../constants/academic';
import { MdCheckCircle, MdPendingActions, MdErrorOutline } from 'react-icons/md';
import { BiLoaderAlt } from 'react-icons/bi';

const ICONS = {
  evaluated: <MdCheckCircle className="text-emerald-500 shrink-0" size={14} />,
  evaluating: <BiLoaderAlt className="text-amber-500 animate-spin shrink-0" size={14} />,
  pending: <MdPendingActions className="text-slate-400 shrink-0" size={14} />,
  failed: <MdErrorOutline className="text-red-500 shrink-0" size={14} />,
};

/**
 * Standardized Status Badge Component
 */
export default function StatusBadge({ status, className = '' }) {
  const norm = status?.toLowerCase() || 'pending';
  const config = SUBMISSION_STATUSES[norm] || SUBMISSION_STATUSES.pending;
  const icon = ICONS[norm] || ICONS.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${config.badgeCls} ${className}`}
    >
      {icon}
      <span>{config.label}</span>
    </span>
  );
}
