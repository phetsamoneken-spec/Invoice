import type { AuthSession, LocalAccount } from '../types/invoice';
import { db, type InvoicePWADatabase } from '../db/database';

const SESSION_STORAGE_KEY = 'original_invoice_pwa_session_v1';

/**
 * Clean AuthProvider contract so the local single-device MVP can later swap to Supabase Auth
 * without rewriting UI screens.
 */
export interface AuthProvider {
  readonly mode: 'local-mvp' | 'supabase';
  getSession(): AuthSession | null;
  signIn(username: string, password: string): Promise<AuthSession>;
  registerLocalAccount(username: string, password: string, displayName?: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  hasAnyLocalAccount(): Promise<boolean>;
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Deterministic fallback for constrained non-secure test environments without crypto.subtle
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function generateSalt(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export class LocalSingleDeviceAuthProvider implements AuthProvider {
  readonly mode = 'local-mvp' as const;
  private database: InvoicePWADatabase;

  constructor(database: InvoicePWADatabase = db) {
    this.database = database;
  }

  getSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthSession;
      if (!parsed || typeof parsed.username !== 'string' || !parsed.username) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async hasAnyLocalAccount(): Promise<boolean> {
    const count = await this.database.localAccounts.count();
    return count > 0;
  }

  async listLocalUsernames(): Promise<Array<{ username: string; displayName: string }>> {
    const rows = await this.database.localAccounts.toArray();
    return rows.map((r) => ({ username: r.username, displayName: r.displayName }));
  }

  async registerLocalAccount(
    username: string,
    password: string,
    displayName?: string
  ): Promise<AuthSession> {
    const normalized = normalizeUsername(username);
    if (normalized.length < 2) {
      throw new Error('ຊື່ຜູ້ໃຊ້ຕ້ອງມີຢ່າງໜ້ອຍ 2 ຕົວອັກສອນ');
    }
    if (password.length < 4) {
      throw new Error('ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 4 ຕົວອັກສອນ');
    }

    const existing = await this.database.localAccounts.get(normalized);
    if (existing) {
      throw new Error('ຊື່ຜູ້ໃຊ້ນີ້ມີຢູ່ໃນເຄື່ອງແລ້ວ (Username already exists locally)');
    }

    const salt = generateSalt();
    const passwordHash = await sha256Hex(`${salt}:${password}`);
    const now = new Date().toISOString();
    const cleanDisplay = (displayName?.trim() || username.trim()).slice(0, 60);

    const account: LocalAccount = {
      username: normalized,
      displayName: cleanDisplay,
      salt,
      passwordHash,
      createdAt: now,
      lastLoginAt: now,
    };
    await this.database.localAccounts.put(account);

    const session: AuthSession = {
      username: normalized,
      displayName: cleanDisplay,
      loggedInAt: now,
      provider: 'local-mvp',
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  async signIn(username: string, password: string): Promise<AuthSession> {
    const normalized = normalizeUsername(username);
    const account = await this.database.localAccounts.get(normalized);
    if (!account) {
      throw new Error('ບໍ່ພົບບັນຊີຜູ້ໃຊ້ນີ້ໃນເຄື່ອງ — ກະລຸນາສ້າງບັນຊີໃໝ່ກ່ອນ (Local account not found)');
    }
    const candidateHash = await sha256Hex(`${account.salt}:${password}`);
    if (candidateHash !== account.passwordHash) {
      throw new Error('ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ (Invalid password)');
    }

    const now = new Date().toISOString();
    await this.database.localAccounts.update(normalized, { lastLoginAt: now });

    const session: AuthSession = {
      username: account.username,
      displayName: account.displayName,
      loggedInAt: now,
      provider: 'local-mvp',
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export const authService = new LocalSingleDeviceAuthProvider();
