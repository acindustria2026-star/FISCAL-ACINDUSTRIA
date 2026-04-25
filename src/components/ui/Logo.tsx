interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <div
      className={`rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #D4A017 0%, #A57D0D 100%)',
        boxShadow: '0 4px 12px rgba(212, 160, 23, 0.3)',
      }}
    >
      <span
        className="font-serif"
        style={{
          fontSize: size * 0.5,
          color: '#0B0B0D',
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        F
      </span>
    </div>
  );
}
