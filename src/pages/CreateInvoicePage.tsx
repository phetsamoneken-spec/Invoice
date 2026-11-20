import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, Eye, Plus, Save, Trash2, UserPlus } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import {
  db,
  ensureDatabaseInitialized,
  peekNextInvoiceNumber,
  saveInvoiceRecord,
} from '../db/database';
import type { AuthSession, LineItem } from '../types/invoice';
import {
  calculateGrandTotal,
  calculateLineTotal,
  createEntityId,
  formatLAK,
  formatLAKWithSymbol,
  todayISODate,
  toIntegerLAK,
  toIntegerQuantity,
} from '../utils/invoiceMath';
import { invoiceFormSchema } from '../utils/validation';

interface CreateInvoicePageProps {
  session: AuthSession | null;
  onSignOut: () => void;
}

function createEmptyRow(): LineItem {
  return {
    id: createEntityId('item'),
    description: '',
    quantity: 1,
    unitPrice: 0,
    lineTotal: 0,
  };
}

export const CreateInvoicePage: React.FC<CreateInvoicePageProps> = ({ session, onSignOut }) => {
  const { id: editId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), []) ?? [];
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), []) ?? [];

  const [loading, setLoading] = useState(true);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('000001');
  const [date, setDate] = useState(todayISODate());
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saveNewCustomer, setSaveNewCustomer] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([createEmptyRow()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      await ensureDatabaseInitialized();
      if (editId) {
        const existing = await db.invoices.get(editId);
        if (!active) return;
        if (!existing) {
          setBlockedReason('ບໍ່ພົບໃບບິນນີ້ (Invoice not found)');
          setLoading(false);
          return;
        }
        if (existing.status !== 'draft') {
          setBlockedReason(
            'ໃບບິນທີ່ອອກແລ້ວບໍ່ສາມາດແກ້ໄຂໂດຍກົງໄດ້ — ກະລຸນາໃຊ້ການຍົກເລີກ ແລະ ສ້າງໃບບິນແກ້ໄຂໃໝ່ຈາກໜ້າຕົວຢ່າງ'
          );
          setLoading(false);
          return;
        }
        setInvoiceNumber(existing.invoiceNumber);
        setDate(existing.date);
        setCustomerId(existing.customerId ?? '');
        setCustomerName(existing.customerName);
        setCustomerPhone(existing.customerPhone);
        setNotes(existing.notes ?? '');
        setItems(existing.items.length > 0 ? existing.items : [createEmptyRow()]);
      } else {
        const nextNum = await peekNextInvoiceNumber();
        if (!active) return;
        setInvoiceNumber(nextNum);
        const preCustomerId = searchParams.get('customerId');
        if (preCustomerId) {
          const cust = await db.customers.get(preCustomerId);
          if (cust && active) {
            setCustomerId(cust.id);
            setCustomerName(cust.name);
            setCustomerPhone(cust.phone);
          }
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [editId, searchParams]);

  const grandTotal = useMemo(() => calculateGrandTotal(items), [items]);

  const handleSelectCustomer = (selectedId: string) => {
    setCustomerId(selectedId);
    if (!selectedId) {
      return;
    }
    const found = customers.find((c) => c.id === selectedId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setSaveNewCustomer(false);
    }
  };

  const handleSelectProductForRow = (rowIndex: number, selectedProductId: string) => {
    const product = products.find((p) => p.id === selectedProductId);
    setItems((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        if (!product) {
          return { ...row, productId: undefined };
        }
        const unitPrice = toIntegerLAK(product.unitPrice);
        return {
          ...row,
          productId: product.id,
          description: product.name,
          unitPrice,
          lineTotal: calculateLineTotal(row.quantity, unitPrice),
        };
      })
    );
  };

  const updateRowField = (
    rowIndex: number,
    patch: Partial<Pick<LineItem, 'description' | 'quantity' | 'unitPrice'>>
  ) => {
    setItems((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        const nextQty =
          patch.quantity !== undefined ? toIntegerQuantity(patch.quantity) : row.quantity;
        const nextPrice =
          patch.unitPrice !== undefined ? toIntegerLAK(patch.unitPrice) : row.unitPrice;
        return {
          ...row,
          ...patch,
          quantity: nextQty,
          unitPrice: nextPrice,
          lineTotal: calculateLineTotal(nextQty, nextPrice),
        };
      })
    );
  };

  const addRow = () => {
    setItems((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (rowIndex: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return [createEmptyRow()];
      return prev.filter((_, idx) => idx !== rowIndex);
    });
  };

  const persistInvoice = async (targetStatus: 'draft' | 'issued') => {
    setErrors([]);
    const nonEmptyItems = items.filter(
      (r) => r.description.trim() !== '' || r.unitPrice > 0 || items.length === 1
    );

    const candidate = {
      invoiceNumber: invoiceNumber.trim(),
      date,
      customerId: customerId || undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      notes: notes.trim() || undefined,
      items: nonEmptyItems.map((r) => ({
        id: r.id,
        productId: r.productId,
        description: r.description.trim(),
        quantity: r.quantity,
        unitPrice: r.unitPrice,
      })),
    };

    const parsed = invoiceFormSchema.safeParse(candidate);
    if (!parsed.success) {
      const msgs = Array.from(new Set(parsed.error.issues.map((i) => i.message)));
      setErrors(msgs);
      return;
    }

    setSaving(true);
    try {
      let resolvedCustomerId = parsed.data.customerId;
      if (!resolvedCustomerId && saveNewCustomer && parsed.data.customerName) {
        const now = new Date().toISOString();
        const newCustId = createEntityId('cust');
        await db.customers.put({
          id: newCustId,
          name: parsed.data.customerName,
          phone: parsed.data.customerPhone,
          createdAt: now,
          updatedAt: now,
        });
        resolvedCustomerId = newCustId;
      }

      const saved = await saveInvoiceRecord({
        id: editId,
        invoiceNumber: parsed.data.invoiceNumber,
        date: parsed.data.date,
        customerId: resolvedCustomerId,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        notes: parsed.data.notes,
        items: parsed.data.items.map((item) => ({
          ...item,
          lineTotal: calculateLineTotal(item.quantity, item.unitPrice),
        })),
        status: targetStatus,
      });

      if (targetStatus === 'draft') {
        navigate(`/invoices/${saved.id}`);
      } else {
        navigate(`/invoices/${saved.id}`);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'ບໍ່ສາມາດບັນທຶກໃບບິນໄດ້']);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="ສ້າງໃບບິນ" showBack session={session} onSignOut={onSignOut}>
        <div className="rounded-[20px] bg-white p-8 text-center text-sm text-[#17241C]/65">
          ກຳລັງໂຫຼດຂໍ້ມູນ...
        </div>
      </AppShell>
    );
  }

  if (blockedReason) {
    return (
      <AppShell title="ແກ້ໄຂໃບບິນ" showBack session={session} onSignOut={onSignOut}>
        <div className="rounded-[20px] bg-white p-6 shadow-xs border border-[#17241C]/10 space-y-4">
          <div className="flex items-start gap-3 text-amber-800">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{blockedReason}</p>
          </div>
          {editId && (
            <button
              type="button"
              onClick={() => navigate(`/invoices/${editId}`)}
              className="min-h-[44px] rounded-xl bg-[#008C35] px-4 py-2 text-sm font-semibold text-white"
            >
              ໄປທີ່ໜ້າຕົວຢ່າງໃບບິນ
            </button>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={editId ? 'ແກ້ໄຂໃບບິນຮ່າງ' : 'ສ້າງໃບບິນ'}
      showBack
      session={session}
      onSignOut={onSignOut}
      headerRight={
        <button
          type="button"
          onClick={() => persistInvoice('draft')}
          disabled={saving}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 lg:bg-[#EAF8EE] lg:text-[#008C35] lg:hover:bg-[#d9f3e1] whitespace-nowrap"
        >
          <Save className="h-4 w-4" />
          <span>ບັນທຶກຮ່າງ</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* Validation Error Summary */}
        {errors.length > 0 && (
          <div
            role="alert"
            className="rounded-[16px] border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800 space-y-1"
          >
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>ກະລຸນາກວດສອບຂໍ້ມູນ:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Invoice Metadata Card */}
        <section className="rounded-[20px] bg-white p-4 sm:p-5 shadow-xs border border-[#17241C]/8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="inv-number" className="block text-xs font-semibold text-[#17241C]/75 mb-1.5">
                ເລກທີບິນ (Invoice No.)
              </label>
              <input
                id="inv-number"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="min-h-[46px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3.5 font-mono-num text-sm font-semibold text-[#17241C] focus:border-[#008C35] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="inv-date" className="block text-xs font-semibold text-[#17241C]/75 mb-1.5">
                ວັນທີ (Date)
              </label>
              <input
                id="inv-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-[46px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3.5 font-mono-num text-sm text-[#17241C] focus:border-[#008C35] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label htmlFor="cust-select" className="block text-xs font-semibold text-[#17241C]/75 mb-1.5">
                ເລືອກລູກຄ້າຈາກບັນຊີ (Saved Customer)
              </label>
              <select
                id="cust-select"
                value={customerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="min-h-[46px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3.5 text-sm text-[#17241C] focus:border-[#008C35] focus:bg-white focus:outline-none"
              >
                <option value="">-- ປ້ອນຊື່ລູກຄ້າເອງ / ເລືອກລູກຄ້າ --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cust-name" className="block text-xs font-semibold text-[#17241C]/75 mb-1.5">
                ຊື່ລູກຄ້າ (Customer Name) *
              </label>
              <input
                id="cust-name"
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (customerId) setCustomerId('');
                }}
                placeholder="ປ້ອນຊື່ລູກຄ້າ ຫຼື ຊື່ຮ້ານ..."
                className="min-h-[46px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3.5 text-sm text-[#17241C] focus:border-[#008C35] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
            <div>
              <label htmlFor="cust-phone" className="block text-xs font-semibold text-[#17241C]/75 mb-1.5">
                ເບີໂທລູກຄ້າ (Phone — ສຳລັບໃບບິນ/WhatsApp)
              </label>
              <input
                id="cust-phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="020 xxxx xxxx"
                className="min-h-[46px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3.5 font-mono-num text-sm text-[#17241C] focus:border-[#008C35] focus:bg-white focus:outline-none"
              />
            </div>

            {!customerId && customerName.trim().length > 0 && (
              <label className="flex min-h-[46px] items-center gap-2.5 rounded-xl bg-[#EAF8EE] px-3.5 py-2 text-xs font-semibold text-[#008C35] cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveNewCustomer}
                  onChange={(e) => setSaveNewCustomer(e.target.checked)}
                  className="h-4 w-4 accent-[#008C35]"
                />
                <UserPlus className="h-4 w-4 shrink-0" />
                <span>ບັນທຶກລູກຄ້ານີ້ໄວ້ໃນລາຍຊື່ລູກຄ້າ</span>
              </label>
            )}
          </div>
        </section>

        {/* Line Items Section */}
        <section className="rounded-[20px] bg-white p-4 sm:p-5 shadow-xs border border-[#17241C]/8 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#17241C]">ລາຍການສິນຄ້າ (Items)</h2>
            <span className="text-xs text-[#17241C]/60">{items.length} ລາຍການ</span>
          </div>

          <div className="space-y-3">
            {items.map((row, idx) => (
              <div
                key={row.id}
                className="rounded-[16px] border border-[#17241C]/10 bg-[#F7FAF8] p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-num text-xs font-bold text-[#008C35]">
                    ລາຍການທີ {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                    aria-label={`Remove item ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Quick Pick from Product Catalog */}
                {products.length > 0 && (
                  <div>
                    <label
                      htmlFor={`prod-pick-${row.id}`}
                      className="block text-[11px] font-medium text-[#17241C]/60 mb-1"
                    >
                      ເລືອກຈາກລາຍການສິນຄ້າ (ທາງເລືອກ)
                    </label>
                    <select
                      id={`prod-pick-${row.id}`}
                      value={row.productId ?? ''}
                      onChange={(e) => handleSelectProductForRow(idx, e.target.value)}
                      className="min-h-[42px] w-full rounded-xl border border-[#17241C]/15 bg-white px-3 text-xs sm:text-sm text-[#17241C] focus:border-[#008C35] focus:outline-none"
                    >
                      <option value="">-- ເລືອກສິນຄ້າ ຫຼື ພິມເອງດ້ານລຸ່ມ --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatLAKWithSymbol(p.unitPrice)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label
                    htmlFor={`desc-${row.id}`}
                    className="block text-[11px] font-medium text-[#17241C]/70 mb-1"
                  >
                    ຊື່ສິນຄ້າ / ລາຍການ (Description) *
                  </label>
                  <input
                    id={`desc-${row.id}`}
                    type="text"
                    value={row.description}
                    onChange={(e) => updateRowField(idx, { description: e.target.value })}
                    placeholder="ຊື່ສິນຄ້າ..."
                    className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-white px-3 text-sm text-[#17241C] focus:border-[#008C35] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-12 gap-2.5 items-end">
                  <div className="col-span-4 sm:col-span-3">
                    <label
                      htmlFor={`qty-${row.id}`}
                      className="block text-[11px] font-medium text-[#17241C]/70 mb-1"
                    >
                      ຈຳນວນ (Qty)
                    </label>
                    <input
                      id={`qty-${row.id}`}
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={row.quantity}
                      onChange={(e) =>
                        updateRowField(idx, { quantity: toIntegerQuantity(e.target.value) })
                      }
                      className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-white px-2.5 text-center font-mono-num text-sm font-semibold text-[#17241C] focus:border-[#008C35] focus:outline-none"
                    />
                  </div>

                  <div className="col-span-8 sm:col-span-5">
                    <label
                      htmlFor={`price-${row.id}`}
                      className="block text-[11px] font-medium text-[#17241C]/70 mb-1"
                    >
                      ລາຄາຕໍ່ໜ່ວຍ (LAK ₭)
                    </label>
                    <input
                      id={`price-${row.id}`}
                      type="number"
                      min={0}
                      step={1000}
                      inputMode="numeric"
                      value={row.unitPrice}
                      onChange={(e) =>
                        updateRowField(idx, { unitPrice: toIntegerLAK(e.target.value) })
                      }
                      className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-white px-3 text-right font-mono-num text-sm font-semibold text-[#17241C] focus:border-[#008C35] focus:outline-none"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-4 flex items-center justify-between sm:block rounded-xl bg-white px-3 py-2 border border-[#17241C]/8">
                    <span className="text-[11px] font-medium text-[#17241C]/60">ຍອດເງິນ (Total)</span>
                    <p className="font-mono-num text-sm font-bold text-[#008C35] sm:mt-0.5">
                      {formatLAK(row.lineTotal)} ₭
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#008C35]/50 bg-[#EAF8EE]/60 px-4 py-2.5 text-sm font-semibold text-[#008C35] transition hover:bg-[#EAF8EE]"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>ເພີ່ມລາຍການ (+ Add Row)</span>
          </button>
        </section>

        {/* Notes + Grand Total + Primary Actions */}
        <section className="rounded-[20px] bg-white p-4 sm:p-5 shadow-xs border border-[#17241C]/8 space-y-4">
          <div>
            <label htmlFor="inv-notes" className="block text-xs font-semibold text-[#17241C]/75 mb-1.5">
              ໝາຍເຫດ (Notes — ທາງເລືອກ)
            </label>
            <input
              id="inv-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ບັນທຶກເພີ່ມເຕີມ..."
              className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3.5 text-sm text-[#17241C] focus:border-[#008C35] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between border-t border-[#17241C]/10 pt-4">
            <span className="text-base font-bold text-[#17241C]">ລວມເງິນ (Grand Total)</span>
            <span className="font-mono-num text-2xl font-bold text-[#008C35]">
              {formatLAKWithSymbol(grandTotal)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => persistInvoice('draft')}
              disabled={saving}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-4 py-3 text-sm font-bold text-[#17241C] transition hover:bg-[#EAF8EE]/60 disabled:opacity-60"
            >
              <Save className="h-4.5 w-4.5" />
              <span>ບັນທຶກຮ່າງ (Save Draft)</span>
            </button>

            <button
              type="button"
              onClick={() => persistInvoice('issued')}
              disabled={saving}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#008C35] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#00732B] active:scale-[0.99] disabled:opacity-60"
            >
              <Eye className="h-4.5 w-4.5" />
              <span>ສະແດງຕົວຢ່າງ (Preview)</span>
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
};
