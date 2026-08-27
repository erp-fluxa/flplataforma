'use client'

import { useState } from 'react'
import { BomWithItems, WorkCenter } from '@/lib/supabase/production'

export function BomView({
  bomList,
  workCenters
}: {
  bomList: BomWithItems[]
  workCenters: WorkCenter[]
}) {
  const [expandidoId, setExpandidoId] = useState<string | null>(bomList[0]?.id || null)

  return (
    <div className="space-y-8">
      {/* Centros de Trabalho */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-sm text-white">🏭 Postos Operacionais & Centros de Trabalho</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workCenters.map((wc) => (
            <div key={wc.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-teal-400 font-mono">{wc.id}</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
                  Ativo
                </span>
              </div>
              <h4 className="font-bold text-xs text-white">{wc.nome}</h4>
              <p className="text-[11px] text-slate-400">
                Capacidade: <b className="text-slate-200">{wc.capacidade_hora_dia}h/dia</b> · Custo: <b className="text-slate-200">R$ {(wc.custo_hora / 100).toFixed(2)}/h</b>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de Fichas Técnicas */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-white">📋 Fichas Técnicas de Engenharia (BOM Ativas)</h3>

        {bomList.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
            Nenhuma ficha técnica cadastrada.
          </div>
        ) : (
          bomList.map((bom) => {
            const isExpandido = expandidoId === bom.id

            return (
              <div
                key={bom.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
              >
                <div
                  onClick={() => setExpandidoId(isExpandido ? null : bom.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-800/50 flex items-center justify-center font-bold text-teal-400 font-mono text-xs">
                      BOM
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {bom.products?.codigo} — {bom.descricao}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Versão: <b className="text-teal-300 font-mono">{bom.versao}</b> · Insumos: <b className="text-white">{bom.items?.length || 0} componentes</b>
                      </p>
                    </div>
                  </div>

                  <span className="text-slate-400 text-xs font-bold font-mono">
                    {isExpandido ? '▲ Recolher' : '▼ Expandir Detalhes'}
                  </span>
                </div>

                {isExpandido && (
                  <div className="p-5 border-t border-slate-800/80 bg-slate-950/40">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Código Insumo</th>
                          <th className="py-2.5 px-3">Descrição do Componente</th>
                          <th className="py-2.5 px-3 text-center">Un.</th>
                          <th className="py-2.5 px-3 text-right">Qtd. Requerida</th>
                          <th className="py-2.5 px-3">Observações / Aplicação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {bom.items?.map((it) => (
                          <tr key={it.id} className="hover:bg-slate-800/20">
                            <td className="py-2.5 px-3 font-bold text-teal-400">
                              {it.products?.codigo}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-white">
                              {it.products?.descricao}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-400">
                              {it.products?.unidade || 'UN'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-white">
                              {it.quantidade}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-400 italic">
                              {it.observacao || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
