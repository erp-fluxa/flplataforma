'use client'

import { useState } from 'react'
import { StockSummaryItem, Warehouse, StockMovement } from '@/lib/supabase/stock'
import { MovimentarModal } from './movimentar-modal'

export function EstoqueView({
  items,
  warehouses,
  movements
}: {
  items: StockSummaryItem[]
  warehouses: Warehouse[]
  movements: StockMovement[]
}) {
  const [abaAtiva, setAbaAtiva] = useState<'saldos' | 'kardex'>('saldos')
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)

  const itensFiltrados = items.filter(
    (i) =>
      i.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      i.descricao.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Barra de Abas e Ações */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAbaAtiva('saldos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              abaAtiva === 'saldos'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            📊 Saldos por Depósito
          </button>
          <button
            onClick={() => setAbaAtiva('kardex')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              abaAtiva === 'kardex'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            📜 Extrato de Movimentações (KARDEX)
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {abaAtiva === 'saldos' && (
            <input
              type="text"
              placeholder="Filtrar produtos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 w-full md:w-60 outline-none focus:border-teal-500"
            />
          )}

          <button
            onClick={() => setModalAberto(true)}
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-lg shadow-teal-900/30 flex items-center gap-2 shrink-0"
          >
            <span>⚡</span>
            <span>Lançar Movimento</span>
          </button>
        </div>
      </div>

      {/* Visão de Saldos */}
      {abaAtiva === 'saldos' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Código SKU</th>
                <th className="py-3.5 px-4">Descrição do Item</th>
                <th className="py-3.5 px-4 text-center">Un.</th>
                {warehouses.map((w) => (
                  <th key={w.id} className="py-3.5 px-4 text-right">
                    {w.nome.split('(')[0]}
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right font-black text-white">Saldo Geral</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5 + warehouses.length} className="py-12 text-center text-slate-500">
                    Nenhum saldo registrado.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{item.codigo}</td>
                    <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                      {item.descricao}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">{item.unidade}</td>
                    {warehouses.map((w) => {
                      const saldoDep = item.saldos_por_deposito.find((s) => s.warehouse_id === w.id)
                      const qtd = saldoDep?.quantidade || 0
                      return (
                        <td key={w.id} className="py-3.5 px-4 text-right font-mono text-slate-300">
                          {qtd > 0 ? qtd : <span className="text-slate-600">0</span>}
                        </td>
                      )
                    })}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-teal-300">
                      {item.total_geral}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'critico'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : item.status === 'atencao'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {item.status === 'critico'
                          ? 'Estoque Baixo'
                          : item.status === 'atencao'
                          ? 'Ponto Reposição'
                          : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Visão KARDEX */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Data/Hora</th>
                <th className="py-3.5 px-4">Produto</th>
                <th className="py-3.5 px-4">Depósito</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4 text-right">Qtd.</th>
                <th className="py-3.5 px-4">Usuário</th>
                <th className="py-3.5 px-4">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Nenhuma movimentação no KARDEX até o momento.
                  </td>
                </tr>
              ) : (
                movements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {new Date(m.criado_em).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {m.products?.codigo} — <span className="font-normal text-slate-300">{m.products?.descricao}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{m.warehouses?.nome}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.sinal > 0
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950 text-red-300 border border-red-800'
                        }`}
                      >
                        {m.tipo.toUpperCase()} ({m.sinal > 0 ? '+' : '-'})
                      </span>
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono font-bold ${
                        m.sinal > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {m.sinal > 0 ? `+${m.quantidade}` : `-${m.quantidade}`} {m.products?.unidade}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{m.usuario_nome}</td>
                    <td className="py-3.5 px-4 text-slate-400 italic">{m.observacao || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <MovimentarModal
          items={items}
          warehouses={warehouses}
          onClose={() => setModalAberto(false)}
        />
      )}
    </div>
  )
}
