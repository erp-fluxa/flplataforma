import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, Plus, Trash2, Edit, Eye, CheckCircle2, Clock, AlertTriangle, 
  Search, Filter, ArrowUpDown, FileText, Check, Award, Building2, Calendar, 
  Sparkles, ExternalLink, ArrowRight, ShieldCheck, Tag, DollarSign, Layers
} from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { useDelete } from '../context/DeleteContext';
import { Button, Card, Badge, Modal } from '../components/ui';
import { fmtMoeda, fmtData, uid } from '../lib/formatters';
import { ShoppingItem, ShoppingItemQuote, ShoppingItemStatusHistory, PurchaseOrder } from '../types';

// Categorias padrão enriquecidas com base nos módulos do Fluxa
const CATEGORIAS_PADRAO = [
  'Steel Frame / Estruturas',
  'Isolamento Termoacústico',
  'Revestimento & Acabamento',
  'Elétrica & Automação',
  'Hidráulica & Tubulações',
  'Filamentos & Polímeros 3D',
  'Componentes Mecânicos & Guias',
  'Fixadores & Parafusos (MUC)',
  'Ferramentas & EPIs',
  'Embalagens & Logística',
  'Limpeza & Manutenção',
  'Geral'
];

const UNIDADES_PADRAO = ['UN', 'M', 'M²', 'M³', 'KG', 'L', 'CX', 'ROLO', 'PAR', 'PCT', 'BARRA'];

const PROJETOS_CENTROS_CUSTO = [
  'Matriz SC — Produção JP3D',
  'Filial PR — Suprimentos',
  'PRJ-001 (Impressoras CoreXY)',
  'PRJ-005 (Manutenção e Reformas)',
  'CT-MONTAGEM (Bancada Mecânica)',
  'CT-ELETRONICA (Bancada Chicotes)',
  'Almoxarifado Central',
  'Uso & Consumo Geral'
];

