import React, { useState } from 'react';
import { Boxes, Plus, Trash2, Edit, Eye, Power, PowerOff, Search, Filter, AlertTriangle, ShieldCheck, Tag, Layers, Package } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge, Modal } from '../components/ui';
import { fmtMoeda, fmtQtd, fmtData, uid } from '../lib/formatters';
import { Product } from '../types';

export const Estoque: React.FC = () => {
  const { db, updateDb, salvarProduto, excluirProduto, zerarSaldosEstoque, reconciliarEstoque } = useDb();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'mp' | 'muc' | 'pa' | 'separacao'>('mp');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('todas');

  // Modais
  const [modalProdutoOpen, setModalProdutoOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Modal Zeramento
  const [modalZerarOpen, setModalZerarOpen] = useState(false);
  const [confirmZerarInput, setConfirmZerarInput] = useState('');

  // Filtragem estrita por tipo de item
  const filteredProducts = db.products.filter(p => {
    if (activeTab === 'mp') return p.tipo_item === 'materia_prima' || p.tipo === 'MP';
    if (activeTab === 'muc') return p.tipo_item === 'muc' || p.tipo === 'MUC';
    if (activeTab === 'pa') return p.tipo_item === 'produto_acabado' || p.tipo === 'PA';
    return true;
  }).filter(p => {
    if (filterCategory !== 'todas' && p.categoria !== filterCategory) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return p.descricao.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenNewProduct = () => {
    setEditingProduct({
      id: uid('prod'),
      codigo: '',
      descricao: '',
      unidade: 'UN',
      tipo_item: activeTab === 'mp' ? 'materia_prima' : (activeTab === 'muc' ? 'muc' : 'produto_acabado'),
      categoria: 'Geral',
      estoqueMinimo: 1000,
      custoMedioCents: 0,
      precoVendaCents: 0,
      ativo: true,
      version: 1
    });
    setModalProdutoOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct({ ...prod });
    setModalProdutoOpen(true);
  };

  const handleOpenViewProduct = (prod: Product) => {
    setViewingProduct(prod);
    setModalViewOpen(true);
  };

  const handleToggleAtivo = async (prod: Product) => {
    const nextStatus = !prod.ativo;
    const res = await salvarProduto({ ...prod, ativo: nextStatus }, user?.name || 'Admin');
    if (res.success) {
      alert(`Produto ${prod.codigo} ${nextStatus ? 'ativado' : 'inativado'} com sucesso!`);
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (confirm(`Tem certeza que deseja excluir o produto [${prod.codigo}] ${prod.descricao}? Esta ação não pode ser desfeita.`)) {
      const res = await excluirProduto(prod.id, user?.name || 'Admin');
      if (res.success) {
        alert(`Produto [${prod.codigo}] excluído com sucesso!`);
      } else {
        alert(res.error || 'Erro ao excluir produto.');
      }
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.codigo || !editingProduct?.descricao) {
      alert('Código e Descrição são obrigatórios!');
      return;
    }
    const res = await salvarProduto(editingProduct as Product, user?.name || 'Admin');
    if (!res.success) {
      alert(res.error || 'Erro ao salvar produto.');
      return;
    }
    setModalProdutoOpen(false);
    setEditingProduct(null);
    alert('Produto salvo com sucesso!');
  };

  const handleConfirmZerarEstoque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmZerarInput.trim() !== 'ZERAR') {
      alert('Digite ZERAR em maiúsculo para confirmar.');
      return;
    }
    await zerarSaldosEstoque(user?.name || 'Super Admin');
    setModalZerarOpen(false);
    setConfirmZerarInput('');
    alert('Todos os saldos de estoque foram zerados com sucesso!');
  };

  const categories = Array.from(new Set(db.products.map(p => p.categoria).filter(Boolean))) as string[];

  return (
    <div className="space-y-5">
      {/* 1. Topo com Abas e Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('mp')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'mp' ? 'bg-brand-700 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
          >
            🔩 Matéria-Prima (MP)
          </button>
          <button
            onClick={() => setActiveTab('muc')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'muc' ? 'bg-brand-700 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
          >
            📦 Uso e Consumo (MUC)
          </button>
          <button
            onClick={() => setActiveTab('pa')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'pa' ? 'bg-brand-700 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
          >
            🤖 Produto Acabado (PA)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<ShieldCheck className="w-3.5 h-3.5 text-teal-400" />}
            onClick={async () => {
              const res = await reconciliarEstoque(user?.name || 'Admin');
              alert(res.detalhes || 'Estoque reconciliado com sucesso!');
            }}
          >
            Reconciliar Estoque
          </Button>

          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => setModalZerarOpen(true)}
          >
            Zerar Todo o Estoque
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenNewProduct}
          >
            Novo Item
          </Button>
        </div>
      </div>

      {/* 2. Filtros e Busca */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código SKU ou descrição..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
          >
            <option value="todas">Todas as Categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* 3. VISUALIZAÇÃO MOBILE (CARDS RESPONSIVOS TOUCH-FRIENDLY COM 4 BOTÕES) */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {filteredProducts.map(prod => {
          const bal = db.stockBalances.find(b => b.productId === prod.id);
          const saldoFisico = bal?.quantidade || 0;
          const reservadoOps = (db.stockReservations || [])
            .filter(r => r.productId === prod.id && r.status === 'ativa')
            .reduce((sum, r) => sum + r.quantidade, 0);
          const disponivelReal = saldoFisico - reservadoOps; // Saldo líquido pode ser negativo indicando déficit

          return (
            <div
              key={prod.id}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                !prod.ativo
                  ? 'bg-slate-900/60 border-rose-900/40 opacity-70'
                  : (disponivelReal < 0 ? 'bg-[#151120] border-rose-900/60 shadow-md' : 'bg-[#111A2D] border-slate-800 shadow-md')
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-black text-brand-600 dark:text-teal-400">{prod.codigo}</span>
                  <h4 className="font-extrabold text-sm text-slate-100">{prod.descricao}</h4>
                  <span className="text-[11px] text-slate-400">UN: {prod.unidade} · {prod.categoria || 'Geral'}</span>
                </div>
                <Badge variant={prod.ativo ? 'success' : 'neutral'}>
                  {prod.ativo ? 'ATIVO' : 'INATIVO'}
                </Badge>
              </div>

              {/* Grid dos 3 Saldos no Mobile */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Físico Total</span>
                  <span className="font-mono font-bold text-slate-200 text-xs">{fmtQtd(saldoFisico, prod.unidade)}</span>
                </div>
                <div className="p-2 rounded-xl bg-amber-950/20 border border-amber-900/40">
                  <span className="text-[10px] text-amber-400 block font-bold">Reservado (OPs)</span>
                  <span className="font-mono font-bold text-amber-300 text-xs">{fmtQtd(reservadoOps, prod.unidade)}</span>
                </div>
                <div className={`p-2 rounded-xl border ${disponivelReal < 0 ? 'bg-rose-950/30 border-rose-800/80 text-rose-300' : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'}`}>
                  <span className="text-[10px] block font-bold">{disponivelReal < 0 ? 'Déficit (Falta)' : 'Disponível'}</span>
                  <span className="font-mono font-black text-xs">{fmtQtd(disponivelReal, prod.unidade)}</span>
                </div>
              </div>

              {/* Barra de 4 Ações no Mobile */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => handleOpenViewProduct(prod)}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-bold gap-1 transition-all"
                >
                  <Eye className="w-4 h-4 text-teal-400" />
                  <span>Detalhes</span>
                </button>

                <button
                  onClick={() => handleOpenEditProduct(prod)}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-bold gap-1 transition-all"
                >
                  <Edit className="w-4 h-4 text-amber-400" />
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => handleToggleAtivo(prod)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10.5px] font-bold gap-1 transition-all ${
                    prod.ativo ? 'bg-slate-800 hover:bg-orange-950/40 text-orange-400' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {prod.ativo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  <span>{prod.ativo ? 'Inativar' : 'Ativar'}</span>
                </button>

                <button
                  onClick={() => handleDeleteProduct(prod)}
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

      {/* 4. VISUALIZAÇÃO DESKTOP / TABLET (TABELA COM OS 3 SALDOS) */}
      <div className="hidden sm:block">
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Descrição do Item</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3 text-right">Físico Total</th>
                  <th className="px-4 py-3 text-right text-amber-500">Reservado (OPs)</th>
                  <th className="px-4 py-3 text-right">Disponível Real</th>
                  <th className="px-4 py-3 text-right">Custo Médio</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredProducts.map(prod => {
                  const bal = db.stockBalances.find(b => b.productId === prod.id);
                  const saldoFisico = bal?.quantidade || 0;
                  const reservadoOps = (db.stockReservations || [])
                    .filter(r => r.productId === prod.id && r.status === 'ativa')
                    .reduce((sum, r) => sum + r.quantidade, 0);
                  const disponivelReal = saldoFisico - reservadoOps; // Saldo líquido pode ser negativo

                  return (
                    <tr key={prod.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${!prod.ativo ? 'opacity-60 bg-slate-100/50 dark:bg-slate-950/40' : (disponivelReal < 0 ? 'bg-rose-950/10' : '')}`}>
                      <td className="px-4 py-3 font-mono font-bold text-brand-600 dark:text-teal-400">
                        {prod.codigo}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 dark:text-white block">{prod.descricao}</span>
                        <span className="text-[11px] text-slate-400">UN: {prod.unidade}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {prod.categoria || 'Geral'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {fmtQtd(saldoFisico, prod.unidade)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-500">
                        {fmtQtd(reservadoOps, prod.unidade)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {disponivelReal < 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono font-black text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg shadow-xs" title="Déficit de Insumo por Ordem de Produção">
                            {fmtQtd(disponivelReal, prod.unidade)}
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {fmtQtd(disponivelReal, prod.unidade)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                        {fmtMoeda(prod.custoMedioCents || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={prod.ativo ? 'success' : 'neutral'}>
                          {prod.ativo ? 'ATIVO' : 'INATIVO'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1. VISUALIZAR */}
                          <button
                            onClick={() => handleOpenViewProduct(prod)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Visualizar Detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. EDITAR */}
                          <button
                            onClick={() => handleOpenEditProduct(prod)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Editar Item"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. INATIVAR / ATIVAR */}
                          <button
                            onClick={() => handleToggleAtivo(prod)}
                            className={`p-1.5 rounded-lg transition-colors ${prod.ativo ? 'text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-emerald-500 hover:bg-emerald-950/40'}`}
                            title={prod.ativo ? 'Inativar Item' : 'Ativar Item'}
                          >
                            {prod.ativo ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </button>

                          {/* 4. EXCLUIR */}
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Excluir Item"
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

      {/* MODAL: VISUALIZAR DETALHES DO PRODUTO */}
      <Modal
        isOpen={modalViewOpen}
        onClose={() => setModalViewOpen(false)}
        title={`Ficha do Item — ${viewingProduct?.codigo}`}
        maxWidth="lg"
      >
        {viewingProduct && (() => {
          const bal = db.stockBalances.find(b => b.productId === viewingProduct.id);
          const fisico = bal?.quantidade || 0;
          const reservado = (db.stockReservations || []).filter(r => r.productId === viewingProduct.id && r.status === 'ativa').reduce((s, r) => s + r.quantidade, 0);
          const disponivel = fisico - reservado;

          return (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-brand-600 dark:text-teal-400 text-sm">{viewingProduct.codigo}</span>
                  <Badge variant={viewingProduct.ativo ? 'success' : 'neutral'}>{viewingProduct.ativo ? 'ATIVO' : 'INATIVO'}</Badge>
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{viewingProduct.descricao}</h3>
                <p className="text-slate-400">Categoria: <b>{viewingProduct.categoria || 'Geral'}</b> · Unidade: <b>{viewingProduct.unidade}</b></p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-[10px] text-slate-400 block font-bold">Físico Total</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {fmtQtd(fisico, viewingProduct.unidade)}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-[10px] text-amber-500 block font-bold">Reservado (OPs)</span>
                  <span className="font-mono font-bold text-amber-500 text-sm">
                    {fmtQtd(reservado, viewingProduct.unidade)}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${disponivel < 0 ? 'bg-rose-950/20 border-rose-800/80' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
                  <span className={`text-[10px] block font-bold ${disponivel < 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
                    {disponivel < 0 ? 'Déficit (Falta Insumo)' : 'Disponível Real'}
                  </span>
                  <span className={`font-mono font-black text-sm ${disponivel < 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
                    {fmtQtd(disponivel, viewingProduct.unidade)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>Fechar</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL: NOVO / EDITAR PRODUTO */}
      <Modal
        isOpen={modalProdutoOpen}
        onClose={() => setModalProdutoOpen(false)}
        title={editingProduct?.id && db.products.some(p => p.id === editingProduct.id) ? 'Editar Item do Catálogo' : 'Novo Item do Catálogo'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Código SKU *</label>
              <input
                type="text"
                value={editingProduct?.codigo || ''}
                onChange={e => setEditingProduct(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                placeholder="Ex: MP-ALU-01"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição do Item *</label>
              <input
                type="text"
                value={editingProduct?.descricao || ''}
                onChange={e => setEditingProduct(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Ex: Perfil de Alumínio Estrutural 30x30mm"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Item</label>
              <select
                value={editingProduct?.tipo_item || 'materia_prima'}
                onChange={e => setEditingProduct(prev => ({ ...prev, tipo_item: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                <option value="materia_prima">Matéria-Prima (MP)</option>
                <option value="muc">Uso e Consumo (MUC)</option>
                <option value="produto_acabado">Produto Acabado (PA)</option>
                <option value="insumo">Insumo / Fixadores</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unidade</label>
              <select
                value={editingProduct?.unidade || 'UN'}
                onChange={e => setEditingProduct(prev => ({ ...prev, unidade: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
              >
                <option value="UN">UN (Unidade)</option>
                <option value="M">M (Metros)</option>
                <option value="KG">KG (Quilos)</option>
                <option value="L">L (Litros)</option>
                <option value="CX">CX (Caixa)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
              <input
                type="text"
                value={editingProduct?.categoria || ''}
                onChange={e => setEditingProduct(prev => ({ ...prev, categoria: e.target.value }))}
                placeholder="Ex: Perfis, Motores, etc."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalProdutoOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">Salvar Item</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CONFIRMAR ZERAMENTO TOTAL */}
      <Modal
        isOpen={modalZerarOpen}
        onClose={() => setModalZerarOpen(false)}
        title="⚠️ ATENÇÃO: Zeramento Geral do Almoxarifado"
      >
        <form onSubmit={handleConfirmZerarEstoque} className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 space-y-2">
            <p className="font-bold">Esta operação irá zerar TODOS os saldos físicos e limpar todas as reservas ativas do sistema.</p>
            <p>Para confirmar esta ação irreversível, digite <b>ZERAR</b> no campo abaixo:</p>
          </div>

          <div>
            <input
              type="text"
              value={confirmZerarInput}
              onChange={e => setConfirmZerarInput(e.target.value)}
              placeholder="Digite ZERAR"
              className="w-full px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-900 bg-white dark:bg-slate-900 text-xs outline-none focus:border-rose-500 font-mono font-bold"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalZerarOpen(false)}>Cancelar</Button>
            <Button variant="danger" size="sm" type="submit" disabled={confirmZerarInput !== 'ZERAR'}>
              Confirmar Zeramento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
