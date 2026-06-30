import { forwardRef } from 'react';
import { cn, getStatusBadgeClass } from '../../utils/helpers';
import { Loader2, Search, X, HelpCircle } from 'lucide-react';
import * as Icons from 'lucide-react';
import useLangStore from '../../store/langStore';

// ── Dynamic Icon Component ───────────────────────────────────────
export const DynamicIcon = ({ name, className, size = 20 }) => {
  if (!name) return null;
  // If it's already a react element / function component, render it
  if (typeof name !== 'string') {
    const IconComp = name;
    return <IconComp className={className} size={size} />;
  }
  const IconComponent = Icons[name] || HelpCircle;
  return <IconComponent className={className} size={size} />;
};

// ── Language Selector Component ──────────────────────────────────
export const LanguageSelector = ({ className }) => {
  const { language, setLanguage } = useLangStore();
  return (
    <div className={cn("flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg border border-gray-200", className)}>
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          "px-2.5 py-1 text-xs font-bold rounded transition-all",
          language === 'en' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-950"
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('te')}
        className={cn(
          "px-2.5 py-1 text-xs font-bold rounded transition-all",
          language === 'te' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-950"
        )}
      >
        తెలుగు
      </button>
    </div>
  );
};

// ── Button ────────────────────────────────────────────────────────
export const Button = forwardRef(({ children, variant = 'primary', size = 'md', loading, disabled, className, ...props }, ref) => {
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none';
  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm border border-brand-700/10 focus:ring-2 focus:ring-brand-500',
    secondary: 'bg-gray-150 hover:bg-gray-200 text-gray-800 border border-gray-200 focus:ring-2 focus:ring-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-2 focus:ring-red-500',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-2 focus:ring-gray-200',
    outline: 'border-2 border-gray-200 hover:bg-gray-50 text-gray-800 hover:border-gray-300 focus:ring-2 focus:ring-gray-300',
  };
  const sizes = {
    sm: 'text-xs px-3.5 py-2 min-h-[38px]',
    md: 'text-sm px-5 py-2.5 min-h-[44px]',
    lg: 'text-base px-7 py-3 min-h-[50px]',
  };
  return (
    <button ref={ref} disabled={disabled || loading} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
});
Button.displayName = 'Button';

