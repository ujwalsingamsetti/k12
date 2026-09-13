import { BiLoaderAlt } from 'react-icons/bi';

/**
 * Enterprise Aurora Button Component
 */
export default function Button({
  children,
  variant = 'primary', // 'primary', 'secondary', 'danger', 'ghost', 'outline'
  size = 'md', // 'sm', 'md', 'lg'
  loading = false,
  disabled = false,
  icon: Icon = null,
  type = 'button',
  onClick = null,
  className = '',
  ...rest
}) {
  const variantStyles = {
    primary:
      'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none border border-transparent',
    secondary:
      'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700',
    danger:
      'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200 dark:shadow-none border border-transparent',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent',
    outline:
      'bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
  };

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-2xl gap-2',
    lg: 'px-6 py-3.5 text-base rounded-2xl gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-bold tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 select-none ${
        variantStyles[variant] || variantStyles.primary
      } ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <BiLoaderAlt className="animate-spin" size={size === 'sm' ? 14 : 18} />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 15 : 18} className="shrink-0" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
