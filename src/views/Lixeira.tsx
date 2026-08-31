import React, { useState, useMemo } from 'react';
import { 
  Trash2, RotateCcw, Search, Filter, AlertTriangle, ShieldCheck, 
  Calendar, User, Clock, CheckCircle2, Package, Users, ShoppingBag, 
  Wrench, ShoppingCart, FileSpreadsheet, Building2, Tag, Layers, Database
} from 'lucide-react';
import { useDelete } from '../context/DeleteContext';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { fmtDataHora, fmtData } from '../lib/formatters';
import { DeletedItemRecord } from '../types';

export const Lixeira: React.FC = () => {
  const { deletedItems, restoreItem, purgeItem, canUserAccessModule } = useDelete();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  // Modal de Detalhes do Item Excluído
  const [viewingItem, setViewingItem] = useState<DeletedItemRecord | null>(null);

  // Filtra itens com base nas permissões de módulo do usuário autenticado
  const userVisibleItems = useMemo(() => {
    return deletedItems.filter(item => canUserAccessModule(item.moduleKey));
  }, [deletedItems, canUserAccessModule]);

  // Filtros de busca e tipo
  const filteredItems = useMemo(() => {
    return userVisibleItems.filter(item => {
      if (filterType !== 'todos' && item.entityType !== filterType) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNome = item.entityName?.toLowerCase().includes(q);
        const matchCod = item.entityCode?.toLowerCase().includes(q);
        const matchUser = item.deletedBy?.name?.toLowerCase().includes(q);
        if (!matchNome && !matchCod && !matchUser) return false;
      }

      return true;
    });
  }, [userVisibleItems, filterType, searchTerm]);

  // Ícone por tipo de entidade
  const getEntityIcon = (type: DeletedItemRecord['entityType']) => {
    switch (type) {
      case 'product': return <Package className="w-4 h-4 text-teal-400" />;
      case 'category': return <Tag className="w-4 h-4 text-blue-400" />;
      case 'customer': return <Users className="w-4 h-4 text-emerald-400" />;
      case 'supplier': return <Building2 className="w-4 h-4 text-amber-400" />;
      case 'user': return <User className="w-4 h-4 text-purple-400" />;
      case 'salesOrder': return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      case 'productionOrder': return <Wrench className="w-4 h-4 text-amber-400" />;
      case 'quotation': return <FileSpreadsheet className="w-4 h-4 text-blue-400" />;
      case 'purchaseOrder': return <ShoppingCart className="w-4 h-4 text-teal-400" />;
      case 'shoppingItem': return <ShoppingCart className="w-4 h-4 text-amber-400" />;
      case 'workCenter': return <Wrench className="w-4 h-4 text-purple-400" />;
      case 'warehouse': return <Database className="w-4 h-4 text-blue-400" />;
      case 'bomVersion': return <Layers className="w-4 h-4 text-teal-400" />;
      default: return <Trash2 className="w-4 h-4 text-slate-400" />;
    }
  };

  // Label amigável do tipo
  const getEntityLabel = (type: DeletedItemRecord['entityType']) => {
    const labels: Record<DeletedItemRecord['entityType'], string> = {
      product: 'Produto / SKU',
      category: 'Categoria',
      company: 'Empresa',
      user: 'Usuário',
      customer: 'Cliente',
      supplier: 'Fornecedor',
      salesOrder: 'Pedido de Venda',
      productionOrder: 'Ordem de Produção (OP)',
      quotation: 'Cotação / RFQ',
      purchaseOrder: 'Pedido de Compra',
      shoppingItem: 'Item Lista de Compras',
      workCenter: 'Centro de Trabalho',
      warehouse: 'Depósito / Almoxarifado',
      bomVersion: 'Ficha Técnica (BOM)'
    };
    return labels[type] || type;
  };

  // Cálculo de dias restantes de retenção (30 dias)
  const getDiasRestantes = (deletedAt: string, retentionDays: number = 30) => {
    const dataExclusao = new Date(deletedAt).getTime();
    const dataLimite = dataExclusao + (retentionDays * 86400000);
    const diffDias = Math.ceil((dataLimite - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDias);
  };

  // Execução de Restauração
  const handleRestore = async (item: DeletedItemRecord) => {
    try {
      setIsRestoring(item.id);
      const res = await restoreItem(item.id);
      if (res.success) {
        alert(`✅ "${item.entityName}" foi restaurado com sucesso!`);
      } else {
        alert(res.error || 'Erro ao restaurar item.');
      }
    } catch (err: any) {
      alert(`Falha na restauração: ${err?.message || 'Erro inesperado'}`);
    } finally {
      setIsRestoring(null);
    }
  };

  // Exclusão permanente (apenas Super Admin)
  const handlePurge = async (item: DeletedItemRecord) => {
    if (confirm(`ATENÇÃO: Deseja purgar permanentemente "${item.entityName}"? Esta ação removerá o registro definitivamente da lixeira sem possibilidade de recuperação.`)) {
      await purgeItem(item.id);
      alert('Registro removido definitivamente.');
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header com Alerta de Retenção */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            Lixeira & Itens Excluídos Recentemente
          </h2>
          <p className="text-xs text-slate-500">
            Todos os itens excluídos via Soft Delete permanecem recuperáveis durante o período de retenção de 30 dias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="info">
            Período de Retenção: 30 dias
          </Badge>
          <span className="text-xs font-mono text-slate-400">
            {filteredItems.length} registro(s)
          </span>
        </div>
      </div>

      {/* 2. Filtros e Busca */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, código ou usuário que excluiu..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-medium"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="product">Produtos / SKUs</option>
            <option value="category">Categorias</option>
            <option value="customer">Clientes</option>
            <option value="supplier">Fornecedores</option>
            <option value="user">Usuários</option>
            <option value="salesOrder">Pedidos de Venda</option>
            <option value="productionOrder">Ordens de Produção (OP)</option>
            <option value="quotation">Cotações / RFQs</option>
            <option value="purchaseOrder">Pedidos de Compra</option>
            <option value="shoppingItem">Itens de Compras</option>
          </select>
        </div>
      </div>

      {/* 3. Tabela / Listagem de Itens Excluídos */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Registro Excluído</th>
                <th className="px-4 py-3">Tipo & Módulo</th>
                <th className="px-4 py-3">Excluído Por</th>
                <th className="px-4 py-3">Data da Exclusão</th>
                <th className="px-4 py-3 text-center">Retenção Restante</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredItems.map(item => {
                const diasRestantes = getDiasRestantes(item.deletedAt, item.retentionDays);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Nome / Identificador */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                          {getEntityIcon(item.entityType)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block text-sm">
                            {item.entityName}
                          </span>
                          {item.entityCode && (
                            <span className="font-mono text-[10.5px] text-slate-400">
                              Código: {item.entityCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tipo & Módulo */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {getEntityLabel(item.entityType)}
                      </span>
                    </td>

                    {/* Excluído Por */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {item.deletedBy?.name || 'Super Admin'}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {item.deletedBy?.id || 'admin'}
                      </span>
                    </td>

                    {/* Data */}
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                      {fmtDataHora(item.deletedAt)}
                    </td>

                    {/* Retenção */}
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold font-mono ${
                        diasRestantes <= 5 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {diasRestantes} dias restantes
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. RESTAURAR ITEM */}
                        <Button
                          variant="success"
                          size="sm"
                          icon={<RotateCcw className="w-3.5 h-3.5" />}
                          onClick={() => handleRestore(item)}
                          loading={isRestoring === item.id}
                          className="font-bold text-[11px] shadow-xs"
                          title="Restaurar item imediatamente para o módulo de origem"
                        >
                          Restaurar
                        </Button>

                        {/* 2. PURGAR (SUPER ADMIN) */}
                        {(user?.roleId === 'super_admin' || user?.permissoes?.includes('*')) && (
                          <button
                            onClick={() => handlePurge(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Excluir definitivamente sem esperar retenção"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto" />
                      <p className="font-bold text-slate-300 text-sm">Lixeira Vazia</p>
                      <p className="text-[11px] text-slate-500">
                        Nenhum item excluído recentemente encontrado nos módulos que você tem acesso.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
