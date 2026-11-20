import React, { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  DatabaseBackup,
  FileText,
  Hash,
  LogOut,
  Save,
  Store,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PWAInstallButton } from '../components/PWAInstallButton';
import {
  clearAllBusinessData,
  createDefaultSettings,
  db,
  exportDatabaseBackup,
  importDatabaseBackup,
} from '../db/database';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import type { AuthSession, ShopSettings } from '../types/invoice';
import { formatInvoiceNumber } from '../utils/invoiceMath';
import { shopSettingsSchema } from '../utils/validation';

interface SettingsPageProps {
  session: AuthSession | null;
  onSignOut: () => void;
}

type SectionKey = 'shop' | 'numbering' | 'template' | 'backup' | 'pwa';

export const SettingsPage: React.FC<SettingsPageProps> = ({ session, onSignOut }) => {
  const storedSettings = useLiveQuery(() => db.settings.get('default'), []);
  const counts = useLiveQuery(async () => {
    const [invoices, customers, products] = await Promise.all([
      db.invoices.count(),
      db.customers.count(),
      db.products.count(),
    ]);
    return { invoices, customers, products };
  }, []);

  const isOnline = useOnlineStatus();
  const [swActive, setSwActive] = useState<boolean>(false);
  const [openSection, setOpenSection] = useState<SectionKey>('shop');
  const [form, setForm] = useState<ShopSettings>(createDefaultSettings());
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (storedSettings) {
      setForm(storedSettings);
    }
  }, [storedSettings]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        setSwActive(!!reg);
      });
    }
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const parsed = shopSettingsSchema.safeParse(form);
    if (!parsed.success) {
      setMessage({
        type: 'err',
        text: parsed.error.issues[0]?.message ?? 'ຂໍ້ມູນຕັ້ງຄ່າບໍ່ຖືກຕ້ອງ',
      });
      return;
    }

    const updated: ShopSettings = {
      ...form,
      ...parsed.data,
      id: 'default',
      currencyCode: 'LAK',
      currencySymbol: '₭',
      updatedAt: new Date().toISOString(),
    };
    await db.settings.put(updated);
    setMessage({ type: 'ok', text: 'ບັນທຶກການຕັ້ງຄ່າສຳເລັດແລ້ວ (Saved locally)' });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setMessage({ type: 'err', text: 'ຂະໜາດໂລໂກ້ຕ້ອງນ້ອຍກວ່າ 1.5MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, logoDataUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportBackup = async () => {
    const payload = await exportDatabaseBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-pwa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    setMessage({ type: 'ok', text: 'ສົ່ງອອກໄຟລ໌ສຳຮອງຂໍ້ມູນ JSON ສຳເລັດແລ້ວ' });
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = await importDatabaseBackup(json);
      setMessage({
        type: 'ok',
        text: `ກູ້ຄືນຂໍ້ມູນສຳເລັດ: ${result.invoices} ໃບບິນ, ${result.customers} ລູກຄ້າ, ${result.products} ສິນຄ້າ`,
      });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? `ໄຟລ໌ບໍ່ຖືກຕ້ອງ: ${err.message}` : 'ບໍ່ສາມາດນຳເຂົ້າໄຟລ໌ໄດ້',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearAll = async () => {
    await clearAllBusinessData();
    setConfirmReset(false);
    setMessage({ type: 'ok', text: 'ລ້າງຂໍ້ມູນທຸລະກິດໃນເຄື່ອງນີ້ແລ້ວ' });
  };

  const toggleSection = (key: SectionKey) => {
    setOpenSection((prev) => (prev === key ? prev : key));
  };

  return (
    <AppShell title="ຕັ້ງຄ່າລະບົບ" showBack backTo="/" session={session} onSignOut={onSignOut}>
      <form onSubmit={handleSaveSettings} className="space-y-3.5">
        {message && (
          <div
            role="status"
            className={`flex items-center gap-2 rounded-[16px] p-3.5 text-xs sm:text-sm font-medium ${
              message.type === 'ok'
                ? 'bg-[#EAF8EE] text-[#008C35]'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Section 1: Shop Info */}
        <section className="rounded-[20px] bg-white shadow-xs border border-[#17241C]/8 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('shop')}
            className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#F7FAF8]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF8EE] text-[#008C35]">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#17241C]">ຂໍ້ມູນຮ້ານ</h2>
                <p className="text-xs text-[#17241C]/60">ຊື່ຮ້ານ, ທີ່ຢູ່, ເບີໂທ, ໂລໂກ້</p>
              </div>
            </div>
            {openSection === 'shop' ? (
              <ChevronDown className="h-5 w-5 text-[#17241C]/50" />
            ) : (
              <ChevronRight className="h-5 w-5 text-[#17241C]/50" />
            )}
          </button>

          {openSection === 'shop' && (
            <div className="border-t border-[#17241C]/8 p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                  ຊື່ຮ້ານ (Shop Name) *
                </label>
                <input
                  type="text"
                  value={form.shopName}
                  onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                  ຄຳອະທິບາຍຮ້ານ (Subtitle)
                </label>
                <input
                  type="text"
                  value={form.shopSubtitle}
                  onChange={(e) => setForm({ ...form, shopSubtitle: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                    ທີ່ຢູ່ (Address)
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                    ເບີໂທ (Phone)
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3.5 font-mono-num text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17241C]/75 mb-1.5">
                  ໂລໂກ້ຮ້ານ (Optional Logo)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {form.logoDataUrl && (
                    <img
                      src={form.logoDataUrl}
                      alt="Shop logo preview"
                      className="h-14 w-14 rounded-xl object-contain border border-[#17241C]/15 bg-white p-1"
                    />
                  )}
                  <label className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3.5 py-2 text-xs font-semibold text-[#17241C] hover:bg-[#EAF8EE]">
                    <Upload className="h-4 w-4 text-[#008C35]" />
                    <span>ເລືອກຮູບໂລໂກ້</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {form.logoDataUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logoDataUrl: undefined })}
                      className="min-h-[42px] rounded-xl px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      ລຶບໂລໂກ້
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Invoice Numbering */}
        <section className="rounded-[20px] bg-white shadow-xs border border-[#17241C]/8 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('numbering')}
            className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#F7FAF8]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF8EE] text-[#008C35]">
                <Hash className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#17241C]">ເລກບິນ</h2>
                <p className="text-xs text-[#17241C]/60">
                  ຮູບແບບ, ລຳດັບຖັດໄປ:{' '}
                  <span className="font-mono-num font-semibold text-[#008C35]">
                    {formatInvoiceNumber(form.nextInvoiceNumber, form.invoicePrefix, form.invoiceDigits)}
                  </span>
                </p>
              </div>
            </div>
            {openSection === 'numbering' ? (
              <ChevronDown className="h-5 w-5 text-[#17241C]/50" />
            ) : (
              <ChevronRight className="h-5 w-5 text-[#17241C]/50" />
            )}
          </button>

          {openSection === 'numbering' && (
            <div className="border-t border-[#17241C]/8 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                  ຄຳນຳໜ້າ (Prefix)
                </label>
                <input
                  type="text"
                  value={form.invoicePrefix}
                  onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                  placeholder="ເຊັ່ນ: INV-"
                  className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3 font-mono-num text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                  ຈຳນວນຫຼັກ (Digits)
                </label>
                <input
                  type="number"
                  min={3}
                  max={10}
                  value={form.invoiceDigits}
                  onChange={(e) =>
                    setForm({ ...form, invoiceDigits: Math.max(3, Math.min(10, Number(e.target.value) || 6)) })
                  }
                  className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3 font-mono-num text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                  ເລກລຳດັບຖັດໄປ (Next #)
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.nextInvoiceNumber}
                  onChange={(e) =>
                    setForm({ ...form, nextInvoiceNumber: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3 font-mono-num text-sm"
                />
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Original Invoice Template Settings */}
        <section className="rounded-[20px] bg-white shadow-xs border border-[#17241C]/8 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('template')}
            className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#F7FAF8]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF8EE] text-[#008C35]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#17241C]">ຮູບແບບໃບບິນ</h2>
                <p className="text-xs text-[#17241C]/60">Original (ຕາມຕົ້ນສະບັບ), ສະກຸນເງິນ LAK ₭</p>
              </div>
            </div>
            {openSection === 'template' ? (
              <ChevronDown className="h-5 w-5 text-[#17241C]/50" />
            ) : (
              <ChevronRight className="h-5 w-5 text-[#17241C]/50" />
            )}
          </button>

          {openSection === 'template' && (
            <div className="border-t border-[#17241C]/8 p-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                    ສະກຸນເງິນ (Currency)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="ກີບລາວ — LAK (₭)"
                    className="min-h-[44px] w-full rounded-xl border border-[#17241C]/10 bg-[#F7FAF8] px-3 text-sm font-semibold text-[#17241C]/75"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                    ຈຳນວນແຖວຂັ້ນຕ່ຳໃນຕາຕະລາງ (Original = 15)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={30}
                    value={form.rowCount}
                    onChange={(e) =>
                      setForm({ ...form, rowCount: Math.max(15, Math.min(30, Number(e.target.value) || 15)) })
                    }
                    className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3 font-mono-num text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                  ຂໍ້ຄວາມທ້າຍໃບບິນ (Footer Note — ກະລຸນາກວດສອບຕາມຕົ້ນສະບັບ)
                </label>
                <input
                  type="text"
                  value={form.footerNote}
                  onChange={(e) => setForm({ ...form, footerNote: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3.5 text-sm"
                />
              </div>

              <label className="flex items-start gap-2.5 rounded-xl bg-[#EAF8EE] p-3.5 text-xs text-[#17241C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.paperFieldsConfirmed}
                  onChange={(e) => setForm({ ...form, paperFieldsConfirmed: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-[#008C35]"
                />
                <span>
                  ຂ້ອຍໄດ້ກວດສອບ ແລະ ຢືນຢັນຂໍ້ມູນຫົວໃບບິນ (ຊື່ຮ້ານ, ທີ່ຢູ່, ເບີໂທ) ແລະ ຂໍ້ຄວາມທ້າຍບິນໃຫ້ຖືກຕ້ອງຕາມແບບໃບບິນຕົ້ນສະບັບແລ້ວ.
                </span>
              </label>
            </div>
          )}
        </section>

        {/* Save Settings CTA */}
        <button
          type="submit"
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#008C35] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#00732B]"
        >
          <Save className="h-4.5 w-4.5" />
          <span>ບັນທຶກການຕັ້ງຄ່າ</span>
        </button>

        {/* Section 4: Backup & Restore JSON */}
        <section className="rounded-[20px] bg-white shadow-xs border border-[#17241C]/8 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('backup')}
            className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#F7FAF8]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF8EE] text-[#008C35]">
                <DatabaseBackup className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#17241C]">ສຳຮອງ/ກູ້ຄືນຂໍ້ມູນ</h2>
                <p className="text-xs text-[#17241C]/60">Export / Import (JSON)</p>
              </div>
            </div>
            {openSection === 'backup' ? (
              <ChevronDown className="h-5 w-5 text-[#17241C]/50" />
            ) : (
              <ChevronRight className="h-5 w-5 text-[#17241C]/50" />
            )}
          </button>

          {openSection === 'backup' && (
            <div className="border-t border-[#17241C]/8 p-4 space-y-3.5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-700" />
                <div>
                  <p className="font-bold">ຄຳເຕືອນ: ຂໍ້ມູນຖືກເກັບໄວ້ໃນເຄື່ອງນີ້ເຄື່ອງດຽວ (Single-Device Storage)</p>
                  <p className="mt-0.5">
                    ໃບບິນ, ລູກຄ້າ ແລະ ສິນຄ້າທັງໝົດຢູ່ໃນ IndexedDB ຂອງອຸປະກອນນີ້. ຖ້າທ່ານລ້າງຂໍ້ມູນບຣາວເຊີ ຫຼື ປ່ຽນໂທລະສັບ ຂໍ້ມູນຈະຫາຍ ຖ້າບໍ່ໄດ້ສຳຮອງ JSON ໄວ້.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#008C35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00732B]"
                >
                  <DatabaseBackup className="h-4.5 w-4.5" />
                  <span>ສົ່ງອອກ JSON Backup</span>
                </button>

                <label className="inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#008C35]/40 bg-[#EAF8EE] px-4 py-2 text-sm font-semibold text-[#008C35] hover:bg-[#d9f3e1]">
                  <Upload className="h-4.5 w-4.5" />
                  <span>ນຳເຂົ້າ JSON Restore</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-2 border-t border-[#17241C]/8">
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>ລ້າງຂໍ້ມູນທຸລະກິດທັງໝົດໃນເຄື່ອງນີ້</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
                    <span className="font-semibold">ຢືນຢັນການລຶບບິນ, ລູກຄ້າ ແລະ ສິນຄ້າທັງໝົດ?</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="min-h-[36px] rounded-lg bg-rose-600 px-3 font-semibold text-white"
                    >
                      ຢືນຢັນລຶບ
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="min-h-[36px] rounded-lg bg-white px-3 font-semibold text-[#17241C]"
                    >
                      ຍົກເລີກ
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Section 5: PWA / Offline Status */}
        <section className="rounded-[20px] bg-white shadow-xs border border-[#17241C]/8 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('pwa')}
            className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#F7FAF8]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF8EE] text-[#008C35]">
                {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5 text-amber-600" />}
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#17241C]">PWA / Offline</h2>
                <p className="text-xs text-[#17241C]/60">ຕິດຕັ້ງໃນໜ້າຈໍ, ໃຊ້ອອບໄລນ໌</p>
              </div>
            </div>
            {openSection === 'pwa' ? (
              <ChevronDown className="h-5 w-5 text-[#17241C]/50" />
            ) : (
              <ChevronRight className="h-5 w-5 text-[#17241C]/50" />
            )}
          </button>

          {openSection === 'pwa' && (
            <div className="border-t border-[#17241C]/8 p-4 space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-[#F7FAF8] p-3">
                  <p className="text-[#17241C]/60 text-xs">ການເຊື່ອມຕໍ່ (Network)</p>
                  <p className="mt-1 font-bold text-[#17241C]">
                    {isOnline ? 'ອອນໄລນ໌ (Online)' : 'ອອບໄລນ໌ (Offline Ready)'}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F7FAF8] p-3">
                  <p className="text-[#17241C]/60 text-xs">Service Worker</p>
                  <p className="mt-1 font-bold text-[#008C35]">
                    {swActive ? 'ພ້ອມໃຊ້ງານ Offline' : 'ກຳລັງຕິດຕັ້ງ / Preview'}
                  </p>
                </div>
              </div>

              {counts && (
                <div className="rounded-xl bg-[#F7FAF8] p-3 text-xs text-[#17241C]/75 flex flex-wrap gap-x-4 gap-y-1">
                  <span>ໃບບິນ: <strong className="font-mono-num">{counts.invoices}</strong></span>
                  <span>ລູກຄ້າ: <strong className="font-mono-num">{counts.customers}</strong></span>
                  <span>ສິນຄ້າ: <strong className="font-mono-num">{counts.products}</strong></span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <PWAInstallButton />
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <LogOut className="h-4 w-4" />
                  <span>ອອກຈາກລະບົບ (Sign Out)</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </form>
    </AppShell>
  );
};
