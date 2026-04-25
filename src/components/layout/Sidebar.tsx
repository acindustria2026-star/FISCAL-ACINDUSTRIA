import { SidebarContent } from './SidebarContent';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = '' }: SidebarProps) {
  return (
    <aside
      className={`w-60 flex-shrink-0 bg-surface border-r border-border h-screen sticky top-0 ${className}`}
    >
      <SidebarContent />
    </aside>
  );
}
