import React, { useState } from 'react';
import { ShoppingCart, Plus, CheckCircle, PackageCheck, Eye, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { useDelete } from '../context/DeleteContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { fmtMoeda, fmtData, uid } from '../lib/formatters';
import { PurchaseOrder, StockMovement, StockBalance } from '../types';

export const PedidosCompra: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();
  const { requestDelete } = useDelete();

  const [modalNovoPedidoOpen, setModalNovoPedidoOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<PurchaseOrder | null>(null);
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);

  const [selectedSupplierId, setSelectedSupplierId] = useState(db.suppliers[0]?.id || '');
  const [valorTotalReais, setValorTotalReais] = useState(1500);
  const [previsaoEntrega, setPrevisaoEntrega] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

  const handleOpenNew = () => {
    setEditingPedidoId(null);
    setValorTotalReais(1500);
    setPrevisaoEntrega(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setModalNovoPedidoOpen(true);
  };

  const handleOpenEdit = (ord: PurchaseOrder) => {
    setEditingPedidoId(ord.id);
    setSelectedSupplierId(ord.supplierId);
    setValorTotalReais(ord.valorTotalCents / 100);
    setPrevisaoEntrega(ord.previsaoEntrega || '');
    setModalNovoPedidoOpen(true);
  };

  const handleOpenView = (ord: PurchaseOrder) => {
    setSelectedPedido(ord);
    setModalViewOpen(true);
  };

  const handleToggleAtivo = async (ord: PurchaseOrder) => {
    const isCancelado = ord.status === 'cancelado';
    const nextStatus = isCancelado ? 'emitido' : 'cancelado';

    await updateDb(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === ord.id ? { ...o, status: nextStatus } : o)
    }), 'PURCHASE_ORDER_STATUS_TOGGLED');

    alert(`Pedido ${ord.codigo} ${nextStatus === 'cancelado' ? 'cancelado / inativado' : 'reativado'}!`);
  };

  const handleDelete = (ord: PurchaseOrder) => {
    const supplier = db.suppliers.find(s => s.id === ord.supplierId);
    const deps: string[] = [];
    if (supplier) deps.push(`Fornecedor: ${supplier.nomeFantasia || supplier.razaoSocial}`);

    requestDelete({
      title: 'Excluir Pedido de Compra',
      itemName: `Pedido de Compra ${ord.codigo} (${fmtMoeda(ord.valorTotalCents)})`,
      itemType: 'Pedido de Compra',
      entityType: 'purchaseOrder',
      moduleKey: 'compras',
      originalId: ord.id,
      itemData: ord,
      isSoftDelete: true,
      dependencies: deps,
      warningMessage: 'Ao confirmar, o pedido de compra será movido para a lixeira.',
      onDelete: async () => {
        await updateDb(prev => ({
          ...prev,
          orders: prev.orders.filter(o => o.id !== ord.id)
        }), 'PURCHASE_ORDER_DELETED');
      }
    });
  };

  const handleCriarOuEditarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;

    if (editingPedidoId) {
      await updateDb(prev => ({
        ...prev,
        orders: prev.orders.map(o => o.id === editingPedidoId ? {
          ...o,
          supplierId: selectedSupplierId,
          valorTotalCents: Math.round(valorTotalReais * 100),
          previsaoEntrega
        } : o)
      }), 'PURCHASE_ORDER_UPDATED');

      setModalNovoPedidoOpen(false);
      alert('Ordem de Compra atualizada!');
      return;
    }

    const seq = (db.orders?.length || 0) + 1;
    const codigo = `PC-${String(seq).padStart(4, '0')}`;

    const novoPedido: PurchaseOrder = {
      id: uid('ord'),
      codigo,
      supplierId: selectedSupplierId,
      status: 'emitido',
      valorTotalCents: Math.round(valorTotalReais * 100),
      previsaoEntrega,
      companyId: db.currentCompanyId,
      criadoEm: new Date().toISOString()
    };

    await updateDb(prev => ({
      ...prev,
      orders: [novoPedido, ...(prev.orders || [])],
      auditLogs: [
        {
          id: uid('log'),
          timestamp: new Date().toISOString(),
          action: 'PURCHASE_ORDER_CREATED',
          actor: { id: user?.id || 'admin', name: user?.name || 'Admin' },
          target: { tipo: 'PEDIDO_COMPRA', codigo },
          details: `Ordem de Compra ${codigo} criada no valor de ${fmtMoeda(Math.round(valorTotalReais * 100))}.`
        },
        ...(prev.auditLogs || [])
      ]
    }), 'PURCHASE_ORDER_CREATED');

    setModalNovoPedidoOpen(false);
    alert(`Ordem de Compra ${codigo} gerada com sucesso!`);
  };

  const handleReceberPedido = async (pedido: PurchaseOrder) => {
    if (confirm(`Confirmar o recebimento físico total do Pedido ${pedido.codigo}? O saldo dos insumos será atualizado no estoque central.`)) {
      const sup = db.suppliers.find(s => s.id === pedido.supplierId);
      const agora = new Date().toISOString();
      
      await updateDb(prev => ({
        ...prev,
        orders: prev.orders.map(o => o.id === pedido.id ? { ...o, status: 'recebido', dataEntregaReal: agora } : o),
        auditLogs: [
          {
            id: uid('log'),
            timestamp: agora,
            action: 'PURCHASE_ORDER_RECEIVED',
            actor: { id: user?.id || 'admin', name: user?.name || 'Admin' },
            target: { tipo: 'PEDIDO_COMPRA', codigo: pedido.codigo },
            details: `Pedido ${pedido.codigo} recebido com sucesso do fornecedor ${sup?.razaoSocial}. Estoque atualizado.`
          },
          ...(prev.auditLogs || [])
        ]
      }), 'PURCHASE_ORDER_RECEIVED');

      alert(`Recebimento do Pedido ${pedido.codigo} concluído com sucesso!`);
    }
  };


  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-brand-600 dark:text-teal-400" />
            Ordens de Compra de Suprimentos (PC)
          </h2>
          <p className="text-xs text-slate-500">
            Controle de pedidos emitidos para fornecedores, prazos de entrega e recebimento físico no almoxarifado.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenNew}
        >
          Nova Ordem de Compra
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">Valor Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Previsão de Entrega</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {(db.orders || []).map(ord => {
              const sup = db.suppliers.find(s => s.id === ord.supplierId);

              return (
                <tr key={ord.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-brand-600 dark:text-teal-400">
                    {ord.codigo}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                    {sup?.razaoSocial || ord.supplierId}
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {fmtMoeda(ord.valorTotalCents)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ord.status === 'recebido' ? 'success' : (ord.status === 'cancelado' ? 'danger' : 'warning')}>
                      {ord.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {fmtData(ord.previsaoEntrega)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {ord.status !== 'recebido' && ord.status !== 'cancelado' && (
                        <Button
                          variant="success"
                          size="sm"
                          icon={<PackageCheck className="w-3.5 h-3.5" />}
                          onClick={() => handleReceberPedido(ord)}
                        >
                          Receber
                        </Button>
                      )}

                      {/* 1. VISUALIZAR */}
                      <button
                        onClick={() => handleOpenView(ord)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Visualizar Pedido"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* 2. EDITAR */}
                      <button
                        onClick={() => handleOpenEdit(ord)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Editar Pedido"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* 3. INATIVAR / CANCELAR */}
                      <button
                        onClick={() => handleToggleAtivo(ord)}
                        className={`p-1.5 rounded-lg transition-colors ${ord.status !== 'cancelado' ? 'text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-emerald-500 hover:bg-emerald-950/40'}`}
                        title={ord.status !== 'cancelado' ? 'Cancelar/Inativar Pedido' : 'Reativar Pedido'}
                      >
                        {ord.status !== 'cancelado' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </button>

                      {/* 4. EXCLUIR */}
                      <button
                        onClick={() => handleDelete(ord)}
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
      </Card>

      {/* MODAL VIEW PEDIDO */}
      <Modal isOpen={modalViewOpen} onClose={() => setModalViewOpen(false)} title={`Detalhes da Ordem de Compra — ${selectedPedido?.codigo}`}>
        {selectedPedido && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-brand-600 dark:text-teal-400 text-sm">{selectedPedido.codigo}</span>
                <Badge variant={selectedPedido.status === 'recebido' ? 'success' : 'warning'}>{selectedPedido.status.toUpperCase()}</Badge>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Fornecedor: {db.suppliers.find(s => s.id === selectedPedido.supplierId)?.razaoSocial}
              </h3>
              <p className="text-slate-400">Previsão de Entrega: <b>{fmtData(selectedPedido.previsaoEntrega)}</b> | Criado em: <b>{fmtData(selectedPedido.criadoEm)}</b></p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
              <span className="font-bold text-slate-700 dark:text-slate-300">Valor Total do Pedido:</span>
              <span className="font-mono font-black text-emerald-500 text-base">{fmtMoeda(selectedPedido.valorTotalCents)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL NOVO / EDITAR PEDIDO */}
      <Modal isOpen={modalNovoPedidoOpen} onClose={() => setModalNovoPedidoOpen(false)} title={editingPedidoId ? 'Editar Ordem de Compra' : 'Nova Ordem de Compra (PC)'}>
        <form onSubmit={handleCriarOuEditarPedido} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fornecedor Homologado *</label>
            <select
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            >
              {db.suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.razaoSocial} ({s.cnpj})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Total (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={valorTotalReais}
                onChange={e => setValorTotalReais(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Previsão de Entrega</label>
              <input
                type="date"
                value={previsaoEntrega}
                onChange={e => setPrevisaoEntrega(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovoPedidoOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">{editingPedidoId ? 'Salvar Alterações' : 'Emitir Ordem de Compra'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
