/**
 * Enterprise Aurora Glass Card Container
 */
export default function GlassCard({
  children,
  className = '',
  hover = false,
  glow = false,
  onClick = null,
  padding = 'p-6 sm:p-8',
}) {
  const hoverClass = hover
    ? 'hover:-translate-y-1 hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-700/60 cursor-pointer'
    : '';

  const glowClass = glow
    ? 'ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/5 dark:shadow-none'
    : 'shadow-sm';

  return (
    <div
      onClick={onClick}
      className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl transition-all duration-300 ${padding} ${hoverClass} ${glowClass} ${className}`}
    >
      {children}
    </div>
  );
}
