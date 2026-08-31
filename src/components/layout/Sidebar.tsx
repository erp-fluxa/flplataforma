import React, { useState } from 'react';
import {
  LayoutDashboard, CheckSquare, Wrench,
  Boxes, ShoppingCart, ShoppingBag, Users,
  Settings, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDb } from '../../context/DbContext';
import { SITE_CONFIG } from '../../config/site';
import { clsx } from 'clsx';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  permKey?: string;
  badgeCount?: () => number;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isMobile = false,
  onCloseMobile
}) => {
  const { user, sidebarCollapsed, toggleSidebar, hasPermission } = useAuth();
  const { db } = useDb();

  const isCollapsed = isMobile ? false : sidebarCollapsed;

  const iconeSrc = db.customLogos?.logo_icone || db.company?.logo_icone_url || SITE_CONFIG.defaultLogoIcone;
  const textoSrc = db.customLogos?.logo_texto || db.customLogos?.fluxa || db.company?.logo_texto_url || SITE_CONFIG.defaultLogoTexto;
  const version = db.customLogos?._v || SITE_CONFIG.buildTimestamp;

  const versionedIcone = iconeSrc.startsWith('data:') ? iconeSrc : `${iconeSrc}?v=${version}`;
  const versionedTexto = textoSrc.startsWith('data:') ? textoSrc : `${textoSrc}?v=${version}`;

  const navGroups: NavGroup[] = [
    {
      id: 'principal',
      title: 'Principal',
      items: [
        { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
        {
          path: '/tarefas',
          label: 'Tarefas & Listas',
          icon: <CheckSquare className="w-4 h-4 shrink-0" />,
          badgeCount: () => (db.gescompTasks || []).filter(t => t.userId === user?.id && !t.completed).length
        }
      ]
    },
    {
      id: 'operacional',
      title: 'Operações',
      items: [
        { path: '/producao', label: 'Produção & PCP', icon: <Wrench className="w-4 h-4 shrink-0" /> },
        {
          path: '/estoque',
          label: 'Estoque & Saldos',
          icon: <Boxes className="w-4 h-4 shrink-0" />,
          badgeCount: () => (db.products || []).filter(p => p.ativo && p.tipo_item === 'materia_prima').length
        },
        { path: '/compras', label: 'Compras & RFQ', icon: <ShoppingCart className="w-4 h-4 shrink-0" /> },
        { path: '/comercial', label: 'Comercial & Vendas', icon: <ShoppingBag className="w-4 h-4 shrink-0" /> }
      ]
    },
    {
      id: 'cadastros',
      title: 'Cadastros & Sistema',
      items: [
        { path: '/cadastros', label: 'Central de Cadastros', icon: <Users className="w-4 h-4 shrink-0" /> },
        { path: '/config', label: 'Configurações & Logos', icon: <Settings className="w-4 h-4 shrink-0" /> }
      ]
    }
  ];

  return (
    <aside
      className={clsx(
        'flex flex-col bg-slate-900/95 dark:bg-[#070D1F] border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 select-none z-30',
        isMobile ? 'w-72 h-full' : (isCollapsed ? 'w-18' : 'w-64'),
        'h-screen sticky top-0'
      )}
    >
      {/* 1. Header com Logotipo Adaptativo Inteligente */}
      <div className="px-2 py-2 border-b border-slate-200/60 dark:border-slate-800/80 shrink-0 flex items-center justify-center min-h-[64px]">
        {isCollapsed ? (
          <div
            onClick={() => onNavigate('/')}
            className="flex items-center justify-center w-full cursor-pointer group py-0.5"
            title="Fluxa ERP — Início"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center overflow-hidden p-1.5 group-hover:border-teal-500/60 transition-all shadow-md">
              <img
                src={versionedIcone}
                alt="Fluxa"
                className="w-full h-full object-contain filter drop-shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        ) : (
          <div
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2.5 px-1 py-0.5 cursor-pointer group w-full"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center overflow-hidden p-1.5 shrink-0 group-hover:border-teal-500/60 transition-all shadow-md">
              <img
                src={versionedIcone}
                alt="Fluxa Ícone"
                className="w-full h-full object-contain filter drop-shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <img
                src={versionedTexto}
                alt="Fluxa ERP"
                className="h-8 max-w-[155px] object-contain object-left filter drop-shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-[10.5px] font-mono text-teal-400 font-bold block tracking-tight truncate mt-0.5">
                {SITE_CONFIG.defaultCompanySubtitle}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Menu de Navegação */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 custom-scrollbar">
        {navGroups.map(group => {
          return (
            <div key={group.id} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.title}
                </div>
              )}

              <div className="space-y-0.5">
                {group.items.map(item => {
                  const isActive = currentPath === item.path ||
                    (item.path === '/compras' && (currentPath === '/cotacoes' || currentPath === '/pedidos')) ||
                    (item.path === '/producao' && (currentPath === '/fichas' || currentPath === '/centros-trabalho')) ||
                    (item.path === '/comercial' && (currentPath === '/vendas' || currentPath === '/crm')) ||
                    (item.path === '/cadastros' && (currentPath === '/clientes' || currentPath === '/fornecedores' || currentPath === '/produtos' || currentPath === '/depositos'));
                  const badge = item.badgeCount ? item.badgeCount() : 0;

                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        onNavigate(item.path);
                        if (isMobile && onCloseMobile) onCloseMobile();
                      }}
                      title={isCollapsed ? item.label : undefined}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left relative',
                        isActive
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-900/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      )}
                    >
                      {item.icon}

                      {!isCollapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {badge > 0 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              {badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* 3. Rodapé com Usuário e Botão de Recolher */}
      <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/80 shrink-0 space-y-2">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center font-bold text-teal-300 shrink-0 text-[11px]">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block font-bold text-slate-200 truncate text-[11px]">{user?.name || 'Super Admin'}</span>
              <span className="block text-[9.5px] text-teal-400 truncate font-mono">@{user?.username || 'admin'}</span>
            </div>
          </div>
        )}

        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors text-xs font-bold"
            title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px]">Recolher Barra</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
};
