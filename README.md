# Original Invoice PWA (`ໃບຮັບເງິນ / FACTURE`)

Mobile-first, offline-capable Progressive Web App (PWA) for creating, previewing, printing, exporting (PDF/PNG), and sharing Lao/French bilingual invoices (`ໃບຮັບເງິນ / FACTURE`).

## Key Capabilities

- **Minimal Clean 2026 Design**: Emerald Green (`#008C35`), Light Green (`#EAF8EE`), soft surface cards, `Noto Sans Lao` + `Plus Jakarta Sans` + `JetBrains Mono` typography, mobile bottom navigation with floating `+` Create Invoice button, and responsive desktop sidebar.
- **Faithful Original Paper Invoice (`OriginalPaperInvoice`)**:
  - Bilingual Lao/French headers (`ໃບຮັບເງິນ` / `FACTURE`)
  - Store details, Invoice No. (`ເລກທີ N°`), Date (`ວັນທີ Date`), Customer (`ນາມ M.`)
  - 5-column merchandise table (`ລ/ດ No`, `ລາຍການ Désignation des Marchandises`, `ຈຳນວນ Quantité`, `ລາຄາ Prix`, `ຈຳນວນເງິນ Montant`) with **15 numbered rows (1–15)**
  - Thin dark-blue (`#1B3B82`) table borders on clean off-white paper
  - Receiver (`ຜູ້ຮັບເງິນ / L'encaisseur`), Payer (`ຜູ້ຈ່າຍ / Payer`), and `ລວມເງິນ / TOTAL`
- **Dedicated Print & Exports**:
  - Independent `@media print` A4 print layout (`#print-invoice-root`)
  - High-DPI PNG export (`html-to-image`) preserving Lao Unicode shaping
  - A4 PDF export (`jsPDF`) preserving Lao Unicode rendering
- **WhatsApp Sharing**:
  - Generates PDF or PNG and checks `navigator.canShare({ files })`
  - Opens native share sheet when supported so the user selects WhatsApp manually
  - Falls back cleanly to file download + `wa.me` text-link on unsupported browsers (never claims automatic delivery)
- **Offline-First Storage & PWA**:
  - IndexedDB persistence via **Dexie** (`invoices`, `customers`, `products`, `settings`, `localAccounts`)
  - `vite-plugin-pwa` manifest, Workbox service worker, offline shell, and in-app `PWAInstallButton`
  - JSON Backup Export / Import with Zod validation and single-device storage warning
- **Controlled Invoice Lifecycle**:
  - Explicit statuses: `draft`, `issued`, `paid`, `void`
  - Issued/Paid invoices cannot be silently overwritten; controlled Void & Corrected Draft creation records a void reason

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Scripts

- `npm run dev` — Start Vite dev server on port 3000 (with PWA dev service worker enabled)
- `npm run lint` — Run TypeScript typechecking (`tsc --noEmit`)
- `npm run test` — Run Vitest unit & component tests
- `npm run build` — Build production bundle & PWA service worker (`dist/`)

## Architecture & Known Limitations

- **Local-Only MVP Authentication**: Credentials are hashed locally with Web Crypto SHA-256 + salt in IndexedDB (`localAccounts`) and session state in `localStorage`. Client-side authentication is strictly for single-device convenience and **does not** provide multi-user server security. `src/services/authService.ts` exposes an `AuthProvider` interface ready for future Supabase Auth integration.
- **Single-Device Persistence**: Data lives only in the current browser's IndexedDB. Always export JSON backups regularly from **Settings → ສຳຮອງ/ກູ້ຄືນຂໍ້ມູນ**.
- **Paper Template Confirmation**: Default shop name/address/footer note are flagged as unconfirmed (`paperFieldsConfirmed: false`) until reviewed and confirmed by the shop owner in Settings.
