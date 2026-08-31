import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DatabaseState, CustomLogos, Product, User, Company, ProductionOrder, Quotation, QuotationItem, PurchaseOrder, SalesOrder, StockMovement, StockReservation } from '../types';
import { INITIAL_DATABASE } from '../lib/initialData';
import { getSupabase } from '../lib/supabase';
import { uid } from '../lib/formatters';

export interface ProcessarVendaResult {
  success: boolean;
  pv: SalesOrder;
  opsGeradas: ProductionOrder[];
  baixasDiretas: StockMovement[];
  reservasGeradas: StockReservation[];
  alertasCompras: Array<{ productId: string; descricao: string; qtdFaltante: number }>;
  error?: string;
}

interface DbContextType {
  db: DatabaseState;
  loading: boolean;
  syncing: boolean;
  syncFromCloud: () => Promise<void>;
  updateDb: (updater: (prev: DatabaseState) => DatabaseState, actionName?: string) => Promise<void>;
  uploadLogo: (type: keyof CustomLogos, dataUrl: string) => Promise<void>;
  resetLogos: () => Promise<void>;
  zerarSaldosEstoque: (actorName: string) => Promise<void>;
  salvarProduto: (product: Product, actorName: string) => Promise<{ success: boolean; error?: string }>;
  excluirProduto: (productId: string, actorName: string) => Promise<{ success: boolean; error?: string }>;
  processarVendaAutomatica: (
    vendaData: { customerId: string; previsaoEntrega: string; valorTotalCents?: number; condicaoPagamento?: string },
    itens: Array<{ productId: string; quantidade: number; precoUnitarioCents?: number }>,
    actorName: string
  ) => Promise<ProcessarVendaResult>;
  excluirVendaComEstorno: (pvId: string, actorName: string) => Promise<{ success: boolean; error?: string; detalhes?: string }>;
  excluirOpComEstorno: (opId: string, actorName: string) => Promise<{ success: boolean; error?: string; detalhes?: string }>;
  reconciliarEstoque: (actorName: string) => Promise<{ success: boolean; reservasRemovidas: number; detalhes?: string }>;
  salvarEmpresa: (company: Company, actorName: string) => Promise<{ success: boolean; error?: string }>;
  excluirEmpresa: (companyId: string, actorName: string) => Promise<{ success: boolean; error?: string }>;
  selecionarEmpresaAtiva: (companyId: string) => Promise<void>;
  salvarCategoria: (cat: MaterialCategory, actorName: string) => Promise<{ success: boolean; error?: string }>;
  excluirCategoria: (catId: string, actorName: string) => Promise<{ success: boolean; error?: string }>;
}

const DbContext = createContext<DbContextType | null>(null);

const STORAGE_KEYS = [
  'fluxa_app_state_v2',
  'fluxa_app_state',
  'fluxa_erp_db_v2',
  'fluxa_erp_db',
  'fluxa_state'
];

/**
 * Realiza o merge seguro de arrays por ID:
 * Se um registro já existe, preserva os dados do usuário. Novos itens do sistema são adicionados apenas se não existirem.
 */
function mergeArrayById<T extends { id: string }>(base: T[] = [], incoming: T[] = []): T[] {
  const map = new Map<string, T>();

  (base || []).forEach(item => {
    if (item && item.id) map.set(item.id, item);
  });

  (incoming || []).forEach(item => {
    if (item && item.id) {
      const existing = map.get(item.id);
      map.set(item.id, Object.assign({}, existing, item));
    }
  });

  return Array.from(map.values());
}

/**
 * Função de merge profundo que nunca apaga dados de usuários
 */
