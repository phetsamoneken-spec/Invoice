import React from 'react';
import type { Invoice, ShopSettings } from '../types/invoice';
import { formatDateDMY, formatLAK } from '../utils/invoiceMath';

interface OriginalPaperInvoiceProps {
  invoice: Invoice;
  settings: ShopSettings;
  innerRef?: React.Ref<HTMLDivElement>;
}

/**
 * Faithfully preserves the original Lao/French paper invoice layout:
 * - ໃບຮັບເງິນ / FACTURE bilingual header
 * - Store details, Invoice No (ເລກທີ N°), Date (ວັນທີ Date), Customer (ນາມ M.)
 * - Thin dark-blue (#1B3B82) table borders on off-white/white paper
 * - Original 5-column merchandise table with 15 numbered rows (1..15)
 * - Receiver (ຜູ້ຮັບເງິນ / L'encaisseur), Payer (ຜູ້ຈ່າຍ / Payer), and TOTAL (ລວມເງິນ)
 */
export const OriginalPaperInvoice: React.FC<OriginalPaperInvoiceProps> = ({
  invoice,
  settings,
  innerRef,
}) => {
  const minRows = Math.max(15, settings.rowCount || 15);
  const totalRows = Math.max(minRows, invoice.items.length);
  const rows = Array.from({ length: totalRows }, (_, idx) => invoice.items[idx] ?? null);

  return (
    <div
      ref={innerRef}
      className="paper-invoice-sheet relative mx-auto w-full max-w-[760px] bg-[#FCFDFB] p-4 sm:p-6 text-[#14275C] shadow-sm border border-[#1B3B82]/30"
      style={{
        fontFamily: "'Noto Sans Lao', 'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Void watermark stamp ONLY when invoice status is actually void */}
      {invoice.status === 'void' && (
        <div
          aria-label="Voided Invoice"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <div className="rotate-[-18deg] border-4 border-rose-600/80 px-6 py-2 text-2xl sm:text-4xl font-bold tracking-wider text-rose-600/80 bg-white/75">
            ຍົກເລີກ / VOID
          </div>
        </div>
      )}

      {/* Top Bilingual Header matching Original Paper Scan */}
      <div className="grid grid-cols-12 items-start gap-2 pb-2">
        {/* Left: Store Details */}
        <div className="col-span-5 text-[11px] sm:text-xs leading-snug">
          <div className="flex items-start gap-2">
            {settings.logoDataUrl && (
              <img
                src={settings.logoDataUrl}
                alt={settings.shopName}
                className="h-10 w-10 shrink-0 rounded object-contain border border-[#1B3B82]/20 bg-white p-0.5"
              />
            )}
            <div className="min-w-0">
              <p className="font-bold text-[#14275C] text-xs sm:text-sm break-words">
                ຮ້ານ {settings.shopName}
              </p>
              {settings.shopSubtitle && (
                <p className="text-[10px] sm:text-[11px] text-[#14275C]/85 break-words">
                  {settings.shopSubtitle}
                </p>
              )}
              {settings.address && (
                <p className="text-[10px] sm:text-[11px] text-[#14275C]/85 break-words">
                  {settings.address}
                </p>
              )}
              {settings.phone && (
                <p className="text-[10px] sm:text-[11px] text-[#14275C]/85 tabular-nums">
                  ໂທ / Tél: {settings.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Center: ໃບຮັບເງິນ / FACTURE */}
        <div className="col-span-4 text-center pt-0.5">
          <h2 className="text-base sm:text-xl font-bold tracking-tight text-[#14275C] leading-tight">
            ໃບຮັບເງິນ
          </h2>
          <p className="text-xs sm:text-sm font-bold tracking-[0.14em] text-[#14275C]">
            FACTURE
          </p>
        </div>

        {/* Right: Invoice No & Date */}
        <div className="col-span-3 text-right text-[10px] sm:text-xs leading-relaxed">
          <div className="border-b border-dotted border-[#1B3B82]/60 pb-0.5">
            <span className="font-medium">ເລກທີ N° </span>
            <span className="font-mono-num font-bold text-[#14275C]">
              {invoice.invoiceNumber}
            </span>
          </div>
          <div className="mt-1 border-b border-dotted border-[#1B3B82]/60 pb-0.5">
            <span className="font-medium">ວັນທີ Date </span>
            <span className="font-mono-num font-semibold text-[#14275C]">
              {formatDateDMY(invoice.date)}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Name Line (ນາມ M.) */}
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2 border-b border-dotted border-[#1B3B82]/65 pb-1 text-xs sm:text-sm">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-semibold shrink-0">ນາມ M.</span>
          <span className="font-semibold text-[#0F1E4A] break-words">
            {invoice.customerName || '........................................'}
          </span>
        </div>
        {invoice.customerPhone && (
          <div className="text-[11px] sm:text-xs text-[#14275C]/85 tabular-nums shrink-0">
            ໂທ: {invoice.customerPhone}
          </div>
        )}
      </div>

      {/* Original 5-Column Merchandise Table with 15 Numbered Rows */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-[#1B3B82] text-[11px] sm:text-xs">
          <thead>
            <tr className="bg-[#F4F7FC] text-[#14275C]">
              <th className="w-[8%] border border-[#1B3B82] px-1 py-1.5 text-center font-semibold leading-tight">
                <div>ລ/ດ</div>
                <div className="text-[9px] sm:text-[10px] font-medium">No</div>
              </th>
              <th className="w-[44%] border border-[#1B3B82] px-2 py-1.5 text-center font-semibold leading-tight">
                <div>ລາຍການ</div>
                <div className="text-[9px] sm:text-[10px] font-medium">
                  Désignation des Marchandises
                </div>
              </th>
              <th className="w-[12%] border border-[#1B3B82] px-1.5 py-1.5 text-center font-semibold leading-tight">
                <div>ຈຳນວນ</div>
                <div className="text-[9px] sm:text-[10px] font-medium">Quantité</div>
              </th>
              <th className="w-[16%] border border-[#1B3B82] px-1.5 py-1.5 text-center font-semibold leading-tight">
                <div>ລາຄາ</div>
                <div className="text-[9px] sm:text-[10px] font-medium">Prix</div>
              </th>
              <th className="w-[20%] border border-[#1B3B82] px-1.5 py-1.5 text-center font-semibold leading-tight">
                <div>ຈຳນວນເງິນ</div>
                <div className="text-[9px] sm:text-[10px] font-medium">Montant</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, idx) => (
              <tr key={item?.id ?? `empty-${idx + 1}`} className="h-[24px] sm:h-[26px]">
                <td className="border border-[#1B3B82] px-1 py-0.5 text-center font-mono-num text-[11px]">
                  {idx + 1}
                </td>
                <td className="border border-[#1B3B82] px-2 py-0.5 text-left text-[#0F1E4A] break-words">
                  {item ? item.description : ''}
                </td>
                <td className="border border-[#1B3B82] px-1.5 py-0.5 text-center font-mono-num text-[#0F1E4A]">
                  {item ? formatLAK(item.quantity) : ''}
                </td>
                <td className="border border-[#1B3B82] px-1.5 py-0.5 text-right font-mono-num text-[#0F1E4A]">
                  {item ? formatLAK(item.unitPrice) : ''}
                </td>
                <td className="border border-[#1B3B82] px-1.5 py-0.5 text-right font-mono-num font-medium text-[#0F1E4A]">
                  {item ? formatLAK(item.lineTotal) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer: Receiver, Payer & TOTAL Box */}
      <div className="mt-3 grid grid-cols-12 items-end gap-2">
        {/* Receiver / L'encaisseur */}
        <div className="col-span-4 text-center text-[10px] sm:text-xs">
          <div className="font-semibold text-[#14275C]">{settings.receiverLabelLao}</div>
          <div className="text-[9px] sm:text-[10px] text-[#14275C]/80">
            {settings.receiverLabelFr}
          </div>
          <div className="mt-6 border-b border-dotted border-[#1B3B82]/70 mx-2" />
        </div>

        {/* Payer */}
        <div className="col-span-3 text-center text-[10px] sm:text-xs">
          <div className="font-semibold text-[#14275C]">{settings.payerLabelLao}</div>
          <div className="text-[9px] sm:text-[10px] text-[#14275C]/80">
            {settings.payerLabelFr}
          </div>
          <div className="mt-6 border-b border-dotted border-[#1B3B82]/70 mx-2" />
        </div>

        {/* TOTAL Box */}
        <div className="col-span-5 flex flex-col items-end">
          <div className="flex w-full items-stretch border border-[#1B3B82] bg-[#F4F7FC]">
            <div className="flex flex-col justify-center border-r border-[#1B3B82] px-2 py-1 text-left leading-tight">
              <span className="text-[10px] sm:text-xs font-bold text-[#14275C]">ລວມເງິນ</span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-[#14275C]">
                TOTAL
              </span>
            </div>
            <div className="flex flex-1 items-center justify-end bg-white px-2.5 py-1.5 text-right font-mono-num text-xs sm:text-sm font-bold text-[#0F1E4A]">
              {formatLAK(invoice.totalAmount)} {settings.currencySymbol}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Polite Note */}
      {settings.footerNote && (
        <div className="mt-3 text-right text-[10px] sm:text-[11px] italic text-[#14275C]/80">
          {settings.footerNote}
        </div>
      )}
    </div>
  );
};
