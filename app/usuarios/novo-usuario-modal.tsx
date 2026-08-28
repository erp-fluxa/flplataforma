'use client'

import { useState } from 'react'
import { createSystemUser } from '@/app/actions/users'
import { Role } from '@/lib/supabase/users'

export function NovoUsuarioModal({
  roles,
  onClose
}: {
  roles: Role[]
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [form, setForm] = useState({
    nome: '',
    username: '',
    email: '',
    role: roles[0]?.id || 'admin'
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    const res = await createSystemUser(form)
    setLoading(false)

    if (res.success) {
      onClose()
    } else {
      setErro(res.error || 'Erro ao cadastrar usuário')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">Novo Colaborador / Usuário</h2>
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
            <label className="block text-slate-400 font-bold uppercase mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Carlos Oliveira"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Username de Acesso *</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
              placeholder="carlos"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Papel / Função RBAC *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
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
              {loading ? 'Cadastrando...' : 'Cadastrar Colaborador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
