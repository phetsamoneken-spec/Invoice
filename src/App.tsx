import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ensureDatabaseInitialized } from './db/database';
import { CreateInvoicePage } from './pages/CreateInvoicePage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { InvoiceHistoryPage } from './pages/InvoiceHistoryPage';
import { InvoicePreviewPage } from './pages/InvoicePreviewPage';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { authService } from './services/authService';
import type { AuthSession } from './types/invoice';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => authService.getSession());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    ensureDatabaseInitialized().finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    await authService.signOut();
    setSession(null);
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F7FAF8] flex items-center justify-center p-4 text-sm font-medium text-[#17241C]/70">
        ກຳລັງເລີ່ມຕົ້ນລະບົບ Offline...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            session ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage onAuthenticated={(s) => setSession(s)} />
            )
          }
        />

        <Route
          path="/"
          element={
            session ? (
              <DashboardPage session={session} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/invoices/new"
          element={
            session ? (
              <CreateInvoicePage session={session} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/invoices/:id/edit"
          element={
            session ? (
              <CreateInvoicePage session={session} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/invoices/:id"
          element={
            session ? (
              <InvoicePreviewPage session={session} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/invoices"
          element={
            session ? (
              <InvoiceHistoryPage session={session} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/customers"
          element={
            session ? (
              <CustomersPage session={session} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/products"
          element={
            session ? (
              <ProductsPage session={session} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/reports"
          element={
            session ? (
              <ReportsPage session={session} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/settings"
          element={
            session ? (
              <SettingsPage session={session} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