export const ListaCompras: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();
  const { requestDelete } = useDelete();

  // Estados de Filtro e Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('todas');
  const [filterPrioridade, setFilterPrioridade] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterProjeto, setFilterProjeto] = useState('todos');
  const [sortBy, setSortBy] = useState<'prioridade' | 'data' | 'nome' | 'valor'>('prioridade');

  // Modais
  const [modalItemOpen, setModalItemOpen] = useState(false);
  const [modalCotacoesOpen, setModalCotacoesOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false);

  // Item selecionado para edição/visualização
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null);

  // Form de Item (Novo / Edição)
  const [formItem, setFormItem] = useState<Partial<ShoppingItem>>({
    item: '',
    categoria: 'Steel Frame / Estruturas',
    unidade: 'UN',
    quantidade: 1,
    prioridade: 'normal',
    dataNecessariaAte: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    fornecedorSugeridoId: '',
    projetoCentroCusto: PROJETOS_CENTROS_CUSTO[0],
    observacoes: '',
    status: 'aguardando_cotacao'
  });

  // Form de Múltiplas Cotações Concorrentes (1 a 3 fornecedores)
  const [cotacoesForm, setCotacoesForm] = useState<ShoppingItemQuote[]>([]);

  // Categorias disponíveis combinando estoques e padrões
  const categoriasDisponiveis = useMemo(() => {
    const fromEstoque = (db.materialCategories || []).map(c => c.nome);
    return Array.from(new Set([...CATEGORIAS_PADRAO, ...fromEstoque]));
  }, [db.materialCategories]);

  // Lista com fallbacks e tratamento de migração
  const itemsFormatados: ShoppingItem[] = useMemo(() => {
    return (db.gescompShoppingList || []).map(raw => {
      const qtdNum = typeof raw.quantidade === 'number' 
        ? raw.quantidade 
        : (raw.quantidade ? parseFloat(String(raw.quantidade)) : 1);

      return {
        ...raw,
        categoria: raw.categoria || 'Geral',
        unidade: raw.unidade || 'UN',
        quantidade: isNaN(qtdNum) ? 1 : qtdNum,
        prioridade: raw.prioridade || 'normal',
        status: raw.status || (raw.completed ? 'aprovado' : 'aguardando_cotacao'),
        cotacoes: raw.cotacoes || [],
        projetoCentroCusto: raw.projetoCentroCusto || 'Matriz SC',
        historicoStatus: raw.historicoStatus || []
      };
    });
  }, [db.gescompShoppingList]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const total = itemsFormatados.length;
    const urgentes = itemsFormatados.filter(i => i.prioridade === 'urgente' && i.status !== 'convertido_pedido' && i.status !== 'cancelado').length;
    const emCotacao = itemsFormatados.filter(i => i.status === 'em_cotacao' || i.status === 'aguardando_cotacao').length;
    const aprovados = itemsFormatados.filter(i => i.status === 'aprovado').length;
    const convertidos = itemsFormatados.filter(i => i.status === 'convertido_pedido').length;
    return { total, urgentes, emCotacao, aprovados, convertidos };
  }, [itemsFormatados]);

  // Checagem de Alerta de Prazo
  const getPrazoAlert = (dataLimite?: string, status?: string) => {
    if (!dataLimite || status === 'aprovado' || status === 'convertido_pedido' || status === 'cancelado') {
      return null;
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const prazo = new Date(dataLimite);
    prazo.setHours(0, 0, 0, 0);

    const diffDias = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return { tipo: 'vencido', label: `⛔ VENCIDO (${Math.abs(diffDias)}d atrás)`, className: 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold' };
    }
    if (diffDias <= 3) {
      return { tipo: 'urgente', label: `⚠️ Vence em ${diffDias}d`, className: 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold animate-pulse' };
    }
    return null;
  };

  // Filtragem e Ordenação
  const itemsFiltrados = useMemo(() => {
    return itemsFormatados.filter(item => {
      if (filterCategoria !== 'todas' && item.categoria !== filterCategoria) return false;
      if (filterPrioridade !== 'todas' && item.prioridade !== filterPrioridade) return false;
      if (filterStatus !== 'todos' && item.status !== filterStatus) return false;
      if (filterProjeto !== 'todos' && item.projetoCentroCusto !== filterProjeto) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNome = item.item?.toLowerCase().includes(q);
        const matchObs = item.observacoes?.toLowerCase().includes(q);
        const matchFornec = item.fornecedorVencedorNome?.toLowerCase().includes(q) || item.fornecedorSugeridoNome?.toLowerCase().includes(q);
        const matchProj = item.projetoCentroCusto?.toLowerCase().includes(q);
        if (!matchNome && !matchObs && !matchFornec && !matchProj) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'prioridade') {
        const peso = { urgente: 3, normal: 2, programada: 1 };
        const pesoA = peso[a.prioridade || 'normal'] || 2;
        const pesoB = peso[b.prioridade || 'normal'] || 2;
        if (pesoA !== pesoB) return pesoB - pesoA;
      }
      if (sortBy === 'data') {
        const dataA = a.dataNecessariaAte || '9999-12-31';
        const dataB = b.dataNecessariaAte || '9999-12-31';
        return dataA.localeCompare(dataB);
      }
      if (sortBy === 'nome') {
        return (a.item || '').localeCompare(b.item || '');
      }
      if (sortBy === 'valor') {
        const valA = a.valorUnitarioVencedorCents || 0;
        const valB = b.valorUnitarioVencedorCents || 0;
        return valB - valA;
      }
      return 0;
    });
  }, [itemsFormatados, filterCategoria, filterPrioridade, filterStatus, filterProjeto, searchTerm, sortBy]);

  // Abertura de Modal Novo Item
  const handleOpenNew = () => {
    setSelectedItem(null);
    setFormItem({
      id: uid('shop'),
      userId: user?.id || 'usr-admin',
      item: '',
      categoria: categoriasDisponiveis[0] || 'Steel Frame / Estruturas',
      unidade: 'UN',
      quantidade: 1,
      prioridade: 'normal',
      dataNecessariaAte: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      fornecedorSugeridoId: db.suppliers[0]?.id || '',
      fornecedorSugeridoNome: db.suppliers[0]?.nomeFantasia || db.suppliers[0]?.razaoSocial || '',
      projetoCentroCusto: PROJETOS_CENTROS_CUSTO[0],
      observacoes: '',
      status: 'aguardando_cotacao',
      cotacoes: []
    });
    setModalItemOpen(true);
  };

  // Abertura de Edição
  const handleOpenEdit = (item: ShoppingItem) => {
    setSelectedItem(item);
    setFormItem({ ...item });
    setModalItemOpen(true);
  };

  // Visualizar Detalhes
  const handleOpenView = (item: ShoppingItem) => {
    setSelectedItem(item);
    setModalViewOpen(true);
  };

  // Histórico de Alterações
  const handleOpenHistorico = (item: ShoppingItem) => {
    setSelectedItem(item);
    setModalHistoricoOpen(true);
  };

  // Salvar Item (Novo ou Edição)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItem.item?.trim()) {
      alert('Por favor, informe o nome do item.');
      return;
    }

    const now = new Date().toISOString();
    const fornecedorObj = db.suppliers.find(s => s.id === formItem.fornecedorSugeridoId);
    const fornecedorNome = fornecedorObj ? (fornecedorObj.nomeFantasia || fornecedorObj.razaoSocial) : formItem.fornecedorSugeridoNome;

    if (selectedItem) {
      // Edição
      const deStatus = selectedItem.status;
      const paraStatus = formItem.status || deStatus || 'aguardando_cotacao';

      let historico = [...(selectedItem.historicoStatus || [])];
      if (deStatus !== paraStatus) {
        historico.push({
          id: uid('hist'),
          deStatus,
          paraStatus,
          data: now,
          usuarioNome: user?.name || 'Administrador'
        });
      }

      const itemAtualizado: ShoppingItem = {
        ...selectedItem,
        ...formItem,
        item: formItem.item.trim(),
        fornecedorSugeridoNome: fornecedorNome,
        historicoStatus: historico
      } as ShoppingItem;

      await updateDb(prev => ({
        ...prev,
        gescompShoppingList: (prev.gescompShoppingList || []).map(i => i.id === selectedItem.id ? itemAtualizado : i)
      }), 'SHOPPING_ITEM_UPDATED');

      alert('Item atualizado com sucesso!');
    } else {
      // Novo Item
      const novoItem: ShoppingItem = {
        id: formItem.id || uid('shop'),
        userId: user?.id || 'usr-admin',
        item: formItem.item.trim(),
        categoria: formItem.categoria || 'Geral',
        unidade: formItem.unidade || 'UN',
        quantidade: Number(formItem.quantidade) || 1,
        prioridade: formItem.prioridade || 'normal',
        dataNecessariaAte: formItem.dataNecessariaAte || '',
        fornecedorSugeridoId: formItem.fornecedorSugeridoId || '',
        fornecedorSugeridoNome: fornecedorNome || '',
        projetoCentroCusto: formItem.projetoCentroCusto || PROJETOS_CENTROS_CUSTO[0],
        observacoes: formItem.observacoes || '',
        status: formItem.status || 'aguardando_cotacao',
        cotacoes: [],
        historicoStatus: [
          {
            id: uid('hist'),
            paraStatus: formItem.status || 'aguardando_cotacao',
            data: now,
            usuarioNome: user?.name || 'Administrador'
          }
        ],
        createdAt: now
      };

      await updateDb(prev => ({
        ...prev,
        gescompShoppingList: [novoItem, ...(prev.gescompShoppingList || [])]
      }), 'SHOPPING_ITEM_ADDED');

      alert('Novo item cadastrado na lista de cotações!');
    }

    setModalItemOpen(false);
  };

  // Excluir Item
  const handleDeleteItem = (itemId: string, nomeItem: string) => {
    const item = db.gescompShoppingList?.find(i => i.id === itemId);
    if (!item) return;

    const deps: string[] = [];
    if (item.cotacoes && item.cotacoes.length > 0) {
      deps.push(`Possui ${item.cotacoes.length} cotação(ões) de fornecedores vinculada(s).`);
    }

    requestDelete({
      title: 'Excluir Item da Lista de Compras',
      itemName: `${nomeItem} (${item.quantidade} ${item.unidade})`,
      itemType: 'Item de Compras',
      entityType: 'shoppingItem',
      moduleKey: 'compras',
      originalId: itemId,
      itemData: item,
      isSoftDelete: true,
      dependencies: deps,
      warningMessage: 'Ao confirmar, o item será movido para a lixeira.',
      onDelete: async () => {
        await updateDb(prev => ({
          ...prev,
          gescompShoppingList: (prev.gescompShoppingList || []).filter(i => i.id !== itemId)
        }), 'SHOPPING_ITEM_DELETED');
      }
    });
  };

  // Alteração Rápida de Status
  const handleQuickChangeStatus = async (item: ShoppingItem, newStatus: ShoppingItem['status']) => {
    if (item.status === newStatus) return;

    const now = new Date().toISOString();
    const historico: ShoppingItemStatusHistory[] = [
      ...(item.historicoStatus || []),
      {
        id: uid('hist'),
        deStatus: item.status,
        paraStatus: newStatus || 'aguardando_cotacao',
        data: now,
        usuarioNome: user?.name || 'Administrador'
      }
    ];

    await updateDb(prev => ({
      ...prev,
      gescompShoppingList: (prev.gescompShoppingList || []).map(i => i.id === item.id ? {
        ...i,
        status: newStatus,
        completed: newStatus === 'aprovado' || newStatus === 'convertido_pedido',
        historicoStatus: historico
      } : i)
    }), 'SHOPPING_STATUS_CHANGED');
  };

  // Abrir Modal de Cotações Concorrentes (1 a 3 fornecedores)
  const handleOpenCotacoes = (item: ShoppingItem) => {
    setSelectedItem(item);
    const existingQuotes = item.cotacoes && item.cotacoes.length > 0 ? [...item.cotacoes] : [];
    
    // Se não tiver cotações, inicializa com 1 vazia ou sugerida
    if (existingQuotes.length === 0) {
      existingQuotes.push({
        id: uid('quote'),
        supplierId: item.fornecedorSugeridoId || db.suppliers[0]?.id || '',
        supplierName: item.fornecedorSugeridoNome || db.suppliers[0]?.nomeFantasia || '',
        precoUnitarioCents: 0,
        prazoEntregaDias: 5,
        condicaoPagamento: '28 DDL',
        vencedor: false
      });
    }

    setCotacoesForm(existingQuotes);
    setModalCotacoesOpen(true);
  };

  // Adicionar Fornecedor Concorrente (até 3)
  const handleAddConcorrente = () => {
    if (cotacoesForm.length >= 3) {
      alert('Você pode adicionar até 3 fornecedores concorrentes por item.');
      return;
    }

    const defaultSupplier = db.suppliers.find(s => !cotacoesForm.some(c => c.supplierId === s.id)) || db.suppliers[0];

    setCotacoesForm(prev => [
      ...prev,
      {
        id: uid('quote'),
        supplierId: defaultSupplier?.id || '',
        supplierName: defaultSupplier ? (defaultSupplier.nomeFantasia || defaultSupplier.razaoSocial) : '',
        precoUnitarioCents: 0,
        prazoEntregaDias: 7,
        condicaoPagamento: '30 DDL',
        vencedor: false
      }
    ]);
  };

  // Definir Fornecedor Vencedor no Form
  const handleSelectVencedor = (quoteId: string) => {
    setCotacoesForm(prev => prev.map(q => ({
      ...q,
      vencedor: q.id === quoteId
    })));
  };

  // Salvar Cotações Concorrentes
  const handleSaveCotacoes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const vencedor = cotacoesForm.find(q => q.vencedor);
    const menorPrecoQuote = cotacoesForm.filter(q => q.precoUnitarioCents > 0).sort((a, b) => a.precoUnitarioCents - b.precoUnitarioCents)[0];

    const now = new Date().toISOString();
    let nextStatus = selectedItem.status;
    if (vencedor && selectedItem.status === 'aguardando_cotacao') {
      nextStatus = 'cotado';
    }

    const historico = [...(selectedItem.historicoStatus || [])];
    if (nextStatus !== selectedItem.status) {
      historico.push({
        id: uid('hist'),
        deStatus: selectedItem.status,
        paraStatus: nextStatus || 'cotado',
        data: now,
        usuarioNome: user?.name || 'Comprador'
      });
    }

    const itemAtualizado: ShoppingItem = {
      ...selectedItem,
      cotacoes: cotacoesForm,
      fornecedorVencedorId: vencedor?.supplierId || '',
      fornecedorVencedorNome: vencedor?.supplierName || '',
      valorUnitarioVencedorCents: vencedor ? vencedor.precoUnitarioCents : (menorPrecoQuote?.precoUnitarioCents || 0),
      status: nextStatus,
      historicoStatus: historico
    };

    await updateDb(prev => ({
      ...prev,
      gescompShoppingList: (prev.gescompShoppingList || []).map(i => i.id === selectedItem.id ? itemAtualizado : i)
    }), 'SHOPPING_QUOTES_SAVED');

    setModalCotacoesOpen(false);
    alert('Cotações salvas com sucesso!');
  };

  // CONVERTER EM PEDIDO DE COMPRA
  const handleConverterEmPedido = async (item: ShoppingItem) => {
    if (item.status !== 'aprovado') {
      alert('Para converter em Pedido de Compra, o item precisa estar com status "Aprovado".');
      return;
    }

    const vencedorQuote = item.cotacoes?.find(q => q.vencedor) || item.cotacoes?.[0];
    const supplierId = item.fornecedorVencedorId || vencedorQuote?.supplierId || item.fornecedorSugeridoId || db.suppliers[0]?.id || 'for-1';
    const supplier = db.suppliers.find(s => s.id === supplierId);
    const precoUnitCents = item.valorUnitarioVencedorCents || vencedorQuote?.precoUnitarioCents || 10000;
    const qtd = Number(item.quantidade) || 1;
    const valorTotalCents = Math.round(precoUnitCents * qtd);

    const seqPc = (db.orders?.length || 0) + 1;
    const codigoPc = `PC-${String(seqPc).padStart(4, '0')}`;
    const pcId = uid('pc');
    const now = new Date().toISOString();

    const novoPedidoCompra: PurchaseOrder = {
      id: pcId,
      codigo: codigoPc,
      supplierId: supplierId,
      status: 'emitido',
      valorTotalCents: valorTotalCents,
      condicaoPagamento: vencedorQuote?.condicaoPagamento || '28 DDL (Faturado)',
      previsaoEntrega: item.dataNecessariaAte || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      companyId: db.currentCompanyId,
      criadoEm: now
    };

    const historico = [
      ...(item.historicoStatus || []),
      {
        id: uid('hist'),
        deStatus: item.status,
        paraStatus: 'convertido_pedido',
        data: now,
        usuarioNome: user?.name || 'Comprador'
      }
    ];

    const itemAtualizado: ShoppingItem = {
      ...item,
      status: 'convertido_pedido',
      completed: true,
      purchaseOrderId: pcId,
      purchaseOrderCodigo: codigoPc,
      historicoStatus: historico
    };

    const auditLog = {
      id: uid('log'),
      timestamp: now,
      action: 'SHOPPING_CONVERTED_TO_PO',
      actor: { id: user?.id || 'usr-admin', name: user?.name || 'Admin' },
      target: { tipo: 'PEDIDO_COMPRA', codigo: codigoPc },
      details: `Item "${item.item}" (${qtd} ${item.unidade}) convertido no Pedido de Compra ${codigoPc} para ${supplier?.nomeFantasia || 'Fornecedor'}.`
    };

    await updateDb(prev => ({
      ...prev,
      orders: [novoPedidoCompra, ...(prev.orders || [])],
      gescompShoppingList: (prev.gescompShoppingList || []).map(i => i.id === item.id ? itemAtualizado : i),
      auditLogs: [auditLog, ...(prev.auditLogs || [])]
    }), 'SHOPPING_CONVERTED_TO_PO');

    alert(`🎉 Pedido de Compra ${codigoPc} gerado com sucesso para ${supplier?.nomeFantasia || 'o fornecedor'} no valor de ${fmtMoeda(valorTotalCents)}!`);
  };

  return (
    <div className="space-y-5">
      {/* 1. TOPO & KPIs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            Lista de Compras, Cotações & Suprimentos Rápidos
          </h2>
          <p className="text-xs text-slate-500">
            Cadastre demandas de compras, compare múltiplos fornecedores e converta cotações aprovadas em Pedidos de Compra.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenNew}
        >
          Novo Item para Cotação
        </Button>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111A2D] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10.5px] font-bold text-slate-400 block uppercase">Total Itens</span>
          <span className="font-mono text-lg font-black text-slate-900 dark:text-white">{stats.total}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
          <span className="text-[10.5px] font-bold text-rose-400 block uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Urgentes
          </span>
          <span className="font-mono text-lg font-black text-rose-400">{stats.urgentes}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <span className="text-[10.5px] font-bold text-amber-400 block uppercase">Em Cotação</span>
          <span className="font-mono text-lg font-black text-amber-400">{stats.emCotacao}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
          <span className="text-[10.5px] font-bold text-emerald-400 block uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Aprovados
          </span>
          <span className="font-mono text-lg font-black text-emerald-400">{stats.aprovados}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 col-span-2 sm:col-span-1">
          <span className="text-[10.5px] font-bold text-brand-400 block uppercase">Em Pedido (PC)</span>
          <span className="font-mono text-lg font-black text-brand-400">{stats.convertidos}</span>
        </div>
      </div>

      {/* 2. BARRA DE BUSCA E FILTROS */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por item, fornecedor, projeto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <select
            value={filterCategoria}
            onChange={e => setFilterCategoria(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
          >
            <option value="todas">Todas as Categorias</option>
            {categoriasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <select
            value={filterPrioridade}
            onChange={e => setFilterPrioridade(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
          >
            <option value="todas">Todas as Prioridades</option>
            <option value="urgente">🚨 Urgente</option>
            <option value="normal">🟡 Normal</option>
            <option value="programada">🟢 Programada</option>
          </select>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="aguardando_cotacao">⏳ Aguardando Cotação</option>
            <option value="em_cotacao">🔄 Em Cotação</option>
            <option value="cotado">📋 Cotado</option>
            <option value="aprovado">✅ Aprovado</option>
            <option value="convertido_pedido">📦 Convertido em Pedido</option>
            <option value="cancelado">❌ Cancelado</option>
          </select>
        </div>
      </div>

      {/* 3. VISUALIZAÇÃO MOBILE (CARDS TOUCH-FRIENDLY COM AÇÕES) */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {itemsFiltrados.map(item => {
          const alertPrazo = getPrazoAlert(item.dataNecessariaAte, item.status);
          const menorCotacao = item.cotacoes && item.cotacoes.length > 0 
            ? item.cotacoes.filter(c => c.precoUnitarioCents > 0).sort((a, b) => a.precoUnitarioCents - b.precoUnitarioCents)[0]
            : null;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                item.status === 'convertido_pedido'
                  ? 'bg-brand-950/20 border-brand-800/40'
                  : item.status === 'cancelado'
                  ? 'bg-slate-900/60 border-slate-800 opacity-60'
                  : 'bg-[#111A2D] border-slate-800 shadow-md'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      item.prioridade === 'urgente'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : item.prioridade === 'programada'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {item.prioridade || 'NORMAL'}
                    </span>
                    <span className="text-[10.5px] text-slate-400 font-mono">{item.categoria}</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-100">{item.item}</h4>
                  <span className="text-[11px] text-slate-400">Projeto: {item.projetoCentroCusto || 'Matriz SC'}</span>
                </div>

                <Badge variant={
                  item.status === 'aprovado' || item.status === 'convertido_pedido' ? 'success' :
                  item.status === 'em_cotacao' || item.status === 'cotado' ? 'warning' :
                  item.status === 'cancelado' ? 'danger' : 'info'
                }>
                  {(item.status || 'aguardando_cotacao').replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              {/* Quantidade e Prazos */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-bold">Quantidade</span>
                  <span className="font-mono font-bold text-slate-200">{item.quantidade} {item.unidade}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-bold">Necessário Até</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-slate-300">{fmtData(item.dataNecessariaAte)}</span>
                    {alertPrazo && (
                      <span className={`px-1.5 py-0.5 rounded text-[9.5px] ${alertPrazo.className}`}>
                        {alertPrazo.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fornecedor / Cotação Vencedora */}
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] text-slate-400 font-bold">Cotação / Fornecedor:</span>
                  <span className="text-[10px] text-amber-400 font-bold font-mono">
                    {item.cotacoes?.length || 0} fornecedor(es) cotado(s)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">
                    {item.fornecedorVencedorNome ? `🏆 ${item.fornecedorVencedorNome}` : (menorCotacao?.supplierName || item.fornecedorSugeridoNome || 'Nenhum definido')}
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {item.valorUnitarioVencedorCents ? fmtMoeda(item.valorUnitarioVencedorCents) : (menorCotacao ? fmtMoeda(menorCotacao.precoUnitarioCents) : 'A Cotar')}
                  </span>
                </div>
              </div>

              {/* Barra de Ações Mobile */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => handleOpenCotacoes(item)}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold gap-1 transition-all border border-amber-500/30"
                  title="Comparar Cotações"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Cotações</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(item)}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold gap-1 transition-all"
                >
                  <Edit className="w-3.5 h-3.5 text-teal-400" />
                  <span>Editar</span>
                </button>

                {item.status === 'aprovado' ? (
                  <button
                    onClick={() => handleConverterEmPedido(item)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold gap-1 transition-all shadow-xs"
                    title="Converter em Pedido de Compra"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Gerar PC</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenView(item)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold gap-1 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Detalhes</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteItem(item.id, item.item)}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-[10px] font-bold gap-1 transition-all border border-rose-900/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          );
        })}

        {itemsFiltrados.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
            Nenhum item encontrado com os filtros selecionados.
          </div>
        )}
      </div>

      {/* 4. VISUALIZAÇÃO DESKTOP (TABELA RICA COM OVERFLOW HORIZONTAL) */}
      <div className="hidden sm:block">
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs min-w-[980px]">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Item & Projeto</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3 text-center">Quantidade</th>
                  <th className="px-4 py-3">Necessário Até</th>
                  <th className="px-4 py-3">Fornecedor / Cotação</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {itemsFiltrados.map(item => {
                  const alertPrazo = getPrazoAlert(item.dataNecessariaAte, item.status);
                  const menorCotacao = item.cotacoes && item.cotacoes.length > 0 
                    ? item.cotacoes.filter(c => c.precoUnitarioCents > 0).sort((a, b) => a.precoUnitarioCents - b.precoUnitarioCents)[0]
                    : null;

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                        item.status === 'convertido_pedido' ? 'bg-brand-950/10' : (item.prioridade === 'urgente' ? 'bg-rose-950/10' : '')
                      }`}
                    >
                      {/* Prioridade */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          item.prioridade === 'urgente'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : item.prioridade === 'programada'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}>
                          {item.prioridade === 'urgente' && <AlertTriangle className="w-3 h-3" />}
                          {item.prioridade || 'NORMAL'}
                        </span>
                      </td>

                      {/* Item & Projeto */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 dark:text-white block text-sm">{item.item}</span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {item.projetoCentroCusto || 'Matriz SC'}
                        </span>
                        {item.observacoes && (
                          <span className="text-[10px] text-slate-500 italic block truncate max-w-[200px]" title={item.observacoes}>
                            Obs: {item.observacoes}
                          </span>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.categoria || 'Geral'}
                        </span>
                      </td>

                      {/* Quantidade */}
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {item.quantidade} {item.unidade}
                      </td>

                      {/* Data Necessária Até */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {fmtData(item.dataNecessariaAte)}
                        </div>
                        {alertPrazo && (
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9.5px] ${alertPrazo.className}`}>
                            {alertPrazo.label}
                          </span>
                        )}
                      </td>

                      {/* Fornecedor & Menor Cotação */}
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          {item.fornecedorVencedorNome ? (
                            <div className="flex items-center gap-1 font-bold text-amber-400">
                              <Award className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[140px]">{item.fornecedorVencedorNome}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 truncate max-w-[140px] block">
                              {menorCotacao?.supplierName || item.fornecedorSugeridoNome || 'Sem fornecedor'}
                            </span>
                          )}
                          <div className="font-mono font-bold text-emerald-400 text-[11px]">
                            {item.valorUnitarioVencedorCents ? fmtMoeda(item.valorUnitarioVencedorCents) : (menorCotacao ? fmtMoeda(menorCotacao.precoUnitarioCents) : 'A Cotar')}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <select
                          value={item.status || 'aguardando_cotacao'}
                          onChange={e => handleQuickChangeStatus(item, e.target.value as any)}
                          className={`px-2 py-1 rounded-lg text-[10.5px] font-bold uppercase tracking-wider outline-none border cursor-pointer ${
                            item.status === 'aprovado' || item.status === 'convertido_pedido'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800'
                              : item.status === 'em_cotacao' || item.status === 'cotado'
                              ? 'bg-amber-950/40 text-amber-400 border-amber-800'
                              : item.status === 'cancelado'
                              ? 'bg-rose-950/40 text-rose-400 border-rose-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <option value="aguardando_cotacao">Aguardando Cotação</option>
                          <option value="em_cotacao">Em Cotação</option>
                          <option value="cotado">Cotado</option>
                          <option value="aprovado">Aprovado</option>
                          <option value="convertido_pedido">Convertido em Pedido</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1. COTAR (ABRE MAPA DE ATÉ 3 FORNECEDORES) */}
                          <button
                            onClick={() => handleOpenCotacoes(item)}
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors"
                            title="Gerenciar Cotações Concorrentes"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>

                          {/* 2. CONVERTER EM PEDIDO DE COMPRA (SE APROVADO) */}
                          {item.status === 'aprovado' && (
                            <button
                              onClick={() => handleConverterEmPedido(item)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition-all"
                              title="Converter em Pedido de Compra Oficial"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Gerar PC</span>
                            </button>
                          )}

                          {/* 3. VER DETALHES / HISTÓRICO */}
                          <button
                            onClick={() => handleOpenView(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
                            title="Ver Detalhes & Histórico"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 4. EDITAR */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                            title="Editar Item"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* 5. EXCLUIR */}
                          <button
                            onClick={() => handleDeleteItem(item.id, item.item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Excluir Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {itemsFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Nenhum item encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NOVO / EDITAR ITEM                                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalItemOpen}
        onClose={() => setModalItemOpen(false)}
        title={selectedItem ? `Editar Item — ${selectedItem.item}` : 'Novo Item para Lista de Cotações'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome / Descrição do Item *</label>
            <input
              type="text"
              value={formItem.item || ''}
              onChange={e => setFormItem(prev => ({ ...prev, item: e.target.value }))}
              placeholder="Ex: Perfil Guia U 90mm Steel Frame, Cabo 4mm², Parafuso M3..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria / Tipo *</label>
              <select
                value={formItem.categoria || 'Geral'}
                onChange={e => setFormItem(prev => ({ ...prev, categoria: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                {categoriasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unidade de Medida *</label>
              <select
                value={formItem.unidade || 'UN'}
                onChange={e => setFormItem(prev => ({ ...prev, unidade: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
              >
                {UNIDADES_PADRAO.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantidade Necessária *</label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={formItem.quantidade || 1}
                onChange={e => setFormItem(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nível de Prioridade *</label>
              <select
                value={formItem.prioridade || 'normal'}
                onChange={e => setFormItem(prev => ({ ...prev, prioridade: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-bold"
              >
                <option value="urgente" className="text-rose-400">🚨 Urgente</option>
                <option value="normal" className="text-amber-400">🟡 Normal</option>
                <option value="programada" className="text-emerald-400">🟢 Programada</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data Necessária Até *</label>
              <input
                type="date"
                value={formItem.dataNecessariaAte || ''}
                onChange={e => setFormItem(prev => ({ ...prev, dataNecessariaAte: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Inicial</label>
              <select
                value={formItem.status || 'aguardando_cotacao'}
                onChange={e => setFormItem(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                <option value="aguardando_cotacao">Aguardando Cotação</option>
                <option value="em_cotacao">Em Cotação</option>
                <option value="cotado">Cotado</option>
                <option value="aprovado">Aprovado</option>
                <option value="convertido_pedido">Convertido em Pedido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fornecedor Sugerido (Opcional)</label>
              <select
                value={formItem.fornecedorSugeridoId || ''}
                onChange={e => setFormItem(prev => ({ ...prev, fornecedorSugeridoId: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                <option value="">Nenhum fornecedor pré-definido</option>
                {db.suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.nomeFantasia || s.razaoSocial} ({s.categoriaPrincipal})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Projeto / Centro de Custo</label>
              <select
                value={formItem.projetoCentroCusto || PROJETOS_CENTROS_CUSTO[0]}
                onChange={e => setFormItem(prev => ({ ...prev, projetoCentroCusto: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                {PROJETOS_CENTROS_CUSTO.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Observações / Justificativa</label>
            <textarea
              rows={2}
              value={formItem.observacoes || ''}
              onChange={e => setFormItem(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Ex: Material em falta para manutenção da linha de montagem CoreXY..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalItemOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">Salvar Item</Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: MAPA DE COTAÇÕES CONCORRENTES (1 A 3 FORNECEDORES)               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalCotacoesOpen}
        onClose={() => setModalCotacoesOpen(false)}
        title={`Mapa de Cotações — ${selectedItem?.item}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCotacoes} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-200 text-sm block">{selectedItem?.item}</span>
              <span className="text-slate-400 text-[11px]">Demanda: <b>{selectedItem?.quantidade} {selectedItem?.unidade}</b> · Projeto: <b>{selectedItem?.projetoCentroCusto}</b></span>
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              icon={<Plus className="w-3 h-3" />}
              onClick={handleAddConcorrente}
              disabled={cotacoesForm.length >= 3}
            >
              Adicionar Fornecedor ({cotacoesForm.length}/3)
            </Button>
          </div>

          <div className="space-y-3">
            {cotacoesForm.map((quote, idx) => {
              const valorTotalItem = (quote.precoUnitarioCents / 100) * (Number(selectedItem?.quantidade) || 1);

              return (
                <div
                  key={quote.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                    quote.vencedor
                      ? 'bg-amber-950/20 border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 flex items-center justify-center font-mono text-[10.5px]">
                        #{idx + 1}
                      </span>
                      Fornecedor Concorrente {idx + 1}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectVencedor(quote.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          quote.vencedor
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        {quote.vencedor ? 'VENCEDOR SELECIONADO' : 'Definir como Vencedor'}
                      </button>

                      {cotacoesForm.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCotacoesForm(prev => prev.filter(q => q.id !== quote.id))}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500"
                          title="Remover Fornecedor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[10.5px] font-bold text-slate-400 mb-1">Fornecedor</label>
                      <select
                        value={quote.supplierId || ''}
                        onChange={e => {
                          const supp = db.suppliers.find(s => s.id === e.target.value);
                          setCotacoesForm(prev => prev.map(q => q.id === quote.id ? {
                            ...q,
                            supplierId: e.target.value,
                            supplierName: supp ? (supp.nomeFantasia || supp.razaoSocial) : q.supplierName
                          } : q));
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-brand-500"
                      >
                        {db.suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.nomeFantasia || s.razaoSocial}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-400 mb-1">Preço Unitário (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quote.precoUnitarioCents ? quote.precoUnitarioCents / 100 : ''}
                        onChange={e => {
                          const val = Math.round(parseFloat(e.target.value || '0') * 100);
                          setCotacoesForm(prev => prev.map(q => q.id === quote.id ? { ...q, precoUnitarioCents: val } : q));
                        }}
                        placeholder="0,00"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-brand-500 font-mono font-bold text-emerald-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-400 mb-1">Prazo de Entrega</label>
                      <input
                        type="number"
                        min="1"
                        value={quote.prazoEntregaDias || 5}
                        onChange={e => {
                          const val = parseInt(e.target.value || '1', 10);
                          setCotacoesForm(prev => prev.map(q => q.id === quote.id ? { ...q, prazoEntregaDias: val } : q));
                        }}
                        placeholder="Dias"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 border-t border-slate-800/60">
                    <span>Condição: <b>{quote.condicaoPagamento || '28 DDL'}</b> · Prazo: <b>{quote.prazoEntregaDias || 5} dias úteis</b></span>
                    <span className="font-mono">Total Proposta: <b className="text-emerald-400">{fmtMoeda(Math.round(valorTotalItem * 100))}</b></span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalCotacoesOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">Salvar Mapa de Cotações</Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: VISUALIZAR DETALHES COMPLETOS & HISTÓRICO                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalViewOpen}
        onClose={() => setModalViewOpen(false)}
        title={`Ficha de Demanda — ${selectedItem?.item}`}
        maxWidth="lg"
      >
        {selectedItem && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-teal-400">{selectedItem.categoria}</span>
                <Badge variant={
                  selectedItem.status === 'aprovado' || selectedItem.status === 'convertido_pedido' ? 'success' :
                  selectedItem.status === 'em_cotacao' || selectedItem.status === 'cotado' ? 'warning' : 'info'
                }>
                  {(selectedItem.status || 'aguardando_cotacao').replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedItem.item}</h3>
              <p className="text-slate-400">Projeto / Centro de Custo: <b>{selectedItem.projetoCentroCusto}</b></p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Quantidade</span>
                <span className="font-mono font-bold text-slate-100 text-sm">{selectedItem.quantidade} {selectedItem.unidade}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Prioridade</span>
                <span className="font-bold text-sm uppercase text-amber-400">{selectedItem.prioridade}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Data Necessária</span>
                <span className="font-mono font-bold text-slate-100 text-sm">{fmtData(selectedItem.dataNecessariaAte)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Preço Cotado</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{fmtMoeda(selectedItem.valorUnitarioVencedorCents || 0)}</span>
              </div>
            </div>

            {/* Linha do Tempo / Histórico de Status */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 block flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-400" />
                Histórico de Alterações de Status:
              </span>
              <div className="space-y-1.5">
                {(selectedItem.historicoStatus || []).map(h => (
                  <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                    <span className="font-bold text-slate-200">
                      {h.deStatus ? `${h.deStatus} ➔ ` : ''} <span className="text-teal-400 uppercase">{h.paraStatus}</span>
                    </span>
                    <span className="text-slate-400 font-mono">
                      {fmtData(h.data)} por <b>{h.usuarioNome}</b>
                    </span>
                  </div>
                ))}
                {(!selectedItem.historicoStatus || selectedItem.historicoStatus.length === 0) && (
                  <p className="text-slate-500 italic">Nenhum histórico registrado.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
