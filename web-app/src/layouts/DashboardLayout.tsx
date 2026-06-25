import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from '../components/layout/AppSidebar';
import { DashboardTopbar } from '../components/layout/DashboardTopbar';

// ── Page metadata per route ───────────────────────────────────────────

const pageMeta: Record<string, { title: string; description: string }> = {
  '/dashboard/reception': {
    title: 'Dashboard Réception',
    description: 'Réservations, chambres, réclamations et QR codes',
  },
  '/dashboard/admin': {
    title: "Console d'Administration",
    description: 'Utilisateurs, chambres, réclamations, logs et configuration',
  },
  '/dashboard/manager': {
    title: 'Dashboard Manager',
    description: 'Réclamations, employés et tâches de ménage',
  },
};

// ── DashboardLayout ───────────────────────────────────────────────────

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const meta = pageMeta[location.pathname] ?? {
    title: 'LoomStay',
    description: 'Plateforme de gestion hôtelière',
  };

  return (
    <div className="min-h-screen flex bg-[hsl(var(--background))]">
      {/* Sidebar */}
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Topbar */}
        <DashboardTopbar
          title={meta.title}
          description={meta.description}
          onMenuOpen={() => setSidebarOpen(true)}
        />

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
