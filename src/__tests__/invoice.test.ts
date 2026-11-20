import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateGrandTotal,
  calculateLineTotal,
  formatDateDMY,
  formatInvoiceNumber,
  formatLAK,
  formatLAKWithSymbol,
  toIntegerLAK,
} from '../utils/invoiceMath';
import {
  invoiceFormSchema,
  loginSchema,
  productSchema,
  shopSettingsSchema,
} from '../utils/validation';
import {
  InvoicePWADatabase,
  allocateNextInvoiceNumber,
  duplicateInvoiceAsDraft,
  ensureDatabaseInitialized,
  exportDatabaseBackup,
  importDatabaseBackup,
  saveInvoiceRecord,
  voidAndCorrectInvoice,
} from '../db/database';
import { LocalSingleDeviceAuthProvider } from '../services/authService';
import { buildWhatsAppFallbackUrl, shareInvoiceViaWhatsApp } from '../utils/exportInvoice';
import type { Invoice } from '../types/invoice';

describe('Invoice integer LAK math & formatting', () => {
  it('computes deterministic integer line totals and grand totals', () => {
    expect(calculateLineTotal(20, 234000)).toBe(4680000);
    expect(calculateLineTotal(20, 210000)).toBe(4200000);
    expect(
      calculateGrandTotal([
        { quantity: 20, unitPrice: 234000 },
        { quantity: 20, unitPrice: 210000 },
      ])
    ).toBe(8880000);
  });

  it('normalizes decimal or negative currency strings to non-negative integer LAK', () => {
    expect(toIntegerLAK('150,000')).toBe(150000);
    expect(toIntegerLAK(-500)).toBe(0);
    expect(toIntegerLAK(1234.6)).toBe(1235);
  });

  it('formats LAK, DD/MM/YYYY dates, and zero-padded invoice numbers', () => {
    expect(formatLAK(8880000)).toBe('8,880,000');
    expect(formatLAKWithSymbol(8880000)).toBe('8,880,000 ₭');
    expect(formatDateDMY('2026-11-19')).toBe('19/11/2026');
    expect(formatInvoiceNumber(1, '', 6)).toBe('000001');
    expect(formatInvoiceNumber(42, 'INV-', 5)).toBe('INV-00042');
  });
});

describe('Zod validation schemas', () => {
  it('rejects empty customer or empty items on invoice form', () => {
    const res = invoiceFormSchema.safeParse({
      invoiceNumber: '000001',
      date: '2026-11-19',
      customerName: '',
      customerPhone: '',
      items: [],
    });
    expect(res.success).toBe(false);
  });

  it('rejects non-integer LAK unit price', () => {
    const res = productSchema.safeParse({
      name: 'ນ້ຳດື່ມ',
      unit: 'ແພັກ',
      unitPrice: 35000.5,
    });
    expect(res.success).toBe(false);
  });

  it('validates login fields without hardcoded passwords', () => {
    expect(loginSchema.safeParse({ username: 'a', password: '123' }).success).toBe(false);
    expect(loginSchema.safeParse({ username: 'ken', password: 'secret-user-pass' }).success).toBe(true);
  });

  it('validates shop settings with minimum 15 rows', () => {
    const res = shopSettingsSchema.safeParse({
      shopName: 'ຮ້ານ ແສງຈັນ',
      shopSubtitle: '',
      address: 'ວຽງຈັນ',
      phone: '020 5555 1234',
      invoicePrefix: '',
      invoiceDigits: 6,
      nextInvoiceNumber: 1,
      rowCount: 15,
      footerNote: 'ຂອບໃຈ',
      receiverLabelLao: 'ຜູ້ຮັບເງິນ',
      receiverLabelFr: "L'encaisseur",
      payerLabelLao: 'ຜູ້ຈ່າຍ',
      payerLabelFr: 'Payer',
      paperFieldsConfirmed: true,
    });
    expect(res.success).toBe(true);
  });
});