function deepMergeDbState(base: DatabaseState, userState: Partial<DatabaseState>): DatabaseState {
  if (!userState) return base;

  return {
    ...base,
    ...userState,
    company: Object.assign({}, base.company, userState.company),
    companies: mergeArrayById(base.companies || [], userState.companies || []),
    currentCompanyId: userState.currentCompanyId || base.currentCompanyId || 'comp-1',
    customLogos: Object.assign({}, base.customLogos, userState.customLogos),
    users: mergeArrayById(base.users, userState.users),
    roles: mergeArrayById((base as any).roles || [], (userState as any).roles || []),
    materialCategories: mergeArrayById(base.materialCategories, userState.materialCategories),
    products: mergeArrayById(base.products, userState.products),
    warehouses: mergeArrayById(base.warehouses, userState.warehouses),
    locations: mergeArrayById(base.locations, userState.locations),
    bomVersions: mergeArrayById(base.bomVersions, userState.bomVersions),
    bomItems: mergeArrayById(base.bomItems, userState.bomItems),
    workCenters: mergeArrayById(base.workCenters, userState.workCenters),
    customers: mergeArrayById(base.customers, userState.customers),
    suppliers: mergeArrayById(base.suppliers, userState.suppliers),
    quotations: mergeArrayById(base.quotations, userState.quotations),
    quotationItems: mergeArrayById(base.quotationItems, userState.quotationItems),
    quotationPrices: mergeArrayById(base.quotationPrices, userState.quotationPrices),
    orders: mergeArrayById(base.orders, userState.orders),
    salesOrders: mergeArrayById(base.salesOrders, userState.salesOrders),
    productionOrders: mergeArrayById(base.productionOrders, userState.productionOrders),
    pickingOrders: mergeArrayById(base.pickingOrders, userState.pickingOrders),
    gescompTasks: mergeArrayById(base.gescompTasks, userState.gescompTasks),
    gescompShoppingList: mergeArrayById(base.gescompShoppingList, userState.gescompShoppingList),
    auditLogs: Array.isArray(userState.auditLogs) && userState.auditLogs.length > 0 ? userState.auditLogs : base.auditLogs,
    stockBalances: Array.isArray(userState.stockBalances) ? userState.stockBalances : base.stockBalances,
    stockMovements: Array.isArray(userState.stockMovements) ? userState.stockMovements : base.stockMovements,
    stockReservations: Array.isArray(userState.stockReservations) ? userState.stockReservations : base.stockReservations,
    crmLeads: mergeArrayById((base as any).crmLeads || [], (userState as any).crmLeads || [])
  } as DatabaseState;
}

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<DatabaseState>(() => {
    let loadedState: Partial<DatabaseState> | null = null;

    for (const key of STORAGE_KEYS) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            loadedState = loadedState ? deepMergeDbState(loadedState as DatabaseState, parsed) : parsed;
          }
        }
      } catch (_) {}
    }

    if (loadedState) {
      return deepMergeDbState(INITIAL_DATABASE, loadedState);
    }

    return INITIAL_DATABASE;
  });

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const realtimeChannelRef = React.useRef<any>(null);
  const lastSyncTimestampRef = React.useRef<string>('');

  // Sincronização centralizada a partir do Supabase Cloud
  const syncFromCloud = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }

    try {
      setSyncing(true);
      const { data, error } = await sb
        .from('system_backups')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0 && data[0]?.dados) {
        const cloudDb = data[0].dados;
        const backupTimestamp = data[0].criado_em || new Date().toISOString();

        if (backupTimestamp !== lastSyncTimestampRef.current) {
          lastSyncTimestampRef.current = backupTimestamp;
          setDb(prev => {
            const merged = deepMergeDbState(prev, cloudDb);
            merged.lastBackup = backupTimestamp;

            STORAGE_KEYS.forEach(key => {
              try {
                localStorage.setItem(key, JSON.stringify(merged));
              } catch (_) {}
            });

            return merged;
          });
        }
      }
    } catch (e) {
      console.warn('[Supabase Sync Error]', e);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, []);

  // Salvar no LocalStorage, Supabase e disparar broadcast para todos os aparelhos
  const persistAndBroadcast = useCallback(async (newDb: DatabaseState, actionName: string = 'STATE_SYNC') => {
    const nowIso = new Date().toISOString();
    lastSyncTimestampRef.current = nowIso;

    // 1. Salvar no LocalStorage (disparará evento 'storage' para outras abas no mesmo dispositivo)
    STORAGE_KEYS.forEach(key => {
      try {
        localStorage.setItem(key, JSON.stringify(newDb));
      } catch (_) {}
    });

    // 2. Disparar evento broadcast WebSocket imediatamente se o canal estiver pronto
    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'fluxa_sync',
          payload: { action: actionName, timestamp: Date.now(), dados: newDb }
        });
      } catch (wsErr) {
        console.warn('[Realtime Broadcast Warn]', wsErr);
      }
    }

    // 3. Persistir Snapshot no Banco de Dados Supabase
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.from('system_backups').insert([{
          versao: '2.0.0',
          dados: newDb,
          tipo: 'auto_sync'
        }]);
      } catch (err) {
        console.warn('[Supabase Insert Error]', err);
      }
    }
  }, []);

  const updateDb = useCallback(async (updater: (prev: DatabaseState) => DatabaseState, actionName: string = 'DATA_UPDATED') => {
    setDb(prev => {
      const next = updater(prev);
      persistAndBroadcast(next, actionName);
      return next;
    });
  }, [persistAndBroadcast]);

  // SALVAR / CRIAR EMPRESA (Multi-CNPJ com Validação Rigorosa)
  const salvarEmpresa = useCallback(async (empresaData: Company, actorName: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Validação Matemática de CNPJ (Módulo 11)
    if (!validarCNPJ(empresaData.cnpj)) {
      return {
        success: false,
        error: 'CNPJ inválido! O número informado não passou na validação dos dígitos verificadores.'
      };
    }

    const cnpjLimpo = empresaData.cnpj.replace(/\D/g, '');
    const cnpjFormatado = mascaraCNPJ(empresaData.cnpj);

    // 2. Checagem de Duplicidade de CNPJ
    const duplicado = (db.companies || []).find(c =>
      c.id !== empresaData.id &&
      c.cnpj.replace(/\D/g, '') === cnpjLimpo &&
      c.ativa !== false
    );

    if (duplicado) {
      return {
        success: false,
        error: `Já existe uma empresa cadastrada com o CNPJ ${cnpjFormatado} (${duplicado.nomeFantasia || duplicado.razaoSocial}).`
      };
    }

    let result = { success: true, error: '' };
    await updateDb(prev => {
      const now = new Date().toISOString();
      const existing = (prev.companies || []).find(c => c.id === empresaData.id);
      const isFirstCompany = (prev.companies || []).filter(c => c.ativa !== false).length === 0;

      const isMatriz = empresaData.isMatriz || isFirstCompany;
      const empresaFormatada: Company = {
        ...empresaData,
        id: empresaData.id || uid('comp'),
        nome: empresaData.nome || empresaData.razaoSocial || empresaData.nomeFantasia || 'Nova Empresa',
        razaoSocial: empresaData.razaoSocial || empresaData.nome,
        nomeFantasia: empresaData.nomeFantasia || empresaData.fantasia || empresaData.nome,
        fantasia: empresaData.fantasia || empresaData.nomeFantasia || empresaData.nome,
        cnpj: cnpjFormatado,
        isMatriz,
        ativa: empresaData.ativa !== false,
        criadoEm: empresaData.criadoEm || now
      };

      let companies = (prev.companies || []).map(c => {
        if (c.id === empresaFormatada.id) return empresaFormatada;
        if (isMatriz && c.id !== empresaFormatada.id) return { ...c, isMatriz: false };
        return c;
      });

      if (!existing) {
        if (isMatriz) {
          companies = companies.map(c => ({ ...c, isMatriz: false }));
        }
        companies.push(empresaFormatada);
      }

      let company = prev.company;
      if (prev.currentCompanyId === empresaFormatada.id || isMatriz || companies.length === 1) {
        company = empresaFormatada;
      }

      const auditLog = {
        id: uid('log'),
        timestamp: now,
        action: existing ? 'COMPANY_UPDATED' : 'COMPANY_CREATED',
        actor: { id: 'usr', name: actorName || 'Super Admin' },
        target: { tipo: 'EMPRESA', codigo: empresaFormatada.cnpj },
        details: `Empresa [${empresaFormatada.cnpj}] ${empresaFormatada.nomeFantasia || empresaFormatada.nome} ${existing ? 'atualizada' : 'cadastrada'} com sucesso.`
      };

      return {
        ...prev,
        companies,
        company,
        currentCompanyId: prev.currentCompanyId || empresaFormatada.id,
        auditLogs: [auditLog, ...(prev.auditLogs || [])]
      };
    }, 'COMPANY_SAVED');

    return result;
  }, [db.companies, updateDb]);

  // EXCLUIR EMPRESA COM SOFT DELETE (Multi-CNPJ)
  const excluirEmpresa = useCallback(async (companyId: string, actorName: string): Promise<{ success: boolean; error?: string; vinculos?: { pedidos: number; ops: number; compras: number } }> => {
    const ativas = (db.companies || []).filter(c => c.ativa !== false);
    if (ativas.length <= 1) {
      return {
        success: false,
        error: 'Não é permitido desativar a única empresa ativa do sistema.'
      };
    }

    const target = (db.companies || []).find(c => c.id === companyId);
    if (!target) {
      return { success: false, error: 'Empresa não encontrada.' };
    }

    let result = { success: true, error: '' };
    await updateDb(prev => {
      const now = new Date().toISOString();

      // Aplica Soft Delete
      const companies = (prev.companies || []).map(c => {
        if (c.id === companyId) {
          return {
            ...c,
            ativa: false,
            excluidaEm: now
          };
        }
        return c;
      });

      let currentCompanyId = prev.currentCompanyId;
      let company = prev.company;

      if (currentCompanyId === companyId) {
        const nextActive = companies.find(c => c.ativa !== false && c.isMatriz) || companies.find(c => c.ativa !== false) || companies[0];
        currentCompanyId = nextActive.id;
        company = nextActive;
      }

      const auditLog = {
        id: uid('log'),
        timestamp: now,
        action: 'COMPANY_SOFT_DELETED',
        actor: { id: 'usr', name: actorName || 'Super Admin' },
        target: { tipo: 'EMPRESA', codigo: target.cnpj },
        details: `Empresa [${target.cnpj}] ${target.nomeFantasia || target.nome} desativada (soft delete) por ${actorName || 'Super Admin'}.`
      };

      return {
        ...prev,
        companies,
        company,
        currentCompanyId,
        auditLogs: [auditLog, ...(prev.auditLogs || [])]
      };
    }, 'COMPANY_DELETED');

    return result;
  }, [db.companies, updateDb]);

  // SELECIONAR EMPRESA ATIVA
  const selecionarEmpresaAtiva = useCallback(async (companyId: string) => {
    await updateDb(prev => {
      const selected = (prev.companies || []).find(c => c.id === companyId);
      if (!selected) return prev;
      return {
        ...prev,
        currentCompanyId: companyId,
        company: selected
      };
    }, 'COMPANY_CHANGED');
  }, [updateDb]);

  // SALVAR / CRIAR CATEGORIA DE MATERIAL/PRODUTO
  const salvarCategoria = useCallback(async (cat: MaterialCategory, actorName: string): Promise<{ success: boolean; error?: string }> => {
    if (!cat.nome || !cat.nome.trim()) {
      return { success: false, error: 'O nome da categoria é obrigatório.' };
    }

    let result = { success: true, error: '' };
    await updateDb(prev => {
      const existing = (prev.materialCategories || []).find(c => c.id === cat.id);
      const catFormatada: MaterialCategory = {
        id: cat.id || uid('cat'),
        nome: cat.nome.trim(),
        tipo: cat.tipo || 'GERAL',
        cor: cat.cor || 'teal',
        ativo: cat.ativo !== false
      };

      const materialCategories = existing
        ? (prev.materialCategories || []).map(c => c.id === cat.id ? catFormatada : c)
        : [...(prev.materialCategories || []), catFormatada];

      const auditLog = {
        id: uid('log'),
        timestamp: new Date().toISOString(),
        action: existing ? 'CATEGORY_UPDATED' : 'CATEGORY_CREATED',
        actor: { id: 'usr', name: actorName || 'Admin' },
        target: { tipo: 'CATEGORIA_MATERIAL', codigo: catFormatada.nome },
        details: `Categoria de material "${catFormatada.nome}" (${catFormatada.tipo}) ${existing ? 'atualizada' : 'criada'} por ${actorName || 'Admin'}.`
      };

      return {
        ...prev,
        materialCategories,
        auditLogs: [auditLog, ...(prev.auditLogs || [])]
      };
    }, 'CATEGORY_SAVED');

    return result;
  }, [updateDb]);

  // EXCLUIR CATEGORIA DE MATERIAL/PRODUTO
  const excluirCategoria = useCallback(async (catId: string, actorName: string): Promise<{ success: boolean; error?: string }> => {
    let result = { success: true, error: '' };
    await updateDb(prev => {
      const target = (prev.materialCategories || []).find(c => c.id === catId);
      if (!target) {
        result = { success: false, error: 'Categoria não encontrada.' };
        return prev;
      }

      // Soft delete / remoção
      const materialCategories = (prev.materialCategories || []).filter(c => c.id !== catId);

      const auditLog = {
        id: uid('log'),
        timestamp: new Date().toISOString(),
        action: 'CATEGORY_DELETED',
        actor: { id: 'usr', name: actorName || 'Admin' },
        target: { tipo: 'CATEGORIA_MATERIAL', codigo: target.nome },
        details: `Categoria de material "${target.nome}" excluída por ${actorName || 'Admin'}.`
      };

      return {
        ...prev,
        materialCategories,
        auditLogs: [auditLog, ...(prev.auditLogs || [])]
      };
    }, 'CATEGORY_DELETED');

    return result;
  }, [updateDb]);

  // Upload de logotipos com versionamento
  const uploadLogo = useCallback(async (type: keyof CustomLogos, dataUrl: string) => {
    await updateDb(prev => {
      const customLogos = Object.assign({}, prev.customLogos, {
        [type]: dataUrl,
        _v: Date.now()
      });
      const company = Object.assign({}, prev.company);
      if (type === 'jp3d') company.logo_institucional_url = dataUrl;
      if (type === 'fluxa' || type === 'logo_texto') {
        company.logo_plataforma_url = dataUrl;
        company.logo_texto_url = dataUrl;
      }
      if (type === 'logo_icone') company.logo_icone_url = dataUrl;
      if (type === 'sidebar') company.logo_sidebar_url = dataUrl;

      return Object.assign({}, prev, { customLogos, company });
    }, `LOGO_UPLOADED_${String(type).toUpperCase()}`);
  }, [updateDb]);

  // Resetar logos padrão
  const resetLogos = useCallback(async () => {
    await updateDb(prev => {
      const customLogos: CustomLogos = {
        fluxa: 'assets/fluxa_logo_texto.png',
        logo_icone: 'assets/fluxa_logo_icone.png',
        logo_texto: 'assets/fluxa_logo_texto.png',
        jp3d: 'assets/logo_jp3d.png',
        sidebar: 'assets/fluxa_logo_icone.png',
        _v: Date.now()
      };
      return Object.assign({}, prev, { customLogos });
    }, 'LOGOS_RESET');
  }, [updateDb]);

  // Zeramento Geral de Estoque
  const zerarSaldosEstoque = useCallback(async (actorName: string) => {
    await updateDb(prev => {
      const auditLog = {
        id: uid('log'),
        timestamp: new Date().toISOString(),
        action: 'ALL_STOCK_BALANCES_ZEROED',
        actor: { id: 'admin', name: actorName || 'Super Admin' },
        target: { tipo: 'ESTOQUE_GERAL' },
        details: `Zeramento total de saldos físicos em estoque executado por ${actorName || 'Super Admin'}.`
      };
      return Object.assign({}, prev, {
        stockBalances: [],
        stockMovements: [],
        stockReservations: [],
        auditLogs: [auditLog, ...(prev.auditLogs || [])]
      });
    }, 'STOCK_ZEROED');
  }, [updateDb]);

  // Salvar Produto com controle de concorrência e soft delete
  const salvarProduto = useCallback(async (product: Product, actorName: string): Promise<{ success: boolean; error?: string }> => {
    let result = { success: true, error: '' };
    await updateDb(prev => {
      const existing = (prev.products || []).find(p => p.id === product.id);
      if (existing && existing.version && product.version && existing.version > product.version) {
        result = { success: false, error: 'Conflito de concorrência: este produto foi modificado por outro usuário.' };
        return prev;
      }

      const nextVersion = (existing?.version || 1) + 1;
      const updatedProduct = Object.assign({}, product, { version: nextVersion });
      const products = existing
        ? prev.products.map(p => p.id === product.id ? updatedProduct : p)
        : [...prev.products, updatedProduct];

      return Object.assign({}, prev, { products });
    }, 'PRODUCT_SAVED');

    return result;
  }, [updateDb]);

  // Excluir Produto com Soft Delete
  const excluirProduto = useCallback(async (productId: string, actorName: string): Promise<{ success: boolean; error?: string }> => {
    await updateDb(prev => {
      const products = prev.products.map(p => {
        if (p.id === productId) {
          return Object.assign({}, p, {
            ativo: false,
            deleted_at: new Date().toISOString(),
            deleted_by: actorName || 'Admin'
          });
        }
        return p;
      });
      return Object.assign({}, prev, { products });
    }, 'PRODUCT_SOFT_DELETED');

    return { success: true };
  }, [updateDb]);

  // FLUXO AUTOMATIZADO ATÔMICO: Venda -> Baixa Estoque / OP / Reserva Insumos / Alerta Compras
  const processarVendaAutomatica = useCallback(async (
    vendaData: { customerId: string; previsaoEntrega: string; valorTotalCents?: number; condicaoPagamento?: string },
    itens: Array<{ productId: string; quantidade: number; precoUnitarioCents?: number }>,
    actorName: string
  ): Promise<ProcessarVendaResult> => {
    let result: ProcessarVendaResult = {
      success: false,
      pv: null as any,
      opsGeradas: [],
      baixasDiretas: [],
      reservasGeradas: [],
      alertasCompras: []
    };

    await updateDb(prev => {
      try {
        const now = new Date().toISOString();
        const seqPv = (prev.salesOrders?.length || 0) + 1;
        const codigoPv = `PV-${String(seqPv).padStart(4, '0')}`;
        const pvId = uid('pv');
        const whId = prev.warehouses[0]?.id || 'wh-1';

        const opsGeradas: ProductionOrder[] = [];
        const baixasDiretas: StockMovement[] = [];
        const reservasGeradas: StockReservation[] = [];
        const alertasCompras: Array<{ productId: string; descricao: string; qtdFaltante: number }> = [];

        let stockBalances = [...(prev.stockBalances || [])];
        let stockMovements = [...(prev.stockMovements || [])];
        let stockReservations = [...(prev.stockReservations || [])];
        let productionOrders = [...(prev.productionOrders || [])];
        let quotations = [...(prev.quotations || [])];
        let quotationItems = [...(prev.quotationItems || [])];

        const pvItems = [];
        let totalCents = 0;

        for (const it of itens) {
          const product = prev.products.find(p => p.id === it.productId);
          if (!product) continue;

          const unitPrice = it.precoUnitarioCents ?? (product.precoVendaCents || (product.precoReferencia ? product.precoReferencia * 100 : 4290000));
          const itemTotal = unitPrice * (it.quantidade / 1000 || 1);
          totalCents += itemTotal;

          const isProdutoAcabado = product.tipo_item === 'produto_acabado' || product.tipo === 'PA';

          // Checa saldo físico e reservas existentes
          const balIdx = stockBalances.findIndex(b => b.productId === it.productId);
          const saldoFisico = balIdx >= 0 ? stockBalances[balIdx].quantidade : 0;
          const reservasAtivas = stockReservations
            .filter(r => r.productId === it.productId && r.status === 'ativa')
            .reduce((sum, r) => sum + r.quantidade, 0);
          const saldoDisponivel = Math.max(0, saldoFisico - reservasAtivas);

          if (!isProdutoAcabado) {
            // Não é produto acabado (matéria-prima, MUC, insumo): baixa direta de estoque
            const qtdBaixar = it.quantidade;
            if (balIdx >= 0) {
              stockBalances[balIdx] = {
                ...stockBalances[balIdx],
                quantidade: Math.max(0, stockBalances[balIdx].quantidade - qtdBaixar)
              };
            }

            const mov: StockMovement = {
              id: uid('mov'),
              productId: it.productId,
              warehouseId: whId,
              tipo: 'saida',
              quantidade: qtdBaixar,
              sinal: -1,
              origemTipo: 'VENDA_DIRETA',
              origemId: pvId,
              observacao: `Baixa por Venda Direta ${codigoPv} (${product.codigo})`,
              criadoEm: now,
              criadoPor: actorName
            };
            stockMovements = [mov, ...stockMovements];
            baixasDiretas.push(mov);

            pvItems.push({
              id: uid('pvi'),
              salesOrderId: pvId,
              productId: it.productId,
              quantidade: it.quantidade,
              precoUnitarioCents: unitPrice,
              valorTotalCents: itemTotal,
              produzido: true
            });
          } else {
            // É PRODUTO ACABADO
            if (saldoDisponivel >= it.quantidade) {
              // Saldo total disponível em estoque: Baixa direta sem gerar OP
              if (balIdx >= 0) {
                stockBalances[balIdx] = {
                  ...stockBalances[balIdx],
                  quantidade: Math.max(0, stockBalances[balIdx].quantidade - it.quantidade)
                };
              }

              const mov: StockMovement = {
                id: uid('mov'),
                productId: it.productId,
                warehouseId: whId,
                tipo: 'saida',
                quantidade: it.quantidade,
                sinal: -1,
                origemTipo: 'VENDA_PRODUTO_ACABADO',
                origemId: pvId,
                observacao: `Baixa de Produto Acabado em Estoque p/ Venda ${codigoPv} (${product.codigo})`,
                criadoEm: now,
                criadoPor: actorName
              };
              stockMovements = [mov, ...stockMovements];
              baixasDiretas.push(mov);

              pvItems.push({
                id: uid('pvi'),
                salesOrderId: pvId,
                productId: it.productId,
                quantidade: it.quantidade,
                precoUnitarioCents: unitPrice,
                valorTotalCents: itemTotal,
                produzido: true
              });
            } else {
              // Saldo insuficiente (parcial ou total): Baixa o parcial se houver e gera OP para a diferença
              const qtdEstoque = saldoDisponivel;
              const qtdAProduzir = it.quantidade - saldoDisponivel;

              if (qtdEstoque > 0) {
                if (balIdx >= 0) {
                  stockBalances[balIdx] = {
                    ...stockBalances[balIdx],
                    quantidade: Math.max(0, stockBalances[balIdx].quantidade - qtdEstoque)
                  };
                }
                const mov: StockMovement = {
                  id: uid('mov'),
                  productId: it.productId,
                  warehouseId: whId,
                  tipo: 'saida',
                  quantidade: qtdEstoque,
                  sinal: -1,
                  origemTipo: 'VENDA_PRODUTO_ACABADO_PARCIAL',
                  origemId: pvId,
                  observacao: `Baixa parcial de Produto Acabado em Estoque p/ Venda ${codigoPv}`,
                  criadoEm: now,
                  criadoPor: actorName
                };
                stockMovements = [mov, ...stockMovements];
                baixasDiretas.push(mov);
              }

              // Localiza Ficha Técnica (BOM)
              const bom = prev.bomVersions?.find(v => v.productId === it.productId && v.status === 'ativa') ||
                prev.bomVersions?.find(v => v.productId === it.productId) ||
                { id: 'bom-cv1200' };

              const bomItems = prev.bomItems?.filter(bi => bi.bomVersionId === bom.id) || [];

              const opSeq = productionOrders.length + opsGeradas.length + 1;
              const opCodigo = `OP-${String(opSeq).padStart(4, '0')}`;
              const opId = uid('op');

              let allMaterialsAvailable = true;

              // Reserva de Matéria-Prima conforme BOM
              for (const bi of bomItems) {
                const fatorQtd = qtdAProduzir >= 1000 ? (qtdAProduzir / 1000) : qtdAProduzir;
                const qtdConsumoTotal = bi.quantidade * fatorQtd;
                const compBal = stockBalances.find(b => b.productId === bi.componentProductId);
                const compFisico = compBal?.quantidade || 0;
                const compReservado = stockReservations
                  .filter(r => r.productId === bi.componentProductId && r.status === 'ativa')
                  .reduce((s, r) => s + r.quantidade, 0);
                const compDisponivel = Math.max(0, compFisico - compReservado);

                const res: StockReservation = {
                  id: uid('res'),
                  productId: bi.componentProductId,
                  warehouseId: whId,
                  productionOrderId: opId,
                  salesOrderId: pvId,
                  quantidade: qtdConsumoTotal,
                  status: 'ativa',
                  criadoEm: now
                };
                stockReservations = [res, ...stockReservations];
                reservasGeradas.push(res);

                if (compDisponivel < qtdConsumoTotal) {
                  allMaterialsAvailable = false;
                  const falta = qtdConsumoTotal - compDisponivel;
                  const compProd = prev.products.find(p => p.id === bi.componentProductId);
                  alertasCompras.push({
                    productId: bi.componentProductId,
                    descricao: compProd?.descricao || bi.componentProductId,
                    qtdFaltante: falta
                  });
                }
              }

              const statusOp: ProductionOrder['status'] = allMaterialsAvailable ? 'material_reservado' : 'aguardando_material';

              const novaOp: ProductionOrder = {
                id: opId,
                codigo: opCodigo,
                productId: it.productId,
                bomVersionId: bom.id,
                salesOrderId: pvId,
                salesOrderCodigo: codigoPv,
                quantidadePlanejada: qtdAProduzir,
                quantidadeProduzida: 0,
                quantidadeRefugo: 0,
                status: statusOp,
                dataInicioPrevista: now.split('T')[0],
                dataEntregaPrevista: vendaData.previsaoEntrega || new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
                companyId: prev.currentCompanyId,
                criadoEm: now
              };

              productionOrders = [novaOp, ...productionOrders];
              opsGeradas.push(novaOp);

              pvItems.push({
                id: uid('pvi'),
                salesOrderId: pvId,
                productId: it.productId,
                quantidade: it.quantidade,
                precoUnitarioCents: unitPrice,
                valorTotalCents: itemTotal,
                produzido: false,
                productionOrderId: opId,
                productionOrderCodigo: opCodigo
              });
            }
          }
        }

        // Se houver alerta de compra, cria uma Solicitação de Cotação Automática (RFQ) no módulo de Compras
        if (alertasCompras.length > 0) {
          const cotSeq = (quotations.length || 0) + 1;
          const cotCodigo = `RFQ-AUTO-${String(cotSeq).padStart(4, '0')}`;
          const cotId = uid('cot');

          const novaCotacao: Quotation = {
            id: cotId,
            codigo: cotCodigo,
            descricao: `Reposição de Insumos Automática para ${opsGeradas.map(o => o.codigo).join(', ')} (${codigoPv})`,
            status: 'nova_solicitacao',
            dataAbertura: now.split('T')[0],
            dataLimite: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
            solicitanteId: 'usr-pcp-auto',
            companyId: prev.currentCompanyId
          };

          const novosItensCotacao: QuotationItem[] = alertasCompras.map(al => ({
            id: uid('coti'),
            quotationId: cotId,
            productId: al.productId,
            quantidade: al.qtdFaltante,
            observacao: `Demanda disparada automaticamente pela venda ${codigoPv}`
          }));

          quotations = [novaCotacao, ...quotations];
          quotationItems = [...novosItensCotacao, ...quotationItems];
        }

        const statusPv: SalesOrder['status'] = opsGeradas.length > 0 ? 'em_producao' : 'pronto_expedicao';

        const novoPv: SalesOrder = {
          id: pvId,
          codigo: codigoPv,
          customerId: vendaData.customerId,
          status: statusPv,
          valorTotalCents: vendaData.valorTotalCents || totalCents,
          condicaoPagamento: vendaData.condicaoPagamento || 'À Vista / Faturamento',
          previsaoEntrega: vendaData.previsaoEntrega,
          items: pvItems,
          productionOrderIds: opsGeradas.map(o => o.id),
          productionOrderCodigos: opsGeradas.map(o => o.codigo),
          companyId: prev.currentCompanyId,
          criadoEm: now
        };

        const auditLog = {
          id: uid('log'),
          timestamp: now,
          action: 'SALES_TO_PRODUCTION_AUTOMATION',
          actor: { id: 'usr', name: actorName },
          target: { tipo: 'PEDIDO_VENDA', codigo: codigoPv },
          details: `Venda ${codigoPv} confirmada. ${opsGeradas.length} OP(s) gerada(s) [${opsGeradas.map(o => o.codigo).join(', ')}], ${baixasDiretas.length} baixa(s) direta(s), ${reservasGeradas.length} reserva(s) de matéria-prima e ${alertasCompras.length} alerta(s) de compra.`
        };

        result = {
          success: true,
          pv: novoPv,
          opsGeradas,
          baixasDiretas,
          reservasGeradas,
          alertasCompras
        };

        return {
          ...prev,
          salesOrders: [novoPv, ...(prev.salesOrders || [])],
          productionOrders,
          stockBalances,
          stockMovements,
          stockReservations,
          quotations,
          quotationItems,
          auditLogs: [auditLog, ...(prev.auditLogs || [])]
        };
      } catch (err: any) {
        result = {
          success: false,
          pv: null as any,
          opsGeradas: [],
          baixasDiretas: [],
          reservasGeradas: [],
          alertasCompras: [],
          error: err?.message || 'Falha ao processar venda automática'
        };
        return prev;
      }
    }, 'SALES_TO_PRODUCTION_AUTOMATION');

    return result;
  }, [updateDb]);

  // EXCLUSÃO DE ORDEM DE PRODUÇÃO COM ESTORNO INTEGRAL
  const excluirOpComEstorno = useCallback(async (opId: string, actorName: string): Promise<{ success: boolean; error?: string; detalhes?: string }> => {
    let result = { success: true, error: '', detalhes: '' };
    await updateDb(prev => {
      const op = (prev.productionOrders || []).find(o => o.id === opId);
      if (!op) {
        result = { success: false, error: 'Ordem de Produção não encontrada.', detalhes: '' };
        return prev;
      }

      const now = new Date().toISOString();
      const whId = prev.warehouses[0]?.id || 'wh-1';

      // 1. Cancelar e remover reservas ativas de matéria-prima vinculadas a esta OP
      const reservasDaOp = (prev.stockReservations || []).filter(r => r.productionOrderId === opId && r.status === 'ativa');
      const totalReservasEstornadas = reservasDaOp.length;
      const stockReservations = (prev.stockReservations || []).filter(r => r.productionOrderId !== opId);

      // 2. Estornar movimentações físicas de estoque geradas pela OP (se houver apontamento/consumo)
      const movsDaOp = (prev.stockMovements || []).filter(m => m.origemId === opId);
      let stockBalances = [...(prev.stockBalances || [])];
      let newMovements: StockMovement[] = [];

      for (const mov of movsDaOp) {
        if (mov.tipo === 'saida' || mov.sinal === -1) {
          const estornoMov: StockMovement = {
            id: uid('mov'),
            productId: mov.productId,
            warehouseId: mov.warehouseId || whId,
            tipo: 'entrada',
            quantidade: mov.quantidade,
            sinal: 1,
            origemTipo: 'ESTORNO_CONSUMO_OP',
            origemId: opId,
            observacao: `Estorno de consumo referente à exclusão da ${op.codigo}`,
            criadoEm: now,
            criadoPor: actorName || 'Sistema'
          };
          newMovements.push(estornoMov);

          const balIdx = stockBalances.findIndex(b => b.productId === mov.productId);
          if (balIdx >= 0) {
            stockBalances[balIdx] = {
              ...stockBalances[balIdx],
              quantidade: stockBalances[balIdx].quantidade + mov.quantidade
            };
          } else {
            stockBalances.push({
              id: uid('bal'),
              productId: mov.productId,
              warehouseId: mov.warehouseId || whId,
              quantidade: mov.quantidade
            });
          }
        } else if (mov.tipo === 'entrada' || mov.sinal === 1) {
          const estornoMov: StockMovement = {
            id: uid('mov'),
            productId: mov.productId,
            warehouseId: mov.warehouseId || whId,
            tipo: 'saida',
            quantidade: mov.quantidade,
            sinal: -1,
            origemTipo: 'ESTORNO_PRODUCAO_OP',
            origemId: opId,
            observacao: `Estorno de produto acabado referente à exclusão da ${op.codigo}`,
            criadoEm: now,
            criadoPor: actorName || 'Sistema'
          };
          newMovements.push(estornoMov);

          const balIdx = stockBalances.findIndex(b => b.productId === mov.productId);
          if (balIdx >= 0) {
            stockBalances[balIdx] = {
              ...stockBalances[balIdx],
              quantidade: Math.max(0, stockBalances[balIdx].quantidade - mov.quantidade)
            };
          }
        }
      }

      // 3. Desvincular a OP do Pedido de Venda associado
      const salesOrders = (prev.salesOrders || []).map(pv => {
        if (pv.productionOrderIds?.includes(opId) || pv.id === op.salesOrderId) {
          return {
            ...pv,
            productionOrderIds: (pv.productionOrderIds || []).filter(id => id !== opId),
            productionOrderCodigos: (pv.productionOrderCodigos || []).filter(c => c !== op.codigo)
          };
        }
        return pv;
      });

      // 4. Remover a OP
      const productionOrders = (prev.productionOrders || []).filter(o => o.id !== opId);

      const auditLog = {
        id: uid('log'),
        timestamp: now,
        action: 'PRODUCTION_ORDER_DELETED_WITH_ROLLBACK',
        actor: { id: 'usr', name: actorName || 'Admin' },
        target: { tipo: 'ORDEM_PRODUCAO', codigo: op.codigo },
        details: `Ordem de Produção ${op.codigo} excluída com estorno: ${totalReservasEstornadas} reserva(s) cancelada(s), ${newMovements.length} movimentação(ões) de estorno gerada(s).`
      };

      result = {
        success: true,
        error: '',
        detalhes: `OP ${op.codigo} excluída com sucesso! ${totalReservasEstornadas} reserva(s) de matéria-prima liberada(s).`
      };

      return {
        ...prev,
        productionOrders,
        stockReservations,
        stockBalances,
        stockMovements: [...newMovements, ...(prev.stockMovements || [])],
        salesOrders,
        auditLogs: [auditLog, ...(prev.auditLogs || [])]
      };
    }, 'OP_DELETED_WITH_ROLLBACK');

    return result;
  }, [updateDb]);

  // EXCLUSÃO DE PEDIDO DE VENDA COM ESTORNO DE TODAS AS OPS, RESERVAS E BAIXAS
  const excluirVendaComEstorno = useCallback(async (pvId: string, actorName: string): Promise<{ success: boolean; error?: string; detalhes?: string }> => {
    let result = { success: true, error: '', detalhes: '' };
    await updateDb(prev => {
      const pv = (prev.salesOrders || []).find(p => p.id === pvId);
      if (!pv) {
        result = { success: false, error: 'Pedido de Venda não encontrado.', detalhes: '' };
        return prev;
      }

      const now = new Date().toISOString();
      const whId = prev.warehouses[0]?.id || 'wh-1';

      // 1. Identificar todas as OPs geradas pela venda
      const opsVinculadas = (prev.productionOrders || []).filter(
        o => o.salesOrderId === pvId || pv.productionOrderIds?.includes(o.id)
      );
      const opIds = new Set(opsVinculadas.map(o => o.id));

      // 2. Cancelar e remover TODAS as reservas vinculadas a esta Venda e às suas OPs
      const reservasAfetadas = (prev.stockReservations || []).filter(
        r => r.salesOrderId === pvId || (r.productionOrderId && opIds.has(r.productionOrderId))
      );
      const totalReservasCanceladas = reservasAfetadas.length;

      const stockReservations = (prev.stockReservations || []).filter(
        r => r.salesOrderId !== pvId && (!r.productionOrderId || !opIds.has(r.productionOrderId))
      );

      // 3. Estornar movimentações de estoque diretas da Venda e das OPs
      const movsVendaEOps = (prev.stockMovements || []).filter(
        m => m.origemId === pvId || (m.origemId && opIds.has(m.origemId)) || (m.observacao && m.observacao.includes(pv.codigo))
      );

      let stockBalances = [...(prev.stockBalances || [])];
      let newMovements: StockMovement[] = [];

      for (const mov of movsVendaEOps) {
        if (mov.tipo === 'saida' || mov.sinal === -1) {
          const estornoMov: StockMovement = {
            id: uid('mov'),
            productId: mov.productId,
            warehouseId: mov.warehouseId || whId,
            tipo: 'entrada',
            quantidade: mov.quantidade,
            sinal: 1,
            origemTipo: 'ESTORNO_VENDA',
            origemId: pvId,
            observacao: `Estorno de saída referente à exclusão da Venda ${pv.codigo}`,
            criadoEm: now,
            criadoPor: actorName || 'Sistema'
          };
          newMovements.push(estornoMov);

          const balIdx = stockBalances.findIndex(b => b.productId === mov.productId);
          if (balIdx >= 0) {
            stockBalances[balIdx] = {
              ...stockBalances[balIdx],
              quantidade: stockBalances[balIdx].quantidade + mov.quantidade
            };
          } else {
            stockBalances.push({
              id: uid('bal'),
              productId: mov.productId,
              warehouseId: mov.warehouseId || whId,
              quantidade: mov.quantidade
            });
          }
        }
      }

      // 4. Remover as OPs vinculadas
      const productionOrders = (prev.productionOrders || []).filter(
        o => o.salesOrderId !== pvId && !opIds.has(o.id)
      );

      // 5. Remover o Pedido de Venda
      const salesOrders = (prev.salesOrders || []).filter(p => p.id !== pvId);

      // 6. Cancelar cotações RFQ automáticas geradas pela venda
      const quotations = (prev.quotations || []).filter(q => {
        const isAutoVenda = q.codigo.startsWith('RFQ-AUTO') && q.descricao.includes(pv.codigo);
        return !isAutoVenda;
      });

      const auditLog = {
        id: uid('log'),
        timestamp: now,
        action: 'SALES_ORDER_DELETED_WITH_ROLLBACK',
        actor: { id: 'usr', name: actorName || 'Admin' },
        target: { tipo: 'PEDIDO_VENDA', codigo: pv.codigo },
        details: `Venda ${pv.codigo} excluída com estorno integral: ${opsVinculadas.length} OP(s) removida(s), ${totalReservasCanceladas} reserva(s) de estoque cancelada(s), ${newMovements.length} baixa(s) estornada(s).`
      };

      result = {
        success: true,
        error: '',
        detalhes: `Venda ${pv.codigo} excluída com sucesso! ${opsVinculadas.length} OP(s) removida(s) e todos os saldos de estoque foram restaurados.`
      };

      return {
        ...prev,
        salesOrders,
        productionOrders,
        stockReservations,
        stockBalances,
        stockMovements: [...newMovements, ...(prev.stockMovements || [])],
        quotations,
        auditLogs: [auditLog, ...(prev.auditLogs || [])]
      };
    }, 'SALES_ORDER_DELETED_WITH_ROLLBACK');

    return result;
  }, [updateDb]);

  // RECONCILIAÇÃO DE ESTOQUE (LIMPEZA DE RESERVAS ÓRFÃS)
  const reconciliarEstoque = useCallback(async (actorName: string): Promise<{ success: boolean; reservasRemovidas: number; detalhes?: string }> => {
    let result = { success: true, reservasRemovidas: 0, detalhes: '' };
    await updateDb(prev => {
      const activeOpIds = new Set((prev.productionOrders || []).map(o => o.id));
      const activePvIds = new Set((prev.salesOrders || []).map(p => p.id));

      const orfas = (prev.stockReservations || []).filter(r =>
        (r.productionOrderId && !activeOpIds.has(r.productionOrderId)) ||
        (r.salesOrderId && !activePvIds.has(r.salesOrderId))
      );

      const reservasValidas = (prev.stockReservations || []).filter(r =>
        (!r.productionOrderId || activeOpIds.has(r.productionOrderId)) &&
        (!r.salesOrderId || activePvIds.has(r.salesOrderId))
      );

      const auditLog = {
        id: uid('log'),
        timestamp: new Date().toISOString(),
        action: 'STOCK_RECONCILIATION',
        actor: { id: 'usr', name: actorName || 'Sistema' },
        target: { tipo: 'ESTOQUE_RECONCILIACAO' },
        details: `Reconciliação de estoque executada. ${orfas.length} reserva(s) órfã(s) removida(s).`
      };

      result = {
        success: true,
        reservasRemovidas: orfas.length,
        detalhes: `Reconciliação concluída: ${orfas.length} reserva(s) órfã(s) limpa(s).`
      };

      return {
        ...prev,
        stockReservations: reservasValidas,
        auditLogs: [auditLog, ...(prev.auditLogs || [])]
      };
    }, 'STOCK_RECONCILIATION');

    return result;
  }, [updateDb]);

  // Subscrição WebSocket Realtime e Sincronização Contínua
  useEffect(() => {
    syncFromCloud();

    // 1. Sincronização instantânea entre abas no mesmo computador/navegador
    const handleStorageChange = (e: StorageEvent) => {
      if (STORAGE_KEYS.includes(e.key || '') && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            setDb(prev => deepMergeDbState(prev, parsed));
          }
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 2. Conexão WebSocket Realtime do Supabase Cloud
    const sb = getSupabase();
    let channel: any = null;

    if (sb) {
      channel = sb.channel('fluxa_realtime_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_backups' }, () => {
          syncFromCloud();
        })
        .on('broadcast', { event: 'fluxa_sync' }, (payload: any) => {
          if (payload?.payload?.dados) {
            setDb(prev => deepMergeDbState(prev, payload.payload.dados));
          } else {
            syncFromCloud();
          }
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            realtimeChannelRef.current = channel;
          }
        });
    }

    // 3. Heartbeat de segurança a cada 5 segundos (garante recuperação instantânea em oscilações de rede)
    const pollerInterval = setInterval(async () => {
      if (document.hidden) return;
      const client = getSupabase();
      if (!client) return;

      try {
        const { data } = await client
          .from('system_backups')
          .select('criado_em')
          .order('criado_em', { ascending: false })
          .limit(1);

        if (data && data[0]?.criado_em && data[0].criado_em !== lastSyncTimestampRef.current) {
          syncFromCloud();
        }
      } catch (_) {}
    }, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollerInterval);
      if (sb && channel) {
        sb.removeChannel(channel);
        realtimeChannelRef.current = null;
      }
    };
  }, [syncFromCloud]);

  return (
    <DbContext.Provider value={{
      db,
      loading,
      syncing,
      syncFromCloud,
      updateDb,
      uploadLogo,
      resetLogos,
      zerarSaldosEstoque,
      salvarProduto,
      excluirProduto,
      processarVendaAutomatica,
      excluirVendaComEstorno,
      excluirOpComEstorno,
      reconciliarEstoque,
      salvarEmpresa,
      excluirEmpresa,
      selecionarEmpresaAtiva,
      salvarCategoria,
      excluirCategoria
    }}>
      {children}
    </DbContext.Provider>
  );
};

export const useDb = () => {
  const context = useContext(DbContext);
  if (!context) throw new Error('useDb must be used within a DbProvider');
  return context;
};
