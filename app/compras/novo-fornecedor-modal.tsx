'use client'

import { useState } from 'react'
import { createSupplier } from '@/app/actions/purchases'

export function NovoFornecedorModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    contato_nome: '',
    email: '',
    telefone: '',
    cidade: '',
    uf: 'SC'
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    const res = await createSupplier(form)
    setLoading(false)

    if (res.success) {
      onClose()
    } else {
      setErro(res.error || 'Erro ao cadastrar fornecedor')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">Novo Fornecedor Homologado</h2>
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
            <label className="block text-slate-400 font-bold uppercase mb-1">Razão Social / Nome Fantasia *</label>
            <input
              type="text"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Polímeros & Extrusão Industrial Ltda"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">CNPJ</label>
              <input
                type="text"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Nome do Contato</label>
              <input
                type="text"
                value={form.contato_nome}
                onChange={(e) => setForm({ ...form, contato_nome: e.target.value })}
                placeholder="Ex: Marcos Silva"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">E-mail Comercial</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="vendas@fornecedor.com.br"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(49) 3622-0000"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-slate-400 font-bold uppercase mb-1">Cidade</label>
              <input
                type="text"
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                placeholder="São Miguel do Oeste"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">UF</label>
              <input
                type="text"
                maxLength={2}
                value={form.uf}
                onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 font-mono text-center font-bold"
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
              {loading ? 'Cadastrando...' : 'Cadastrar Fornecedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
