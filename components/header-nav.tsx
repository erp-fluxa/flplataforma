'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavProps {
  branding: {
    nome_sistema: string
    logo_sidebar_url: string | null
    logo_plataforma_url: string | null
  }
}

const LINKS = [
  { href: '/', label: 'Visão Geral', icon: '📊' },
  { href: '/estoque', label: 'Estoque & KARDEX', icon: '📦' },
  { href: '/produtos', label: 'Catálogo de Produtos', icon: '🏷️' },
  { href: '/producao', label: 'PCP & Kanban', icon: '⚙️' },
  { href: '/compras', label: 'Compras & RFQ', icon: '🛒' },
  { href: '/vendas', label: 'CRM & Vendas', icon: '🎯' },
  { href: '/usuarios', label: 'Usuários & RBAC', icon: '👥' },
  { href: '/configuracoes', label: 'Branding & Logos', icon: '🎨' },
]

export function HeaderNav({ branding }: NavProps) {
  const pathname = usePathname()
  const [menuMobileAberto, setMenuMobileAberto] = useState(false)

  // Não exibe o header na tela de login
  if (pathname === '/login') return null

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo / Marca do Sistema (Vindo do Supabase SSR) */}
        <Link href="/" className="flex items-center gap-3 group">
          {branding.logo_sidebar_url || branding.logo_plataforma_url ? (
            <img
              src={branding.logo_sidebar_url || branding.logo_plataforma_url!}
              alt={branding.nome_sistema}
              className="h-8 max-w-[140px] object-contain rounded"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center font-black text-teal-400 text-sm">
              FL
            </div>
          )}
          <span className="font-black text-white text-base tracking-tight group-hover:text-teal-400 transition-colors">
            {branding.nome_sistema}
          </span>
        </Link>

        {/* Links Desktop */}
        <nav className="hidden lg:flex items-center gap-1">
          {LINKS.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="text-xs">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Status de Nuvem & Ações */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-950/80 border border-slate-800 rounded-full text-[10px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Supabase Cloud (SSR)</span>
          </div>

          <Link
            href="/login"
            className="text-xs text-slate-400 hover:text-red-400 font-bold transition-colors px-2 py-1"
          >
            Sair
          </Link>

          {/* Botão Mobile */}
          <button
            onClick={() => setMenuMobileAberto(!menuMobileAberto)}
            className="lg:hidden text-slate-400 hover:text-white text-lg p-1.5"
          >
            {menuMobileAberto ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {menuMobileAberto && (
        <div className="lg:hidden pt-4 pb-2 border-t border-slate-800 mt-3 grid grid-cols-2 gap-2">
          {LINKS.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuMobileAberto(false)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
