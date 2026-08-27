'use client'

import { useState } from 'react'
import { createProductionOrder, type CreateOpPayload } from '@/app/actions/production'
import { ProductWithStock } from '@/lib/supabase/products'

export function NovaOpModal({
  produtos,
  onClose
}: {
  produtos: ProductWithStock[]
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const produtosProduziveis = produtos.filter((p) => p.tipo_item === 'produto_acabado' || p.produzivel)

  const [form, setForm] = useState<CreateOpPayload>({
    product_id: produtosProduziveis[0]?.id || produtos[0]?.id || '',
    quantidade: 1,
    prioridade: 'normal',
    data_prevista_fim: '',
    observacoes: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    const res = await createProductionOrder(form)
    setLoading(false)

    if (res.success) {
      onClose()
    } else {
      setErro(res.error || 'Erro ao emitir Ordem de Produção')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">Nova Ordem de Produção (PCP)</h2>
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
            <label className="block text-slate-400 font-bold uppercase mb-1">Máquina / Produto a Fabricar *</label>
            <select
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
            >
              {produtosProduziveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.descricao}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Quantidade *</label>
              <input
                type="number"
                min="1"
                required
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Prioridade</label>
              <select
                value={form.prioridade}
                onChange={(e: any) => setForm({ ...form, prioridade: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              >
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente 🔥</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Data Prometida de Entrega</label>
            <input
              type="date"
              value={form.data_prevista_fim || ''}
              onChange={(e) => setForm({ ...form, data_prevista_fim: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Observações da Ordem</label>
            <input
              type="text"
              value={form.observacoes || ''}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Ex: Cliente prioritário, pedido #1042"
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
              {loading ? 'Emitindo Ordem...' : 'Emitir Ordem de Produção'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
