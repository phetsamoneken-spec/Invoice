import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Edit2, Package, Plus, Search, Trash2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { db } from '../db/database';
import type { AuthSession, Product } from '../types/invoice';
import { createEntityId, formatLAKWithSymbol, toIntegerLAK } from '../utils/invoiceMath';
import { productSchema } from '../utils/validation';

interface ProductsPageProps {
  session: AuthSession | null;
  onSignOut: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ session, onSignOut }) => {
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), []) ?? [];
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('ອັນ');
  const [unitPrice, setUnitPrice] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => `${p.name} ${p.unit}`.toLowerCase().includes(q));
  }, [products, search]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setUnit('ອັນ');
    setUnitPrice(0);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setUnit(p.unit);
    setUnitPrice(p.unitPrice);
    setError(null);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = productSchema.safeParse({
      name,
      unit,
      unitPrice: toIntegerLAK(unitPrice),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ຂໍ້ມູນສິນຄ້າບໍ່ຖືກຕ້ອງ');
      return;
    }
    const now = new Date().toISOString();
    await db.products.put({
      id: editing?.id ?? createEntityId('prod'),
      name: parsed.data.name,
      unit: parsed.data.unit || 'ອັນ',
      unitPrice: parsed.data.unitPrice,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await db.products.delete(id);
  };

  return (
    <AppShell
      title="ລາຍການສິນຄ້າ (Catalog)"
      showBack
      backTo="/"
      session={session}
      onSignOut={onSignOut}
      headerRight={
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 lg:bg-[#008C35] lg:hover:bg-[#00732B] whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>ເພີ່ມສິນຄ້າ</span>
        </button>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#17241C]/45" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ຄົ້ນຫາຊື່ສິນຄ້າ..."
            className="min-h-[46px] w-full rounded-2xl border border-[#17241C]/12 bg-white pl-10 pr-4 text-sm text-[#17241C] shadow-xs focus:border-[#008C35] focus:outline-none"
          />
        </div>

        {showForm && (
          <form
            onSubmit={handleSave}
            className="rounded-[20px] bg-white p-4 sm:p-5 shadow-xs border border-[#008C35]/30 space-y-3"
          >
            <h2 className="text-sm font-bold text-[#17241C]">
              {editing ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າໃໝ່'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                  ຊື່ສິນຄ້າ *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                  ຫົວໜ່ວຍ (Unit)
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                ລາຄາຂາຍ (LAK ₭ — Integer) *
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                inputMode="numeric"
                value={unitPrice}
                onChange={(e) => setUnitPrice(toIntegerLAK(e.target.value))}
                className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3 font-mono-num text-sm"
              />
            </div>
            {error && <p className="text-xs font-medium text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="min-h-[42px] rounded-xl border border-[#17241C]/15 px-4 text-xs font-semibold"
              >
                ຍົກເລີກ
              </button>
              <button
                type="submit"
                className="min-h-[42px] rounded-xl bg-[#008C35] px-4 text-xs font-semibold text-white"
              >
                ບັນທຶກ
              </button>
            </div>
          </form>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-[20px] bg-white p-8 text-center text-sm text-[#17241C]/65 border border-[#17241C]/8">
            ຍັງບໍ່ມີສິນຄ້າໃນລາຍການ
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((prod) => (
              <div
                key={prod.id}
                className="flex items-center justify-between gap-3 rounded-[18px] bg-white p-4 shadow-xs border border-[#17241C]/8"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF8EE] text-[#008C35]">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#17241C] truncate">{prod.name}</h3>
                    <p className="mt-0.5 text-xs text-[#17241C]/60">
                      ຫົວໜ່ວຍ: {prod.unit} ·{' '}
                      <span className="font-mono-num font-bold text-[#008C35]">
                        {formatLAKWithSymbol(prod.unitPrice)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(prod)}
                    className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-[#17241C]/65 hover:bg-[#F7FAF8]"
                    aria-label={`Edit ${prod.name}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(prod.id)}
                    className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                    aria-label={`Delete ${prod.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};
