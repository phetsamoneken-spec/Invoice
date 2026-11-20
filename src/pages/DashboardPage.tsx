import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BarChart3,
  FilePlus2,
  FileText,
  Package,
  Settings,
  Users,
  ChevronRight,
  HardDriveDownload,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { StatusLabel } from '../components/StatusLabel';
import { db } from '../db/database';
import type { AuthSession } from '../types/invoice';
import { formatDateDMY, formatLAKWithSymbol } from '../utils/invoiceMath';

interface DashboardPageProps {
  session: AuthSession | null;
  onSignOut: () => void;
}

const ACTION_TILES = [
  {
    to: '/invoices/new',
    title: 'ສ້າງໃບບິນ',
    subtitle: 'Create Invoice',
    icon: FilePlus2,
  },
  {
    to: '/invoices',
    title: 'ປະຫວັດບິນ',
    subtitle: 'Invoice History',
    icon: FileText,
  },
  {
    to: '/customers',
    title: 'ລູກຄ້າ',
    subtitle: 'Customers',
    icon: Users,
  },
  {
    to: '/products',
    title: 'ລາຍການສິນຄ້າ',
    subtitle: 'Product Catalog',
    icon: Package,
  },
  {
    to: '/reports',
    title: 'ລາຍງານ',
    subtitle: 'Reports',
    icon: BarChart3,
  },
  {
    to: '/settings',
    title: 'ຕັ້ງຄ່າ',
    subtitle: 'Settings',
    icon: Settings,
  },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({ session, onSignOut }) => {
  const invoices = useLiveQuery(() => db.invoices.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.settings.get('default'), []);

  const stats = useMemo(() => {
    let billedTotal = 0;
    let paidTotal = 0;
    let unpaidTotal = 0;
    let activeCount = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    for (const inv of invoices) {
      if (inv.status === 'void' || inv.status === 'draft') continue;
      activeCount += 1;
      billedTotal += inv.totalAmount;
      if (inv.status === 'paid') {
        paidTotal += inv.totalAmount;
        paidCount += 1;
      } else if (inv.status === 'issued') {
        unpaidTotal += inv.totalAmount;
        unpaidCount += 1;
      }
    }

    return {
      totalAll: invoices.length,
      activeCount,
      billedTotal,
      paidTotal,
      unpaidTotal,
      paidCount,
      unpaidCount,
    };
  }, [invoices]);

  const recentInvoices = invoices.slice(0, 5);

  return (
    <AppShell
      title={`ສະບາຍດີ, ${session?.displayName || 'ຜູ້ໃຊ້'}`}
      session={session}
      onSignOut={onSignOut}
      headerRight={<PWAInstallButton compact />}
    >
      <div className="space-y-5">
        {/* Top Shop Identity & Single-Device Notice */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#17241C]/60">
              {settings?.shopName || 'Original Invoice PWA'}
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-[#17241C] truncate">
              ສະຫຼຸບຍອດໃບຮັບເງິນ
            </h2>
          </div>
          <Link
            to="/settings"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#EAF8EE] px-3 py-1.5 text-xs font-semibold text-[#008C35] hover:bg-[#d9f3e1] whitespace-nowrap"
          >
            <HardDriveDownload className="h-4 w-4 shrink-0" />
            <span>ຂໍ້ມູນເກັບໃນເຄື່ອງນີ້ (Backup)</span>
          </Link>
        </div>

        {/* Hero 2 Emerald Metric Cards matching Screen 2 mockup */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="rounded-[20px] bg-[#008C35] p-5 text-white shadow-sm">
            <p className="text-xs font-medium text-white/85">ຈຳນວນໃບບິນທັງໝົດ</p>
            <p className="mt-1.5 font-mono-num text-3xl font-bold tracking-tight">
              {stats.totalAll}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/90">
              <span>ຈ່າຍແລ້ວ: {stats.paidCount}</span>
              <span aria-hidden="true">·</span>
              <span>ຍັງບໍ່ຈ່າຍ: {stats.unpaidCount}</span>
            </div>
          </div>

          <div className="rounded-[20px] bg-[#008C35] p-5 text-white shadow-sm">
            <p className="text-xs font-medium text-white/85">ຍອດຂາຍລວມ (Billed)</p>
            <p className="mt-1.5 font-mono-num text-2xl sm:text-3xl font-bold tracking-tight break-words">
              {formatLAKWithSymbol(stats.billedTotal)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/90 tabular-nums">
              <span>ຈ່າຍແລ້ວ: {formatLAKWithSymbol(stats.paidTotal)}</span>
              <span aria-hidden="true">·</span>
              <span>ຄ້າງຈ່າຍ: {formatLAKWithSymbol(stats.unpaidTotal)}</span>
            </div>
          </div>
        </div>

        {/* Paid vs Unpaid Quick Split Strip */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[16px] bg-white p-4 shadow-xs border border-[#17241C]/8">
            <p className="text-xs font-medium text-[#17241C]/60">ຮັບເງິນແລ້ວ (Paid)</p>
            <p className="mt-1 font-mono-num text-base sm:text-lg font-bold text-[#008C35]">
              {formatLAKWithSymbol(stats.paidTotal)}
            </p>
          </div>
          <div className="rounded-[16px] bg-white p-4 shadow-xs border border-[#17241C]/8">
            <p className="text-xs font-medium text-[#17241C]/60">ຍັງຄ້າງຈ່າຍ (Unpaid)</p>
            <p className="mt-1 font-mono-num text-base sm:text-lg font-bold text-amber-700">
              {formatLAKWithSymbol(stats.unpaidTotal)}
            </p>
          </div>
        </div>

        {/* 6 Main Action Cards matching Screen 2 mockup */}
        <div>
          <h3 className="mb-3 text-sm font-bold text-[#17241C]/80">ເມນູຫຼັກ (Quick Actions)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ACTION_TILES.map((tile) => {
              const Icon = tile.icon;
              return (
                <Link
                  key={tile.to}
                  to={tile.to}
                  className="group flex min-h-[104px] flex-col items-center justify-center rounded-[18px] bg-white p-4 text-center shadow-xs border border-[#17241C]/8 transition duration-200 hover:border-[#008C35]/40 hover:bg-[#EAF8EE]/45 active:scale-[0.98]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF8EE] text-[#008C35] transition-colors group-hover:bg-[#008C35] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="mt-2.5 text-sm font-bold text-[#17241C]">{tile.title}</span>
                  <span className="mt-0.5 text-[11px] text-[#17241C]/55">{tile.subtitle}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Invoices List */}
        <div className="rounded-[20px] bg-white p-4 sm:p-5 shadow-xs border border-[#17241C]/8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-bold text-[#17241C]">ໃບບິນຫຼ້າສຸດ (Recent Invoices)</h3>
            <Link
              to="/invoices"
              className="inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-[#008C35] hover:underline whitespace-nowrap"
            >
              <span>ເບິ່ງທັງໝົດ</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#17241C]/65">ຍັງບໍ່ມີໃບບິນເທື່ອ</p>
              <Link
                to="/invoices/new"
                className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#008C35] px-4 py-2 text-sm font-semibold text-white"
              >
                <FilePlus2 className="h-4 w-4" />
                <span>ສ້າງໃບບິນທຳອິດ</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#17241C]/8">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="flex min-h-[60px] items-center justify-between gap-3 py-3 transition hover:bg-[#F7FAF8] -mx-2 px-2 rounded-xl"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num text-sm font-bold text-[#17241C]">
                        #{inv.invoiceNumber}
                      </span>
                      <StatusLabel status={inv.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-[#17241C]/65">
                      {formatDateDMY(inv.date)} · {inv.customerName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono-num text-sm font-bold text-[#17241C]">
                      {formatLAKWithSymbol(inv.totalAmount)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};
