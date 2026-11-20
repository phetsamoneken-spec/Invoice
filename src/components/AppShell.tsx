import React from 'react';
import {
  ArrowLeft,
  FilePlus2,
  FileText,
  Home,
  LogOut,
  Package,
  BarChart3,
  Settings,
  Users,
  WifiOff,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import type { AuthSession } from '../types/invoice';

interface AppShellProps {
  title: string;
  showBack?: boolean;
  backTo?: string;
  headerRight?: React.ReactNode;
  session: AuthSession | null;
  onSignOut?: () => void;
  children: React.ReactNode;
}

const BOTTOM_TABS = [
  { to: '/', label: 'ໜ້າຫຼັກ', icon: Home },
  { to: '/invoices', label: 'ບິນ', icon: FileText },
];

const BOTTOM_TABS_RIGHT = [
  { to: '/customers', label: 'ລູກຄ້າ', icon: Users },
  { to: '/settings', label: 'ຕັ້ງຄ່າ', icon: Settings },
];

const SIDEBAR_LINKS = [
  { to: '/', label: 'ໜ້າຫຼັກ (Dashboard)', icon: Home },
  { to: '/invoices/new', label: 'ສ້າງໃບບິນໃໝ່', icon: FilePlus2 },
  { to: '/invoices', label: 'ປະຫວັດໃບບິນ', icon: FileText },
  { to: '/customers', label: 'ລູກຄ້າ', icon: Users },
  { to: '/products', label: 'ລາຍການສິນຄ້າ', icon: Package },
  { to: '/reports', label: 'ລາຍງານ', icon: BarChart3 },
  { to: '/settings', label: 'ຕັ້ງຄ່າລະບົບ', icon: Settings },
];

export const AppShell: React.FC<AppShellProps> = ({
  title,
  showBack = false,
  backTo,
  headerRight,
  session,
  onSignOut,
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#F7FAF8] text-[#17241C] lg:flex no-print">
      {/* Desktop Sidebar (expands cleanly on >=1024px so desktop never looks like a trapped 300px phone void) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-[#17241C]/10 lg:bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-[#17241C]/10 px-5 bg-[#008C35] text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">Invoice PWA</div>
            <div className="truncate text-[11px] text-white/85">ໃບຮັບເງິນ / FACTURE</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto" aria-label="Main Navigation">
          {SIDEBAR_LINKS.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === '/invoices'
                ? location.pathname === '/invoices' ||
                  (location.pathname.startsWith('/invoices/') &&
                    location.pathname !== '/invoices/new')
                : isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#EAF8EE] text-[#008C35] font-semibold'
                    : 'text-[#17241C]/75 hover:bg-[#F7FAF8] hover:text-[#17241C]'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#17241C]/10 p-4 space-y-3">
          {!isOnline && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>Offline Mode (Local DB)</span>
            </div>
          )}
          {session && (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#17241C]">
                  {session.displayName}
                </p>
                <p className="truncate text-xs text-[#17241C]/55">@{session.username}</p>
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#17241C]/60 hover:bg-rose-50 hover:text-rose-700"
                  title="ອອກຈາກລະບົບ (Sign Out)"
                  aria-label="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Compact Sticky Emerald Top Header (mobile-first, <=52px) */}
        <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between gap-3 bg-[#008C35] px-4 text-white shadow-sm lg:bg-white lg:text-[#17241C] lg:border-b lg:border-[#17241C]/10 lg:h-16 lg:px-8">
          <div className="flex items-center gap-2 min-w-0">
            {showBack && (
              <button
                type="button"
                onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
                className="flex min-h-[44px] min-w-[44px] -ml-2 items-center justify-center rounded-xl transition hover:bg-white/15 lg:hover:bg-[#F7FAF8]"
                aria-label="ກັບຄືນ (Back)"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="truncate text-base sm:text-lg font-bold tracking-tight">{title}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isOnline && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white lg:hidden">
                <WifiOff className="h-3.5 w-3.5" />
                <span>Offline</span>
              </span>
            )}
            {headerRight}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 px-4 py-4 pb-24 sm:px-6 lg:px-8 lg:py-6 lg:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar + Center Floating Green Create Invoice Button */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#17241C]/10 bg-white/95 backdrop-blur-md pb-safe lg:hidden"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-1">
          {BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const active =
              tab.to === '/invoices'
                ? location.pathname === '/invoices' ||
                  (location.pathname.startsWith('/invoices/') &&
                    location.pathname !== '/invoices/new')
                : isActive(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-[#008C35] font-semibold' : 'text-[#17241C]/60'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}

          {/* Center Floating Green Create Invoice Button */}
          <div className="flex items-center justify-center">
            <Link
              to="/invoices/new"
              aria-label="ສ້າງໃບບິນ (Create Invoice)"
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#008C35] text-white shadow-lg shadow-[#008C35]/30 ring-4 ring-white transition-transform hover:bg-[#00732B] active:scale-95"
            >
              <span className="text-2xl font-bold leading-none">+</span>
            </Link>
          </div>

          {BOTTOM_TABS_RIGHT.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-[#008C35] font-semibold' : 'text-[#17241C]/60'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
