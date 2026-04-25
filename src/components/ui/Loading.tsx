import { Loader2 } from 'lucide-react';

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
}

export function Loading({ text = 'Carregando...', fullScreen = true }: LoadingProps) {
  const wrapperClass = fullScreen
    ? 'min-h-screen flex items-center justify-center'
    : 'flex items-center justify-center py-12';

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-accent" />
        <p className="text-sm text-text-2">{text}</p>
      </div>
    </div>
  );
}
