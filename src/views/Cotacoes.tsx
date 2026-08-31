import React, { useState } from 'react';
import { FileSpreadsheet, Plus, CheckCircle, Eye, ShoppingCart, Trash2, Edit, Power, PowerOff, Building, Sparkles, PackagePlus, Scale, Award, Clock, DollarSign, ArrowRight, UserCheck } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { fmtMoeda, fmtQtd, fmtData, uid } from '../lib/formatters';
import { Quotation, QuotationItem, QuotationSupplierPrice, PurchaseOrder, Product, Supplier } from '../types';

export interface FornecedorComparacao {
  id: string;
  fornecedorId?: string;
  nomeFornecedor: string;
  valorUnitario: number;
  unidade: string;
  quantidade: number;
  prazo: string;
  condicaoPagamento?: string;
  observacao?: string;
}

export const Cotacoes: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();

  // Modais
  const [modalNovaCotacaoOpen, setModalNovaCotacaoOpen] = useState(false);
  const [modalComparativoOpen, setModalComparativoOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedCotacao, setSelectedCotacao] = useState<Quotation | null>(null);
  const [editingCotId, setEditingCotId] = useState<string | null>(null);

  // Comparador de Múltiplos Fornecedores Lado a Lado Dinâmico
  const [fornecedoresComparacao, setFornecedoresComparacao] = useState<FornecedorComparacao[]>([
    {
      id: 'sup-1',
      fornecedorId: db.suppliers[0]?.id || '',
      nomeFornecedor: db.suppliers[0]?.razaoSocial || 'Fornecedor A (Distribuidora Principal)',
      valorUnitario: 45.0,
      unidade: 'UN',
      quantidade: 10,
      prazo: '5 dias úteis',
      condicaoPagamento: '30 dias (Boleto)'
    },
    {
      id: 'sup-2',
      fornecedorId: db.suppliers[1]?.id || '',
      nomeFornecedor: db.suppliers[1]?.razaoSocial || 'Fornecedor B (Fabricante Direto)',
      valorUnitario: 42.5,
      unidade: 'UN',
      quantidade: 10,
      prazo: '7 dias úteis',
      condicaoPagamento: 'À vista (5% desc)'
    }
  ]);

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

  // FUNÇÕES DO COMPARADOR MULTI-FORNECEDORES DINÂMICO
  const handleAddFornecedor = () => {
    const proximoNum = fornecedoresComparacao.length + 1;
    const supDefault = db.suppliers[fornecedoresComparacao.length % (db.suppliers.length || 1)];
    const novaUnidade = fornecedoresComparacao[0]?.unidade || 'UN';
    const novaQtd = fornecedoresComparacao[0]?.quantidade || 1;

    setFornecedoresComparacao(prev => [
      ...prev,
      {
        id: uid('sup-cot'),
        fornecedorId: supDefault?.id || '',
        nomeFornecedor: supDefault?.razaoSocial || `Fornecedor ${String.fromCharCode(64 + proximoNum)}`,
        valorUnitario: 0,
        unidade: novaUnidade,
        quantidade: novaQtd,
        prazo: '5 dias úteis',
        condicaoPagamento: '30 dias'
      }
    ]);
  };

  const handleRemoveFornecedor = (id: string) => {
    if (fornecedoresComparacao.length <= 1) {
      alert('A comparação precisa ter pelo menos 1 fornecedor.');
      return;
    }
    setFornecedoresComparacao(prev => prev.filter(f => f.id !== id));
  };

  const handleUpdateFornecedor = (id: string, fields: Partial<FornecedorComparacao>) => {
    setFornecedoresComparacao(prev => prev.map(f => f.id === id ? { ...f, ...fields } : f));
  };

  const handleConverterComparacaoEmPedido = async (forn: FornecedorComparacao) => {
    if (!forn.valorUnitario || forn.valorUnitario <= 0) {
      alert('Informe o valor unitário do fornecedor antes de aprovar a compra.');
      return;
    }

    const seq = (db.orders?.length || 0) + 1;
    const codigoPc = `PC-${String(seq).padStart(4, '0')}`;
    const totalCents = Math.round((forn.valorUnitario * forn.quantidade) * 100);

    const novoPedido: PurchaseOrder = {
      id: uid('pc'),
      codigo: codigoPc,
      fornecedorId: forn.fornecedorId || (db.suppliers[0]?.id || 'sup-1'),
      status: 'aprovado',
      valorTotalCents: totalCents,
      condicaoPagamento: forn.condicaoPagamento || '30 dias',
      previsaoEntrega: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
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
          action: 'PURCHASE_ORDER_GENERATED_FROM_COMPARISON',
          actor: { id: user?.id || 'admin', name: user?.name || 'Admin' },
          target: { tipo: 'PEDIDO_COMPRA', codigo: codigoPc },
          details: `Pedido de Compra ${codigoPc} gerado a partir do comparativo multi-fornecedor (${forn.nomeFornecedor} — Total: ${fmtMoeda(totalCents)}).`
        },
        ...(prev.auditLogs || [])
      ]
    }), 'PURCHASE_ORDER_GENERATED');

    setModalComparativoOpen(false);
    alert(`🎉 Pedido de Compra ${codigoPc} gerado com sucesso para ${forn.nomeFornecedor}!\nValor Total: ${fmtMoeda(totalCents)}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-600 dark:text-teal-400" />
            Cotações de Preço & Comparativo Multi-Fornecedores
          </h2>
          <p className="text-xs text-slate-500">
            Comparativo de preços lado a lado entre fornecedores, cálculo automático e aprovação de compras.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Scale className="w-3.5 h-3.5 text-brand-600 dark:text-teal-400" />}
            onClick={() => {
              setSelectedCotacao(null);
              setModalComparativoOpen(true);
            }}
          >
            Comparar Fornecedores Lado a Lado
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenNew}
          >
            Nova Cotação
          </Button>
        </div>
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

      {/* MODAL: COMPARADOR DE MÚLTIPLOS FORNECEDORES LADO A LADO */}
      <Modal
        isOpen={modalComparativoOpen}
        onClose={() => setModalComparativoOpen(false)}
        title={selectedCotacao ? `Comparativo de Preços — ${selectedCotacao.codigo}` : 'Comparador de Cotações (Múltiplos Fornecedores)'}
        maxWidth="4xl"
      >
        <div className="space-y-4 text-xs">
          {/* Topo Informativo e Ação de Adicionar Fornecedor */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-brand-600 dark:text-teal-400" />
                Comparativo de Propostas Lado a Lado
              </h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Preencha os valores, prazos e condições de cada fornecedor. O total e o menor preço são calculados automaticamente.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleAddFornecedor}
            >
              + Adicionar Fornecedor ({fornecedoresComparacao.length})
            </Button>
          </div>

          {/* Grid de Fornecedores Lado a Lado (Scroll Horizontal Suave) */}
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x">
            {(() => {
              // Cálculo do Menor Total para Destaque
              const totaisValidos = fornecedoresComparacao
                .map(f => ({ id: f.id, total: (f.valorUnitario || 0) * (f.quantidade || 0) }))
                .filter(t => t.total > 0);
              const menorTotal = totaisValidos.length > 0 ? Math.min(...totaisValidos.map(t => t.total)) : 0;
              const maiorTotal = totaisValidos.length > 1 ? Math.max(...totaisValidos.map(t => t.total)) : 0;

              return fornecedoresComparacao.map((forn, index) => {
                const subtotal = (forn.valorUnitario || 0) * (forn.quantidade || 0);
                const isMelhorPreco = subtotal > 0 && subtotal === menorTotal && fornecedoresComparacao.length > 1;
                const economiaReais = maiorTotal > subtotal && isMelhorPreco ? maiorTotal - subtotal : 0;

                return (
                  <div
                    key={forn.id}
                    className={`w-[300px] sm:w-[330px] flex-shrink-0 snap-center rounded-2xl border p-4 transition-all space-y-3.5 flex flex-col justify-between ${
                      isMelhorPreco
                        ? 'bg-emerald-950/20 dark:bg-emerald-950/30 border-emerald-500/70 shadow-lg ring-2 ring-emerald-500/40'
                        : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header do Card do Fornecedor */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-500 dark:text-slate-400">
                              Proposta #{index + 1}
                            </span>
                            {isMelhorPreco && (
                              <Badge variant="success" className="animate-pulse">
                                ⭐ MELHOR PREÇO
                              </Badge>
                            )}
                          </div>
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white block truncate max-w-[210px]">
                            {forn.nomeFornecedor || `Fornecedor #${index + 1}`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFornecedor(forn.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Remover este fornecedor da comparação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 1. Seleção / Nome do Fornecedor */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Fornecedor
                        </label>
                        <select
                          value={forn.fornecedorId || ''}
                          onChange={e => {
                            const supId = e.target.value;
                            const supObj = db.suppliers.find(s => s.id === supId);
                            handleUpdateFornecedor(forn.id, {
                              fornecedorId: supId,
                              nomeFornecedor: supObj ? (supObj.nomeFantasia || supObj.razaoSocial) : forn.nomeFornecedor
                            });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none focus:border-brand-500 mb-1.5"
                        >
                          <option value="">Selecionar fornecedor cadastrado...</option>
                          {db.suppliers.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.nomeFantasia || s.razaoSocial} ({s.cnpj || 'CNPJ não informado'})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={forn.nomeFornecedor}
                          onChange={e => handleUpdateFornecedor(forn.id, { nomeFornecedor: e.target.value })}
                          placeholder="Ou digite o nome do fornecedor..."
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                        />
                      </div>

                      {/* 2. Valor Unitário & Unidade */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Valor Unitário (R$) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[11px]">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={forn.valorUnitario || ''}
                              onChange={e => handleUpdateFornecedor(forn.id, { valorUnitario: parseFloat(e.target.value) || 0 })}
                              placeholder="0,00"
                              className="w-full pl-8 pr-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold outline-none focus:border-brand-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Unidade
                          </label>
                          <select
                            value={forn.unidade}
                            onChange={e => handleUpdateFornecedor(forn.id, { unidade: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold outline-none focus:border-brand-500 font-mono"
                          >
                            <option value="UN">UN (Unidade)</option>
                            <option value="KG">KG (Quilo)</option>
                            <option value="M">M (Metro)</option>
                            <option value="M²">M² (Metro²)</option>
                            <option value="CX">CX (Caixa)</option>
                            <option value="ROLO">ROLO (Rolo/Carretel)</option>
                            <option value="PAR">PAR (Par)</option>
                            <option value="L">L (Litro)</option>
                            <option value="KIT">KIT (Conjunto)</option>
                          </select>
                        </div>
                      </div>

                      {/* 3. Quantidade & Prazo de Entrega */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Quantidade *
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={forn.quantidade || ''}
                            onChange={e => handleUpdateFornecedor(forn.id, { quantidade: parseFloat(e.target.value) || 0 })}
                            placeholder="1"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold outline-none focus:border-brand-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Prazo de Entrega
                          </label>
                          <input
                            type="text"
                            value={forn.prazo}
                            onChange={e => handleUpdateFornecedor(forn.id, { prazo: e.target.value })}
                            placeholder="Ex: 5 dias úteis"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                          />
                        </div>
                      </div>

                      {/* 4. Condições de Pagamento */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                          Condição de Pagamento
                        </label>
                        <input
                          type="text"
                          value={forn.condicaoPagamento || ''}
                          onChange={e => handleUpdateFornecedor(forn.id, { condicaoPagamento: e.target.value })}
                          placeholder="Ex: 30 dias / Boleto / À vista"
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* Bloco de Cálculo Automático e Ação */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                      <div className={`p-3 rounded-xl border text-center transition-all ${
                        isMelhorPreco
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                      }`}>
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                          Total Calculado (Valor × Qtd)
                        </span>
                        <span className={`font-mono font-black text-base block mt-0.5 ${
                          isMelhorPreco ? 'text-emerald-400 dark:text-emerald-300' : 'text-slate-900 dark:text-white'
                        }`}>
                          {fmtMoeda(subtotal * 100)}
                        </span>
                        {isMelhorPreco && economiaReais > 0 && (
                          <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                            Economia de {fmtMoeda(economiaReais * 100)}
                          </span>
                        )}
                      </div>

                      <Button
                        variant={isMelhorPreco ? 'success' : 'primary'}
                        size="sm"
                        icon={<ShoppingCart className="w-3.5 h-3.5" />}
                        className="w-full font-bold"
                        onClick={() => handleConverterComparacaoEmPedido(forn)}
                      >
                        Aprovar & Gerar Pedido (PC)
                      </Button>
                    </div>
                  </div>
                );
              });
            })()}

            {/* Bloco Tracejado para Adicionar Fornecedor */}
            <button
              type="button"
              onClick={handleAddFornecedor}
              className="w-[220px] sm:w-[260px] flex-shrink-0 snap-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700/80 hover:border-brand-500 dark:hover:border-teal-400 p-6 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-brand-600 dark:hover:text-teal-400 transition-all group cursor-pointer"
            >
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-500/10 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <div className="text-center">
                <span className="font-extrabold text-sm block">Adicionar Fornecedor</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Incluir mais uma proposta para comparação lado a lado</span>
              </div>
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setModalComparativoOpen(false)}>
              Fechar Comparador
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
