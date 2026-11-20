import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'ຊື່ຜູ້ໃຊ້ຕ້ອງມີຢ່າງໜ້ອຍ 2 ຕົວອັກສອນ (Username min 2 chars)')
    .max(40, 'ຊື່ຜູ້ໃຊ້ຍາວເກີນໄປ'),
  password: z
    .string()
    .min(4, 'ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 4 ຕົວອັກສອນ (Password min 4 chars)')
    .max(128, 'ລະຫັດຜ່ານຍາວເກີນໄປ'),
  displayName: z.string().trim().max(60).optional(),
});

export const lineItemSchema = z.object({
  id: z.string().min(1),
  productId: z.string().optional(),
  description: z
    .string()
    .trim()
    .min(1, 'ກະລຸນາປ້ອນຊື່ລາຍການສິນຄ້າ (Product name required)')
    .max(160, 'ຊື່ສິນຄ້າຍາວເກີນ 160 ຕົວອັກສອນ'),
  quantity: z
    .number('ຈຳນວນຕ້ອງເປັນຕົວເລກ')
    .int('ຈຳນວນຕ້ອງເປັນເລກຖ້ວນ (Integer quantity required)')
    .min(1, 'ຈຳນວນຕ້ອງ >= 1')
    .max(1_000_000, 'ຈຳນວນສູງເກີນໄປ'),
  unitPrice: z
    .number('ລາຄາຕ້ອງເປັນຕົວເລກ')
    .int('ລາຄາ LAK ຕ້ອງເປັນເລກຖ້ວນ (Integer LAK required)')
    .min(0, 'ລາຄາຕ້ອງ >= 0')
    .max(100_000_000_000, 'ລາຄາສູງເກີນໄປ'),
});

export const invoiceFormSchema = z.object({
  invoiceNumber: z
    .string()
    .trim()
    .min(1, 'ກະລຸນາປ້ອນເລກທີບິນ (Invoice number required)')
    .max(32, 'ເລກທີບິນຍາວເກີນໄປ'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'ຮູບແບບວັນທີບໍ່ຖືກຕ້ອງ (YYYY-MM-DD)'),
  customerId: z.string().optional(),
  customerName: z
    .string()
    .trim()
    .min(1, 'ກະລຸນາປ້ອນຊື່ລູກຄ້າ (Customer name required)')
    .max(120, 'ຊື່ລູກຄ້າຍາວເກີນໄປ'),
  customerPhone: z
    .string()
    .trim()
    .max(32, 'ເບີໂທຍາວເກີນໄປ')
    .default(''),
  notes: z.string().trim().max(400).optional(),
  items: z
    .array(lineItemSchema)
    .min(1, 'ກະລຸນາເພີ່ມຢ່າງໜ້ອຍ 1 ລາຍການສິນຄ້າ (At least 1 line item required)'),
});

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'ກະລຸນາປ້ອນຊື່ລູກຄ້າ (Customer name required)')
    .max(120),
  phone: z.string().trim().max(32).default(''),
  address: z.string().trim().max(240).optional(),
});

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'ກະລຸນາປ້ອນຊື່ສິນຄ້າ (Product name required)')
    .max(160),
  unit: z.string().trim().max(32).default('ອັນ'),
  unitPrice: z
    .number('ລາຄາຕ້ອງເປັນຕົວເລກ')
    .int('ລາຄາ LAK ຕ້ອງເປັນເລກຖ້ວນ')
    .min(0, 'ລາຄາຕ້ອງ >= 0'),
});

export const shopSettingsSchema = z.object({
  shopName: z.string().trim().min(1, 'ກະລຸນາປ້ອນຊື່ຮ້ານ (Shop name required)').max(120),
  shopSubtitle: z.string().trim().max(120).default(''),
  address: z.string().trim().max(240).default(''),
  phone: z.string().trim().max(60).default(''),
  logoDataUrl: z.string().optional(),
  invoicePrefix: z.string().trim().max(12).default(''),
  invoiceDigits: z.number().int().min(3).max(10),
  nextInvoiceNumber: z.number().int().min(1).max(999_999_999),
  rowCount: z.number().int().min(15).max(30),
  footerNote: z.string().trim().max(160).default(''),
  receiverLabelLao: z.string().trim().min(1).max(40),
  receiverLabelFr: z.string().trim().min(1).max(40),
  payerLabelLao: z.string().trim().min(1).max(40),
  payerLabelFr: z.string().trim().min(1).max(40),
  paperFieldsConfirmed: z.boolean(),
});

export const backupPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  app: z.literal('original-invoice-pwa'),
  settings: z.object({
    id: z.literal('default'),
    shopName: z.string(),
    shopSubtitle: z.string().default(''),
    address: z.string(),
    phone: z.string(),
    logoDataUrl: z.string().optional(),
    invoicePrefix: z.string(),
    invoiceDigits: z.number().int(),
    nextInvoiceNumber: z.number().int(),
    currencyCode: z.literal('LAK'),
    currencySymbol: z.literal('₭'),
    rowCount: z.number().int(),
    footerNote: z.string(),
    receiverLabelLao: z.string(),
    receiverLabelFr: z.string(),
    payerLabelLao: z.string(),
    payerLabelFr: z.string(),
    paperFieldsConfirmed: z.boolean(),
    updatedAt: z.string(),
  }),
  customers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      phone: z.string(),
      address: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
  products: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      unit: z.string(),
      unitPrice: z.number().int(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
  invoices: z.array(
    z.object({
      id: z.string(),
      invoiceNumber: z.string(),
      date: z.string(),
      customerId: z.string().optional(),
      customerName: z.string(),
      customerPhone: z.string(),
      items: z.array(
        lineItemSchema.extend({
          lineTotal: z.number().int(),
        })
      ),
      totalAmount: z.number().int(),
      status: z.enum(['draft', 'issued', 'paid', 'void']),
      notes: z.string().optional(),
      voidReason: z.string().optional(),
      correctedFromId: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
      issuedAt: z.string().optional(),
      paidAt: z.string().optional(),
      voidedAt: z.string().optional(),
    })
  ),
});
