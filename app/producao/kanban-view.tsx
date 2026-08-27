'use client'

import { useState } from 'react'
import { ProductionOrderWithDetails } from '@/lib/supabase/production'
import { updateOpStatus } from '@/app/actions/production'

const COLUNAS = [
  { id: 'planejada', titulo: '1. Planejadas', cor: 'border-slate-700 bg-slate-900/60' },
  { id: 'separacao', titulo: '2. Separação (Picking)', cor: 'border-blue-800/60 bg-blue-950/20' },
  { id: 'producao', titulo: '3. Em Fabricação', cor: 'border-amber-800/60 bg-amber-950/20' },
  { id: 'qualidade', titulo: '4. Testes & Qualidade', cor: 'border-purple-800/60 bg-purple-950/20' },
  { id: 'concluida', titulo: '5. Concluídas', cor: 'border-emerald-800/60 bg-emerald-950/20' }
]

export function KanbanView({
  orders
}: {
  orders: ProductionOrderWithDetails[]
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleMudarStatus(
    opId: string,
    novoStatus: 'planejada' | 'separacao' | 'producao' | 'qualidade' | 'concluida' | 'cancelada'
  ) {
    setLoadingId(opId)
    await updateOpStatus(opId, novoStatus)
    setLoadingId(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start min-h-[600px]">
      {COLUNAS.map((col) => {
        const opsDaColuna = orders.filter((o) => o.status === col.id)

        return (
          <div
            key={col.id}
            className={`border rounded-2xl p-4 flex flex-col space-y-3 min-h-[500px] ${col.cor}`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                {col.titulo}
              </h3>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {opsDaColuna.length}
              </span>
            </div>

            <div className="space-y-3 flex-1">
              {opsDaColuna.length === 0 ? (
                <div className="h-32 flex items-center justify-center border border-dashed border-slate-800/80 rounded-xl text-[11px] text-slate-600 text-center p-2">
                  Nenhuma ordem nesta etapa
                </div>
              ) : (
                opsDaColuna.map((op) => (
                  <div
                    key={op.id}
                    className="bg-slate-900 border border-slate-800 hover:border-teal-700/60 rounded-xl p-4 space-y-3 shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono font-bold text-xs text-teal-400">{op.numero}</span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          op.prioridade === 'urgente'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : op.prioridade === 'alta'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {op.prioridade}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-white line-clamp-1">
                        {op.products?.codigo} — {op.products?.descricao}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Quantidade: <b className="text-white font-mono">{op.quantidade} {op.products?.unidade || 'UN'}</b>
                      </p>
                    </div>

                    {/* Empenho de Materiais */}
                    {op.materials && op.materials.length > 0 && (
                      <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/80 text-[10px] space-y-1">
                        <span className="text-slate-400 font-bold block">
                          Insumos ({op.materials.length} itens)
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {op.materials.slice(0, 3).map((m) => (
                            <span
                              key={m.id}
                              className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono text-[9px]"
                            >
                              {m.products?.codigo || 'Item'} ({m.quantidade_necessaria})
                            </span>
                          ))}
                          {op.materials.length > 3 && (
                            <span className="text-slate-500 text-[9px]">
                              +{op.materials.length - 3} mais
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Transição de Etapa */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
                      {col.id === 'planejada' && (
                        <button
                          disabled={loadingId === op.id}
                          onClick={() => handleMudarStatus(op.id, 'separacao')}
                          className="w-full bg-blue-950/80 hover:bg-blue-900 text-blue-200 py-1.5 px-2 rounded-lg font-bold transition-all text-center"
                        >
                          Iniciar Separação →
                        </button>
                      )}

                      {col.id === 'separacao' && (
                        <button
                          disabled={loadingId === op.id}
                          onClick={() => handleMudarStatus(op.id, 'producao')}
                          className="w-full bg-amber-950/80 hover:bg-amber-900 text-amber-200 py-1.5 px-2 rounded-lg font-bold transition-all text-center"
                        >
                          Liberar p/ Montagem →
                        </button>
                      )}

                      {col.id === 'producao' && (
                        <button
                          disabled={loadingId === op.id}
                          onClick={() => handleMudarStatus(op.id, 'qualidade')}
                          className="w-full bg-purple-950/80 hover:bg-purple-900 text-purple-200 py-1.5 px-2 rounded-lg font-bold transition-all text-center"
                        >
                          Enviar p/ Teste 12h →
                        </button>
                      )}

                      {col.id === 'qualidade' && (
                        <button
                          disabled={loadingId === op.id}
                          onClick={() => handleMudarStatus(op.id, 'concluida')}
                          className="w-full bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 py-1.5 px-2 rounded-lg font-bold transition-all text-center"
                        >
                          Aprovar e Concluir ✔
                        </button>
                      )}

                      {col.id === 'concluida' && (
                        <span className="w-full text-center text-emerald-400 font-bold py-1">
                          ✔ Finalizada
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
