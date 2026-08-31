import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'soft' | 'danger' | 'success' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className,
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 border-brand-700 shadow-sm active:bg-brand-900',
    ghost: 'bg-transparent border-slate-300 dark:border-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
    soft: 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs',
    danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 active:bg-red-800',
    success: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
    amber: 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700 active:bg-amber-800'
  }[variant];

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg',
    md: 'px-3.5 py-2 text-xs font-bold rounded-xl',
    lg: 'px-5 py-2.5 text-sm font-bold rounded-xl'
  }[size];

  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 font-semibold transition-all border outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        variantStyles,
        sizeStyles,
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }> = ({ children, className, title, action }) => (
  <div className={clsx('rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden', className)}>
    {title && (
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">{title}</h3>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; className?: string }> = ({ children, variant = 'neutral', className }) => {
  const styles = {
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    danger: 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300 dark:border-red-800',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
  }[variant];

  return (
    <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold border', styles, className)}>
      {children}
    </span>
  );
};

export * from './Modal';
export * from './ConfirmDeleteModal';
export * from './UndoToast';

