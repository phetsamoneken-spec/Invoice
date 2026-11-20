import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OriginalPaperInvoice } from '../components/OriginalPaperInvoice';
import { LoginPage } from '../pages/LoginPage';
import { createDefaultSettings } from '../db/database';
import type { Invoice } from '../types/invoice';

describe('OriginalPaperInvoice component', () => {
  const sampleInvoice: Invoice = {
    id: 'inv_test',
    invoiceNumber: '000123',
    date: '2026-11-19',
    customerName: 'ຮ້ານ ສີສະຫວາດ',
    customerPhone: '020 5511 2233',
    items: [
      {
        id: 'i1',
        description: 'ນ້ຳດື່ມບໍລິສຸດ ແພັກ 12',
        quantity: 10,
        unitPrice: 35000,
        lineTotal: 350000,
      },
      {
        id: 'i2',
        description: 'ເຂົ້າສານຫອມມະລິ',
        quantity: 5,
        unitPrice: 185000,
        lineTotal: 925000,
      },
    ],
    totalAmount: 1275000,
    status: 'issued',
    createdAt: '2026-11-19T00:00:00Z',
    updatedAt: '2026-11-19T00:00:00Z',
  };

  it('preserves Lao/French headings, 5 columns, 15 numbered rows, receiver/payer, and actual customer data', () => {
    const settings = {
      ...createDefaultSettings(),
      shopName: 'ຮ້ານ ພອນໄຊ',
      paperFieldsConfirmed: true,
    };

    const { container } = render(
      <OriginalPaperInvoice invoice={sampleInvoice} settings={settings} />
    );

    expect(screen.getByText('ໃບຮັບເງິນ')).toBeInTheDocument();
    expect(screen.getByText('FACTURE')).toBeInTheDocument();
    expect(screen.getByText('Désignation des Marchandises')).toBeInTheDocument();
    expect(screen.getByText('Quantité')).toBeInTheDocument();
    expect(screen.getByText('Prix')).toBeInTheDocument();
    expect(screen.getByText('Montant')).toBeInTheDocument();
    expect(screen.getByText("L'encaisseur")).toBeInTheDocument();
    expect(screen.getByText('Payer')).toBeInTheDocument();
    expect(screen.getByText('TOTAL')).toBeInTheDocument();

    // Verify 15 numbered rows in tbody
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(15);
    expect(rows[0].querySelector('td')?.textContent?.trim()).toBe('1');
    expect(rows[14].querySelector('td')?.textContent?.trim()).toBe('15');

    // Verify real invoice values (and absence of hardcoded photo items)
    expect(screen.getByText('000123')).toBeInTheDocument();
    expect(screen.getByText('19/11/2026')).toBeInTheDocument();
    expect(screen.getByText('ຮ້ານ ສີສະຫວາດ')).toBeInTheDocument();
    expect(screen.getByText('ນ້ຳດື່ມບໍລິສຸດ ແພັກ 12')).toBeInTheDocument();
    expect(screen.getByText('1,275,000 ₭')).toBeInTheDocument();
  });

  it('displays VOID stamp when invoice is voided', () => {
    const voided: Invoice = { ...sampleInvoice, status: 'void', voidReason: 'Wrong quantity' };
    render(<OriginalPaperInvoice invoice={voided} settings={createDefaultSettings()} />);
    expect(screen.getByText('ຍົກເລີກ / VOID')).toBeInTheDocument();
  });
});

describe('LoginPage accessibility & show/hide password', () => {
  it('toggles password visibility and uses accessible touch controls', () => {
    render(
      <MemoryRouter>
        <LoginPage onAuthenticated={() => {}} />
      </MemoryRouter>
    );

    const pwInput = screen.getByLabelText('ລະຫັດຜ່ານ (Password)') as HTMLInputElement;
    expect(pwInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: 'Show password' });
    fireEvent.click(toggleBtn);
    expect(pwInput.type).toBe('text');
  });
});
