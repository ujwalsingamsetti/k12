import { getGradeInfo } from '../../constants/academic';

/**
 * Enterprise Score Badge Component
 * Displays obtained/max marks, percentage, and grade tier with Aurora color accent
 */
export default function ScoreBadge({
  obtained = 0,
  max = 100,
  percentage = null,
  size = 'md',
  showGrade = true,
  className = '',
}) {
  const calcPct =
    percentage !== null && percentage !== undefined
      ? Number(percentage)
      : max > 0
      ? Math.round((Number(obtained) / Number(max)) * 100 * 10) / 10
      : 0;

  const info = getGradeInfo(calcPct);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 rounded-lg',
    md: 'text-sm px-3 py-1 rounded-xl',
    lg: 'text-base px-4 py-2 rounded-2xl',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 border font-bold shadow-sm transition-all ${
        info.badgeCls
      } ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title={`Grade: ${info.grade} (${info.label}) - ${calcPct}%`}
    >
      <span className="font-mono">
        {obtained}/{max}
      </span>
      <span className="opacity-60 text-xs font-semibold">({calcPct}%)</span>
      {showGrade && (
        <span className="px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/10 text-[10px] uppercase font-black tracking-wider">
          {info.grade}
        </span>
      )}
    </div>
  );
}
