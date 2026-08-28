'use client'

import { useState } from 'react'
import { Deal, SalesOrder, Customer } from '@/lib/supabase/crm'
import { updateDealStage } from '@/app/actions/crm'
import { NovoClienteModal } from './novo-cliente-modal'
import { NovoLeadModal } from './novo-lead-modal'

const ETAPAS_CRM = [
  { id: 'prospeccao', titulo: '1. Prospecção', cor: 'border-slate-700 bg-slate-900/60' },
  { id: 'qualificacao', titulo: '2. Qualificação', cor: 'border-blue-800/60 bg-blue-950/20' },
  { id: 'proposta', titulo: '3. Proposta Enviada', cor: 'border-amber-800/60 bg-amber-950/20' },
  { id: 'negociacao', titulo: '4. Negociação / Fechamento', cor: 'border-purple-800/60 bg-purple-950/20' },
  { id: 'ganho', titulo: '5. Ganho 🔥 (Vendido)', cor: 'border-emerald-800/60 bg-emerald-950/20' }
]

export function VendasTabs({
  deals,
  orders,
  customers
}: {
  deals: any[]
  orders: any[]
  customers: Customer[]
}) {
  const [abaAtiva, setAbaAtiva] = useState<'funil' | 'pedidos' | 'clientes'>('funil')
  const [modalClienteAberto, setModalClienteAberto] = useState(false)
  const [modalLeadAberto, setModalLeadAberto] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleMudarEtapa(dealId: string, novaEtapa: any) {
    setLoadingId(dealId)
    await updateDealStage(dealId, novaEtapa)
    setLoadingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Barra de Abas e Ações */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAbaAtiva('funil')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              abaAtiva === 'funil'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            🎯 Funil de Vendas CRM ({deals.length})
          </button>
          <button
            onClick={() => setAbaAtiva('pedidos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              abaAtiva === 'pedidos'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            📄 Pedidos de Venda ({orders.length})
          </button>
          <button
            onClick={() => setAbaAtiva('clientes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              abaAtiva === 'clientes'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            🏢 Clientes ({customers.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {abaAtiva === 'clientes' ? (
            <button
              onClick={() => setModalClienteAberto(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-lg shadow-teal-900/30 flex items-center gap-2 shrink-0"
            >
              <span>+</span>
              <span>Novo Cliente</span>
            </button>
          ) : (
            <button
              onClick={() => setModalLeadAberto(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-lg shadow-teal-900/30 flex items-center gap-2 shrink-0"
            >
              <span>+</span>
              <span>Nova Oportunidade CRM</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Aba Funil de Vendas CRM */}
      {abaAtiva === 'funil' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start min-h-[550px]">
          {ETAPAS_CRM.map((col) => {
            const dealsDaColuna = deals.filter((d) => d.etapa === col.id)
            const valorTotalColuna = dealsDaColuna.reduce(
              (acc, d) => acc + Number(d.valor_estimado || 0),
              0
            )

            return (
              <div
                key={col.id}
                className={`border rounded-2xl p-4 flex flex-col space-y-3 min-h-[480px] ${col.cor}`}
              >
                <div className="border-b border-slate-800/80 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                      {col.titulo}
                    </h3>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {dealsDaColuna.length}
                    </span>
                  </div>
                  <p className="text-[10.5px] font-mono font-bold text-teal-400 mt-1">
                    R$ {(valorTotalColuna / 100).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-3 flex-1">
                  {dealsDaColuna.length === 0 ? (
                    <div className="h-28 flex items-center justify-center border border-dashed border-slate-800/80 rounded-xl text-[11px] text-slate-600 text-center p-2">
                      Sem oportunidades
                    </div>
                  ) : (
                    dealsDaColuna.map((d) => (
                      <div
                        key={d.id}
                        className="bg-slate-900 border border-slate-800 hover:border-teal-700/60 rounded-xl p-3.5 space-y-2 shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs text-white leading-tight">{d.titulo}</h4>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 font-mono">
                            {d.linha_interesse || 'CV'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 font-medium truncate">
                          🏢 {d.customers?.nome || 'Lead sem cadastro'}
                        </p>

                        <div className="flex items-center justify-between font-mono text-[11px] pt-1">
                          <span className="font-bold text-emerald-400">
                            R$ {(Number(d.valor_estimado || 0) / 100).toFixed(2)}
                          </span>
                          <span className="text-slate-400">{d.responsavel_nome}</span>
                        </div>

                        {/* Botões de Avanço de Fase */}
                        <div className="pt-2 border-t border-slate-800/80 flex gap-1 text-[10px]">
                          {col.id === 'prospeccao' && (
                            <button
                              disabled={loadingId === d.id}
                              onClick={() => handleMudarEtapa(d.id, 'qualificacao')}
                              className="w-full bg-blue-950/80 hover:bg-blue-900 text-blue-200 py-1 rounded font-bold transition-all text-center"
                            >
                              Qualificar →
                            </button>
                          )}
                          {col.id === 'qualificacao' && (
                            <button
                              disabled={loadingId === d.id}
                              onClick={() => handleMudarEtapa(d.id, 'proposta')}
                              className="w-full bg-amber-950/80 hover:bg-amber-900 text-amber-200 py-1 rounded font-bold transition-all text-center"
                            >
                              Enviar Proposta →
                            </button>
                          )}
                          {col.id === 'proposta' && (
                            <button
                              disabled={loadingId === d.id}
                              onClick={() => handleMudarEtapa(d.id, 'negociacao')}
                              className="w-full bg-purple-950/80 hover:bg-purple-900 text-purple-200 py-1 rounded font-bold transition-all text-center"
                            >
                              Negociar →
                            </button>
                          )}
                          {col.id === 'negociacao' && (
                            <button
                              disabled={loadingId === d.id}
                              onClick={() => handleMudarEtapa(d.id, 'ganho')}
                              className="w-full bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 py-1 rounded font-bold transition-all text-center"
                            >
                              Fechar Venda 🔥
                            </button>
                          )}
                          {col.id === 'ganho' && (
                            <span className="w-full text-center text-emerald-400 font-bold py-0.5">
                              ✔ Fechado
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
      )}

      {/* 2. Aba Pedidos de Venda */}
      {abaAtiva === 'pedidos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Número</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Vendedor</th>
                <th className="py-3.5 px-4 text-right">Valor Total</th>
                <th className="py-3.5 px-4 text-right">Sinal Entrada</th>
                <th className="py-3.5 px-4 text-center">Prazo Fabr.</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Nenhum pedido de venda industrial registrado.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{o.numero}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{o.customers?.nome}</td>
                    <td className="py-3.5 px-4 text-slate-300">{o.vendedor_nome}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      R$ {(o.valor_total / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      R$ {(o.sinal_entrada / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {o.prazo_fabricacao_dias} dias
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800">
                        {o.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                      {new Date(o.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Aba Clientes */}
      {abaAtiva === 'clientes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Nome Fantasia</th>
                <th className="py-3.5 px-4">Razão Social</th>
                <th className="py-3.5 px-4">CNPJ / CPF</th>
                <th className="py-3.5 px-4">E-mail</th>
                <th className="py-3.5 px-4">Telefone</th>
                <th className="py-3.5 px-4">Localização</th>
                <th className="py-3.5 px-4 text-center">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">{c.nome}</td>
                  <td className="py-3.5 px-4 text-slate-300">{c.razao_social || '—'}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{c.cnpj_cpf || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-300">{c.email || '—'}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{c.telefone || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {c.cidade ? `${c.cidade}/${c.uf}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                      {c.origem}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalClienteAberto && (
        <NovoClienteModal onClose={() => setModalClienteAberto(false)} />
      )}

      {modalLeadAberto && (
        <NovoLeadModal customers={customers} onClose={() => setModalLeadAberto(false)} />
      )}
    </div>
  )
}
