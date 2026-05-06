interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <div
      className={`rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-white ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: '0 4px 12px rgba(212, 160, 23, 0.3)',
      }}
    >
      <img
        src="/logo.jpg"
        alt="Logo"
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
}
