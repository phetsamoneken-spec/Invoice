import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppShell } from '../components/AppShell';
import { db } from '../db/database';
import type { AuthSession } from '../types/invoice';
import { formatLAKWithSymbol } from '../utils/invoiceMath';

interface ReportsPageProps {
  session: AuthSession | null;
  onSignOut: () => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ session, onSignOut }) => {
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) ?? [];

  const summary = useMemo(() => {
    let paidAmount = 0;
    let unpaidAmount = 0;
    let draftAmount = 0;
    let voidAmount = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let draftCount = 0;
    let voidCount = 0;

    const customerTotals = new Map<string, { name: string; total: number; count: number }>();

    for (const inv of invoices) {
      if (inv.status === 'paid') {
        paidAmount += inv.totalAmount;
        paidCount += 1;
      } else if (inv.status === 'issued') {
        unpaidAmount += inv.totalAmount;
        unpaidCount += 1;
      } else if (inv.status === 'draft') {
        draftAmount += inv.totalAmount;
        draftCount += 1;
      } else if (inv.status === 'void') {
        voidAmount += inv.totalAmount;
        voidCount += 1;
      }

      if (inv.status === 'paid' || inv.status === 'issued') {
        const key = inv.customerName.trim() || 'ບໍ່ລະບຸຊື່';
        const prev = customerTotals.get(key) ?? { name: key, total: 0, count: 0 };
        prev.total += inv.totalAmount;
        prev.count += 1;
        customerTotals.set(key, prev);
      }
    }

    const topCustomers = Array.from(customerTotals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    return {
      billedTotal: paidAmount + unpaidAmount,
      paidAmount,
      unpaidAmount,
      draftAmount,
      voidAmount,
      paidCount,
      unpaidCount,
      draftCount,
      voidCount,
      topCustomers,
    };
  }, [invoices]);

  return (
    <AppShell title="ລາຍງານ (Reports)" showBack backTo="/" session={session} onSignOut={onSignOut}>
      <div className="space-y-4">
        <div className="rounded-[20px] bg-[#008C35] p-5 text-white shadow-sm">
          <p className="text-xs font-medium text-white/85">ຍອດຂາຍທີ່ອອກບິນແລ້ວທັງໝົດ (Billed = Paid + Issued)</p>
          <p className="mt-1.5 font-mono-num text-3xl font-bold">
            {formatLAKWithSymbol(summary.billedTotal)}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-[16px] bg-white p-4 shadow-xs border border-[#17241C]/8">
            <p className="text-xs text-[#17241C]/60">ຈ່າຍແລ້ວ ({summary.paidCount})</p>
            <p className="mt-1 font-mono-num text-base font-bold text-[#008C35]">
              {formatLAKWithSymbol(summary.paidAmount)}
            </p>
          </div>
          <div className="rounded-[16px] bg-white p-4 shadow-xs border border-[#17241C]/8">
            <p className="text-xs text-[#17241C]/60">ຍັງບໍ່ຈ່າຍ ({summary.unpaidCount})</p>
            <p className="mt-1 font-mono-num text-base font-bold text-amber-700">
              {formatLAKWithSymbol(summary.unpaidAmount)}
            </p>
          </div>
          <div className="rounded-[16px] bg-white p-4 shadow-xs border border-[#17241C]/8">
            <p className="text-xs text-[#17241C]/60">ຮ່າງ ({summary.draftCount})</p>
            <p className="mt-1 font-mono-num text-base font-bold text-slate-700">
              {formatLAKWithSymbol(summary.draftAmount)}
            </p>
          </div>
          <div className="rounded-[16px] bg-white p-4 shadow-xs border border-[#17241C]/8">
            <p className="text-xs text-[#17241C]/60">ຍົກເລີກ ({summary.voidCount})</p>
            <p className="mt-1 font-mono-num text-base font-bold text-rose-700">
              {formatLAKWithSymbol(summary.voidAmount)}
            </p>
          </div>
        </div>

        <div className="rounded-[20px] bg-white p-4 sm:p-5 shadow-xs border border-[#17241C]/8">
          <h2 className="text-sm font-bold text-[#17241C] mb-3">
            ລູກຄ້າຍອດສູງສຸດ (Top Billed Customers)
          </h2>
          {summary.topCustomers.length === 0 ? (
            <p className="text-sm text-[#17241C]/60 py-4 text-center">ຍັງບໍ່ມີຂໍ້ມູນໃບບິນທີ່ອອກແລ້ວ</p>
          ) : (
            <div className="divide-y divide-[#17241C]/8">
              {summary.topCustomers.map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#17241C] truncate">{c.name}</p>
                    <p className="text-xs text-[#17241C]/55">{c.count} ໃບບິນ</p>
                  </div>
                  <p className="font-mono-num text-sm font-bold text-[#008C35] shrink-0">
                    {formatLAKWithSymbol(c.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};
