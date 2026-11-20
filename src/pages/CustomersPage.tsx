import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Edit2, FilePlus2, Phone, Plus, Search, Trash2, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { db } from '../db/database';
import type { AuthSession, Customer } from '../types/invoice';
import { createEntityId } from '../utils/invoiceMath';
import { customerSchema } from '../utils/validation';

interface CustomersPageProps {
  session: AuthSession | null;
  onSignOut: () => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ session, onSignOut }) => {
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), []) ?? [];
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => `${c.name} ${c.phone} ${c.address ?? ''}`.toLowerCase().includes(q));
  }, [customers, search]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setPhone('');
    setAddress('');
    setError(null);
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setName(c.name);
    setPhone(c.phone);
    setAddress(c.address ?? '');
    setError(null);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = customerSchema.safeParse({ name, phone, address });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ');
      return;
    }
    const now = new Date().toISOString();
    await db.customers.put({
      id: editing?.id ?? createEntityId('cust'),
      name: parsed.data.name,
      phone: parsed.data.phone,
      address: parsed.data.address || undefined,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await db.customers.delete(id);
  };

  return (
    <AppShell
      title="ລູກຄ້າ (Customers)"
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
          <span>ເພີ່ມລູກຄ້າ</span>
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
            placeholder="ຄົ້ນຫາຊື່ລູກຄ້າ ຫຼື ເບີໂທ..."
            className="min-h-[46px] w-full rounded-2xl border border-[#17241C]/12 bg-white pl-10 pr-4 text-sm text-[#17241C] shadow-xs focus:border-[#008C35] focus:outline-none"
          />
        </div>

        {showForm && (
          <form
            onSubmit={handleSave}
            className="rounded-[20px] bg-white p-4 sm:p-5 shadow-xs border border-[#008C35]/30 space-y-3"
          >
            <h2 className="text-sm font-bold text-[#17241C]">
              {editing ? 'ແກ້ໄຂຂໍ້ມູນລູກຄ້າ' : 'ເພີ່ມລູກຄ້າໃໝ່'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                  ຊື່ລູກຄ້າ *
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
                  ເບີໂທ
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3 font-mono-num text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17241C]/75 mb-1">
                ທີ່ຢູ່ (ທາງເລືອກ)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#17241C]/15 bg-[#F7FAF8] px-3 text-sm"
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
            ຍັງບໍ່ມີລູກຄ້າ — ກົດ “ເພີ່ມລູກຄ້າ” ເພື່ອບັນທຶກ
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((cust) => (
              <div
                key={cust.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-white p-4 shadow-xs border border-[#17241C]/8"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF8EE] text-[#008C35]">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#17241C] truncate">{cust.name}</h3>
                    {cust.phone && (
                      <p className="mt-0.5 flex items-center gap-1 font-mono-num text-xs text-[#17241C]/65">
                        <Phone className="h-3 w-3" />
                        <span>{cust.phone}</span>
                      </p>
                    )}
                    {cust.address && (
                      <p className="mt-0.5 text-xs text-[#17241C]/55 truncate">{cust.address}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/invoices/new?customerId=${encodeURIComponent(cust.id)}`}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#EAF8EE] px-3 text-xs font-semibold text-[#008C35] hover:bg-[#d9f3e1]"
                  >
                    <FilePlus2 className="h-3.5 w-3.5" />
                    <span>ອອກບິນ</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEdit(cust)}
                    className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-[#17241C]/65 hover:bg-[#F7FAF8]"
                    aria-label={`Edit ${cust.name}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cust.id)}
                    className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                    aria-label={`Delete ${cust.name}`}
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
