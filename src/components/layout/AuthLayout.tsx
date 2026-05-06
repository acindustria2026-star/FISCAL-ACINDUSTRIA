import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none opacity-25"
        style={{
          background: 'radial-gradient(circle at center top, #D4A017 0%, transparent 70%)',
        }}
      />
      <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

export function AuthHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="text-center mb-8">
      <div className="w-24 h-24 mx-auto rounded-2xl mb-4 shadow-xl bg-white flex items-center justify-center overflow-hidden">
        <img
          src="/logo.jpg"
          alt="Logo"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>
      <h1 className="font-serif-display text-4xl">Controle Fiscal</h1>
      {subtitle && <p className="text-text-2 mt-1 text-sm">{subtitle}</p>}
    </div>
  );
}
