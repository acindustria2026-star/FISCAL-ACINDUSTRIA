import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-[14px] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
