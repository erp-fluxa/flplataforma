import React, { useState } from 'react';
import { Boxes, Plus, Trash2, Edit, Eye, Power, PowerOff, Search, Filter, AlertTriangle, ShieldCheck, Tag, Layers, Package } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { useDelete } from '../context/DeleteContext';
import { Button, Card, Badge, Modal } from '../components/ui';
import { fmtMoeda, fmtQtd, fmtData, uid } from '../lib/formatters';
import { Product, MaterialCategory } from '../types';

export const Estoque: React.FC = () => {
  const { db, updateDb, salvarProduto, excluirProduto, zerarSaldosEstoque, reconciliarEstoque, salvarCategoria, excluirCategoria } = useDb();
  const { user } = useAuth();
  const { requestDelete } = useDelete();

  const [activeTab, setActiveTab] = useState<'mp' | 'muc' | 'pa' | 'separacao'>('mp');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('todas');

  // Modais de Produto
  const [modalProdutoOpen, setModalProdutoOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Modais de Categoria
  const [modalCategoriasOpen, setModalCategoriasOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Partial<MaterialCategory> | null>(null);
  const [modalNovaCategoriaOpen, setModalNovaCategoriaOpen] = useState(false);

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

  const handleDeleteProduct = (prod: Product) => {
    const deps: string[] = [];
    const saldo = db.stockBalances?.find(b => b.productId === prod.id);
    if (saldo && saldo.saldoFisico !== 0) {
      deps.push(`Saldo Físico atual no estoque: ${saldo.saldoFisico} ${prod.unidadeMedida}`);
    }
    const temBOM = db.bomItems?.some(b => b.componentId === prod.id);
    if (temBOM) {
      deps.push('Este item é componente em uma ou mais Fichas Técnicas ativas.');
    }

    requestDelete({
      title: 'Excluir Produto / Insumo',
      itemName: `[${prod.codigo}] ${prod.descricao}`,
      itemType: 'Produto',
      entityType: 'product',
      moduleKey: 'estoque',
      originalId: prod.id,
      itemData: prod,
      isSoftDelete: true,
      dependencies: deps,
      warningMessage: 'Ao confirmar, o item será movido para a lixeira e você poderá desfazê-lo imediatamente.',
      onDelete: async () => {
        const res = await excluirProduto(prod.id, user?.name || 'Admin');
        if (!res.success) {
          throw new Error(res.error || 'Erro ao excluir produto.');
        }
      }
    });
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

  // Handlers de Categorias de Produtos
  const handleOpenNewCategory = (tipoPadrao?: 'MP' | 'MUC' | 'PA' | 'GERAL') => {
    setEditingCategoria({
      id: '',
      nome: '',
      tipo: tipoPadrao || (activeTab === 'mp' ? 'MP' : (activeTab === 'muc' ? 'MUC' : 'PA')),
      cor: 'teal',
      ativo: true
    });
    setModalNovaCategoriaOpen(true);
  };

  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoria?.nome || !editingCategoria.nome.trim()) {
      alert('O nome da categoria é obrigatório!');
      return;
    }

    const res = await salvarCategoria(editingCategoria as MaterialCategory, user?.name || 'Admin');
    if (res.success) {
      if (editingProduct) {
        setEditingProduct(prev => ({ ...prev, categoria: editingCategoria.nome?.trim() }));
      }
      setModalNovaCategoriaOpen(false);
      setEditingCategoria(null);
      alert('Categoria salva com sucesso!');
    } else {
      alert(res.error || 'Erro ao salvar categoria.');
    }
  };

  const handleDeleteCategoria = (cat: MaterialCategory) => {
    const vinculados = db.products.filter(p => p.categoria === cat.nome).length;
    const deps = vinculados > 0 ? [`Existem ${vinculados} produto(s) ou insumo(s) vinculados a esta categoria.`] : [];

    requestDelete({
      title: 'Excluir Categoria de Material',
      itemName: cat.nome,
      itemType: 'Categoria',
      entityType: 'category',
      moduleKey: 'estoque',
      originalId: cat.id,
      itemData: cat,
      isSoftDelete: true,
      dependencies: deps,
      warningMessage: 'Ao confirmar, a categoria será movida para a lixeira.',
      onDelete: async () => {
        const res = await excluirCategoria(cat.id, user?.name || 'Admin');
        if (!res.success) {
          throw new Error(res.error || 'Erro ao excluir categoria.');
        }
      }
    });
  };

  // Lista unificada de categorias
  const registeredCategories = db.materialCategories || [];
  const categories = Array.from(new Set([
    ...registeredCategories.map(c => c.nome),
    ...db.products.map(p => p.categoria).filter(Boolean)
  ])) as string[];

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
            icon={<Tag className="w-3.5 h-3.5 text-brand-600 dark:text-teal-400" />}
            onClick={() => setModalCategoriasOpen(true)}
          >
            Categorias ({registeredCategories.length})
          </Button>

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
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Categoria</label>
                <button
                  type="button"
                  onClick={() => handleOpenNewCategory()}
                  className="text-[10.5px] font-bold text-brand-600 dark:text-teal-400 hover:underline"
                >
                  + Nova Categoria
                </button>
              </div>
              <select
                value={editingProduct?.categoria || ''}
                onChange={e => setEditingProduct(prev => ({ ...prev, categoria: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-medium"
              >
                <option value="">Selecione a categoria...</option>
                {categories.map(catNome => (
                  <option key={catNome} value={catNome}>
                    {catNome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalProdutoOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">Salvar Item</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: GERENCIAMENTO DE CATEGORIAS */}
      <Modal
        isOpen={modalCategoriasOpen}
        onClose={() => setModalCategoriasOpen(false)}
        title="Gestão de Categorias de Materiais & Produtos"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Categorias Cadastradas</h4>
              <p className="text-slate-500 text-[11px]">Gerencie as categorias de Matéria-Prima, Consumo e Produtos Acabados.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleOpenNewCategory()}
            >
              + Nova Categoria
            </Button>
          </div>

          {/* Tabela de Categorias */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Nome da Categoria</th>
                  <th className="px-4 py-2.5">Tipo Aplicável</th>
                  <th className="px-4 py-2.5">Produtos Vinculados</th>
                  <th className="px-4 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {(registeredCategories.length > 0 ? registeredCategories : [
                  { id: 'cat-fil', nome: 'Filamento', tipo: 'MP', ativo: true },
                  { id: 'cat-mec', nome: 'Mecânica', tipo: 'MP', ativo: true },
                  { id: 'cat-elet', nome: 'Eletrônica', tipo: 'MP', ativo: true }
                ] as MaterialCategory[]).map(cat => {
                  const vinculados = db.products.filter(p => p.categoria === cat.nome).length;

                  return (
                    <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-brand-600 dark:text-teal-400" />
                        <span>{cat.nome}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={cat.tipo === 'MP' ? 'info' : (cat.tipo === 'PA' ? 'success' : (cat.tipo === 'MUC' ? 'warning' : 'neutral'))}>
                          {cat.tipo === 'MP' ? 'Matéria-Prima (MP)' : (cat.tipo === 'PA' ? 'Produto Acabado (PA)' : (cat.tipo === 'MUC' ? 'Uso/Consumo (MUC)' : 'Geral'))}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {vinculados} item(ns)
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingCategoria({ ...cat });
                              setModalNovaCategoriaOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                            title="Editar Categoria"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategoria(cat)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Excluir Categoria"
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

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setModalCategoriasOpen(false)}>Fechar</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: ADICIONAR / EDITAR CATEGORIA */}
      <Modal
        isOpen={modalNovaCategoriaOpen}
        onClose={() => { setModalNovaCategoriaOpen(false); setEditingCategoria(null); }}
        title={editingCategoria?.id ? 'Editar Categoria' : 'Nova Categoria de Material / Produto'}
      >
        <form onSubmit={handleSaveCategoria} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Categoria *</label>
            <input
              type="text"
              value={editingCategoria?.nome || ''}
              onChange={e => setEditingCategoria(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Ex: Motores & Drivers, Chapas Metálicas, etc."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Aplicação</label>
              <select
                value={editingCategoria?.tipo || 'MP'}
                onChange={e => setEditingCategoria(prev => ({ ...prev, tipo: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                <option value="MP">Matéria-Prima (MP)</option>
                <option value="MUC">Uso e Consumo (MUC)</option>
                <option value="PA">Produto Acabado (PA)</option>
                <option value="GERAL">Geral / Todos</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cor da Tag / Destaque</label>
              <select
                value={editingCategoria?.cor || 'teal'}
                onChange={e => setEditingCategoria(prev => ({ ...prev, cor: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                <option value="teal">Verde / Ciano (Teal)</option>
                <option value="blue">Azul (Blue)</option>
                <option value="amber">Amarelo / Âmbar (Amber)</option>
                <option value="purple">Roxo / Púrpura (Purple)</option>
                <option value="rose">Rosa / Vermelho (Rose)</option>
                <option value="slate">Cinza Neutro (Slate)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => { setModalNovaCategoriaOpen(false); setEditingCategoria(null); }}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Salvar Categoria
            </Button>
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
