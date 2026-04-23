import { type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AdminLayout({
  title,
  actions,
  children,
}: {
  title?: string | undefined;
  actions?: ReactNode;
  children?: ReactNode;
}): JSX.Element {
  return (
    <div className="min-h-screen flex bg-ink-50 text-ink-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-[240px]">
        <TopBar title={title} actions={actions} />
        <main className="flex-1 min-w-0 px-6 py-5">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
