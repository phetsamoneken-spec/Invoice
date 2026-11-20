export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void';

export interface LineItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number; // Integer LAK
  lineTotal: number; // Integer LAK = quantity * unitPrice
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  customerId?: string;
  customerName: string;
  customerPhone: string;
  items: LineItem[];
  totalAmount: number; // Integer LAK
  status: InvoiceStatus;
  notes?: string;
  voidReason?: string;
  correctedFromId?: string;
  createdAt: string;
  updatedAt: string;
  issuedAt?: string;
  paidAt?: string;
  voidedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  unitPrice: number; // Integer LAK
  createdAt: string;
  updatedAt: string;
}

export interface ShopSettings {
  id: 'default';
  shopName: string;
  shopSubtitle: string;
  address: string;
  phone: string;
  logoDataUrl?: string;
  invoicePrefix: string;
  invoiceDigits: number;
  nextInvoiceNumber: number;
  currencyCode: 'LAK';
  currencySymbol: '₭';
  rowCount: number;
  footerNote: string;
  receiverLabelLao: string;
  receiverLabelFr: string;
  payerLabelLao: string;
  payerLabelFr: string;
  paperFieldsConfirmed: boolean;
  updatedAt: string;
}

export interface LocalAccount {
  username: string; // normalized lowercase key
  displayName: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthSession {
  username: string;
  displayName: string;
  loggedInAt: string;
  provider: 'local-mvp' | 'supabase';
}

export interface BackupPayload {
  schemaVersion: 1;
  exportedAt: string;
  app: 'original-invoice-pwa';
  settings: ShopSettings;
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
}
