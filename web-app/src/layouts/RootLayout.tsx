import React from 'react';
import { Outlet } from 'react-router-dom';
import { PwaInstallBanner } from '../components/PwaInstallBanner';

export const RootLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight text-primary">Smart Concierge</span>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              Menu
            </span>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
        <Outlet />
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-16 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} Hotel Smart Concierge. All rights reserved.
          </p>
        </div>
      </footer>

      <PwaInstallBanner />
    </div>
  );
};
