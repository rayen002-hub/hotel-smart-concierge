import React, { useEffect, useState } from 'react';
import { Outlet, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { setClientRoomToken, getClientRoomToken } from '../api/apiClient';

export const RoomLayout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

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
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/40 text-3xl">
            🔒
          </div>
          <h1 className="text-xl font-bold">Accès non autorisé</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Aucun token d'accès chambre détecté. Veuillez scanner le QR code fourni par la réception pour accéder aux services de votre chambre.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-[hsl(var(--primary))]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return <Outlet />;
};
