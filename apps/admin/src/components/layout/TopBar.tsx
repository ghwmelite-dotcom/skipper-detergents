import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function TopBar({
  title,
  actions,
}: {
  title?: string | undefined;
  actions?: ReactNode;
}): JSX.Element {
  const { user } = useAuthStore();
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-ink-200 bg-white px-6">
      <h1 className="text-base font-semibold text-ink-900">{title ?? ''}</h1>
      <div className="flex items-center gap-3">
        {actions}
        {user && (
          <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 pl-3 pr-1 py-0.5">
            <span className="text-xs text-ink-700">{user.email}</span>
            <div className="h-6 w-6 rounded-full bg-navy-700 text-white flex items-center justify-center text-2xs font-semibold">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