describe('IndexedDB persistence, numbering, void/correction, and backup/restore', () => {
  let testDb: InvoicePWADatabase;

  beforeEach(async () => {
    testDb = new InvoicePWADatabase(`TestDB_${Date.now()}_${Math.random()}`);
    await ensureDatabaseInitialized(testDb);
  });

  it('persists drafts and allocates sequential invoice numbers deterministically', async () => {
    const num1 = await allocateNextInvoiceNumber(testDb);
    const num2 = await allocateNextInvoiceNumber(testDb);
    expect(num1).toBe('000002');
    expect(num2).toBe('000003');

    const saved = await saveInvoiceRecord(
      {
        invoiceNumber: num1,
        date: '2026-11-19',
        customerName: 'ລູກຄ້າ ທົດສອບ',
        customerPhone: '020 9999 8888',
        items: [
          {
            id: 'r1',
            description: 'ສິນຄ້າ A',
            quantity: 3,
            unitPrice: 50000,
            lineTotal: 150000,
          },
        ],
        status: 'draft',
      },
      testDb
    );

    const reloaded = await testDb.invoices.get(saved.id);
    expect(reloaded?.totalAmount).toBe(150000);
    expect(reloaded?.status).toBe('draft');
  });

  it('performs controlled void & corrected draft duplication without mutating original amounts', async () => {
    const issued = await saveInvoiceRecord(
      {
        invoiceNumber: '000010',
        date: '2026-11-19',
        customerName: 'ຮ້ານ B',
        customerPhone: '',
        items: [
          {
            id: 'r1',
            description: 'ເຂົ້າສານ',
            quantity: 2,
            unitPrice: 185000,
            lineTotal: 370000,
          },
        ],
        status: 'issued',
      },
      testDb
    );

    const { voided, correctedDraft } = await voidAndCorrectInvoice(
      issued.id,
      'ປ້ອນຈຳນວນຜິດ',
      true,
      testDb
    );

    expect(voided.status).toBe('void');
    expect(voided.voidReason).toBe('ປ້ອນຈຳນວນຜິດ');
    expect(correctedDraft).toBeDefined();
    expect(correctedDraft?.status).toBe('draft');
    expect(correctedDraft?.correctedFromId).toBe(issued.id);
    expect(correctedDraft?.invoiceNumber).not.toBe(issued.invoiceNumber);

    const dup = await duplicateInvoiceAsDraft(issued.id, {}, testDb);
    expect(dup.status).toBe('draft');
    expect(dup.items[0].description).toBe('ເຂົ້າສານ');
  });

  it('exports and restores full JSON backup cleanly', async () => {
    const backup = await exportDatabaseBackup(testDb);
    expect(backup.schemaVersion).toBe(1);
    expect(backup.invoices.length).toBeGreaterThanOrEqual(1);

    await testDb.invoices.clear();
    expect(await testDb.invoices.count()).toBe(0);

    const counts = await importDatabaseBackup(backup, testDb);
    expect(counts.invoices).toBe(backup.invoices.length);
    expect(await testDb.invoices.count()).toBe(backup.invoices.length);
  });
});

describe('Local auth & WhatsApp sharing fallback', () => {
  it('registers local user and rejects wrong password', async () => {
    const authDb = new InvoicePWADatabase(`AuthDB_${Date.now()}_${Math.random()}`);
    localStorage.clear();
    const auth = new LocalSingleDeviceAuthProvider(authDb);

    expect(await auth.hasAnyLocalAccount()).toBe(false);
    const session = await auth.registerLocalAccount('ken_la', 'pass1234', 'Ken');
    expect(session.username).toBe('ken_la');
    expect(await auth.hasAnyLocalAccount()).toBe(true);

    await expect(auth.signIn('ken_la', 'wrong')).rejects.toThrow();
    const ok = await auth.signIn('ken_la', 'pass1234');
    expect(ok.displayName).toBe('Ken');

    await auth.signOut();
    expect(auth.getSession()).toBeNull();
  });

  it('uses download + wa.me text-link fallback when Web Share files API is unsupported', async () => {
    const sampleInvoice: Invoice = {
      id: 'inv_1',
      invoiceNumber: '000001',
      date: '2026-11-19',
      customerName: 'ຮ້ານ A',
      customerPhone: '8562055551111',
      items: [],
      totalAmount: 8880000,
      status: 'issued',
      createdAt: '',
      updatedAt: '',
    };

    const url = buildWhatsAppFallbackUrl(sampleInvoice, 'ຮ້ານຕົວຢ່າງ');
    expect(url).toContain('https://wa.me/8562055551111?text=');
    expect(decodeURIComponent(url)).toContain('000001');

    // Mock anchor download in jsdom
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:mock', writable: true });
      Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, writable: true });
    }

    const res = await shareInvoiceViaWhatsApp({
      invoice: sampleInvoice,
      shopName: 'ຮ້ານຕົວຢ່າງ',
      blob: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
      filename: 'invoice-000001.pdf',
      mimeType: 'application/pdf',
    });

    expect(res.mode).toBe('fallback-download');
    expect(res.whatsappUrl).toContain('https://wa.me/');
    clickSpy.mockRestore();
  });
});