// ── Input ─────────────────────────────────────────────────────────
export const Input = forwardRef(({ label, error, hint, required, className, ...props }, ref) => (
  <div className="w-full">
    {label && (
      <label className="label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}
    <input ref={ref} className={cn('input-base text-gray-900 font-medium placeholder-gray-400 bg-white border-2 border-gray-200 focus:border-brand-500 min-h-[44px]', error && 'border-red-400 focus:ring-red-400', className)} {...props} />
    {error && <p className="mt-1 text-xs text-red-600 font-bold">{error}</p>}
    {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
));
Input.displayName = 'Input';

// ── Select ────────────────────────────────────────────────────────
export const Select = forwardRef(({ label, error, required, children, className, ...props }, ref) => (
  <div className="w-full">
    {label && (
      <label className="label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}
    <select ref={ref} className={cn('input-base bg-white text-gray-900 font-medium border-2 border-gray-200 focus:border-brand-500 min-h-[44px]', error && 'border-red-400', className)} {...props}>
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-red-600 font-bold">{error}</p>}
  </div>
));
Select.displayName = 'Select';

// ── Textarea ──────────────────────────────────────────────────────
export const Textarea = forwardRef(({ label, error, rows = 3, className, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="label">{label}</label>}
    <textarea ref={ref} rows={rows} className={cn('input-base resize-none text-gray-900 font-medium border-2 border-gray-200 focus:border-brand-500', error && 'border-red-400', className)} {...props} />
    {error && <p className="mt-1 text-xs text-red-600 font-bold">{error}</p>}
  </div>
));
Textarea.displayName = 'Textarea';

// ── Card ──────────────────────────────────────────────────────────
export const Card = ({ children, className, ...props }) => (
  <div className={cn('card p-5 bg-white border border-gray-200 rounded-2xl shadow-card transition-all duration-200 hover:shadow-md', className)} {...props}>{children}</div>
);

// ── Badge ─────────────────────────────────────────────────────────
export const Badge = ({ status, label }) => {
  const { t } = useLangStore();
  const displayLabel = label ? t(label) : t(status);
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap", getStatusBadgeClass(status))}>
      {displayLabel}
    </span>
  );
};

// ── Avatar ────────────────────────────────────────────────────────
export const Avatar = ({ name, size = 'md', color = 'brand' }) => {
  const initials = (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };
  const colors = { brand: 'bg-brand-600', blue: 'bg-blue-600', red: 'bg-red-600', purple: 'bg-purple-600', green: 'bg-green-600' };
  return (
    <div className={cn('rounded-full flex items-center justify-center text-white font-extrabold flex-shrink-0 select-none shadow-sm', sizes[size], colors[color])}>
      {initials}
    </div>
  );
};

// ── Modal ─────────────────────────────────────────────────────────
export const Modal = ({ title, children, onClose, size = 'md' }) => {
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={cn('bg-white rounded-2xl w-full shadow-modal flex flex-col max-h-[90vh] overflow-hidden border border-gray-100', {
        'max-w-sm': size === 'sm',
        'max-w-lg': size === 'md',
        'max-w-2xl': size === 'lg',
        'max-w-4xl': size === 'xl',
      }[size])}>
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 flex-shrink-0 bg-gray-50">
          <h2 className="font-extrabold text-gray-900 text-lg">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white border border-gray-250 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-6">{children}</div>
      </div>
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────
export const Skeleton = ({ className }) => (
  <div className={cn('skeleton', className)} />
);

export const SkeletonCard = () => (
  <div className="card p-5 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-2/3" />
  </div>
);

// ── Empty State ───────────────────────────────────────────────────
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-gray-400 p-4 bg-gray-100 rounded-full mb-4">
      <DynamicIcon name={icon} size={36} className="text-gray-500" />
    </div>
    <h3 className="font-bold text-gray-900 text-lg mb-1">{title}</h3>
    <p className="text-gray-500 text-sm max-w-sm mb-6 font-medium">{description}</p>
    {action}
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, icon, color = 'text-gray-900', pulse, trend }) => (
  <Card className="flex-1 min-w-0 border-2 border-gray-100 hover:border-gray-250">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</p>
        <div className="flex items-center gap-2">
          <p className={cn('text-2xl font-black leading-none tracking-tight', color)}>{value}</p>
          {pulse && <span className="w-2 h-2 rounded-full bg-red-600 pulse-dot" />}
        </div>
        {sub && <p className="text-xs text-gray-400 mt-1.5 font-medium">{sub}</p>}
        {trend && (
          <p className={cn('text-xs font-semibold mt-1.5', trend > 0 ? 'text-green-600' : 'text-red-600')}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
          </p>
        )}
      </div>
      {icon && (
        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-gray-500">
          <DynamicIcon name={icon} className="text-gray-400" size={22} />
        </div>
      )}
    </div>
  </Card>
);

// ── Confirm Dialog ────────────────────────────────────────────────
export const ConfirmDialog = ({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) => {
  const { t } = useLangStore();
  return (
    <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-modal border border-gray-150">
        <h3 className="font-extrabold text-lg text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 text-sm mb-6 font-medium">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
};

// ── Search Input ──────────────────────────────────────────────────
export const SearchInput = ({ value, onChange, placeholder = 'Search...' }) => (
  <div className="relative w-full">
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
      <Search size={16} />
    </span>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-base pl-10 pr-4 border-2 border-gray-200 focus:border-brand-500 min-h-[44px]"
    />
  </div>
);

// ── Page Header ───────────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
    <div>
      <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1 font-semibold">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ── Tab Bar ───────────────────────────────────────────────────────
export const TabBar = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit border border-gray-200/50">
    {tabs.map(tab => (
      <button
        key={tab.value}
        onClick={() => onChange(tab.value)}
        className={cn(
          'px-4 py-2 rounded-lg text-sm font-bold transition-all duration-150 select-none min-h-[36px] flex items-center gap-1',
          active === tab.value
            ? 'bg-white text-gray-950 shadow-sm border border-gray-200/20'
            : 'text-gray-500 hover:text-gray-800'
        )}
      >
        {tab.label}
        {tab.count !== undefined && (
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-bold ml-1', active === tab.value ? 'bg-gray-100 text-gray-700' : 'bg-gray-200/60 text-gray-500')}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);
