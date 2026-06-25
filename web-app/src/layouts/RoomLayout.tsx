import React, { useEffect, useState } from 'react';
import { Outlet, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { setClientRoomToken, getClientRoomToken } from '../api/apiClient';
import { PwaInstallBanner } from '../components/PwaInstallBanner';
import { RoomNavBar } from '../components/layout/RoomNavBar';

/**
 * Register the service worker only when we're on the /room route.
 * This keeps the PWA install prompt from appearing on admin/staff pages.
 */
function useRoomServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/room' })
        .then((reg) => {
          console.log('[PWA] Service worker registered for /room scope', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        });
    }
  }, []);
}

export const RoomLayout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  // Register SW only for room guests
  useRoomServiceWorker();

  useEffect(() => {
    // 1. Check for ?token= in the URL
    const urlToken = searchParams.get('token');

    if (urlToken) {
      // Store it and strip from URL to keep it clean
      setClientRoomToken(urlToken);
      navigate(location.pathname, { replace: true });
      setReady(true);
      return;
    }

    // 2. Fall back to sessionStorage
    const stored = getClientRoomToken();
    if (stored) {
      setReady(true);
      return;
    }

    // 3. No token at all
    setError(true);
  }, [searchParams, navigate, location.pathname]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[hsl(var(--background))]">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-900/30 text-4xl shadow-inner">
            🔒
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Accès non autorisé</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Aucun token d'accès chambre détecté. Veuillez scanner le QR code fourni par la réception pour accéder aux services de votre chambre.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page content with bottom padding to avoid RoomNavBar overlap */}
      <div className="pb-16">
        <Outlet />
      </div>
      <RoomNavBar />
      <PwaInstallBanner />
    </>
  );
};
