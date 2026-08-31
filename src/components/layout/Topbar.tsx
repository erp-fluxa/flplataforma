import React, { useState } from 'react';
import { Menu, Bell, Building2, User as UserIcon, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDb } from '../../context/DbContext';
import { Button } from '../ui';

interface TopbarProps {
  onOpenMobileMenu: () => void;
  title?: string;
  onNavigate: (path: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu, title, onNavigate }) => {
  const { user, logout } = useAuth();
  const { db, selecionarEmpresaAtiva } = useDb();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isSuperAdmin = user?.roleId === 'super_admin' || user?.roleId === 'admin' || user?.role?.name?.toLowerCase().includes('admin') || user?.username === 'admin';

  const allActiveCompanies = (db.companies || []).filter(c => c.ativa !== false);
  const baseCompanies = allActiveCompanies.length > 0 ? allActiveCompanies : (db.company ? [db.company] : []);

  const companiesList = isSuperAdmin
    ? baseCompanies
    : baseCompanies.filter(c => !user?.allowedCompanyIds || user.allowedCompanyIds.length === 0 || user.allowedCompanyIds.includes(c.id));

  const currentCompany = companiesList.find(c => c.id === db.currentCompanyId) || db.company || companiesList[0];

  const handleSelectCompany = (companyId: string) => {
    selecionarEmpresaAtiva(companyId);
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 sm:px-6 bg-white/90 dark:bg-[#070D1F]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 rounded-lg lg:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
          {title || 'Painel de Controle'}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Seletor de Unidade / Empresa */}
        {companiesList.length > 1 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Building2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <select
              value={db.currentCompanyId || currentCompany?.id}
              onChange={e => handleSelectCompany(e.target.value)}
              className="bg-transparent border-0 outline-none text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer max-w-[150px] sm:max-w-[220px] truncate"
            >
              {companiesList.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.fantasia || c.nomeFantasia || c.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Menu do Usuário */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-700 text-white font-black text-xs">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-tight">{user?.name}</span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold leading-none">{user?.role?.name || 'Super Admin'}</span>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-extrabold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => { onNavigate('/config'); setShowUserMenu(false); }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <UserIcon className="w-3.5 h-3.5" /> Meu Perfil & Configurações
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sair do Sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
