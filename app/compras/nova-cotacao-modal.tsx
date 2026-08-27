'use client'

import { useState } from 'react'
import { createQuotation, type CreateQuotationPayload } from '@/app/actions/purchases'
import { Supplier } from '@/lib/supabase/purchases'

export function NovaCotacaoModal({
  suppliers,
  onClose
}: {
  suppliers: Supplier[]
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [form, setForm] = useState<CreateQuotationPayload>({
    titulo: '',
    fornecedor_id: suppliers[0]?.id || '',
    solicitante: 'Carlos Compras',
    comprador: 'Carlos Compras',
    prioridade: 'normal',
    prazo: '',
    valor_estimado: 0,
    observacoes: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    const res = await createQuotation(form)
    setLoading(false)

    if (res.success) {
      onClose()
    } else {
      setErro(res.error || 'Erro ao abrir cotação')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">Nova Cotação RFQ</h2>
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
            <label className="block text-slate-400 font-bold uppercase mb-1">Título da Cotação / Pacote *</label>
            <input
              type="text"
              required
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Lote de Guias MGN12 + Motores Nema 23"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Fornecedor Preferencial</label>
              <select
                value={form.fornecedor_id || ''}
                onChange={(e) => setForm({ ...form, fornecedor_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              >
                <option value="">Aberto a Múltiplos Fornecedores</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Data Limite de Proposta</label>
              <input
                type="date"
                value={form.prazo || ''}
                onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Comprador Responsável</label>
              <input
                type="text"
                value={form.comprador || ''}
                onChange={(e) => setForm({ ...form, comprador: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Observações e Requisitos Técnicos</label>
            <textarea
              rows={2}
              value={form.observacoes || ''}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Especificações, tolerâncias e condições comerciais"
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
              {loading ? 'Abrindo Cotação...' : 'Abrir Cotação RFQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
