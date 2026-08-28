'use client'

import { useState } from 'react'
import { SystemUser, Role } from '@/lib/supabase/users'
import { NovoUsuarioModal } from './novo-usuario-modal'

export function UsuariosView({
  users,
  roles
}: {
  users: SystemUser[]
  roles: Role[]
}) {
  const [modalAberto, setModalAberto] = useState(false)

  return (
    <div className="space-y-6">
      {/* Barra de Ações */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-sm font-bold text-white">Colaboradores & Acessos ({users.length})</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerenciamento de credenciais e permissões de segurança RBAC.
          </p>
        </div>

        <button
          onClick={() => setModalAberto(true)}
          className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-teal-900/30 flex items-center gap-2"
        >
          <span>+</span>
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4">Nome do Colaborador</th>
              <th className="py-3.5 px-4">Username</th>
              <th className="py-3.5 px-4">E-mail</th>
              <th className="py-3.5 px-4">Função / Papel</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Cadastrado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-bold text-white">{u.nome}</td>
                <td className="py-3.5 px-4 font-mono text-teal-400 font-bold">@{u.username}</td>
                <td className="py-3.5 px-4 text-slate-300">{u.email || '—'}</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.ativo
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-red-950 text-red-300 border border-red-800'
                    }`}
                  >
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                  {new Date(u.criado_em).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <NovoUsuarioModal roles={roles} onClose={() => setModalAberto(false)} />
      )}
    </div>
  )
}
