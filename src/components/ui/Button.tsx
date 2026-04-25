import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-accent text-[#0B0B0D] hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-surface-2 text-text border border-border hover:border-text-3 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-text-2 hover:text-text hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-warn text-white hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, fullWidth, className = '', children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
});
