'use client'

import { useState } from 'react'
import { ProductionOrderWithDetails, BomWithItems, WorkCenter } from '@/lib/supabase/production'
import { ProductWithStock } from '@/lib/supabase/products'
import { KanbanView } from './kanban-view'
import { BomView } from './bom-view'
import { NovaOpModal } from './nova-op-modal'

export function ProducaoTabs({
  orders,
  bomList,
  workCenters,
  produtos
}: {
  orders: ProductionOrderWithDetails[]
  bomList: BomWithItems[]
  workCenters: WorkCenter[]
  produtos: ProductWithStock[]
}) {
  const [abaAtiva, setAbaAtiva] = useState<'kanban' | 'bom'>('kanban')
  const [modalNovaOpAberto, setModalNovaOpAberto] = useState(false)

  return (
    <div className="space-y-6">
      {/* Barra de Navegação de Abas */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAbaAtiva('kanban')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              abaAtiva === 'kanban'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            📊 Quadro Kanban Industrial ({orders.length})
          </button>
          <button
            onClick={() => setAbaAtiva('bom')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              abaAtiva === 'bom'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            📋 Fichas Técnicas BOM ({bomList.length})
          </button>
        </div>

        <button
          onClick={() => setModalNovaOpAberto(true)}
          className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2 px-5 rounded-xl transition-all shadow-lg shadow-teal-900/30 flex items-center gap-2 shrink-0"
        >
          <span>⚡</span>
          <span>Nova Ordem de Produção</span>
        </button>
      </div>

      {abaAtiva === 'kanban' ? (
        <KanbanView orders={orders} />
      ) : (
        <BomView bomList={bomList} workCenters={workCenters} />
      )}

      {modalNovaOpAberto && (
        <NovaOpModal produtos={produtos} onClose={() => setModalNovaOpAberto(false)} />
      )}
    </div>
  )
}
