// PageHeader — single admin page-heading pattern (rotation E2 «بچین پنل»).
// Replaces the 3 drifted variants (no-icon 2xl→3xl / icon text-primary-500 / text-xl).
import type { ComponentType } from 'react';

interface PageHeaderProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}

export default function PageHeader({ icon: Icon, title, subtitle }: PageHeaderProps) {
  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-white flex items-center gap-2">
        <Icon className="h-6 w-6 text-[var(--color-emphasis-text)] shrink-0" />
        <span className="truncate">{title}</span>
      </h1>
      {subtitle && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
