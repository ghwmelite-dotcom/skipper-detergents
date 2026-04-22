import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FolderTree,
  Activity,
  Settings,
  Users,
  UserCircle,
  LogOut,
} from 'lucide-react';
import { ADMIN_ROLE_LABELS } from '@skipper/shared';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';

const navItems: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  superAdminOnly?: boolean;
}> = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/customers', label: 'Customers', icon: UserCircle },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/team', label: 'Team', icon: Users, superAdminOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar(): JSX.Element {
  const { user, logout } = useAuthStore();
  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-[240px] flex flex-col bg-navy-700 text-white border-r border-navy-800"
      aria-label="Admin navigation"
    >
      <div className="px-4 py-4 border-b border-navy-800/60 flex items-center gap-2">
        <div className="h-7 w-7 rounded bg-cyan-500 flex items-center justify-center text-navy-900 text-xs font-bold">
          S
        </div>
        <div>
          <div className="text-sm font-semibold leading-none">Skipper</div>
          <div className="text-2xs text-ink-300 uppercase tracking-widest mt-0.5">
            Admin
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems
          .filter((item) => !item.superAdminOnly || user?.role === 'super_admin')
          .map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end ?? false}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded px-2.5 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-navy-600 text-white'
                  : 'text-ink-200 hover:bg-navy-600/60 hover:text-white',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-navy-800/60 p-3">
        {user && (
          <div className="mb-2">
            <div className="text-xs text-white font-medium truncate">{user.name}</div>
            <div className="text-2xs text-ink-300 uppercase tracking-wider">
              {ADMIN_ROLE_LABELS[user.role] ?? user.role}
            </div>
          </div>
        )}
        <button
          onClick={() => {
            logout();
            window.location.assign('/login');
          }}
          className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-sm text-ink-200 hover:bg-navy-600/60 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
