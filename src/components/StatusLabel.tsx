import React from 'react';
import { Ban, CheckCircle2, Clock, FileEdit } from 'lucide-react';
import type { InvoiceStatus } from '../types/invoice';

interface StatusLabelProps {
  status: InvoiceStatus;
}

const STATUS_META: Record<
  InvoiceStatus,
  {
    lao: string;
    en: string;
    textClass: string;
    bgClass: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  draft: {
    lao: 'ຮ່າງ',
    en: 'Draft',
    textClass: 'text-slate-700',
    bgClass: 'bg-slate-100',
    Icon: FileEdit,
  },
  issued: {
    lao: 'ຍັງບໍ່ຈ່າຍ',
    en: 'Issued',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50',
    Icon: Clock,
  },
  paid: {
    lao: 'ຈ່າຍແລ້ວ',
    en: 'Paid',
    textClass: 'text-[#008C35]',
    bgClass: 'bg-[#EAF8EE]',
    Icon: CheckCircle2,
  },
  void: {
    lao: 'ຍົກເລີກ',
    en: 'Void',
    textClass: 'text-rose-700',
    bgClass: 'bg-rose-50',
    Icon: Ban,
  },
};

export const StatusLabel: React.FC<StatusLabelProps> = ({ status }) => {
  const meta = STATUS_META[status];
  const Icon = meta.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${meta.bgClass} ${meta.textClass}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{meta.lao}</span>
    </span>
  );
};

export function getStatusLabelText(status: InvoiceStatus): string {
  const m = STATUS_META[status];
  return `${m.lao} (${m.en})`;
}
