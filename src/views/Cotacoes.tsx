import React, { useState } from 'react';
import { FileSpreadsheet, Plus, CheckCircle, Eye, ShoppingCart, Trash2, Edit, Power, PowerOff, Building, Sparkles, PackagePlus } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { fmtMoeda, fmtQtd, fmtData, uid } from '../lib/formatters';
import { Quotation, QuotationItem, QuotationSupplierPrice, PurchaseOrder, Product } from '../types';

export const Cotacoes: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();

  // Modais
  const [modalNovaCotacaoOpen, setModalNovaCotacaoOpen] = useState(false);
  const [modalComparativoOpen, setModalComparativoOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedCotacao, setSelectedCotacao] = useState<Quotation | null>(null);
  const [editingCotId, setEditingCotId] = useState<string | null>(null);

  // Form Cotação
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaDataLimite, setNovaDataLimite] = useState('');
  const [itensCotacao, setItensCotacao] = useState<{ productId: string; quantidade: number; observacao: string }[]>([]);

  // Aba de Adicionar Item: 'catalogo' ou 'manual'
  const [itemMode, setItemMode] = useState<'catalogo' | 'manual'>('catalogo');

  // Item do Catálogo Existente
  const [tempProdId, setTempProdId] = useState(db.products.find(p => p.ativo)?.id || '');
  const [tempQtd, setTempQtd] = useState(10);
  const [tempObs, setTempObs] = useState('');

  // Item Manual / Novo Pré-Cadastro
  const [manualDescricao, setManualDescricao] = useState('');
  const [manualTipo, setManualTipo] = useState<'materia_prima' | 'muc'>('materia_prima');
  const [manualCategoria, setManualCategoria] = useState('Eletrônica');
  const [manualUnidade, setManualUnidade] = useState('UN');
  const [manualQtd, setManualQtd] = useState(1);
  const [manualPrecoRef, setManualPrecoRef] = useState(0);

  // Form Mapa de Preços
  const [mapaPrecos, setMapaPrecos] = useState<Record<string, Record<string, { precoCents: number; prazoDias: number; selecionado: boolean }>>>({});

  const handleAddItemDoCatalogo = () => {
    if (!tempProdId) return;
    setItensCotacao(prev => [...prev, { productId: tempProdId, quantidade: tempQtd * 1000, observacao: tempObs }]);
    setTempObs('');
  };

  const handleCadastrarNovoItemManual = async () => {
    if (!manualDescricao.trim()) {
      alert('Por favor, informe a descrição do novo item.');
      return;
    }

    const prefix = manualTipo === 'materia_prima' ? 'MP' : 'MUC';
    const seq = (db.products || []).length + 1;
    const codigoGerado = `${prefix}-NOVO-${String(seq).padStart(3, '0')}`;
    const newProdId = uid('prod');

    const novoProduto: Product = {
      id: newProdId,
      codigo: codigoGerado,
      descricao: manualDescricao.trim(),
      unidade: manualUnidade,
      categoria: manualCategoria,
      tipo: manualTipo === 'materia_prima' ? 'MP' : 'MUC',
      tipo_item: manualTipo,
      estoqueMinimo: 1000,
      pontoReposicao: 2000,
      custoMedioCents: Math.round(manualPrecoRef * 100),
      precoReferencia: Math.round(manualPrecoRef * 100),
      ativo: true
    };

    // Salva no banco de produtos reativo
    await updateDb(prev => ({
      ...prev,
      products: [...(prev.products || []), novoProduto],
      auditLogs: [
        {
          id: uid('log'),
          timestamp: new Date().toISOString(),
          action: 'PRODUCT_QUICK_REGISTERED',
          actor: { id: user?.id || 'admin', name: user?.name || 'Admin' },
          target: { tipo: 'PRODUTO', codigo: codigoGerado },
          details: `Novo item "${manualDescricao}" pré-cadastrado via Cotação.`
        },
        ...(prev.auditLogs || [])
      ]
    }), 'PRODUCT_CREATED');

    // Adiciona na lista da cotação em andamento
    setItensCotacao(prev => [
      ...prev,
      { productId: newProdId, quantidade: manualQtd * 1000, observacao: 'Item novo pré-cadastrado' }
    ]);

    // Reseta form manual
    setManualDescricao('');
    setManualPrecoRef(0);
    setManualQtd(1);
    setItemMode('catalogo');
    setTempProdId(newProdId);
    alert(`Item [${codigoGerado}] ${novoProduto.descricao} pré-cadastrado e adicionado à cotação!`);
  };

  const handleRemoveItemTemp = (idx: number) => {
    setItensCotacao(prev => prev.filter((_, i) => i !== idx));
  };

  const handleOpenNew = () => {
    setEditingCotId(null);
    setNovaDescricao('');
    setNovaDataLimite('');
    setItensCotacao([]);
    setItemMode('catalogo');
    setModalNovaCotacaoOpen(true);
  };

  const handleOpenEdit = (cot: Quotation) => {
    setEditingCotId(cot.id);
    setNovaDescricao(cot.descricao);
    setNovaDataLimite(cot.dataLimite || '');
    const items = (db.quotationItems || []).filter(i => i.quotationId === cot.id);
    setItensCotacao(items.map(i => ({ productId: i.productId, quantidade: i.quantidade, observacao: i.observacao || '' })));
    setItemMode('catalogo');
    setModalNovaCotacaoOpen(true);
  };

  const handleOpenView = (cot: Quotation) => {
    setSelectedCotacao(cot);
    setModalViewOpen(true);
  };

  const handleToggleAtivo = async (cot: Quotation) => {
    const isCancelada = cot.status === 'reprovada';
    const nextStatus = isCancelada ? 'em_analise' : 'reprovada';

    await updateDb(prev => ({
      ...prev,
      quotations: prev.quotations.map(q => q.id === cot.id ? { ...q, status: nextStatus } : q)
    }), 'QUOTATION_STATUS_CHANGED');

    alert(`Cotação ${cot.codigo} ${nextStatus === 'reprovada' ? 'inativada / cancelada' : 'reativada'}!`);
  };

  const handleDelete = async (cot: Quotation) => {
    if (confirm(`Tem certeza que deseja excluir a cotação ${cot.codigo}?`)) {
      await updateDb(prev => ({
        ...prev,
        quotations: prev.quotations.filter(q => q.id !== cot.id),
        quotationItems: (prev.quotationItems || []).filter(i => i.quotationId !== cot.id)
      }), 'QUOTATION_DELETED');
      alert(`Cotação ${cot.codigo} excluída!`);
    }
  };

  const handleCriarOuEditarCotacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDescricao.trim()) {
      alert('Preencha a descrição da cotação.');
      return;
    }
    if (itensCotacao.length === 0) {
      alert('Adicione pelo menos 1 item à cotação.');
      return;
    }

    if (editingCotId) {
      // Edição
      await updateDb(prev => ({
        ...prev,
        quotations: prev.quotations.map(q => q.id === editingCotId ? {
          ...q,
          descricao: novaDescricao.trim(),
          dataLimite: novaDataLimite || undefined
        } : q),
        quotationItems: [
          ...(prev.quotationItems || []).filter(i => i.quotationId !== editingCotId),
          ...itensCotacao.map(it => ({
            id: uid('cotit'),
            quotationId: editingCotId,
            productId: it.productId,
            quantidade: it.quantidade,
            observacao: it.observacao
          }))
        ]
      }), 'QUOTATION_UPDATED');

      setModalNovaCotacaoOpen(false);
      alert('Cotação atualizada com sucesso!');
      return;
    }

    // Nova Cotação
    const seq = (db.quotations?.length || 0) + 1;
    const codigo = `COT-${String(seq).padStart(4, '0')}`;
    const cotId = uid('cot');

    const novaCot: Quotation = {
      id: cotId,
      codigo,
      descricao: novaDescricao.trim(),
      status: 'em_analise',
      dataLimite: novaDataLimite || undefined,
      companyId: db.currentCompanyId,
      criadoEm: new Date().toISOString(),
      criadoPor: user?.name || 'Admin'
    };

    const novosItens: QuotationItem[] = itensCotacao.map(it => ({
      id: uid('cotit'),
      quotationId: cotId,
      productId: it.productId,
      quantidade: it.quantidade,
      observacao: it.observacao
    }));

    await updateDb(prev => ({
      ...prev,
      quotations: [novaCot, ...(prev.quotations || [])],
      quotationItems: [...novosItens, ...(prev.quotationItems || [])],
      auditLogs: [
        {
          id: uid('log'),
          timestamp: new Date().toISOString(),
          action: 'QUOTATION_CREATED',
          actor: { id: user?.id || 'admin', name: user?.name || 'Admin' },
          target: { tipo: 'COTACAO', codigo },
          details: `Cotação ${codigo} criada com ${novosItens.length} itens.`
        },
        ...(prev.auditLogs || [])
      ]
    }), 'QUOTATION_CREATED');

    setModalNovaCotacaoOpen(false);
    alert(`Cotação ${codigo} criada com sucesso!`);
  };

  const handleAbrirComparativo = (cot: Quotation) => {
    setSelectedCotacao(cot);
    const existingPrices = (db.quotationPrices || []).filter(p => p.quotationId === cot.id);
    const map: Record<string, Record<string, { precoCents: number; prazoDias: number; selecionado: boolean }>> = {};

    existingPrices.forEach(p => {
      if (!map[p.supplierId]) map[p.supplierId] = {};
      map[p.supplierId][p.productId] = {
        precoCents: p.precoCents,
        prazoDias: p.prazoEntregaDias,
        selecionado: p.selecionado
      };
    });

    setMapaPrecos(map);
    setModalComparativoOpen(true);
  };

  const handlePrecoChange = (supplierId: string, productId: string, valorReais: number) => {
    setMapaPrecos(prev => ({
      ...prev,
      [supplierId]: {
        ...(prev[supplierId] || {}),
        [productId]: {
          ...(prev[supplierId]?.[productId] || { prazoDias: 7, selecionado: false }),
          precoCents: Math.round(valorReais * 100)
        }
      }
    }));
  };

  const handleConverterEmPedido = async (supplierId: string) => {
    if (!selectedCotacao) return;
    const sup = db.suppliers.find(s => s.id === supplierId);
    if (!sup) return;

    const cotItems = (db.quotationItems || []).filter(i => i.quotationId === selectedCotacao.id);
    const seq = (db.orders?.length || 0) + 1;
    const codigoPc = `PC-${String(seq).padStart(4, '0')}`;

    let totalCents = 0;
    cotItems.forEach(it => {
      const precoUnit = mapaPrecos[supplierId]?.[it.productId]?.precoCents || db.products.find(p => p.id === it.productId)?.custoMedioCents || 0;
      totalCents += Math.round((precoUnit * it.quantidade) / 1000);
    });

    const novoPedido: PurchaseOrder = {
      id: uid('pc'),
      codigo: codigoPc,
      fornecedorId: supplierId,
      status: 'aprovado',
      valorTotalCents: totalCents,
      dataPrevisaoEntrega: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      companyId: db.currentCompanyId,
      criadoEm: new Date().toISOString()
    };

    await updateDb(prev => ({
      ...prev,
      quotations: prev.quotations.map(q => q.id === selectedCotacao.id ? { ...q, status: 'aprovada' } : q),
      orders: [novoPedido, ...(prev.orders || [])],
      auditLogs: [
        {
          id: uid('log'),
          timestamp: new Date().toISOString(),
          action: 'PURCHASE_ORDER_GENERATED_FROM_QUOTATION',
          actor: { id: user?.id || 'admin', name: user?.name || 'Admin' },
          target: { tipo: 'PEDIDO_COMPRA', codigo: codigoPc },
          details: `Pedido de Compra ${codigoPc} gerado a partir da Cotação ${selectedCotacao.codigo} (Fornecedor: ${sup.razaoSocial}).`
        },
        ...(prev.auditLogs || [])
      ]
    }), 'PURCHASE_ORDER_GENERATED');

    setModalComparativoOpen(false);
    alert(`Pedido de Compra ${codigoPc} gerado com sucesso para ${sup.razaoSocial}! Valor: ${fmtMoeda(totalCents)}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-600 dark:text-teal-400" />
            Cotações de Preço & RFQ
          </h2>
          <p className="text-xs text-slate-500">
            Comparativo de preços entre fornecedores, homologação de matérias-primas e aprovação de compras.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenNew}
        >
          Nova Cotação
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Descrição / Finalidade</th>
              <th className="px-4 py-3">Itens</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data Limite</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {(db.quotations || []).map(cot => {
              const itens = (db.quotationItems || []).filter(i => i.quotationId === cot.id);

              return (
                <tr key={cot.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-brand-600 dark:text-teal-400">
                    {cot.codigo}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                    {cot.descricao}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold">
                      {itens.length} itens
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={cot.status === 'aprovada' ? 'success' : (cot.status === 'reprovada' ? 'danger' : 'info')}>
                      {cot.status.toUpperCase().replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {cot.dataLimite ? fmtData(cot.dataLimite) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="soft"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => handleAbrirComparativo(cot)}
                      >
                        Mapa de Preços
                      </Button>

                      {/* 1. VISUALIZAR */}
                      <button
                        onClick={() => handleOpenView(cot)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Visualizar Cotação"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* 2. EDITAR */}
                      <button
                        onClick={() => handleOpenEdit(cot)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Editar Cotação"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* 3. INATIVAR / ATIVAR */}
                      <button
                        onClick={() => handleToggleAtivo(cot)}
                        className={`p-1.5 rounded-lg transition-colors ${cot.status !== 'reprovada' ? 'text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-emerald-500 hover:bg-emerald-950/40'}`}
                        title={cot.status !== 'reprovada' ? 'Inativar/Reprovar Cotação' : 'Reativar Cotação'}
                      >
                        {cot.status !== 'reprovada' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </button>

                      {/* 4. EXCLUIR */}
                      <button
                        onClick={() => handleDelete(cot)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Excluir Cotação"
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

      {/* MODAL VIEW COTAÇÃO */}
      <Modal isOpen={modalViewOpen} onClose={() => setModalViewOpen(false)} title={`Ficha da Cotação — ${selectedCotacao?.codigo}`}>
        {selectedCotacao && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-brand-600 dark:text-teal-400 text-sm">{selectedCotacao.codigo}</span>
                <Badge variant={selectedCotacao.status === 'aprovada' ? 'success' : 'info'}>{selectedCotacao.status.toUpperCase()}</Badge>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedCotacao.descricao}</h3>
              <p className="text-slate-400">Criado em: <b>{fmtData(selectedCotacao.criadoEm)}</b> | Limite: <b>{selectedCotacao.dataLimite ? fmtData(selectedCotacao.dataLimite) : '—'}</b></p>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">Itens Solicitados na Cotação:</span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {(db.quotationItems || []).filter(i => i.quotationId === selectedCotacao.id).map(it => {
                  const prod = db.products.find(p => p.id === it.productId);
                  return (
                    <div key={it.id} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                      <div>
                        <span className="font-mono text-teal-400 block font-bold">[{prod?.codigo}]</span>
                        <span className="font-bold text-slate-900 dark:text-white">{prod?.descricao}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-500">{fmtQtd(it.quantidade, prod?.unidade || 'UN')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>Fechar</Button>
              <Button variant="primary" size="sm" onClick={() => { setModalViewOpen(false); handleAbrirComparativo(selectedCotacao); }}>Abrir Mapa de Preços</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: NOVA / EDITAR COTAÇÃO COM ADIÇÃO DE ITEM MANUAL / PRÉ-CADASTRO */}
      <Modal
        isOpen={modalNovaCotacaoOpen}
        onClose={() => setModalNovaCotacaoOpen(false)}
        title={editingCotId ? 'Editar Cotação' : 'Nova Cotação de Compras'}
        maxWidth="2xl"
      >
        <form onSubmit={handleCriarOuEditarCotacao} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Título / Descrição da Cotação *</label>
            <input
              type="text"
              value={novaDescricao}
              onChange={e => setNovaDescricao(e.target.value)}
              placeholder="Ex: Cotação de Filamentos PETG, Parafusos e Novos Componentes"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block">Adicionar Itens à Cotação</span>

              {/* Seletor de Modo: Catálogo ou Novo Item Manual */}
              <div className="flex rounded-lg bg-slate-200 dark:bg-slate-800 p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setItemMode('catalogo')}
                  className={`px-3 py-1 rounded-md transition-all ${itemMode === 'catalogo' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                >
                  Do Catálogo
                </button>
                <button
                  type="button"
                  onClick={() => setItemMode('manual')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all ${itemMode === 'manual' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  + Novo Item Manual (Pré-Cadastro)
                </button>
              </div>
            </div>

            {/* MODO 1: ITEM EXISTENTE NO CATÁLOGO */}
            {itemMode === 'catalogo' && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Item / Insumo</label>
                  <select
                    value={tempProdId}
                    onChange={e => setTempProdId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
                  >
                    {db.products.filter(p => p.ativo).map(p => (
                      <option key={p.id} value={p.id}>[{p.codigo}] {p.descricao}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Quantidade</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={tempQtd}
                    onChange={e => setTempQtd(parseFloat(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Button variant="soft" size="sm" type="button" onClick={handleAddItemDoCatalogo} className="w-full">
                    + Incluir Item
                  </Button>
                </div>
              </div>
            )}

            {/* MODO 2: NOVO ITEM MANUAL (PRÉ-CADASTRO AUTOMÁTICO) */}
            {itemMode === 'manual' && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                  <PackagePlus className="w-4 h-4" />
                  <span>Cadastrar Novo Item Rápido (Será incluído no catálogo automaticamente)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-7">
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">Descrição do Novo Item *</label>
                    <input
                      type="text"
                      value={manualDescricao}
                      onChange={e => setManualDescricao(e.target.value)}
                      placeholder="Ex: Fonte Chaveada 24V 350W MeanWell"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">Tipo de Item</label>
                    <select
                      value={manualTipo}
                      onChange={e => setManualTipo(e.target.value as any)}
                      className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
                    >
                      <option value="materia_prima">Matéria-Prima (MP)</option>
                      <option value="muc">Uso e Consumo (MUC)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">Unidade</label>
                    <select
                      value={manualUnidade}
                      onChange={e => setManualUnidade(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
                    >
                      <option value="UN">UN</option>
                      <option value="KG">KG</option>
                      <option value="M">M</option>
                      <option value="ROLO">ROLO</option>
                      <option value="CX">CX</option>
                      <option value="PAR">PAR</option>
                      <option value="L">L</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">Categoria</label>
                    <select
                      value={manualCategoria}
                      onChange={e => setManualCategoria(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
                    >
                      <option value="Eletrônica">Eletrônica & Automação</option>
                      <option value="Mecânica">Mecânica & Guias</option>
                      <option value="Filamento">Filamento 3D</option>
                      <option value="Ferramenta">Fixação & Ferramentas</option>
                      <option value="EPI">EPI & Segurança</option>
                      <option value="Embalagem">Embalagens</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">Quantidade</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={manualQtd}
                      onChange={e => setManualQtd(parseFloat(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none font-bold"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <Button
                      variant="amber"
                      size="sm"
                      type="button"
                      onClick={handleCadastrarNovoItemManual}
                      className="w-full"
                    >
                      ✓ Pré-Cadastrar & Incluir
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {itensCotacao.length > 0 && (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 pt-2">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">Itens Adicionados ({itensCotacao.length}):</span>
                {itensCotacao.map((it, idx) => {
                  const prod = db.products.find(p => p.id === it.productId);
                  return (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-teal-400 text-[10.5px] font-bold">[{prod?.codigo}]</span>{' '}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {prod?.descricao}
                        </span>{' '}
                        — <b className="text-brand-600 dark:text-teal-400 font-mono">{fmtQtd(it.quantidade, prod?.unidade || 'UN')}</b>
                      </div>
                      <button onClick={() => handleRemoveItemTemp(idx)} className="text-rose-500 hover:text-rose-700 p-1" title="Remover item">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovaCotacaoOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">{editingCotId ? 'Salvar Alterações' : 'Salvar e Abrir Cotação'}</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: MAPA DE PREÇOS E FORNECEDORES */}
      <Modal
        isOpen={modalComparativoOpen}
        onClose={() => setModalComparativoOpen(false)}
        title={`Mapa Comparativo de Preços — ${selectedCotacao?.codigo}`}
        maxWidth="4xl"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Insira os valores cotados por cada fornecedor para gerar o comparativo e emitir a Ordem de Compra.
          </p>

          <div className="space-y-4 overflow-x-auto">
            {db.suppliers.map(sup => {
              const cotItems = (db.quotationItems || []).filter(i => i.quotationId === selectedCotacao?.id);
              let totalFornecedor = 0;

              return (
                <div key={sup.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-brand-600 dark:text-teal-400" />
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">{sup.razaoSocial}</span>
                      <span className="text-[11px] text-slate-400">({sup.contatoNome || sup.email})</span>
                    </div>

                    <Button
                      variant="success"
                      size="sm"
                      icon={<ShoppingCart className="w-3.5 h-3.5" />}
                      onClick={() => handleConverterEmPedido(sup.id)}
                    >
                      Aprovar & Gerar Pedido de Compra
                    </Button>
                  </div>

                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2">Item / Insumo</th>
                        <th className="py-2">Quantidade</th>
                        <th className="py-2">Preço Unitário Cotado (R$)</th>
                        <th className="py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                      {cotItems.map(it => {
                        const prod = db.products.find(p => p.id === it.productId);
                        const precoUnit = mapaPrecos[sup.id]?.[it.productId]?.precoCents || 0;
                        const subtotalCents = Math.round((precoUnit * it.quantidade) / 1000);
                        totalFornecedor += subtotalCents;

                        return (
                          <tr key={it.id}>
                            <td className="py-2">
                              <span className="font-bold text-slate-900 dark:text-white">{prod?.descricao}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">[{prod?.codigo}]</span>
                            </td>
                            <td className="py-2 font-mono font-bold text-brand-600 dark:text-teal-400">
                              {fmtQtd(it.quantidade, prod?.unidade || 'UN')}
                            </td>
                            <td className="py-2">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={precoUnit ? precoUnit / 100 : ''}
                                onChange={e => handlePrecoChange(sup.id, it.productId, parseFloat(e.target.value) || 0)}
                                className="w-28 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold outline-none focus:border-brand-500"
                              />
                            </td>
                            <td className="py-2 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                              {fmtMoeda(subtotalCents)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 dark:border-slate-800 font-bold">
                        <td colSpan={3} className="pt-2 text-right text-slate-400 uppercase text-[10px]">Total Proposta Fornecedor:</td>
                        <td className="pt-2 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                          {fmtMoeda(totalFornecedor)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setModalComparativoOpen(false)}>Fechar Mapa</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
