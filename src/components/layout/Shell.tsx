import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface ShellProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  title?: string;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ currentPath, onNavigate, title, children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#070D1F] text-slate-900 dark:text-slate-100 antialiased font-sans">
      {/* 1. Sidebar Desktop */}
      <div className="hidden lg:block shrink-0">
        <Sidebar currentPath={currentPath} onNavigate={onNavigate} />
      </div>

      {/* 2. Sidebar Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/80 backdrop-blur-xs">
          <div className="w-72 h-full bg-slate-900 shadow-2xl">
            <Sidebar
              currentPath={currentPath}
              onNavigate={onNavigate}
              isMobile={true}
              onCloseMobile={() => setMobileMenuOpen(false)}
            />
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* 3. Área Principal */}
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          title={title}
          onNavigate={onNavigate}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
