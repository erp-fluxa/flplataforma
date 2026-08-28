import { getDeals, getSalesOrders, getCustomers } from '@/lib/supabase/crm'
import { VendasTabs } from './vendas-tabs'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function VendasPage() {
  const [deals, orders, customers] = await Promise.all([
    getDeals(),
    getSalesOrders(),
    getCustomers()
  ])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Topo */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-teal-400 hover:underline">
              ← Painel Geral
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-slate-400">Comercial</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">CRM, Funil de Vendas & Pedidos Industriais</h1>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="p-8 max-w-7xl mx-auto w-full flex-1">
        <VendasTabs deals={deals} orders={orders} customers={customers} />
      </main>
    </div>
  )
}
