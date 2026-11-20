import React, { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  FileDown,
  Image as ImageIcon,
  MessageCircle,
  Printer,
  Send,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import type { AuthSession } from '../types/invoice';
import {
  generateInvoicePdfBlob,
  generateInvoicePngBlob,
  shareInvoiceViaWhatsApp,
  triggerBlobDownload,
  type ShareResult,
} from '../utils/exportInvoice';

interface InvoicePreviewPageProps {
  session: AuthSession | null;
  onSignOut: () => void;
}

export const InvoicePreviewPage: React.FC<InvoicePreviewPageProps> = ({ session, onSignOut }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const paperRef = useRef<HTMLDivElement>(null);

  const invoice = useLiveQuery(() => (id ? db.invoices.get(id) : undefined), [id]);
  const settings = useLiveQuery(() => db.settings.get('default'), []) ?? createDefaultSettings();

  const [busyAction, setBusyAction] = useState<'pdf' | 'png' | 'whatsapp' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [shareFallback, setShareFallback] = useState<ShareResult | null>(null);
  const [shareFormat, setShareFormat] = useState<'pdf' | 'png'>('pdf');
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [createCorrectedDraft, setCreateCorrectedDraft] = useState(true);
  const [voidError, setVoidError] = useState<string | null>(null);

  const handleExportPdf = async () => {
    if (!paperRef.current || !invoice) return;
    setBusyAction('pdf');
    setFeedback(null);
    try {
      const blob = await generateInvoicePdfBlob(paperRef.current);
      triggerBlobDownload(blob, `invoice-${invoice.invoiceNumber}.pdf`);
      setFeedback('ດາວໂຫຼດໄຟລ໌ PDF ສຳເລັດແລ້ວ');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'ບໍ່ສາມາດສ້າງໄຟລ໌ PDF ໄດ້');
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportPng = async () => {
    if (!paperRef.current || !invoice) return;
    setBusyAction('png');
    setFeedback(null);
    try {
      const { blob } = await generateInvoicePngBlob(paperRef.current);
      triggerBlobDownload(blob, `invoice-${invoice.invoiceNumber}.png`);
      setFeedback('ດາວໂຫຼດຮູບພາບ PNG ສຳເລັດແລ້ວ');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'ບໍ່ສາມາດສ້າງຮູບພາບ PNG ໄດ້');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = async () => {
    if (!paperRef.current || !invoice) return;
    setBusyAction('whatsapp');
    setFeedback(null);
    setShareFallback(null);
    try {
      const blob =
        shareFormat === 'pdf'
          ? await generateInvoicePdfBlob(paperRef.current)
          : (await generateInvoicePngBlob(paperRef.current)).blob;
      const filename = `invoice-${invoice.invoiceNumber}.${shareFormat}`;
      const mimeType = shareFormat === 'pdf' ? 'application/pdf' : 'image/png';
      const result = await shareInvoiceViaWhatsApp({
        invoice,
        shopName: settings.shopName,
        blob,
        filename,
        mimeType,
      });

      if (result.mode === 'native-share') {
        setFeedback(result.message);
      } else {
        setShareFallback(result);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setFeedback('ຍົກເລີກການແບ່ງປັນ');
      } else {
        setFeedback(err instanceof Error ? err.message : 'ບໍ່ສາມາດແບ່ງປັນໄດ້');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleDuplicate = async () => {
    if (!invoice) return;
    const cloned = await duplicateInvoiceAsDraft(invoice.id);
    navigate(`/invoices/${cloned.id}/edit`);
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setVoidError(null);
    try {
      const res = await voidAndCorrectInvoice(invoice.id, voidReason, createCorrectedDraft);
      setShowVoidModal(false);
      setVoidReason('');
      if (res.correctedDraft) {
        navigate(`/invoices/${res.correctedDraft.id}/edit`);
      }
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : 'ກະລຸນາປ້ອນເຫດຜົນການຍົກເລີກ');
    }
  };

  if (invoice === undefined) {
    return (
      <AppShell title="ຕົວຢ່າງໃບບິນ" showBack backTo="/invoices" session={session} onSignOut={onSignOut}>
        <div className="rounded-[20px] bg-white p-8 text-center text-sm text-[#17241C]/65">
          ກຳລັງໂຫຼດໃບບິນ...
        </div>
      </AppShell>
    );
  }

  if (!invoice) {
    return (
      <AppShell title="ບໍ່ພົບໃບບິນ" showBack backTo="/invoices" session={session} onSignOut={onSignOut}>
        <div className="rounded-[20px] bg-white p-6 text-center space-y-4">
          <p className="text-sm font-medium text-[#17241C]/75">ບໍ່ພົບໃບບິນທີ່ທ່ານຕ້ອງການ</p>
          <Link
            to="/invoices"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#008C35] px-5 py-2 text-sm font-semibold text-white"
          >
            ກັບໄປປະຫວັດໃບບິນ
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell
        title={`ຕົວຢ່າງໃບບິນ #${invoice.invoiceNumber}`}
        showBack
        backTo="/invoices"
        session={session}
        onSignOut={onSignOut}
        headerRight={<StatusLabel status={invoice.status} />}
      >
        <div className="space-y-4">
          {/* Paper Template Confirmation Reminder (when fields haven't been confirmed by user yet) */}
          {!settings.paperFieldsConfirmed && (
            <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
                <span>
                  ຂໍ້ມູນຮ້ານ ແລະ ຂໍ້ຄວາມທ້າຍໃບບິນຕົ້ນສະບັບຍັງບໍ່ທັນໄດ້ຢືນຢັນ — ກະລຸນາກວດສອບຊື່ຮ້ານ, ທີ່ຢູ່, ເບີໂທ ແລະ ຂໍ້ຄວາມທ້າຍບິນ.
                </span>
              </div>
              <Link
                to="/settings"
                className="inline-flex min-h-[36px] items-center rounded-lg bg-amber-100 px-3 py-1 font-semibold text-amber-950 hover:bg-amber-200 whitespace-nowrap"
              >
                ຢືນຢັນໃນຕັ້ງຄ່າ
              </Link>
            </div>
          )}

          {/* Status & Lifecycle Action Bar (Explicit Payment Control — WhatsApp never auto-marks Paid) */}
          <div className="rounded-[18px] bg-white p-3.5 shadow-xs border border-[#17241C]/8 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusLabel status={invoice.status} />
              {invoice.voidReason && (
                <span className="text-xs text-rose-700 font-medium">
                  ເຫດຜົນ: {invoice.voidReason}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {invoice.status === 'draft' && (
                <>
                  <Link
                    to={`/invoices/${invoice.id}/edit`}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#17241C]/15 px-3 py-1.5 text-xs font-semibold text-[#17241C] hover:bg-[#F7FAF8]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>ແກ້ໄຂຮ່າງ</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => updateInvoiceStatus(invoice.id, 'issued')}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#008C35] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00732B]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>ອອກບິນ (Issue)</span>
                  </button>
                </>
              )}

              {invoice.status === 'issued' && (
                <button
                  type="button"
                  onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#008C35] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00732B]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>ຢືນຢັນວ່າຈ່າຍແລ້ວ (Mark Paid)</span>
                </button>
              )}

              {invoice.status === 'paid' && (
                <button
                  type="button"
                  onClick={() => updateInvoiceStatus(invoice.id, 'issued')}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  <span>ປ່ຽນເປັນຍັງບໍ່ຈ່າຍ</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDuplicate}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#17241C]/15 px-3 py-1.5 text-xs font-semibold text-[#17241C] hover:bg-[#F7FAF8]"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>ສຳເນົາບິນ</span>
              </button>

              {(invoice.status === 'issued' || invoice.status === 'paid') && (
                <button
                  type="button"
                  onClick={() => setShowVoidModal(true)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>ຍົກເລີກ / ແກ້ໄຂບິນ</span>
                </button>
              )}
            </div>
          </div>

          {/* Original Paper Invoice Preview Card */}
          <div className="rounded-[20px] bg-white p-2 sm:p-4 shadow-xs border border-[#17241C]/8 overflow-x-auto">
            <OriginalPaperInvoice invoice={invoice} settings={settings} innerRef={paperRef} />
          </div>

          {/* Feedback message */}
          {feedback && (
            <div
              role="status"
              className="rounded-xl bg-[#EAF8EE] px-4 py-2.5 text-xs sm:text-sm font-medium text-[#008C35]"
            >
              {feedback}
            </div>
          )}

          {/* Share Format Toggle + 4 Action Buttons matching Screen 4 mockup (PDF, ຮູບພາບ, ພິມ, WhatsApp) */}
          <div className="rounded-[20px] bg-white p-4 shadow-xs border border-[#17241C]/8 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#17241C]/70">
              <span>ຮູບແບບໄຟລ໌ສຳລັບ WhatsApp:</span>
              <div className="inline-flex rounded-lg bg-[#F7FAF8] p-0.5 border border-[#17241C]/10">
                <button
                  type="button"
                  onClick={() => setShareFormat('pdf')}
                  className={`min-h-[32px] rounded-md px-3 text-xs font-semibold transition ${
                    shareFormat === 'pdf' ? 'bg-white text-[#008C35] shadow-xs' : 'text-[#17241C]/65'
                  }`}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShareFormat('png')}
                  className={`min-h-[32px] rounded-md px-3 text-xs font-semibold transition ${
                    shareFormat === 'png' ? 'bg-white text-[#008C35] shadow-xs' : 'text-[#17241C]/65'
                  }`}
                >
                  PNG
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={busyAction !== null}
                className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#17241C]/12 bg-[#F7FAF8] px-2 py-2.5 text-xs font-bold text-[#17241C] transition hover:border-[#008C35]/40 hover:bg-[#EAF8EE]/60 disabled:opacity-60"
              >
                <FileDown className="h-5 w-5 text-[#008C35]" />
                <span>{busyAction === 'pdf' ? '...' : 'PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportPng}
                disabled={busyAction !== null}
                className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#17241C]/12 bg-[#F7FAF8] px-2 py-2.5 text-xs font-bold text-[#17241C] transition hover:border-[#008C35]/40 hover:bg-[#EAF8EE]/60 disabled:opacity-60"
              >
                <ImageIcon className="h-5 w-5 text-[#008C35]" />
                <span>{busyAction === 'png' ? '...' : 'ຮູບພາບ'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#17241C]/12 bg-[#F7FAF8] px-2 py-2.5 text-xs font-bold text-[#17241C] transition hover:border-[#008C35]/40 hover:bg-[#EAF8EE]/60"
              >
                <Printer className="h-5 w-5 text-[#008C35]" />
                <span>ພິມ</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                disabled={busyAction !== null}
                className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-[#008C35] px-2 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#00732B] disabled:opacity-60"
              >
                <MessageCircle className="h-5 w-5" />
                <span>{busyAction === 'whatsapp' ? '...' : 'WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      </AppShell>

      {/* Dedicated Independent Print Component (Hidden on screen, visible ONLY in @media print) */}
      <div id="print-invoice-root" className="hidden print:block">
        <OriginalPaperInvoice invoice={invoice} settings={settings} />
      </div>

      {/* WhatsApp Fallback Modal (when Web Share API file sharing isn't supported) */}
      {shareFallback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wa-fallback-title"
        >
          <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 id="wa-fallback-title" className="text-base font-bold text-[#17241C]">
                ແບ່ງປັນຜ່ານ WhatsApp (Manual Attach)
              </h3>
              <button
                type="button"
                onClick={() => setShareFallback(null)}
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#17241C]/60 hover:bg-[#F7FAF8]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-[#17241C]/80">{shareFallback.message}</p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              {shareFallback.whatsappUrl && (
                <a
                  href={shareFallback.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#008C35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00732B]"
                >
                  <span>ເປີດ WhatsApp ພ້ອມຂໍ້ຄວາມ</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setShareFallback(null)}
                className="min-h-[44px] rounded-xl border border-[#17241C]/15 px-4 py-2 text-sm font-semibold text-[#17241C] hover:bg-[#F7FAF8]"
              >
                ປິດ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controlled Correction / Void Modal */}
      {showVoidModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="void-modal-title"
        >
          <form
            onSubmit={handleVoidSubmit}
            className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 id="void-modal-title" className="text-base font-bold text-[#17241C]">
                ຍົກເລີກ ແລະ ແກ້ໄຂໃບບິນ #{invoice.invoiceNumber}
              </h3>
              <button
                type="button"
                onClick={() => setShowVoidModal(false)}
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#17241C]/60 hover:bg-[#F7FAF8]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-[#17241C]/70">
              ໃບບິນທີ່ອອກແລ້ວຈະຖືກບັນທຶກເປັນ “ຍົກເລີກ (Void)” ເພື່ອຮັກສາປະຫວັດການກວດສອບ ແລະ ສາມາດສ້າງໃບບິນຮ່າງໃໝ່ເພື່ອແກ້ໄຂໄດ້ທັນທີ.
            </p>
            <div>
              <label htmlFor="void-reason" className="block text-xs font-semibold text-[#17241C]/75 mb-1.5">
                ເຫດຜົນການຍົກເລີກ (Void Reason) *
              </label>
              <input
                id="void-reason"
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="ຕົວຢ່າງ: ປ້ອນຈຳນວນຜິດ / ລູກຄ້າປ່ຽນລາຍການ"
                className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3 text-sm text-[#17241C] focus:border-[#008C35] focus:bg-white focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs font-medium text-[#17241C] cursor-pointer">
              <input
                type="checkbox"
                checked={createCorrectedDraft}
                onChange={(e) => setCreateCorrectedDraft(e.target.checked)}
                className="h-4 w-4 accent-[#008C35]"
              />
              <span>ສ້າງໃບບິນຮ່າງໃໝ່ຈາກຂໍ້ມູນເດີມເພື່ອແກ້ໄຂຕໍ່</span>
            </label>

            {voidError && <p className="text-xs font-medium text-rose-700">{voidError}</p>}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowVoidModal(false)}
                className="min-h-[44px] rounded-xl border border-[#17241C]/15 px-4 py-2 text-sm font-semibold text-[#17241C]"
              >
                ຍົກເລີກ
              </button>
              <button
                type="submit"
                className="min-h-[44px] rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                ຢືນຢັນການຍົກເລີກບິນ
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
