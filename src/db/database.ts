import Dexie, { type Table } from 'dexie';
import type {
  BackupPayload,
  Customer,
  Invoice,
  InvoiceStatus,
  LocalAccount,
  Product,
  ShopSettings,
} from '../types/invoice';
import {
  calculateGrandTotal,
  calculateLineTotal,
  createEntityId,
  formatInvoiceNumber,
  todayISODate,
} from '../utils/invoiceMath';
import { backupPayloadSchema } from '../utils/validation';

export class InvoicePWADatabase extends Dexie {
  invoices!: Table<Invoice, string>;
  customers!: Table<Customer, string>;
  products!: Table<Product, string>;
  settings!: Table<ShopSettings, string>;
  localAccounts!: Table<LocalAccount, string>;

  constructor(name = 'OriginalInvoicePWADB') {
    super(name);
    this.version(1).stores({
      invoices: 'id, invoiceNumber, date, customerId, customerName, status, updatedAt',
      customers: 'id, name, phone, updatedAt',
      products: 'id, name, updatedAt',
      settings: 'id',
      localAccounts: 'username',
    });
  }
}

export const db = new InvoicePWADatabase();

export function createDefaultSettings(): ShopSettings {
  const now = new Date().toISOString();
  return {
    id: 'default',
    shopName: 'ຮ້ານຂອງທ່ານ (ກະລຸນາຕັ້ງຊື່ຮ້ານ)',
    shopSubtitle: 'ຈຳໜ່າຍສິນຄ້າທົ່ວໄປ',
    address: 'ນະຄອນຫຼວງວຽງຈັນ (ກະລຸນາຢືນຢັນທີ່ຢູ່)',
    phone: '020 xxxx xxxx',
    logoDataUrl: undefined,
    invoicePrefix: '',
    invoiceDigits: 6,
    nextInvoiceNumber: 1,
    currencyCode: 'LAK',
    currencySymbol: '₭',
    rowCount: 15,
    footerNote: '(ຂອບໃຈທີ່ທ່ານມາໃຊ້ບໍລິການ — ກະລຸນາກວດສອບຂໍ້ຄວາມນີ້)',
    receiverLabelLao: 'ຜູ້ຮັບເງິນ',
    receiverLabelFr: "L'encaisseur",
    payerLabelLao: 'ຜູ້ຈ່າຍ',
    payerLabelFr: 'Payer',
    paperFieldsConfirmed: false,
    updatedAt: now,
  };
}

let seedPromise: Promise<void> | null = null;

