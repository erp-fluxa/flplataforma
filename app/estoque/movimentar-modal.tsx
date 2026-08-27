'use client'

import { useState } from 'react'
import { createStockMovement, type StockMovementPayload } from '@/app/actions/stock'
import { Warehouse, StockSummaryItem } from '@/lib/supabase/stock'

export function MovimentarModal({
  items,
  warehouses,
  onClose
}: {
  items: StockSummaryItem[]
  warehouses: Warehouse[]
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [form, setForm] = useState<StockMovementPayload>({
    product_id: items[0]?.product_id || '',
    warehouse_id: warehouses[0]?.id || '',
    tipo: 'entrada',
    quantidade: 1,
    observacao: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    const res = await createStockMovement(form)
    setLoading(false)

    if (res.success) {
      onClose()
    } else {
      setErro(res.error || 'Erro ao lançar movimentação')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">Lançar Movimentação de Estoque</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold p-1">
            ✕
          </button>
        </div>

        {erro && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Produto / Item *</label>
            <select
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
            >
              {items.map((i) => (
                <option key={i.product_id} value={i.product_id}>
                  {i.codigo} — {i.descricao} ({i.unidade})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Depósito *</label>
              <select
                value={form.warehouse_id}
                onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Tipo de Movimento *</label>
              <select
                value={form.tipo}
                onChange={(e: any) => setForm({ ...form, tipo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              >
                <option value="entrada">Entrada (+)</option>
                <option value="saida">Saída (-)</option>
                <option value="ajuste">Ajuste de Inventário</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Quantidade *</label>
            <input
              type="number"
              min="0.001"
              step="any"
              required
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Observação / Justificativa</label>
            <input
              type="text"
              value={form.observacao || ''}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              placeholder="Ex: Recebimento de compra, acerto de inventário"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg shadow-teal-900/30 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
