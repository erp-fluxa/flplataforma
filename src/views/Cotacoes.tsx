import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Plus, CheckCircle, Eye, ShoppingCart, Trash2, Edit, 
  Power, PowerOff, Building, Sparkles, PackagePlus, Scale, Award, 
  Clock, DollarSign, ArrowRight, UserCheck, Zap, AlertCircle, 
  Check, Calendar, CreditCard, Tag, Layers, ChevronRight
} from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { useDelete } from '../context/DeleteContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { fmtMoeda, fmtQtd, fmtData, uid } from '../lib/formatters';
import { Quotation, QuotationItem, QuotationSupplierPrice, PurchaseOrder, Product, Supplier, ShoppingItem } from '../types';
import { CompraRapida } from './CompraRapida';

export interface SupplierDraftQuote {
  id: string;
  supplierId: string;
  nomeFornecedor: string;
  valorUnitario: number;
  valorFinalManual?: number;
  prazoDias: number;
  prazoTexto: string;
  formaPagamento: string;
  observacao: string;
  selecionado: boolean;
}

export const Cotacoes: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();
  const { requestDelete } = useDelete();

  // Modais
  const [modalCompraRapidaOpen, setModalCompraRapidaOpen] = useState(false);
  const [modalNovaCotacaoOpen, setModalNovaCotacaoOpen] = useState(false);
  const [modalComparativoOpen, setModalComparativoOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [modalNovoFornecedorOpen, setModalNovoFornecedorOpen] = useState(false);

  // Estados de Seleção e Edição
  const [selectedCotacao, setSelectedCotacao] = useState<Quotation | null>(null);
  const [viewingCotacao, setViewingCotacao] = useState<Quotation | null>(null);
  const [editingCotId, setEditingCotId] = useState<string | null>(null);
  const [originShoppingItemId, setOriginShoppingItemId] = useState<string | null>(null);

  // Form Cotação
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaDataLimite, setNovaDataLimite] = useState('');
  const [novoStatus, setNovoStatus] = useState<Quotation['status']>('em_analise');
  const [itensCotacao, setItensCotacao] = useState<{ productId: string; quantidade: number; observacao: string }[]>([]);
  const [fornecedoresCotacao, setFornecedoresCotacao] = useState<SupplierDraftQuote[]>([]);

  // Item do Catálogo para inclusão na cotação
  const [tempProdId, setTempProdId] = useState(db.products.find(p => p.ativo)?.id || '');
  const [tempQtd, setTempQtd] = useState(1);
  const [tempObs, setTempObs] = useState('');

  // Form Novo Fornecedor Rápido
  const [novoFornRazao, setNovoFornRazao] = useState('');
  const [novoFornFantasia, setNovoFornFantasia] = useState('');
  const [novoFornCnpj, setNovoFornCnpj] = useState('');
  const [novoFornContato, setNovoFornContato] = useState('');
  const [novoFornTelefone, setNovoFornTelefone] = useState('');
  const [novoFornEmail, setNovoFornEmail] = useState('');

  // Itens da Lista de Compras Rápidas que estão PENDENTES de cotação
  // Mostra TODOS os itens que ainda não foram cancelados ou convertidos em pedido,
  // independente de 'completed' ou status — garante visibilidade total em Cotações & RFQ
  const pendingShoppingItems = useMemo(() => {
    return (db.gescompShoppingList || []).filter(
      item => item.status !== 'convertido_pedido' && item.status !== 'cancelado'
    );
  }, [db.gescompShoppingList]);

  // Fornecedores ativos
  const activeSuppliers = useMemo(() => {
    return (db.suppliers || []).filter(s => s.ativo !== false);
  }, [db.suppliers]);

  // -------------------------------------------------------------
  // HANDLERS DO FORMULÁRIO DE COTAÇÃO (NOVA / EDITAR)
  // -------------------------------------------------------------
  const handleOpenNew = () => {
    setEditingCotId(null);
    setOriginShoppingItemId(null);
    setNovaDescricao('');
    setNovaDataLimite(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setNovoStatus('em_analise');
    
    // Inicia com primeiro produto do catálogo
    const prodPadrao = db.products.find(p => p.ativo) || db.products[0];
    if (prodPadrao) {
      setItensCotacao([{ productId: prodPadrao.id, quantidade: 1000, observacao: '' }]);
    } else {
      setItensCotacao([]);
    }

    // Inicia com primeiro fornecedor cadastrado
    const supPadrao = activeSuppliers[0];
    if (supPadrao) {
      setFornecedoresCotacao([
        {
          id: uid('sup-draft'),
          supplierId: supPadrao.id,
          nomeFornecedor: supPadrao.nomeFantasia || supPadrao.razaoSocial,
          valorUnitario: 0,
          prazoDias: 5,
          prazoTexto: '5 dias úteis',
          formaPagamento: '28 DDL (Boleto)',
          observacao: '',
          selecionado: false
        }
      ]);
    } else {
      setFornecedoresCotacao([]);
    }

    setModalNovaCotacaoOpen(true);
  };

  // Transformar Item da Lista Rápida em Cotação
  const handleTransformQuickItemIntoQuote = (quickItem: ShoppingItem) => {
    setEditingCotId(null);
    setOriginShoppingItemId(quickItem.id);
    setNovaDescricao(`Cotação: ${quickItem.item}`);
    setNovaDataLimite(quickItem.dataNecessariaAte || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setNovoStatus('nova_solicitacao');

    // Tenta casar produto existente no catálogo
    const matchedProduct = db.products.find(
      p => p.descricao.toLowerCase().includes(quickItem.item.toLowerCase()) || 
           quickItem.item.toLowerCase().includes(p.descricao.toLowerCase())
    ) || db.products[0];

    const qtd = typeof quickItem.quantidade === 'number' ? quickItem.quantidade : parseFloat(quickItem.quantidade as any) || 1;
    if (matchedProduct) {
      setItensCotacao([
        {
          productId: matchedProduct.id,
          quantidade: qtd * 1000,
          observacao: `Item originado da Lista Rápida (${quickItem.item})`
        }
      ]);
    } else {
      setItensCotacao([]);
    }

    // Fornecedor sugerido ou padrão
    const suggestedSup = activeSuppliers.find(s => s.id === quickItem.fornecedorSugeridoId) || activeSuppliers[0];
    if (suggestedSup) {
      setFornecedoresCotacao([
        {
          id: uid('sup-draft'),
          supplierId: suggestedSup.id,
          nomeFornecedor: suggestedSup.nomeFantasia || suggestedSup.razaoSocial,
          valorUnitario: 0,
          prazoDias: 5,
          prazoTexto: '5 dias úteis',
          formaPagamento: '28 DDL',
          observacao: 'Fornecedor prioritário para cotação',
          selecionado: false
        }
      ]);
    } else {
      setFornecedoresCotacao([]);
    }

    setModalNovaCotacaoOpen(true);
  };

  // Abrir Edição de Cotação Existente
  const handleOpenEdit = (cot: Quotation) => {
    setEditingCotId(cot.id);
    setOriginShoppingItemId(cot.shoppingItemId || null);
    setNovaDescricao(cot.descricao);
    setNovaDataLimite(cot.dataLimite || '');
    setNovoStatus(cot.status);

    // Carrega itens da cotação
    const existingItems = (db.quotationItems || []).filter(i => i.quotationId === cot.id);
    setItensCotacao(existingItems.map(i => ({
      productId: i.productId,
      quantidade: i.quantidade,
      observacao: i.observacao || ''
    })));

    // Carrega preços e fornecedores da cotação
    const existingPrices = (db.quotationPrices || []).filter(p => p.quotationId === cot.id);
    if (existingPrices.length > 0) {
      const drafts: SupplierDraftQuote[] = existingPrices.map(p => {
        const sup = db.suppliers.find(s => s.id === p.supplierId);
        return {
          id: p.id,
          supplierId: p.supplierId,
          nomeFornecedor: sup?.nomeFantasia || sup?.razaoSocial || 'Fornecedor',
          valorUnitario: (p.precoUnitarioCents || 0) / 100,
          valorFinalManual: p.valorFinalCents ? p.valorFinalCents / 100 : undefined,
          prazoDias: p.prazoEntregaDias || 5,
          prazoTexto: p.prazoTexto || `${p.prazoEntregaDias || 5} dias`,
          formaPagamento: p.formaPagamento || p.condicaoPagamento || '28 DDL',
          observacao: p.observacao || '',
          selecionado: p.selecionado || false
        };
      });
      setFornecedoresCotacao(drafts);
    } else {
      setFornecedoresCotacao([]);
    }

    setModalNovaCotacaoOpen(true);
  };

  // Visualizar Cotação
  const handleOpenView = (cot: Quotation) => {
    setViewingCotacao(cot);
    setModalViewOpen(true);
  };

  // Excluir Cotação (Universal com Lixeira)
  const handleDelete = (cot: Quotation) => {
    const itensCount = db.quotationItems?.filter(i => i.quotationId === cot.id).length || 0;
    const precosCount = db.quotationPrices?.filter(p => p.quotationId === cot.id).length || 0;
    const deps: string[] = [];
    if (itensCount > 0) deps.push(`Possui ${itensCount} item(ns) cotado(s) vinculado(s).`);
    if (precosCount > 0) deps.push(`Possui ${precosCount} proposta(s) de fornecedores cadastrada(s).`);

    requestDelete({
      title: 'Excluir Cotação / RFQ',
      itemName: `Cotação ${cot.codigo} — ${cot.descricao}`,
      itemType: 'Cotação',
      entityType: 'quotation',
      moduleKey: 'compras',
      originalId: cot.id,
      itemData: cot,
      isSoftDelete: true,
      dependencies: deps,
      warningMessage: 'Ao confirmar, a cotação será movida para a lixeira.',
      onDelete: async () => {
        await updateDb(prev => ({
          ...prev,
          quotations: prev.quotations.filter(q => q.id !== cot.id),
          quotationItems: (prev.quotationItems || []).filter(i => i.quotationId !== cot.id),
          quotationPrices: (prev.quotationPrices || []).filter(p => p.quotationId !== cot.id)
        }), 'QUOTATION_DELETED');
      }
    });
  };

  // Adicionar Item do Catálogo na Cotação Draft
  const handleAddItemDoCatalogo = () => {
    if (!tempProdId) return;
    setItensCotacao(prev => [...prev, { productId: tempProdId, quantidade: tempQtd * 1000, observacao: tempObs }]);
    setTempObs('');
  };

  const handleRemoveItemDraft = (idx: number) => {
    setItensCotacao(prev => prev.filter((_, i) => i !== idx));
  };

  // Adicionar Fornecedor no Draft da Cotação
  const handleAddSupplierDraft = (supplierId: string) => {
    const sup = activeSuppliers.find(s => s.id === supplierId);
    if (!sup) return;
    if (fornecedoresCotacao.some(f => f.supplierId === supplierId)) {
      alert('Este fornecedor já foi adicionado a esta cotação.');
      return;
    }

    setFornecedoresCotacao(prev => [
      ...prev,
      {
        id: uid('sup-draft'),
        supplierId: sup.id,
        nomeFornecedor: sup.nomeFantasia || sup.razaoSocial,
        valorUnitario: 0,
        prazoDias: 5,
        prazoTexto: '5 dias úteis',
        formaPagamento: '28 DDL',
        observacao: '',
        selecionado: false
      }
    ]);
  };

  const handleRemoveSupplierDraft = (id: string) => {
    setFornecedoresCotacao(prev => prev.filter(f => f.id !== id));
  };

  const handleUpdateSupplierDraft = (id: string, fields: Partial<SupplierDraftQuote>) => {
    setFornecedoresCotacao(prev => prev.map(f => f.id === id ? { ...f, ...fields } : f));
  };

  // Salvar Novo Fornecedor Rápido (Ação Explícita)
  const handleSalvarNovoFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFornRazao.trim()) return;

    const supplierId = uid('for');
    const newSupplier: Supplier = {
      id: supplierId,
      razaoSocial: novoFornRazao.trim(),
      nomeFantasia: novoFornFantasia.trim() || novoFornRazao.trim(),
      cnpj: novoFornCnpj.trim() || '00.000.000/0000-00',
      contatoNome: novoFornContato.trim(),
      email: novoFornEmail.trim(),
      telefone: novoFornTelefone.trim(),
      categoriaPrincipal: 'Geral',
      avaliacao: 5,
      ativo: true
    };

    await updateDb(prev => ({
      ...prev,
      suppliers: [newSupplier, ...(prev.suppliers || [])]
    }), 'SUPPLIER_CREATED');

    handleAddSupplierDraft(supplierId);
    setModalNovoFornecedorOpen(false);
    setNovoFornRazao('');
    setNovoFornFantasia('');
    setNovoFornCnpj('');
    setNovoFornContato('');
    setNovoFornTelefone('');
    setNovoFornEmail('');
    alert(`Fornecedor "${newSupplier.nomeFantasia}" cadastrado e adicionado à cotação!`);
  };

  // Submissão do Formulário de Cotação (Nova / Editar)
  const handleCriarOuEditarCotacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDescricao.trim()) {
      alert('Preencha a descrição/finalidade da cotação.');
      return;
    }
    if (itensCotacao.length === 0) {
      alert('Adicione pelo menos 1 item à cotação.');
      return;
    }

    const now = new Date().toISOString();

    if (editingCotId) {
      // ------------------------------------
      // ATUALIZAÇÃO DE COTAÇÃO EXISTENTE
      // ------------------------------------
      const cotItems: QuotationItem[] = itensCotacao.map(it => ({
        id: uid('cotit'),
        quotationId: editingCotId,
        productId: it.productId,
        quantidade: it.quantidade,
        observacao: it.observacao
      }));

      const cotPrices: QuotationSupplierPrice[] = fornecedoresCotacao.map(f => {
        const itemPrinc = itensCotacao[0];
        const qtdUn = (itemPrinc?.quantidade || 1000) / 1000;
        const totalCalculado = Math.round(f.valorUnitario * qtdUn * 100);
        const finalCents = f.valorFinalManual !== undefined ? Math.round(f.valorFinalManual * 100) : totalCalculado;

        return {
          id: f.id.startsWith('qpr-') || f.id.startsWith('sup-') ? uid('qpr') : f.id,
          quotationId: editingCotId,
          supplierId: f.supplierId,
          productId: itemPrinc?.productId || '',
          precoUnitarioCents: Math.round(f.valorUnitario * 100),
          valorFinalCents: finalCents,
          prazoEntregaDias: f.prazoDias,
          prazoTexto: f.prazoTexto,
          formaPagamento: f.formaPagamento,
          observacao: f.observacao,
          selecionado: f.selecionado
        };
      });

      await updateDb(prev => ({
        ...prev,
        quotations: prev.quotations.map(q => q.id === editingCotId ? {
          ...q,
          descricao: novaDescricao.trim(),
          dataLimite: novaDataLimite || undefined,
          status: novoStatus
        } : q),
        quotationItems: [
          ...(prev.quotationItems || []).filter(i => i.quotationId !== editingCotId),
          ...cotItems
        ],
        quotationPrices: [
          ...(prev.quotationPrices || []).filter(p => p.quotationId !== editingCotId),
          ...cotPrices
        ],
        auditLogs: [
          {
            id: uid('log'),
            timestamp: now,
            action: 'QUOTATION_UPDATED',
            actor: { id: user?.id || 'admin', name: user?.name || 'Admin' },
            target: { tipo: 'COTACAO', codigo: prev.quotations.find(q => q.id === editingCotId)?.codigo || '' },
            details: `Cotação atualizada com ${cotItems.length} itens e ${cotPrices.length} propostas de fornecedores.`
          },
          ...(prev.auditLogs || [])
        ]
      }), 'QUOTATION_UPDATED');

      setModalNovaCotacaoOpen(false);
      alert('Cotação atualizada com sucesso!');
      return;
    }

    // ------------------------------------
    // CRIAÇÃO DE NOVA COTAÇÃO
    // ------------------------------------
    const seq = (db.quotations?.length || 0) + 1;
    const codigo = `COT-${String(seq).padStart(4, '0')}`;
    const cotId = uid('cot');

    const novaCot: Quotation = {
      id: cotId,
      codigo,
      descricao: novaDescricao.trim(),
      status: novoStatus || 'em_analise',
      dataAbertura: now.split('T')[0],
      dataLimite: novaDataLimite || undefined,
      solicitanteId: user?.id || 'usr-admin',
      solicitanteNome: user?.name || 'Comprador',
      shoppingItemId: originShoppingItemId || undefined,
      companyId: db.currentCompanyId,
      criadoEm: now,
      criadoPor: user?.name || 'Admin'
    };

    const novosItens: QuotationItem[] = itensCotacao.map(it => ({
      id: uid('cotit'),
      quotationId: cotId,
      productId: it.productId,
      quantidade: it.quantidade,
      observacao: it.observacao
    }));

    const novosPrecos: QuotationSupplierPrice[] = fornecedoresCotacao.map(f => {
      const itemPrinc = itensCotacao[0];
      const qtdUn = (itemPrinc?.quantidade || 1000) / 1000;
      const totalCalculado = Math.round(f.valorUnitario * qtdUn * 100);
      const finalCents = f.valorFinalManual !== undefined ? Math.round(f.valorFinalManual * 100) : totalCalculado;

      return {
        id: uid('qpr'),
        quotationId: cotId,
        supplierId: f.supplierId,
        productId: itemPrinc?.productId || '',
        precoUnitarioCents: Math.round(f.valorUnitario * 100),
        valorFinalCents: finalCents,
        prazoEntregaDias: f.prazoDias,
        prazoTexto: f.prazoTexto,
        formaPagamento: f.formaPagamento,
        observacao: f.observacao,
        selecionado: f.selecionado
      };
    });

    // Se a cotação veio da Lista Rápida, atualiza o item original para 'em_cotacao'
    let updatedShoppingList = prevShoppingList(db.gescompShoppingList || [], originShoppingItemId, codigo, now, user?.name || 'Comprador');

    await updateDb(prev => ({
      ...prev,
      quotations: [novaCot, ...(prev.quotations || [])],
      quotationItems: [...novosItens, ...(prev.quotationItems || [])],
      quotationPrices: [...novosPrecos, ...(prev.quotationPrices || [])],
      gescompShoppingList: updatedShoppingList,
      auditLogs: [
        {
          id: uid('log'),
          timestamp: now,
          action: 'QUOTATION_CREATED',
          actor: { id: user?.id || 'admin', name: user?.name || 'Admin' },
          target: { tipo: 'COTACAO', codigo },
          details: `Cotação ${codigo} criada com ${novosItens.length} itens e ${novosPrecos.length} fornecedores vinculados.`
        },
        ...(prev.auditLogs || [])
      ]
    }), 'QUOTATION_CREATED');

    setModalNovaCotacaoOpen(false);
    alert(`Cotação ${codigo} criada com sucesso!`);
  };

  function prevShoppingList(list: ShoppingItem[], itemId: string | null, codigoCot: string, now: string, userName: string) {
    if (!itemId) return list;
    return list.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: 'em_cotacao' as const,
          observacoes: (item.observacoes ? `${item.observacoes} | ` : '') + `Vinculado à cotação ${codigoCot}`,
          historicoStatus: [
            ...(item.historicoStatus || []),
            {
              id: uid('hist'),
              deStatus: item.status,
              paraStatus: 'em_cotacao',
              data: now,
              usuarioNome: userName
            }
          ]
        };
      }
      return item;
    });
  }

  // Abrir Modal de Comparação Lado a Lado
  const handleAbrirComparativo = (cot: Quotation) => {
    setSelectedCotacao(cot);
    const existingPrices = (db.quotationPrices || []).filter(p => p.quotationId === cot.id);
    const drafts: SupplierDraftQuote[] = existingPrices.map(p => {
      const sup = db.suppliers.find(s => s.id === p.supplierId);
      return {
        id: p.id,
        supplierId: p.supplierId,
        nomeFornecedor: sup?.nomeFantasia || sup?.razaoSocial || 'Fornecedor',
        valorUnitario: (p.precoUnitarioCents || 0) / 100,
        valorFinalManual: p.valorFinalCents ? p.valorFinalCents / 100 : undefined,
        prazoDias: p.prazoEntregaDias || 5,
        prazoTexto: p.prazoTexto || `${p.prazoEntregaDias || 5} dias`,
        formaPagamento: p.formaPagamento || p.condicaoPagamento || '28 DDL',
        observacao: p.observacao || '',
        selecionado: p.selecionado || false
      };
    });

    setFornecedoresCotacao(drafts);
    setModalComparativoOpen(true);
  };

  // Converter Vencedor da Comparação em Pedido de Compra
  const handleConverterEmPedido = async (forn: SupplierDraftQuote) => {
    if (!selectedCotacao) return;
    if (forn.valorUnitario <= 0 && (!forn.valorFinalManual || forn.valorFinalManual <= 0)) {
      alert('Informe o valor unitário ou final do fornecedor antes de aprovar a compra.');
      return;
    }

    const cotItems = (db.quotationItems || []).filter(i => i.quotationId === selectedCotacao.id);
    const itemPrinc = cotItems[0];
    const qtdUn = (itemPrinc?.quantidade || 1000) / 1000;
    const totalCents = forn.valorFinalManual ? Math.round(forn.valorFinalManual * 100) : Math.round(forn.valorUnitario * qtdUn * 100);

    const seq = (db.orders?.length || 0) + 1;
    const codigoPc = `PC-${String(seq).padStart(4, '0')}`;
    const now = new Date().toISOString();

    const novoPedido: PurchaseOrder = {
      id: uid('pc'),
      codigo: codigoPc,
      supplierId: forn.supplierId,
      quotationId: selectedCotacao.id,
      status: 'emitido',
      valorTotalCents: totalCents,
      condicaoPagamento: forn.formaPagamento,
      previsaoEntrega: new Date(Date.now() + (forn.prazoDias || 7) * 86400000).toISOString().split('T')[0],
      companyId: db.currentCompanyId,
      criadoEm: now
    };

    await updateDb(prev => ({
      ...prev,
      quotations: prev.quotations.map(q => q.id === selectedCotacao.id ? { 
        ...q, 
        status: 'aprovada',
        fornecedorVencedorId: forn.supplierId,
        valorTotalFechadoCents: totalCents
      } : q),
      quotationPrices: (prev.quotationPrices || []).map(p => {
        if (p.quotationId === selectedCotacao.id) {
          return { ...p, selecionado: p.supplierId === forn.supplierId };
        }
        return p;
      }),
      orders: [novoPedido, ...(prev.orders || [])],
      auditLogs: [
        {
          id: uid('log'),
          timestamp: now,
          action: 'PURCHASE_ORDER_GENERATED_FROM_QUOTATION',
          actor: { id: user?.id || 'admin', name: user?.name || 'Admin' },
          target: { tipo: 'PEDIDO_COMPRA', codigo: codigoPc },
          details: `Pedido de Compra ${codigoPc} gerado a partir da Cotação ${selectedCotacao.codigo} (${forn.nomeFornecedor} — Total: ${fmtMoeda(totalCents)}).`
        },
        ...(prev.auditLogs || [])
      ]
    }), 'PURCHASE_ORDER_GENERATED');

    setModalComparativoOpen(false);
    alert(`🎉 Pedido de Compra ${codigoPc} gerado com sucesso para ${forn.nomeFornecedor}!\nValor: ${fmtMoeda(totalCents)}\nPrazo: ${forn.prazoTexto}\nPagamento: ${forn.formaPagamento}`);
  };

  const getStatusBadge = (status: Quotation['status']) => {
    switch (status) {
      case 'nova_solicitacao': return <Badge variant="warning">NOVA SOLICITAÇÃO</Badge>;
      case 'em_analise': return <Badge variant="info">EM ANÁLISE</Badge>;
      case 'enviada_fornecedor': return <Badge variant="neutral">ENVIADA AO FORNECEDOR</Badge>;
      case 'cotacao_recebida': return <Badge variant="info">PROPOSTA RECEBIDA</Badge>;
      case 'em_comparacao': return <Badge variant="brand">EM COMPARAÇÃO</Badge>;
      case 'aprovada': return <Badge variant="success">APROVADA / PC GERADO</Badge>;
      case 'reprovada': return <Badge variant="danger">REPROVADA / CANCELADA</Badge>;
      default: return <Badge variant="neutral">{status?.toUpperCase() || 'EM ANDAMENTO'}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================================= */}
      {/* BLOCO TOPO: ITENS DA LISTA DE COMPRAS RÁPIDA — SEMPRE VISÍVEL */}
      {/* ============================================================= */}
      {pendingShoppingItems.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-slate-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-amber-300 flex items-center gap-2">
                  📋 Lista de Compras Rápidas — Aguardando Cotação
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                    {pendingShoppingItems.length}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Itens adicionados em "Tarefas &amp; Lista de Compras" que ainda não viraram cotação. Clique em "Transformar em Cotação" para processar.</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-amber-500/20">
            <table className="w-full text-xs">
              <thead className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 uppercase font-bold">
                <tr>
                  <th className="px-3 py-2 text-left">Item Solicitado</th>
                  <th className="px-3 py-2 text-left">Qtd</th>
                  <th className="px-3 py-2 text-left">Prioridade</th>
                  <th className="px-3 py-2 text-left">Fornecedor Sugerido</th>
                  <th className="px-3 py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {pendingShoppingItems.map(item => (
                  <tr key={item.id} className="hover:bg-amber-500/5 transition-colors">
                    <td className="px-3 py-2">
                      <span className="font-bold text-white">{item.item}</span>
                      {item.observacoes && <span className="block text-[10px] text-slate-400">{item.observacoes}</span>}
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-slate-300">{item.quantidade || 1} {item.unidade || 'UN'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${item.prioridade === 'urgente' ? 'bg-rose-500/20 text-rose-400' : item.prioridade === 'programada' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {item.prioridade?.toUpperCase() || 'NORMAL'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-400">{item.fornecedorSugeridoNome || 'Qualquer homologado'}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Zap className="w-3 h-3" />}
                        onClick={() => handleTransformQuickItemIntoQuote(item)}
                        className="bg-amber-600 hover:bg-amber-500 font-bold text-[11px] px-2 py-1"
                      >
                        Transformar em Cotação
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. CABEÇALHO PRINCIPAL COM AÇÕES RÁPIDAS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-600 dark:text-teal-400" />
            Cotações de Preço & Comparativo Multi-Fornecedores
          </h2>
          <p className="text-xs text-slate-500">
            Comparativo de preços lado a lado entre fornecedores, prazos, formas de pagamento e aprovação de compras.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Zap className="w-3.5 h-3.5 text-teal-300" />}
            onClick={() => setModalCompraRapidaOpen(true)}
            className="bg-teal-600 hover:bg-teal-500 font-bold"
          >
            ⚡ Compra Rápida
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Scale className="w-3.5 h-3.5 text-brand-600 dark:text-teal-400" />}
            onClick={() => {
              if (db.quotations && db.quotations.length > 0) {
                handleAbrirComparativo(db.quotations[0]);
              } else {
                alert('Cadastre uma cotação primeiro.');
              }
            }}
          >
            Comparar Fornecedores
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenNew}
          >
            + Nova Cotação Completa
          </Button>
        </div>
      </div>

      {/* 2. TABELA PRINCIPAL DE COTAÇÕES & RFQ (CRUD COMPLETO) */}
      <Card title="Cotações Cadastradas no Sistema" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Descrição / Finalidade</th>
                <th className="px-4 py-3">Itens</th>
                <th className="px-4 py-3">Fornecedores Cotados</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data Limite</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {(db.quotations || []).map(cot => {
                const itensCount = (db.quotationItems || []).filter(i => i.quotationId === cot.id).length;
                const fornPrices = (db.quotationPrices || []).filter(p => p.quotationId === cot.id);
                const fornCount = fornPrices.length;

                return (
                  <tr key={cot.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-brand-600 dark:text-teal-400">
                      {cot.codigo}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 dark:text-white block">{cot.descricao}</span>
                      {cot.criadoPor && (
                        <span className="text-[10px] text-slate-400">Por: {cot.criadoPor}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                        {itensCount} item(ns)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${fornCount > 0 ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-slate-800 text-slate-400'}`}>
                          {fornCount} fornecedor(es)
                        </span>
                        {fornCount > 1 && (
                          <span className="text-[10px] text-amber-400 font-bold">Multi-proposta</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(cot.status)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {cot.dataLimite ? fmtData(cot.dataLimite) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Botão Comparar Propostas */}
                        <button
                          onClick={() => handleAbrirComparativo(cot)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition-colors flex items-center gap-1"
                          title="Comparar Propostas e Preços"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>Mapa</span>
                        </button>

                        {/* 1. VISUALIZAR */}
                        <button
                          onClick={() => handleOpenView(cot)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Visualizar Cotação Completa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* 2. EDITAR */}
                        <button
                          onClick={() => handleOpenEdit(cot)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Editar Cotação"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* 3. EXCLUIR */}
                        <button
                          onClick={() => handleDelete(cot)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Excluir Cotação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {(!db.quotations || db.quotations.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma cotação cadastrada no momento. Clique em "+ Nova Cotação" ou use a Compra Rápida.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 3. SEÇÃO DE INTEGRAÇÃO: ITENS PENDENTES DA LISTA DE COMPRAS RÁPIDA       */}
      {/* ========================================================================= */}
      <div className="space-y-3 pt-2">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-slate-900/80 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Itens Pendentes da Lista de Compras Rápida
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 font-mono">
                  {pendingShoppingItems.length} aguardando cotação
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Itens solicitados pelos operadores e setores que ainda não viraram cotação. Clique em "Transformar em Cotação" para processar.
              </p>
            </div>
          </div>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Item Solicitado</th>
                  <th className="px-4 py-3">Quantidade & Unidade</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Data Necessária</th>
                  <th className="px-4 py-3">Fornecedor Sugerido</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação de Compras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {pendingShoppingItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 dark:text-white block text-sm">{item.item}</span>
                      {item.observacoes && (
                        <span className="text-[10.5px] text-slate-400">{item.observacoes}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {item.quantidade || 1} {item.unidade || 'UN'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.prioridade === 'urgente' ? 'danger' : (item.prioridade === 'programada' ? 'info' : 'warning')}>
                        {item.prioridade?.toUpperCase() || 'NORMAL'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {item.dataNecessariaAte ? fmtData(item.dataNecessariaAte) : 'Imediato'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {item.fornecedorSugeridoNome || 'Qualquer homologado'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status === 'em_cotacao' ? 'info' : 'warning'}>
                        {item.status === 'em_cotacao' ? 'EM COTAÇÃO' : 'PENDENTE'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Zap className="w-3.5 h-3.5" />}
                        onClick={() => handleTransformQuickItemIntoQuote(item)}
                        className="bg-amber-600 hover:bg-amber-500 font-bold text-xs"
                      >
                        Transformar em Cotação
                      </Button>
                    </td>
                  </tr>
                ))}

                {pendingShoppingItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Nenhum item pendente na lista rápida. Todos os itens já foram cotados ou processados! 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: NOVA / EDITAR COTAÇÃO COM MULTI-FORNECEDOR & VALORES               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalNovaCotacaoOpen}
        onClose={() => setModalNovaCotacaoOpen(false)}
        title={editingCotId ? 'Editar Cotação & Propostas de Fornecedores' : 'Nova Cotação / RFQ de Suprimentos'}
        maxWidth="2xl"
      >
        <form onSubmit={handleCriarOuEditarCotacao} className="space-y-5 text-xs">
          {/* Identificação Principal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição / Finalidade da Cotação *</label>
              <input
                type="text"
                value={novaDescricao}
                onChange={e => setNovaDescricao(e.target.value)}
                placeholder="Ex: Aquisição de 10 Guias Lineares MGN12H para Montagem CoreXY"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-medium"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data Limite de Resposta</label>
              <input
                type="date"
                value={novaDataLimite}
                onChange={e => setNovaDataLimite(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
              />
            </div>
          </div>

          {/* Bloco 1: Itens a Cotar */}
          <Card title="1. Itens da Cotação">
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={tempProdId}
                  onChange={e => setTempProdId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-medium"
                >
                  <option value="">Selecione um produto do catálogo...</option>
                  {db.products.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.codigo}] {p.descricao} ({p.unidade})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={tempQtd}
                  onChange={e => setTempQtd(parseInt(e.target.value) || 1)}
                  className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none font-mono"
                  placeholder="Qtd"
                />
                <Button variant="secondary" size="sm" type="button" onClick={handleAddItemDoCatalogo}>
                  + Item
                </Button>
              </div>

              {/* Lista de Itens Inseridos */}
              <div className="space-y-1.5">
                {itensCotacao.map((it, idx) => {
                  const prod = db.products.find(p => p.id === it.productId);
                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          [{prod?.codigo || 'SKU'}] {prod?.descricao || it.productId}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Quantidade: {fmtQtd(it.quantidade, prod?.unidade || 'UN')} {it.observacao && `· ${it.observacao}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemDraft(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500"
                        title="Remover Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Bloco 2: Múltiplos Fornecedores & Preços / Prazos / Pagamento */}
          <Card 
            title="2. Fornecedores Onde Vou Cotar (Valores, Prazos & Forma de Pagamento)"
            action={
              <Button
                variant="outline"
                size="sm"
                type="button"
                icon={<Plus className="w-3 h-3" />}
                onClick={() => setModalNovoFornecedorOpen(true)}
                className="text-xs"
              >
                + Novo Fornecedor
              </Button>
            }
          >
            <div className="space-y-4">
              {/* Seletor de Fornecedores Cadastrados */}
              <div className="flex gap-2">
                <select
                  id="select-sup-add"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-medium"
                  onChange={e => {
                    if (e.target.value) {
                      handleAddSupplierDraft(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">Selecione um fornecedor para incluir na cotação...</option>
                  {activeSuppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nomeFantasia || s.razaoSocial} ({s.categoriaPrincipal || 'Geral'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cards Detalhados dos Fornecedores na Cotação */}
              <div className="space-y-3">
                {fornecedoresCotacao.map(forn => {
                  const itemPrinc = itensCotacao[0];
                  const qtdUn = (itemPrinc?.quantidade || 1000) / 1000;
                  const totalCalculado = forn.valorUnitario * qtdUn;
                  const totalFinal = forn.valorFinalManual !== undefined ? forn.valorFinalManual : totalCalculado;

                  return (
                    <div key={forn.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-teal-400" />
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {forn.nomeFornecedor}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSupplierDraft(forn.id)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                          title="Remover Fornecedor da Cotação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {/* 1. Valor Unitário */}
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Valor Unitário (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={forn.valorUnitario || ''}
                            onChange={e => handleUpdateSupplierDraft(forn.id, { valorUnitario: parseFloat(e.target.value) || 0 })}
                            placeholder="0,00"
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold outline-none"
                          />
                        </div>

                        {/* 2. Valor Final (com override manual) */}
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Valor Final Total (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={forn.valorFinalManual !== undefined ? forn.valorFinalManual : (forn.valorUnitario > 0 ? (forn.valorUnitario * qtdUn).toFixed(2) : '')}
                            onChange={e => handleUpdateSupplierDraft(forn.id, { valorFinalManual: parseFloat(e.target.value) || 0 })}
                            placeholder="Calculado auto"
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-extrabold text-teal-400 outline-none"
                          />
                        </div>

                        {/* 3. Prazo de Entrega */}
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Prazo de Entrega
                          </label>
                          <input
                            type="text"
                            value={forn.prazoTexto}
                            onChange={e => handleUpdateSupplierDraft(forn.id, { prazoTexto: e.target.value })}
                            placeholder="Ex: 5 dias úteis"
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
                          />
                        </div>

                        {/* 4. Forma de Pagamento */}
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Forma de Pagamento
                          </label>
                          <input
                            type="text"
                            value={forn.formaPagamento}
                            onChange={e => handleUpdateSupplierDraft(forn.id, { formaPagamento: e.target.value })}
                            placeholder="Ex: 28 DDL Boleto"
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {fornecedoresCotacao.length === 0 && (
                  <p className="text-center py-4 text-slate-400 text-xs">
                    Nenhum fornecedor adicionado. Selecione no campo acima para cotar.
                  </p>
                )}
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovaCotacaoOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingCotId ? 'Salvar Alterações da Cotação' : 'Salvar e Gerar Cotação'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: VISUALIZAR COTAÇÃO COMPLETA (SOMENTE LEITURA)                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalViewOpen}
        onClose={() => setModalViewOpen(false)}
        title={`Detalhes da Cotação — ${viewingCotacao?.codigo}`}
        maxWidth="lg"
      >
        {viewingCotacao && (() => {
          const items = (db.quotationItems || []).filter(i => i.quotationId === viewingCotacao.id);
          const prices = (db.quotationPrices || []).filter(p => p.quotationId === viewingCotacao.id);

          return (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-brand-600 dark:text-teal-400 text-sm">{viewingCotacao.codigo}</span>
                  {getStatusBadge(viewingCotacao.status)}
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{viewingCotacao.descricao}</h3>
                <div className="flex gap-4 text-slate-400 text-[11px]">
                  <span>Abertura: <b>{fmtData(viewingCotacao.dataAbertura)}</b></span>
                  <span>Data Limite: <b>{viewingCotacao.dataLimite ? fmtData(viewingCotacao.dataLimite) : '—'}</b></span>
                  <span>Solicitante: <b>{viewingCotacao.solicitanteNome || viewingCotacao.criadoPor || 'Admin'}</b></span>
                </div>
              </div>

              {/* Itens */}
              <Card title="Itens da Cotação">
                <div className="space-y-2">
                  {items.map(it => {
                    const prod = db.products.find(p => p.id === it.productId);
                    return (
                      <div key={it.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">[{prod?.codigo}] {prod?.descricao}</span>
                          <span className="text-[10.5px] text-slate-400">Categoria: {prod?.categoria}</span>
                        </div>
                        <span className="font-mono font-bold text-teal-400">{fmtQtd(it.quantidade, prod?.unidade || 'UN')}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Fornecedores e Propostas */}
              <Card title={`Propostas de Fornecedores (${prices.length})`}>
                <div className="space-y-2.5">
                  {prices.map(p => {
                    const sup = db.suppliers.find(s => s.id === p.supplierId);
                    return (
                      <div key={p.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {sup?.nomeFantasia || sup?.razaoSocial}
                          </span>
                          <span className="font-mono font-black text-teal-400 text-sm">
                            Total: {fmtMoeda(p.valorFinalCents || p.precoUnitarioCents)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                          <span>Unitário: <b>{fmtMoeda(p.precoUnitarioCents)}</b></span>
                          <span>Prazo: <b>{p.prazoTexto || `${p.prazoEntregaDias} dias`}</b></span>
                          <span>Pagamento: <b>{p.formaPagamento || p.condicaoPagamento || '28 DDL'}</b></span>
                        </div>
                      </div>
                    );
                  })}

                  {prices.length === 0 && (
                    <p className="text-center py-4 text-slate-400 text-xs">Nenhum fornecedor registrado nesta cotação.</p>
                  )}
                </div>
              </Card>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: COMPARADOR DE FORNECEDORES LADO A LADO COM APROVAÇÃO              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalComparativoOpen}
        onClose={() => setModalComparativoOpen(false)}
        title={`Comparativo de Fornecedores — ${selectedCotacao?.codigo || 'Cotação'}`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400 text-xs">
            Avalie as propostas comerciais lado a lado para aprovação e geração direta da Ordem de Compra (PC):
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fornecedoresCotacao.map(forn => {
              const itemPrinc = (db.quotationItems || []).find(i => i.quotationId === selectedCotacao?.id);
              const qtdUn = (itemPrinc?.quantidade || 1000) / 1000;
              const totalFinal = forn.valorFinalManual !== undefined ? forn.valorFinalManual : forn.valorUnitario * qtdUn;

              return (
                <div key={forn.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-md flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {forn.nomeFornecedor}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-400 font-bold">
                        Proposta
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-400">Valor Unitário:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{fmtMoeda(Math.round(forn.valorUnitario * 100))}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-400">Valor Total Final:</span>
                        <span className="font-mono font-black text-teal-400 text-sm">{fmtMoeda(Math.round(totalFinal * 100))}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-400">Prazo de Entrega:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{forn.prazoTexto}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Forma de Pagamento:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{forn.formaPagamento}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={<ShoppingCart className="w-3.5 h-3.5" />}
                    onClick={() => handleConverterEmPedido(forn)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-xs shadow-sm mt-3"
                  >
                    Aprovar e Gerar Pedido de Compra (PC)
                  </Button>
                </div>
              );
            })}

            {fornecedoresCotacao.length === 0 && (
              <p className="col-span-2 text-center py-6 text-slate-400">
                Nenhum fornecedor cotado nesta solicitação ainda.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalComparativoOpen(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: COMPRA RÁPIDA                                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalCompraRapidaOpen}
        onClose={() => setModalCompraRapidaOpen(false)}
        title="⚡ Compra Rápida & Cotação Direta"
        maxWidth="lg"
      >
        <CompraRapida onComplete={() => setModalCompraRapidaOpen(false)} />
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: NOVO FORNECEDOR EXPLÍCITO                                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalNovoFornecedorOpen}
        onClose={() => setModalNovoFornecedorOpen(false)}
        title="Cadastrar Novo Fornecedor"
        maxWidth="md"
      >
        <form onSubmit={handleSalvarNovoFornecedor} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Razão Social *</label>
            <input
              type="text"
              value={novoFornRazao}
              onChange={e => setNovoFornRazao(e.target.value)}
              placeholder="Ex: Fornecedor Industrial Ltda"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={novoFornFantasia}
                onChange={e => setNovoFornFantasia(e.target.value)}
                placeholder="Ex: Fornecedor Tech"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CNPJ</label>
              <input
                type="text"
                value={novoFornCnpj}
                onChange={e => setNovoFornCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
              <input
                type="text"
                value={novoFornTelefone}
                onChange={e => setNovoFornTelefone(e.target.value)}
                placeholder="(47) 99999-9999"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
              <input
                type="email"
                value={novoFornEmail}
                onChange={e => setNovoFornEmail(e.target.value)}
                placeholder="vendas@fornecedor.com.br"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovoFornecedorOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Salvar e Incluir
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