export async function ensureDatabaseInitialized(targetDb: InvoicePWADatabase = db): Promise<void> {
  if (targetDb === db && seedPromise) {
    return seedPromise;
  }

  const run = async () => {
    const existingSettings = await targetDb.settings.get('default');
    if (!existingSettings) {
      await targetDb.settings.put(createDefaultSettings());
    }

    const productCount = await targetDb.products.count();
    const customerCount = await targetDb.customers.count();
    const invoiceCount = await targetDb.invoices.count();

    // Seed starter catalog/customers only on a brand-new database so first-run experience is ready
    if (productCount === 0 && customerCount === 0 && invoiceCount === 0) {
      const now = new Date().toISOString();
      const today = todayISODate();

      const starterProducts: Product[] = [
        {
          id: 'prod_sample_1',
          name: 'ນ້ຳດື່ມບໍລິສຸດ (ແພັກ 12 ຕຸກ)',
          unit: 'ແພັກ',
          unitPrice: 35000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prod_sample_2',
          name: 'ເຂົ້າສານຫອມມະລິ 10 ກິໂລ',
          unit: 'ຖົງ',
          unitPrice: 185000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prod_sample_3',
          name: 'ນ້ຳມັນພືດ 1 ລິດ',
          unit: 'ຂວດ',
          unitPrice: 42000,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const starterCustomers: Customer[] = [
        {
          id: 'cust_sample_1',
          name: 'ຮ້ານຄ້າ ດວງໃຈ (ຕົວຢ່າງ)',
          phone: '020 5550 1122',
          address: 'ບ້ານໂພນສີນວນ, ວຽງຈັນ',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'cust_sample_2',
          name: 'ມິນິມາດ ແສງທອງ (ຕົວຢ່າງ)',
          phone: '020 7771 3344',
          address: 'ບ້ານດົງໂດກ, ວຽງຈັນ',
          createdAt: now,
          updatedAt: now,
        },
      ];

      await targetDb.products.bulkPut(starterProducts);
      await targetDb.customers.bulkPut(starterCustomers);

      const sampleItems1 = [
        {
          id: 'item_1',
          productId: 'prod_sample_2',
          description: 'ເຂົ້າສານຫອມມະລິ 10 ກິໂລ',
          quantity: 10,
          unitPrice: 185000,
          lineTotal: calculateLineTotal(10, 185000),
        },
        {
          id: 'item_2',
          productId: 'prod_sample_1',
          description: 'ນ້ຳດື່ມບໍລິສຸດ (ແພັກ 12 ຕຸກ)',
          quantity: 20,
          unitPrice: 35000,
          lineTotal: calculateLineTotal(20, 35000),
        },
      ];

      const sampleInvoice: Invoice = {
        id: 'inv_sample_1',
        invoiceNumber: '000001',
        date: today,
        customerId: 'cust_sample_1',
        customerName: 'ຮ້ານຄ້າ ດວງໃຈ (ຕົວຢ່າງ)',
        customerPhone: '020 5550 1122',
        items: sampleItems1,
        totalAmount: calculateGrandTotal(sampleItems1),
        status: 'paid',
        notes: 'ບິນຕົວຢ່າງເບື້ອງຕົ້ນ (ສາມາດລຶບ ຫຼື ແກ້ໄຂໄດ້ໃນຕັ້ງຄ່າ)',
        createdAt: now,
        updatedAt: now,
        issuedAt: now,
        paidAt: now,
      };

      await targetDb.invoices.put(sampleInvoice);
      await targetDb.settings.update('default', {
        nextInvoiceNumber: 2,
        updatedAt: now,
      });
    }
  };

  if (targetDb === db) {
    seedPromise = run().finally(() => {
      seedPromise = null;
    });
    return seedPromise;
  }
  return run();
}

export async function getSettings(targetDb: InvoicePWADatabase = db): Promise<ShopSettings> {
  await ensureDatabaseInitialized(targetDb);
  const s = await targetDb.settings.get('default');
  return s ?? createDefaultSettings();
}

export async function peekNextInvoiceNumber(targetDb: InvoicePWADatabase = db): Promise<string> {
  const s = await getSettings(targetDb);
  return formatInvoiceNumber(s.nextInvoiceNumber, s.invoicePrefix, s.invoiceDigits);
}

/**
 * Atomically allocates the next sequential invoice number inside a Dexie transaction.
 */
export async function allocateNextInvoiceNumber(targetDb: InvoicePWADatabase = db): Promise<string> {
  return targetDb.transaction('rw', targetDb.settings, async () => {
    const current = (await targetDb.settings.get('default')) ?? createDefaultSettings();
    const formatted = formatInvoiceNumber(
      current.nextInvoiceNumber,
      current.invoicePrefix,
      current.invoiceDigits
    );
    await targetDb.settings.put({
      ...current,
      nextInvoiceNumber: current.nextInvoiceNumber + 1,
      updatedAt: new Date().toISOString(),
    });
    return formatted;
  });
}

/**
 * Ensures if a user manually used a sequential number matching or exceeding nextInvoiceNumber,
 * the counter advances so subsequent invoices don't collide.
 */
export async function syncInvoiceNumberSequence(
  usedInvoiceNumber: string,
  targetDb: InvoicePWADatabase = db
): Promise<void> {
  await targetDb.transaction('rw', targetDb.settings, async () => {
    const current = (await targetDb.settings.get('default')) ?? createDefaultSettings();
    const stripped = current.invoicePrefix
      ? usedInvoiceNumber.startsWith(current.invoicePrefix)
        ? usedInvoiceNumber.slice(current.invoicePrefix.length)
        : usedInvoiceNumber
      : usedInvoiceNumber;
    if (/^\d+$/.test(stripped)) {
      const parsed = Number.parseInt(stripped, 10);
      if (Number.isSafeInteger(parsed) && parsed >= current.nextInvoiceNumber) {
        await targetDb.settings.put({
          ...current,
          nextInvoiceNumber: parsed + 1,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  });
}

export async function saveInvoiceRecord(
  input: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'totalAmount'> & { id?: string },
  targetDb: InvoicePWADatabase = db
): Promise<Invoice> {
  const now = new Date().toISOString();
  const normalizedItems = input.items.map((item) => ({
    ...item,
    quantity: Math.round(item.quantity),
    unitPrice: Math.round(item.unitPrice),
    lineTotal: calculateLineTotal(item.quantity, item.unitPrice),
  }));
  const totalAmount = calculateGrandTotal(normalizedItems);

  const existing = input.id ? await targetDb.invoices.get(input.id) : undefined;
  const record: Invoice = {
    ...input,
    id: existing?.id ?? input.id ?? createEntityId('inv'),
    items: normalizedItems,
    totalAmount,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    issuedAt:
      input.status === 'issued' || input.status === 'paid'
        ? existing?.issuedAt ?? input.issuedAt ?? now
        : existing?.issuedAt,
    paidAt: input.status === 'paid' ? existing?.paidAt ?? input.paidAt ?? now : undefined,
    voidedAt: input.status === 'void' ? existing?.voidedAt ?? input.voidedAt ?? now : undefined,
  };

  await targetDb.invoices.put(record);
  await syncInvoiceNumberSequence(record.invoiceNumber, targetDb);
  return record;
}

export async function updateInvoiceStatus(
  id: string,
  nextStatus: InvoiceStatus,
  voidReason?: string,
  targetDb: InvoicePWADatabase = db
): Promise<Invoice> {
  const existing = await targetDb.invoices.get(id);
  if (!existing) {
    throw new Error('ບໍ່ພົບໃບບິນນີ້ (Invoice not found)');
  }
  const now = new Date().toISOString();
  const updated: Invoice = {
    ...existing,
    status: nextStatus,
    updatedAt: now,
    issuedAt:
      nextStatus === 'issued' || nextStatus === 'paid'
        ? existing.issuedAt ?? now
        : existing.issuedAt,
    paidAt: nextStatus === 'paid' ? now : nextStatus === 'issued' ? undefined : existing.paidAt,
    voidedAt: nextStatus === 'void' ? now : existing.voidedAt,
    voidReason: nextStatus === 'void' ? voidReason ?? existing.voidReason : existing.voidReason,
  };
  await targetDb.invoices.put(updated);
  return updated;
}

export async function duplicateInvoiceAsDraft(
  sourceId: string,
  options: { correctedFromId?: string } = {},
  targetDb: InvoicePWADatabase = db
): Promise<Invoice> {
  const source = await targetDb.invoices.get(sourceId);
  if (!source) {
    throw new Error('ບໍ່ພົບໃບບິນຕົ້ນສະບັບ (Source invoice not found)');
  }
  const nextNumber = await allocateNextInvoiceNumber(targetDb);
  const now = new Date().toISOString();
  const cloned: Invoice = {
    id: createEntityId('inv'),
    invoiceNumber: nextNumber,
    date: todayISODate(),
    customerId: source.customerId,
    customerName: source.customerName,
    customerPhone: source.customerPhone,
    items: source.items.map((item) => ({
      ...item,
      id: createEntityId('item'),
    })),
    totalAmount: source.totalAmount,
    status: 'draft',
    notes: options.correctedFromId
      ? `ແກ້ໄຂຈາກໃບບິນເລກທີ ${source.invoiceNumber}`
      : source.notes,
    correctedFromId: options.correctedFromId,
    createdAt: now,
    updatedAt: now,
  };
  await targetDb.invoices.put(cloned);
  return cloned;
}

/**
 * Controlled correction/void workflow for issued or paid invoices:
 * Marks the original invoice as 'void' with an explicit reason and optionally creates a new draft copy.
 */
export async function voidAndCorrectInvoice(
  invoiceId: string,
  reason: string,
  createCorrectedDraft: boolean,
  targetDb: InvoicePWADatabase = db
): Promise<{ voided: Invoice; correctedDraft?: Invoice }> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error('ກະລຸນາລະບຸເຫດຜົນການຍົກເລີກ (Void reason required)');
  }
  const voided = await updateInvoiceStatus(invoiceId, 'void', trimmedReason, targetDb);
  let correctedDraft: Invoice | undefined;
  if (createCorrectedDraft) {
    correctedDraft = await duplicateInvoiceAsDraft(
      invoiceId,
      { correctedFromId: invoiceId },
      targetDb
    );
  }
  return { voided, correctedDraft };
}

export async function exportDatabaseBackup(
  targetDb: InvoicePWADatabase = db
): Promise<BackupPayload> {
  const [settings, customers, products, invoices] = await Promise.all([
    getSettings(targetDb),
    targetDb.customers.toArray(),
    targetDb.products.toArray(),
    targetDb.invoices.toArray(),
  ]);
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: 'original-invoice-pwa',
    settings,
    customers,
    products,
    invoices,
  };
}

export async function importDatabaseBackup(
  rawJson: unknown,
  targetDb: InvoicePWADatabase = db
): Promise<{ invoices: number; customers: number; products: number }> {
  const parsed = backupPayloadSchema.parse(rawJson);
  await targetDb.transaction(
    'rw',
    targetDb.settings,
    targetDb.customers,
    targetDb.products,
    targetDb.invoices,
    async () => {
      await targetDb.settings.clear();
      await targetDb.customers.clear();
      await targetDb.products.clear();
      await targetDb.invoices.clear();

      await targetDb.settings.put(parsed.settings);
      if (parsed.customers.length > 0) await targetDb.customers.bulkPut(parsed.customers);
      if (parsed.products.length > 0) await targetDb.products.bulkPut(parsed.products);
      if (parsed.invoices.length > 0) await targetDb.invoices.bulkPut(parsed.invoices);
    }
  );
  return {
    invoices: parsed.invoices.length,
    customers: parsed.customers.length,
    products: parsed.products.length,
  };
}

export async function clearAllBusinessData(targetDb: InvoicePWADatabase = db): Promise<void> {
  await targetDb.transaction(
    'rw',
    targetDb.settings,
    targetDb.customers,
    targetDb.products,
    targetDb.invoices,
    async () => {
      await targetDb.invoices.clear();
      await targetDb.customers.clear();
      await targetDb.products.clear();
      await targetDb.settings.put(createDefaultSettings());
    }
  );
}
