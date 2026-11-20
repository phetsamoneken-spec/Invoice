import React, { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Ban,
  Calendar,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FilePlus2,
  MessageCircle,
  MoreVertical,
  Search,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { OriginalPaperInvoice } from '../components/OriginalPaperInvoice';
import { StatusLabel } from '../components/StatusLabel';
import {
  createDefaultSettings,
  db,
  duplicateInvoiceAsDraft,
  updateInvoiceStatus,
  voidAndCorrectInvoice,
} from '../db/database';
import type { AuthSession, Invoice, InvoiceStatus } from '../types/invoice';
import {
  generateInvoicePdfBlob,
  shareInvoiceViaWhatsApp,
  type ShareResult,
} from '../utils/exportInvoice';
import { formatDateDMY, formatLAKWithSymbol } from '../utils/invoiceMath';

interface InvoiceHistoryPageProps {
  session: AuthSession | null;
  onSignOut: () => void;
}

const FILTER_TABS: Array<{ key: 'all' | InvoiceStatus; label: string }> = [
  { key: 'all', label: 'ທັງໝົດ' },
  { key: 'paid', label: 'ຈ່າຍແລ້ວ' },
  { key: 'issued', label: 'ຍັງບໍ່ຈ່າຍ' },
  { key: 'draft', label: 'ຮ່າງ' },
  { key: 'void', label: 'ຍົກເລີກ' },
];

export const InvoiceHistoryPage: React.FC<InvoiceHistoryPageProps> = ({ session, onSignOut }) => {
  const navigate = useNavigate();
  const invoices = useLiveQuery(() => db.invoices.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.settings.get('default'), []) ?? createDefaultSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [sharingInvoice, setSharingInvoice] = useState<Invoice | null>(null);
  const [shareFallback, setShareFallback] = useState<ShareResult | null>(null);
  const [voidTarget, setVoidTarget] = useState<Invoice | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [createCorrectedDraft, setCreateCorrectedDraft] = useState(true);
  const [voidError, setVoidError] = useState<string | null>(null);
  const hiddenPaperRef = useRef<HTMLDivElement>(null);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (dateFilter && inv.date !== dateFilter) return false;
      if (q) {
        const hay = `${inv.invoiceNumber} ${inv.customerName} ${inv.customerPhone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, dateFilter, searchQuery]);

  const handleDuplicate = async (inv: Invoice) => {
    setOpenMenuId(null);
    const cloned = await duplicateInvoiceAsDraft(inv.id);
    navigate(`/invoices/${cloned.id}/edit`);
  };

  const handleShareAgain = async (inv: Invoice) => {
    setOpenMenuId(null);
    setSharingInvoice(inv);
    // Wait one animation frame for hidden off-screen OriginalPaperInvoice to render with selected invoice
    await new Promise((r) => setTimeout(r, 80));
    try {
      if (!hiddenPaperRef.current) {
        navigate(`/invoices/${inv.id}`);
        return;
      }
      const blob = await generateInvoicePdfBlob(hiddenPaperRef.current);
      const res = await shareInvoiceViaWhatsApp({
        invoice: inv,
        shopName: settings.shopName,
        blob,
        filename: `invoice-${inv.invoiceNumber}.pdf`,
        mimeType: 'application/pdf',
      });
      if (res.mode === 'fallback-download') {
        setShareFallback(res);
      }
    } finally {
      setSharingInvoice(null);
    }
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget) return;
    setVoidError(null);
    try {
      const res = await voidAndCorrectInvoice(voidTarget.id, voidReason, createCorrectedDraft);
      setVoidTarget(null);
      setVoidReason('');
      if (res.correctedDraft) {
        navigate(`/invoices/${res.correctedDraft.id}/edit`);
      }
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : 'ກະລຸນາລະບຸເຫດຜົນ');
    }
  };

  return (
    <AppShell
      title="ປະຫວັດໃບບິນ"
      showBack
      backTo="/"
      session={session}
      onSignOut={onSignOut}
      headerRight={
        <Link
          to="/invoices/new"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 lg:bg-[#008C35] lg:hover:bg-[#00732B] whitespace-nowrap"
        >
          <FilePlus2 className="h-4 w-4" />
          <span>ສ້າງໃໝ່</span>
        </Link>
      }
    >
      <div className="space-y-4">
        {/* Search & Date Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="relative sm:col-span-8">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#17241C]/45" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ຄົ້ນຫາເລກບິນ, ຊື່ລູກຄ້າ..."
              aria-label="ຄົ້ນຫາເລກບິນ, ລູກຄ້າ"
              className="min-h-[46px] w-full rounded-2xl border border-[#17241C]/12 bg-white pl-10 pr-4 text-sm text-[#17241C] shadow-xs placeholder:text-[#17241C]/40 focus:border-[#008C35] focus:outline-none"
            />
          </div>

          <div className="relative sm:col-span-4 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#17241C]/45" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                aria-label="ກັ່ນຕອງຕາມວັນທີ"
                className="min-h-[46px] w-full rounded-2xl border border-[#17241C]/12 bg-white pl-9 pr-3 font-mono-num text-xs sm:text-sm text-[#17241C] shadow-xs focus:border-[#008C35] focus:outline-none"
              />
            </div>
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white border border-[#17241C]/12 text-[#17241C]/60 hover:text-[#17241C]"
                aria-label="Clear date filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs (Interactive button group) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`min-h-[40px] rounded-xl px-4 py-1.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#008C35] text-white shadow-xs'
                    : 'bg-white text-[#17241C]/75 border border-[#17241C]/10 hover:bg-[#EAF8EE]/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Invoice List */}
        {filteredInvoices.length === 0 ? (
          <div className="rounded-[20px] bg-white p-8 text-center shadow-xs border border-[#17241C]/8">
            <p className="text-sm font-medium text-[#17241C]/65">ບໍ່ພົບໃບບິນທີ່ຕົງກັບການຄົ້ນຫາ</p>
            <Link
              to="/invoices/new"
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#008C35] px-5 py-2 text-sm font-semibold text-white"
            >
              <FilePlus2 className="h-4 w-4" />
              <span>ສ້າງໃບບິນໃໝ່</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                className="relative rounded-[18px] bg-white p-4 shadow-xs border border-[#17241C]/8 transition hover:border-[#008C35]/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/invoices/${inv.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-num text-base font-bold text-[#17241C]">
                        #{inv.invoiceNumber}
                      </span>
                      <StatusLabel status={inv.status} />
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-[#17241C]/70 truncate">
                      {formatDateDMY(inv.date)} · {inv.customerName}
                    </p>
                    <p className="mt-1.5 font-mono-num text-base sm:text-lg font-bold text-[#17241C]">
                      {formatLAKWithSymbol(inv.totalAmount)}
                    </p>
                  </Link>

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === inv.id ? null : inv.id)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#17241C]/65 hover:bg-[#F7FAF8]"
                      aria-label={`Actions for invoice ${inv.invoiceNumber}`}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Quick inline action row + expandable menu */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#17241C]/8 pt-3">
                  <Link
                    to={`/invoices/${inv.id}`}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#EAF8EE] px-3 py-1.5 text-xs font-semibold text-[#008C35] hover:bg-[#d9f3e1]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>ເບິ່ງໃບບິນ</span>
                  </Link>

                  {inv.status === 'draft' && (
                    <Link
                      to={`/invoices/${inv.id}/edit`}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#17241C]/15 px-3 py-1.5 text-xs font-semibold text-[#17241C] hover:bg-[#F7FAF8]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>ແກ້ໄຂຮ່າງ</span>
                    </Link>
                  )}

                  {inv.status === 'issued' && (
                    <button
                      type="button"
                      onClick={() => updateInvoiceStatus(inv.id, 'paid')}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#008C35]/30 px-3 py-1.5 text-xs font-semibold text-[#008C35] hover:bg-[#EAF8EE]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>ຈ່າຍແລ້ວ</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleShareAgain(inv)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#17241C]/15 px-3 py-1.5 text-xs font-semibold text-[#17241C] hover:bg-[#F7FAF8]"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-[#008C35]" />
                    <span>ສົ່ງ WhatsApp</span>
                  </button>

                  {openMenuId === inv.id && (
                    <div className="w-full flex flex-wrap gap-2 pt-2 border-t border-[#17241C]/8">
                      <button
                        type="button"
                        onClick={() => handleDuplicate(inv)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#F7FAF8] px-3 py-1.5 text-xs font-semibold text-[#17241C] hover:bg-[#EAF8EE]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>ສຳເນົາບິນ (Duplicate)</span>
                      </button>

                      {(inv.status === 'issued' || inv.status === 'paid') && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setVoidTarget(inv);
                          }}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>ຍົກເລີກ / ແກ້ໄຂບິນ</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden Off-Screen Invoice Renderer for direct History WhatsApp Share */}
      {sharingInvoice && (
        <div className="fixed -left-[9999px] top-0 w-[760px] pointer-events-none opacity-0">
          <OriginalPaperInvoice
            invoice={sharingInvoice}
            settings={settings}
            innerRef={hiddenPaperRef}
          />
        </div>
      )}

      {/* WhatsApp Fallback Modal */}
      {shareFallback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#17241C]">ແບ່ງປັນຜ່ານ WhatsApp</h3>
            <p className="text-sm leading-relaxed text-[#17241C]/80">{shareFallback.message}</p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              {shareFallback.whatsappUrl && (
                <a
                  href={shareFallback.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#008C35] px-4 py-2 text-sm font-semibold text-white"
                >
                  <span>ເປີດ WhatsApp</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setShareFallback(null)}
                className="min-h-[44px] rounded-xl border border-[#17241C]/15 px-4 py-2 text-sm font-semibold text-[#17241C]"
              >
                ປິດ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void / Controlled Correction Modal */}
      {voidTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleVoidSubmit}
            className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-xl space-y-4"
          >
            <h3 className="text-base font-bold text-[#17241C]">
              ຍົກເລີກ ແລະ ແກ້ໄຂໃບບິນ #{voidTarget.invoiceNumber}
            </h3>
            <p className="text-xs text-[#17241C]/70">
              ໃບບິນເດີມຈະຖືກໝາຍວ່າ “ຍົກເລີກ (Void)” ແລະ ທ່ານສາມາດສ້າງຮ່າງໃໝ່ເພື່ອແກ້ໄຂໄດ້.
            </p>
            <input
              type="text"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="ເຫດຜົນການຍົກເລີກ..."
              className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3 text-sm text-[#17241C]"
            />
            <label className="flex items-center gap-2 text-xs font-medium text-[#17241C]">
              <input
                type="checkbox"
                checked={createCorrectedDraft}
                onChange={(e) => setCreateCorrectedDraft(e.target.checked)}
                className="h-4 w-4 accent-[#008C35]"
              />
              <span>ສ້າງໃບບິນຮ່າງໃໝ່ເພື່ອແກ້ໄຂຕໍ່</span>
            </label>
            {voidError && <p className="text-xs text-rose-700 font-medium">{voidError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="min-h-[44px] rounded-xl border border-[#17241C]/15 px-4 py-2 text-sm font-semibold"
              >
                ປິດ
              </button>
              <button
                type="submit"
                className="min-h-[44px] rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
              >
                ຢືນຢັນຍົກເລີກ
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
};
