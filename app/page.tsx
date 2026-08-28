import { getSystemBranding } from '@/lib/supabase/branding'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const branding = await getSystemBranding()

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          {branding.logo_sidebar_url || branding.logo_institucional_url ? (
            <img
              src={branding.logo_sidebar_url || branding.logo_institucional_url || ''}
              alt="Logo"
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center font-black text-slate-950">
              G
            </div>
          )}
          <span className="font-bold text-white tracking-tight">{branding.nome_sistema}</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/configuracoes"
            className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 font-semibold text-xs py-2 px-4 rounded-xl transition-all flex items-center gap-2"
          >
            <span>⚙️</span>
            <span>Configurar Logotipos</span>
          </Link>
          <Link
            href="/login"
            className="bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 font-semibold text-xs py-2 px-3 rounded-xl transition-all"
          >
            Sair
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="bg-gradient-to-r from-teal-950/40 to-slate-900 border border-teal-800/30 rounded-2xl p-8 shadow-xl">
          <span className="text-[11px] font-black uppercase tracking-widest text-teal-400 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800/50">
            Nova Arquitetura Next.js + Supabase SSR
          </span>
          <h1 className="text-3xl font-black text-white mt-4">
            Painel Geral — {branding.nome_sistema}
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Sistema 100% conectado diretamente ao Supabase. Não há dependência de cache em localStorage para dados corporativos. Qualquer alteração de logo ou dado nesta base reflete em tempo real em todos os celulares e computadores.
          </p>
        </div>

        {/* Módulos do Sistema Migrados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/vendas"
            className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-pink-700/60 rounded-2xl p-6 space-y-3 transition-all shadow-lg hover:shadow-pink-950/20"
          >
            <div className="w-10 h-10 rounded-xl bg-pink-950 border border-pink-800/50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              🎯
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white group-hover:text-pink-300 transition-colors">
                CRM & Vendas
              </h3>
              <span className="text-xs text-pink-400 font-bold">Acessar →</span>
            </div>
            <p className="text-xs text-slate-400">
              Funil comercial de leads em 5 etapas, clientes e pedidos de venda industriais (PV).
            </p>
          </Link>

          <Link
            href="/compras"
            className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-700/60 rounded-2xl p-6 space-y-3 transition-all shadow-lg hover:shadow-emerald-950/20"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              🛒
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white group-hover:text-emerald-300 transition-colors">
                Compras & Cotações RFQ
              </h3>
              <span className="text-xs text-emerald-400 font-bold">Acessar →</span>
            </div>
            <p className="text-xs text-slate-400">
              Fornecedores homologados, requisições internas, mapa de cotação e pedidos de compra.
            </p>
          </Link>

          <Link
            href="/producao"
            className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-700/60 rounded-2xl p-6 space-y-3 transition-all shadow-lg hover:shadow-amber-950/20"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800/50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              ⚙️
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white group-hover:text-amber-300 transition-colors">
                PCP & Kanban
              </h3>
              <span className="text-xs text-amber-400 font-bold">Acessar →</span>
            </div>
            <p className="text-xs text-slate-400">
              Ordens de Produção, Kanban industrial em 5 etapas e Fichas Técnicas (BOM).
            </p>
          </Link>

          <Link
            href="/estoque"
            className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-700/60 rounded-2xl p-6 space-y-3 transition-all shadow-lg hover:shadow-teal-950/20"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-800/50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              📦
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white group-hover:text-teal-300 transition-colors">
                Estoque & Depósitos
              </h3>
              <span className="text-xs text-teal-400 font-bold">Acessar →</span>
            </div>
            <p className="text-xs text-slate-400">
              Controle multi-depósito (Matriz SC e Filial PR), saldos em tempo real e KARDEX.
            </p>
          </Link>

          <Link
            href="/produtos"
            className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-700/60 rounded-2xl p-6 space-y-3 transition-all shadow-lg hover:shadow-cyan-950/20"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              🏷️
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                Catálogo de Produtos
              </h3>
              <span className="text-xs text-cyan-400 font-bold">Acessar →</span>
            </div>
            <p className="text-xs text-slate-400">
              Matérias-Primas (MP), insumos de consumo (MUC) e produtos acabados.
            </p>
          </Link>

          <Link
            href="/usuarios"
            className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-700/60 rounded-2xl p-6 space-y-3 transition-all shadow-lg hover:shadow-indigo-950/20"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800/50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              👥
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                Usuários & Governança
              </h3>
              <span className="text-xs text-indigo-400 font-bold">Acessar →</span>
            </div>
            <p className="text-xs text-slate-400">
              Gestão de colaboradores, credenciais e matriz de permissões de acesso RBAC.
            </p>
          </Link>
        </div>
      </main>
    </div>
  )
}
