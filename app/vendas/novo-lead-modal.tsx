'use client'

import { useState } from 'react'
import { createDeal } from '@/app/actions/crm'
import { Customer } from '@/lib/supabase/crm'

export function NovoLeadModal({
  customers,
  onClose
}: {
  customers: Customer[]
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [form, setForm] = useState({
    customer_id: customers[0]?.id || '',
    titulo: '',
    valor_estimado: 42000,
    linha_interesse: 'CV',
    responsavel_nome: 'João Marcos'
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    const res = await createDeal({
      ...form,
      valor_estimado: Math.round(Number(form.valor_estimado) * 100) // Converte para centavos
    })
    setLoading(false)

    if (res.success) {
      onClose()
    } else {
      setErro(res.error || 'Erro ao registrar oportunidade')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">Nova Oportunidade no Funil (Lead / Deal)</h2>
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
            <label className="block text-slate-400 font-bold uppercase mb-1">Título do Negócio *</label>
            <input
              type="text"
              required
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Aquisição Impressora JP3D CV1200 + Mesa 120°C"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Cliente Vinculado</label>
              <select
                value={form.customer_id}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              >
                <option value="">Lead Novo / Sem Cadastro</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.cidade || 'SC'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Linha de Interesse</label>
              <select
                value={form.linha_interesse}
                onChange={(e) => setForm({ ...form, linha_interesse: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              >
                <option value="CV">Linha CV (Comunicação Visual)</option>
                <option value="CX">Linha CX (Cenografia Industrial)</option>
                <option value="insumos">Filamentos & Insumos</option>
                <option value="servicos">Manutenção & Serviços</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Valor Estimado (R$)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.valor_estimado}
                onChange={(e) => setForm({ ...form, valor_estimado: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Responsável Comercial</label>
              <input
                type="text"
                value={form.responsavel_nome}
                onChange={(e) => setForm({ ...form, responsavel_nome: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              />
            </div>
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
              {loading ? 'Salvando...' : 'Lançar no Funil CRM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
