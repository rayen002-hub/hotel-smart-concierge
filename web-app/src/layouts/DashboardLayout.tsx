import React, { useState } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '../components/layout/AppSidebar';
import { DashboardTopbar } from '../components/layout/DashboardTopbar';

// ── Tab labels per route ──────────────────────────────────────────────

const routeMeta: Record<string, { title: string; tabs: Record<string, string> }> = {
  '/dashboard/reception': {
    title: 'Réception',
    tabs: {
      reservations: 'Réservations',
      rooms: 'Chambres',
      fiches: 'Fiches voyageurs',
      complaints: 'Réclamations',
      messages: 'Messages',
      events: 'Événements',
      qr: 'QR Codes',
    },
  },
  '/dashboard/admin': {
    title: 'Administration',
    tabs: {
      users: 'Utilisateurs',
      rooms: 'Chambres',
      complaints: 'Réclamations',
      logs: "Logs d'activité",
      hotel: 'Infos Hôtel',
      currency: 'Devises',
    },
  },
  '/dashboard/manager': {
    title: 'Manager',
    tabs: {
      complaints: 'Réclamations',
      employees: 'Employés',
      housekeeping: 'Ménage',
    },
  },
};

// ── DashboardLayout ───────────────────────────────────────────────────

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const meta = routeMeta[location.pathname];
  const activeTab = searchParams.get('tab') || '';
  const tabLabel = meta?.tabs[activeTab] || '';
  const title = meta ? `${meta.title}${tabLabel ? ` — ${tabLabel}` : ''}` : 'LoomStay';
  const description = 'Plateforme de gestion hôtelière LoomStay';

  return (
    // Full-screen flex row — sidebar is a flex sibling on desktop
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main column (topbar + scrollable content) ─────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Sticky topbar inside the main column — never overlaps sidebar */}
        <DashboardTopbar
          title={title}
          description={description}
          onMenuOpen={() => setSidebarOpen(true)}
        />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
