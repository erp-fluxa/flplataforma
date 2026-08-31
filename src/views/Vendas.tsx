import React, { useState } from 'react';
import { ShoppingBag, Plus, Wrench, CheckCircle, Eye, Edit, Trash2, Power, PowerOff, Package, AlertTriangle, ArrowRight, Layers, FileText } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { fmtMoeda, fmtData, uid } from '../lib/formatters';
import { SalesOrder, ProductionOrder } from '../types';

export const Vendas: React.FC = () => {
  const { db, updateDb, processarVendaAutomatica, excluirVendaComEstorno } = useDb();
  const { user } = useAuth();

  const [modalNovoPedidoOpen, setModalNovoPedidoOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [modalResultadoOpen, setModalResultadoOpen] = useState(false);
  const [resultadoFluxo, setResultadoFluxo] = useState<any>(null);

  const [selectedPv, setSelectedPv] = useState<SalesOrder | null>(null);
  const [editingPvId, setEditingPvId] = useState<string | null>(null);

  // Form Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState(db.customers[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(db.products.find(p => p.tipo_item === 'produto_acabado')?.id || db.products[0]?.id || '');
  const [quantidade, setQuantidade] = useState(1);
  const [precoUnitarioReais, setPrecoUnitarioReais] = useState(42900);
  const [condicaoPagamento, setCondicaoPagamento] = useState('Sinal 50% + Saldo na Entrega');
  const [previsaoEntrega, setPrevisaoEntrega] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);

  // Atualiza preço padrão quando o produto muda
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = db.products.find(p => p.id === prodId);
    if (prod) {
      if (prod.precoVendaCents) setPrecoUnitarioReais(prod.precoVendaCents / 100);
      else if (prod.precoReferencia) setPrecoUnitarioReais(prod.precoReferencia);
    }
  };

  const handleOpenNew = () => {
    setEditingPvId(null);
    const defaultPA = db.products.find(p => p.tipo_item === 'produto_acabado') || db.products[0];
    setSelectedCustomerId(db.customers[0]?.id || '');
    setSelectedProductId(defaultPA?.id || '');
    setQuantidade(1);
    setPrecoUnitarioReais(defaultPA?.precoVendaCents ? defaultPA.precoVendaCents / 100 : (defaultPA?.precoReferencia || 42900));
    setCondicaoPagamento('Sinal 50% + Saldo na Entrega');
    setPrevisaoEntrega(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setModalNovoPedidoOpen(true);
  };

  const handleOpenEdit = (pv: SalesOrder) => {
    setEditingPvId(pv.id);
    setSelectedCustomerId(pv.customerId);
    const firstItem = pv.items?.[0];
    if (firstItem) {
      setSelectedProductId(firstItem.productId);
      setQuantidade(firstItem.quantidade >= 1000 ? firstItem.quantidade / 1000 : firstItem.quantidade);
      setPrecoUnitarioReais(firstItem.precoUnitarioCents / 100);
    } else {
      setPrecoUnitarioReais(pv.valorTotalCents / 100);
    }
    setCondicaoPagamento(pv.condicaoPagamento || 'Faturamento 30/60 dias');
    setPrevisaoEntrega(pv.previsaoEntrega || '');
    setModalNovoPedidoOpen(true);
  };

  const handleOpenView = (pv: SalesOrder) => {
    setSelectedPv(pv);
    setModalViewOpen(true);
  };

  const handleToggleAtivo = async (pv: SalesOrder) => {
    const isCancelado = pv.status === 'cancelado';
    const nextStatus = isCancelado ? 'confirmado' : 'cancelado';

    await updateDb(prev => ({
      ...prev,
      salesOrders: prev.salesOrders.map(p => p.id === pv.id ? { ...p, status: nextStatus } : p)
    }), 'SALES_ORDER_STATUS_TOGGLED');

    alert(`Pedido de Venda ${pv.codigo} ${nextStatus === 'cancelado' ? 'cancelado / inativado' : 'reativado'}!`);
  };

  const handleDelete = async (pv: SalesOrder) => {
    if (confirm(`Tem certeza que deseja excluir o Pedido de Venda ${pv.codigo}?\n\nEsta ação irá remover a venda, excluir as Ordens de Produção vinculadas e estornar/liberar automaticamente todas as reservas e baixas de estoque.`)) {
      const res = await excluirVendaComEstorno(pv.id, user?.name || 'Vendedor');
      if (res.success) {
        alert(res.detalhes || `Pedido de Venda ${pv.codigo} excluído e estoque estornado com sucesso!`);
      } else {
        alert(res.error || 'Erro ao excluir pedido de venda.');
      }
    }
  };

  const handleSubmitVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedProductId) {
      alert('Selecione o cliente e o produto.');
      return;
    }

    if (editingPvId) {
      // Edição simples
      await updateDb(prev => ({
        ...prev,
        salesOrders: prev.salesOrders.map(p => p.id === editingPvId ? {
          ...p,
          customerId: selectedCustomerId,
          valorTotalCents: Math.round(precoUnitarioReais * quantidade * 100),
          condicaoPagamento,
          previsaoEntrega
        } : p)
      }), 'SALES_ORDER_UPDATED');

      setModalNovoPedidoOpen(false);
      alert('Pedido de Venda atualizado com sucesso!');
      return;
    }

    // DISPARO DO FLUXO AUTOMATIZADO ATÔMICO
    const totalCents = Math.round(precoUnitarioReais * quantidade * 100);
    const res = await processarVendaAutomatica(
      {
        customerId: selectedCustomerId,
        previsaoEntrega,
        valorTotalCents: totalCents,
        condicaoPagamento
      },
      [
        {
          productId: selectedProductId,
          quantidade: quantidade * 1000, // em milli-unidades ou unidades
          precoUnitarioCents: Math.round(precoUnitarioReais * 100)
        }
      ],
      user?.name || 'Vendedor'
    );

    if (!res.success) {
      alert(res.error || 'Erro ao processar a venda.');
      return;
    }

    setModalNovoPedidoOpen(false);
    setResultadoFluxo(res);
    setModalResultadoOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-600 dark:text-teal-400" />
            Vendas & Pedidos de Venda (PV)
          </h2>
          <p className="text-xs text-slate-500">
            Fluxo automatizado integrado com Almoxarifado, Ordens de Produção e Alertas de Compras.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenNew}
        >
          Novo Pedido de Venda
        </Button>
      </div>

      {/* 1. VISUALIZAÇÃO MOBILE (CARDS RESPONSIVOS TOUCH-FRIENDLY COM 4 BOTÕES) */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {(db.salesOrders || []).map(pv => {
          const cliente = db.customers.find(c => c.id === pv.customerId);
          const opsVinculadas = (db.productionOrders || []).filter(o => o.salesOrderId === pv.id || pv.productionOrderIds?.includes(o.id));

          return (
            <div
              key={pv.id}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                pv.status === 'cancelado'
                  ? 'bg-slate-900/60 border-rose-900/40 opacity-70'
                  : 'bg-[#111A2D] border-slate-800 shadow-md'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-black text-brand-600 dark:text-teal-400">{pv.codigo}</span>
                  <h4 className="font-extrabold text-sm text-slate-100">{cliente?.nome || 'Cliente não identificado'}</h4>
                </div>
                <Badge variant={pv.status === 'pronto_expedicao' || pv.status === 'faturado' ? 'success' : (pv.status === 'em_producao' ? 'warning' : (pv.status === 'cancelado' ? 'danger' : 'info'))}>
                  {pv.status.toUpperCase().replace('_', ' ')}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Valor Total:</span>
                  <b className="font-mono text-emerald-400">{fmtMoeda(pv.valorTotalCents)}</b>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Previsão Entrega:</span>
                  <b>{fmtData(pv.previsaoEntrega)}</b>
                </div>

                {/* Vínculo de OP */}
                {opsVinculadas.length > 0 && (
                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-bold">OP(s) Gerada(s):</span>
                    {opsVinculadas.map(op => (
                      <span key={op.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
                        <Wrench className="w-2.5 h-2.5" />
                        {op.codigo} ({op.status})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Barra de 4 Ações no Mobile */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => handleOpenView(pv)}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-bold gap-1 transition-all"
                >
                  <Eye className="w-4 h-4 text-teal-400" />
                  <span>Detalhes</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(pv)}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-bold gap-1 transition-all"
                >
                  <Edit className="w-4 h-4 text-amber-400" />
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => handleToggleAtivo(pv)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10.5px] font-bold gap-1 transition-all ${
                    pv.status !== 'cancelado' ? 'bg-slate-800 hover:bg-rose-950/40 text-rose-400' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {pv.status !== 'cancelado' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  <span>{pv.status !== 'cancelado' ? 'Cancelar' : 'Reativar'}</span>
                </button>

                <button
                  onClick={() => handleDelete(pv)}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-[10.5px] font-bold gap-1 transition-all border border-rose-900/40"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. VISUALIZAÇÃO DESKTOP / TABLET (TABELA COM OVERFLOW HORIZONTAL) */}
      <div className="hidden sm:block">
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs min-w-[780px]">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Código PV</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Rastreabilidade PCP / OP</th>
                  <th className="px-4 py-3 text-right">Valor Total</th>
                  <th className="px-4 py-3">Previsão Entrega</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {(db.salesOrders || []).map(pv => {
                  const cliente = db.customers.find(c => c.id === pv.customerId);
                  const opsVinculadas = (db.productionOrders || []).filter(o => o.salesOrderId === pv.id || pv.productionOrderIds?.includes(o.id));

                  return (
                    <tr key={pv.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${pv.status === 'cancelado' ? 'opacity-60 bg-slate-100/50 dark:bg-slate-950/40' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-brand-600 dark:text-teal-400">
                        {pv.codigo}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{cliente?.nome || 'Cliente'}</div>
                        <div className="text-[10.5px] font-mono text-slate-400">{cliente?.cnpjCpf}</div>
                      </td>
                      <td className="px-4 py-3">
                        {opsVinculadas.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {opsVinculadas.map(op => (
                              <span key={op.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10.5px] font-mono font-bold">
                                <Wrench className="w-3 h-3" />
                                {op.codigo}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pronto em Estoque (Baixa Direta)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {fmtMoeda(pv.valorTotalCents)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                        {fmtData(pv.previsaoEntrega)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={pv.status === 'pronto_expedicao' || pv.status === 'faturado' ? 'success' : (pv.status === 'em_producao' ? 'warning' : (pv.status === 'cancelado' ? 'danger' : 'info'))}>
                          {pv.status.toUpperCase().replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1. VISUALIZAR */}
                          <button
                            onClick={() => handleOpenView(pv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Visualizar Pedido"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. EDITAR */}
                          <button
                            onClick={() => handleOpenEdit(pv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Editar Pedido"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. CANCELAR / REATIVAR */}
                          <button
                            onClick={() => handleToggleAtivo(pv)}
                            className={`p-1.5 rounded-lg transition-colors ${pv.status !== 'cancelado' ? 'text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-emerald-500 hover:bg-emerald-950/40'}`}
                            title={pv.status !== 'cancelado' ? 'Cancelar Pedido' : 'Reativar Pedido'}
                          >
                            {pv.status !== 'cancelado' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </button>

                          {/* 4. EXCLUIR */}
                          <button
                            onClick={() => handleDelete(pv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Excluir Pedido"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* MODAL RESULTADO DO FLUXO AUTOMÁTICO */}
      <Modal
        isOpen={modalResultadoOpen}
        onClose={() => setModalResultadoOpen(false)}
        title="⚡ Fluxo de Venda Automatizado Concluído com Sucesso!"
      >
        {resultadoFluxo && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-emerald-400">{resultadoFluxo.pv?.codigo}</span>
                <Badge variant="success">CONFIRMADO</Badge>
              </div>
              <p className="text-emerald-200">
                O Pedido de Venda foi registrado e integrado de forma atômica aos demais módulos da empresa.
              </p>
            </div>

            {/* 1. Ordens de Produção Geradas */}
            {resultadoFluxo.opsGeradas?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4" />
                  Ordem de Produção (OP) Gerada Automaticamente:
                </span>
                {resultadoFluxo.opsGeradas.map((op: any) => (
                  <div key={op.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="font-mono font-bold text-slate-200">{op.codigo}</span>
                    <Badge variant={op.status === 'material_reservado' ? 'success' : 'warning'}>
                      {op.status === 'material_reservado' ? 'MATERIAL RESERVADO' : 'AGUARDANDO INSUMOS'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* 2. Baixas Diretas */}
            {resultadoFluxo.baixasDiretas?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  Baixa Direta no Almoxarifado:
                </span>
                <p className="text-slate-300">
                  {resultadoFluxo.baixasDiretas.length} item(ns) baixado(s) do saldo disponível de estoque.
                </p>
              </div>
            )}

            {/* 3. Reservas de Insumos */}
            {resultadoFluxo.reservasGeradas?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Reserva de Insumos (BOM):
                </span>
                <p className="text-slate-300">
                  {resultadoFluxo.reservasGeradas.length} insumo(s) reservado(s) para a montagem da máquina.
                </p>
              </div>
            )}

            {/* 4. Alertas de Compra (se faltou insumo) */}
            {resultadoFluxo.alertasCompras?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/60 space-y-2">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Demanda Disparada para o Setor de Compras:
                </span>
                <p className="text-rose-200 text-[11px]">
                  Foi gerada uma Solicitação de Cotação (RFQ) no módulo de Compras para repor os itens em falta.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button variant="primary" size="sm" onClick={() => setModalResultadoOpen(false)}>
                Entendido, Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL VIEW PEDIDO DE VENDA */}
      <Modal isOpen={modalViewOpen} onClose={() => setModalViewOpen(false)} title={`Ficha do Pedido — ${selectedPv?.codigo}`}>
        {selectedPv && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-brand-600 dark:text-teal-400">{selectedPv.codigo}</span>
                <Badge variant="info">{selectedPv.status.toUpperCase()}</Badge>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {db.customers.find(c => c.id === selectedPv.customerId)?.nome || 'Cliente'}
              </h3>
              <p className="text-slate-400">Condições: <b>{selectedPv.condicaoPagamento || 'Padrão'}</b></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Valor Total</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{fmtMoeda(selectedPv.valorTotalCents)}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Previsão Entrega</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{fmtData(selectedPv.previsaoEntrega)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL NOVO / EDITAR PEDIDO DE VENDA */}
      <Modal isOpen={modalNovoPedidoOpen} onClose={() => setModalNovoPedidoOpen(false)} title={editingPvId ? 'Editar Pedido de Venda' : 'Novo Pedido de Venda com Automação PCP'}>
        <form onSubmit={handleSubmitVenda} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cliente Comprador *</label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            >
              {db.customers.map(c => (
                <option key={c.id} value={c.id}>{c.nome} ({c.cnpjCpf})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Item / Produto Acabado *</label>
              <select
                value={selectedProductId}
                onChange={e => handleProductChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                required
              >
                {db.products.map(p => (
                  <option key={p.id} value={p.id}>[{p.codigo}] {p.descricao}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantidade *</label>
              <input
                type="number"
                min="1"
                value={quantidade}
                onChange={e => setQuantidade(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Preço Unitário (R$) *</label>
              <input
                type="number"
                step="0.01"
                value={precoUnitarioReais}
                onChange={e => setPrecoUnitarioReais(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Previsão de Entrega Prometida *</label>
              <input
                type="date"
                value={previsaoEntrega}
                onChange={e => setPrevisaoEntrega(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Condição de Pagamento</label>
            <input
              type="text"
              value={condicaoPagamento}
              onChange={e => setCondicaoPagamento(e.target.value)}
              placeholder="Ex: Sinal 50% + Saldo na Entrega"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
            />
          </div>

          {/* Banner explicativo do fluxo automatizado */}
          <div className="p-3 rounded-xl bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
            <span className="font-bold text-brand-900 dark:text-brand-300 flex items-center gap-1.5">
              ⚡ Automação Inteligente Ativa:
            </span>
            <p>
              Ao confirmar a venda, o sistema checará o saldo em estoque. Se não houver estoque pronto, criará automaticamente a <b>Ordem de Produção (OP)</b>, reservará as matérias-primas e disparará os alertas de compra se algum componente estiver em falta.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovoPedidoOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">
              {editingPvId ? 'Salvar Alterações' : 'Confirmar Venda & Disparar Fluxo'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
