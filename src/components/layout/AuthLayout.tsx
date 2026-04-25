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
      <div
        className="w-14 h-14 mx-auto rounded-2xl mb-4 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #D4A017 0%, #A57D0D 100%)' }}
      />
      <h1 className="font-serif-display text-4xl">Controle Fiscal</h1>
      {subtitle && <p className="text-text-2 mt-1 text-sm">{subtitle}</p>}
    </div>
  );
}
