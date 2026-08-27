'use client'

import { useState } from 'react'
import { Quotation, PurchaseOrder, Requisition, Supplier } from '@/lib/supabase/purchases'
import { NovaCotacaoModal } from './nova-cotacao-modal'
import { NovoFornecedorModal } from './novo-fornecedor-modal'

export function ComprasTabs({
  quotations,
  orders,
  requisitions,
  suppliers
}: {
  quotations: any[]
  orders: any[]
  requisitions: Requisition[]
  suppliers: Supplier[]
}) {
  const [abaAtiva, setAbaAtiva] = useState<'cotacoes' | 'pedidos' | 'requisicoes' | 'fornecedores'>('cotacoes')
  const [modalCotacaoAberto, setModalCotacaoAberto] = useState(false)
  const [modalFornecedorAberto, setModalFornecedorAberto] = useState(false)

  return (
    <div className="space-y-6">
      {/* Barra de Abas e Ações */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAbaAtiva('cotacoes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              abaAtiva === 'cotacoes'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            📊 Cotações RFQ ({quotations.length})
          </button>
          <button
            onClick={() => setAbaAtiva('pedidos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              abaAtiva === 'pedidos'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            📦 Pedidos de Compra ({orders.length})
          </button>
          <button
            onClick={() => setAbaAtiva('requisicoes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              abaAtiva === 'requisicoes'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            📝 Requisições ({requisitions.length})
          </button>
          <button
            onClick={() => setAbaAtiva('fornecedores')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              abaAtiva === 'fornecedores'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            🏢 Fornecedores ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {abaAtiva === 'fornecedores' ? (
            <button
              onClick={() => setModalFornecedorAberto(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-lg shadow-teal-900/30 flex items-center gap-2 shrink-0"
            >
              <span>+</span>
              <span>Novo Fornecedor</span>
            </button>
          ) : (
            <button
              onClick={() => setModalCotacaoAberto(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-lg shadow-teal-900/30 flex items-center gap-2 shrink-0"
            >
              <span>+</span>
              <span>Nova Cotação RFQ</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Aba Cotações */}
      {abaAtiva === 'cotacoes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Número</th>
                <th className="py-3.5 px-4">Título da Cotação</th>
                <th className="py-3.5 px-4">Fornecedor</th>
                <th className="py-3.5 px-4">Comprador</th>
                <th className="py-3.5 px-4 text-center">Prioridade</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Data Abertura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Nenhuma cotação RFQ em aberto.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{q.numero}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{q.titulo}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {q.suppliers?.nome || 'Múltiplos Fornecedores'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{q.comprador}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {q.prioridade}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                        {q.status === 'em_cotacao' ? 'Em Cotação' : q.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                      {new Date(q.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Aba Pedidos de Compra */}
      {abaAtiva === 'pedidos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Número</th>
                <th className="py-3.5 px-4">Fornecedor</th>
                <th className="py-3.5 px-4">Condição Pgto</th>
                <th className="py-3.5 px-4">Prazo Entrega</th>
                <th className="py-3.5 px-4 text-right">Valor Total</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Emissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Nenhum pedido de compra emitido até o momento.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{o.numero}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{o.suppliers?.nome}</td>
                    <td className="py-3.5 px-4 text-slate-300">{o.condicao_pagamento}</td>
                    <td className="py-3.5 px-4 text-slate-300">{o.prazo_entrega}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      R$ {(o.valor_total / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
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

      {/* 3. Aba Requisições */}
      {abaAtiva === 'requisicoes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Número</th>
                <th className="py-3.5 px-4">Solicitante</th>
                <th className="py-3.5 px-4">Setor</th>
                <th className="py-3.5 px-4">Justificativa</th>
                <th className="py-3.5 px-4 text-center">Prioridade</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {requisitions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Nenhuma requisição de compra cadastrada.
                  </td>
                </tr>
              ) : (
                requisitions.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{r.numero}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{r.solicitante}</td>
                    <td className="py-3.5 px-4 text-slate-300">{r.setor}</td>
                    <td className="py-3.5 px-4 text-slate-400">{r.justificativa || '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {r.prioridade}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Aba Fornecedores */}
      {abaAtiva === 'fornecedores' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Fornecedor / Razão Social</th>
                <th className="py-3.5 px-4">CNPJ</th>
                <th className="py-3.5 px-4">Contato</th>
                <th className="py-3.5 px-4">E-mail</th>
                <th className="py-3.5 px-4">Telefone</th>
                <th className="py-3.5 px-4">Localização</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">{s.nome}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{s.cnpj || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-300">{s.contato_nome || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-300">{s.email || '—'}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{s.telefone || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {s.cidade ? `${s.cidade}/${s.uf}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Homologado
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalCotacaoAberto && (
        <NovaCotacaoModal suppliers={suppliers} onClose={() => setModalCotacaoAberto(false)} />
      )}

      {modalFornecedorAberto && (
        <NovoFornecedorModal onClose={() => setModalFornecedorAberto(false)} />
      )}
    </div>
  )
}
