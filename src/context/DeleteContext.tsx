import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useDb } from './DbContext';
import { useAuth } from './AuthContext';
import { DeletedItemRecord } from '../types';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { UndoToast } from '../components/ui/UndoToast';
import { uid } from '../lib/formatters';

export interface DeleteRequestOptions {
  title?: string;
  itemName: string;
  itemType: string;
  entityType: DeletedItemRecord['entityType'];
  moduleKey: DeletedItemRecord['moduleKey'];
  originalId: string;
  itemData: any;
  isSoftDelete?: boolean;
  warningMessage?: string;
  dependencies?: string[];
  onDelete: () => Promise<void> | void;
}

interface DeleteContextType {
  requestDelete: (options: DeleteRequestOptions) => void;
  restoreItem: (recordId: string) => Promise<{ success: boolean; error?: string }>;
  purgeItem: (recordId: string) => Promise<{ success: boolean }>;
  deletedItems: DeletedItemRecord[];
  canUserAccessModule: (moduleKey: DeletedItemRecord['moduleKey']) => boolean;
}

const DeleteContext = createContext<DeleteContextType | null>(null);

const DEFAULT_RETENTION_DAYS = 30; // Proposta de retenção de 30 dias na lixeira

export const DeleteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();

  // Estado do Modal de Confirmação
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<DeleteRequestOptions | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado do Undo Toast
  const [undoItem, setUndoItem] = useState<DeletedItemRecord | null>(null);

  // Checagem de permissão do usuário sobre módulos
  const canUserAccessModule = useCallback((moduleKey: DeletedItemRecord['moduleKey']): boolean => {
    if (!user) return false;
    if (user.roleId === 'super_admin' || user.permissoes?.includes('*')) return true;

    switch (moduleKey) {
      case 'estoque':
        return user.permissoes?.includes('estoque') || user.roleId === 'role-estoquista' || user.roleId === 'role-producao';
      case 'compras':
        return user.permissoes?.includes('compras') || user.roleId === 'role-comprador-sr';
      case 'vendas':
        return user.permissoes?.includes('comercial') || user.permissoes?.includes('vendas');
      case 'producao':
        return user.permissoes?.includes('producao') || user.roleId === 'role-producao';
      case 'cadastros':
        return user.permissoes?.includes('cadastros') || user.roleId === 'role-engenheiro';
      case 'config':
        return user.roleId === 'super_admin';
      case 'tarefas':
        return true;
      default:
        return true;
    }
  }, [user]);

  // Limpeza automática de registros que excederam os 30 dias de retenção
  useEffect(() => {
    if (db.deletedItems && db.deletedItems.length > 0) {
      const nowMs = Date.now();
      const validItems = db.deletedItems.filter(item => {
        const itemDate = new Date(item.deletedAt).getTime();
        const maxAgeMs = (item.retentionDays || DEFAULT_RETENTION_DAYS) * 86400000;
        return (nowMs - itemDate) <= maxAgeMs;
      });

      if (validItems.length !== db.deletedItems.length) {
        updateDb(prev => ({
          ...prev,
          deletedItems: validItems
        }), 'CLEANUP_EXPIRED_TRASH');
      }
    }
  }, [db.deletedItems, updateDb]);

  // Abertura do Modal Universal de Confirmação
  const requestDelete = useCallback((options: DeleteRequestOptions) => {
    setModalOptions(options);
    setModalOpen(true);
  }, []);

  // Execução da exclusão após confirmação de forma 100% ATÔMICA
  const handleConfirmDelete = async () => {
    if (!modalOptions) return;

    try {
      setIsDeleting(true);
      const now = new Date().toISOString();
      const recordId = uid('del');

      const deletedRecord: DeletedItemRecord = {
        id: recordId,
        originalId: modalOptions.originalId,
        entityType: modalOptions.entityType,
        entityName: modalOptions.itemName,
        entityCode: modalOptions.itemData?.codigo || modalOptions.itemData?.name || modalOptions.originalId,
        data: modalOptions.itemData,
        deletedAt: now,
        deletedBy: {
          id: user?.id || 'usr-admin',
          name: user?.name || 'Super Admin'
        },
        retentionDays: DEFAULT_RETENTION_DAYS,
        isSoftDelete: modalOptions.isSoftDelete ?? true,
        moduleKey: modalOptions.moduleKey
      };

      const auditLog = {
        id: uid('log'),
        timestamp: now,
        action: 'ITEM_DELETED',
        actor: { id: user?.id || 'usr-admin', name: user?.name || 'Super Admin' },
        target: { tipo: modalOptions.entityType.toUpperCase(), id: modalOptions.originalId, codigo: deletedRecord.entityCode },
        details: `${modalOptions.itemType} "${modalOptions.itemName}" excluído com sucesso.`
      };

      // 1. ATOMIC UPDATE: Remove da respectiva coleção e adiciona na lixeira em UMA ÚNICA chamada
      await updateDb(prev => {
        let nextDb = { ...prev };
        const idToRemove = modalOptions.originalId;

        switch (modalOptions.entityType) {
          case 'shoppingItem':
            nextDb.gescompShoppingList = (prev.gescompShoppingList || []).filter(i => i.id !== idToRemove);
            break;
          case 'task':
            nextDb.gescompTasks = (prev.gescompTasks || []).filter(t => t.id !== idToRemove);
            break;
          case 'user':
            nextDb.users = (prev.users || []).filter(u => u.id !== idToRemove);
            break;
          case 'company':
            nextDb.companies = (prev.companies || []).filter(c => c.id !== idToRemove);
            if (prev.currentCompanyId === idToRemove) {
              const remaining = (prev.companies || []).filter(c => c.id !== idToRemove);
              nextDb.currentCompanyId = remaining[0]?.id || 'comp-1';
              nextDb.company = remaining[0] || prev.company;
            }
            break;
          case 'product':
            nextDb.products = (prev.products || []).filter(p => p.id !== idToRemove);
            break;
          case 'category':
            nextDb.materialCategories = (prev.materialCategories || []).filter(c => c.id !== idToRemove);
            break;
          case 'customer':
            nextDb.customers = (prev.customers || []).filter(c => c.id !== idToRemove);
            break;
          case 'supplier':
            nextDb.suppliers = (prev.suppliers || []).filter(s => s.id !== idToRemove);
            break;
          case 'quotation':
            nextDb.quotations = (prev.quotations || []).filter(q => q.id !== idToRemove);
            break;
          case 'purchaseOrder':
            nextDb.purchaseOrders = (prev.purchaseOrders || []).filter(o => o.id !== idToRemove);
            nextDb.orders = (prev.orders || []).filter(o => o.id !== idToRemove);
            break;
          case 'productionOrder':
            nextDb.productionOrders = (prev.productionOrders || []).filter(o => o.id !== idToRemove);
            break;
          case 'salesOrder':
            nextDb.salesOrders = (prev.salesOrders || []).filter(p => p.id !== idToRemove);
            break;
          case 'workCenter':
            nextDb.workCenters = (prev.workCenters || []).filter(w => w.id !== idToRemove);
            break;
          case 'warehouse':
            nextDb.warehouses = (prev.warehouses || []).filter(w => w.id !== idToRemove);
            break;
          case 'location':
            nextDb.locations = (prev.locations || []).filter(l => l.id !== idToRemove);
            break;
          case 'bomVersion':
            nextDb.bomVersions = (prev.bomVersions || []).filter(b => b.id !== idToRemove);
            break;
          default:
            break;
        }

        // Adiciona à lixeira e ao log de auditoria
        nextDb.deletedItems = [deletedRecord, ...(prev.deletedItems || [])];
        nextDb.auditLogs = [auditLog, ...(prev.auditLogs || [])];
        return nextDb;
      }, `DELETE_${modalOptions.entityType.toUpperCase()}`);

      // Executa callback adicional de onDelete caso precise disparar eventos externos
      if (modalOptions.onDelete) {
        try {
          await modalOptions.onDelete();
        } catch (_) {}
      }

      // 2. Fecha o modal e abre o Toast de Desfazer
      setModalOpen(false);
      setModalOptions(null);
      setUndoItem(deletedRecord);
    } catch (err: any) {
      alert(`Erro ao excluir item: ${err?.message || 'Erro inesperado'}`);
    } finally {
      setIsDeleting(false);
    }
  };


  // Restauração de Item (Camada 1 e Camada 2)
  const restoreItem = useCallback(async (recordId: string): Promise<{ success: boolean; error?: string }> => {
    const record = (db.deletedItems || []).find(r => r.id === recordId);
    if (!record) {
      return { success: false, error: 'Registro excluído não encontrado na lixeira.' };
    }

    if (!canUserAccessModule(record.moduleKey)) {
      return { success: false, error: 'Você não tem permissão para restaurar itens deste módulo.' };
    }

    const now = new Date().toISOString();
    const itemData = record.data;

    await updateDb(prev => {
      let nextDb = { ...prev };
      const restoredAudit = {
        id: uid('log'),
        timestamp: now,
        action: 'ITEM_RESTORED',
        actor: { id: user?.id || 'usr-admin', name: user?.name || 'Super Admin' },
        target: { tipo: record.entityType.toUpperCase(), id: record.originalId, codigo: record.entityCode },
        details: `${record.entityType} "${record.entityName}" restaurado com sucesso a partir da lixeira.`
      };

      switch (record.entityType) {
        case 'product':
          const restoredProd = { ...itemData, ativo: true, deleted_at: undefined, deleted_by: undefined };
          const existingProdIdx = (prev.products || []).findIndex(p => p.id === record.originalId);
          const nextProds = existingProdIdx >= 0
            ? prev.products.map(p => p.id === record.originalId ? restoredProd : p)
            : [restoredProd, ...(prev.products || [])];
          nextDb.products = nextProds;
          break;

        case 'category':
          const restoredCat = { ...itemData, ativo: true };
          const existingCatIdx = (prev.materialCategories || []).findIndex(c => c.id === record.originalId);
          nextDb.materialCategories = existingCatIdx >= 0
            ? prev.materialCategories.map(c => c.id === record.originalId ? restoredCat : c)
            : [restoredCat, ...(prev.materialCategories || [])];
          break;

        case 'customer':
          const restoredCust = { ...itemData, ativo: true };
          const existingCustIdx = (prev.customers || []).findIndex(c => c.id === record.originalId);
          nextDb.customers = existingCustIdx >= 0
            ? prev.customers.map(c => c.id === record.originalId ? restoredCust : c)
            : [restoredCust, ...(prev.customers || [])];
          break;

        case 'supplier':
          const restoredSupp = { ...itemData, ativo: true };
          const existingSuppIdx = (prev.suppliers || []).findIndex(s => s.id === record.originalId);
          nextDb.suppliers = existingSuppIdx >= 0
            ? prev.suppliers.map(s => s.id === record.originalId ? restoredSupp : s)
            : [restoredSupp, ...(prev.suppliers || [])];
          break;

        case 'user':
          const restoredUsr = { ...itemData, active: true };
          const existingUsrIdx = (prev.users || []).findIndex(u => u.id === record.originalId);
          nextDb.users = existingUsrIdx >= 0
            ? prev.users.map(u => u.id === record.originalId ? restoredUsr : u)
            : [restoredUsr, ...(prev.users || [])];
          break;

        case 'company':
          const restoredComp = { ...itemData, ativa: true };
          const existingCompIdx = (prev.companies || []).findIndex(c => c.id === record.originalId);
          nextDb.companies = existingCompIdx >= 0
            ? prev.companies.map(c => c.id === record.originalId ? restoredComp : c)
            : [restoredComp, ...(prev.companies || [])];
          break;

        case 'salesOrder':
          const restoredPv = { ...itemData, status: itemData.status === 'cancelado' ? 'confirmado' : itemData.status };
          const existingPvIdx = (prev.salesOrders || []).findIndex(p => p.id === record.originalId);
          nextDb.salesOrders = existingPvIdx >= 0
            ? prev.salesOrders.map(p => p.id === record.originalId ? restoredPv : p)
            : [restoredPv, ...(prev.salesOrders || [])];
          break;

        case 'productionOrder':
          const restoredOp = { ...itemData, status: 'planejada' };
          const existingOpIdx = (prev.productionOrders || []).findIndex(o => o.id === record.originalId);
          nextDb.productionOrders = existingOpIdx >= 0
            ? prev.productionOrders.map(o => o.id === record.originalId ? restoredOp : o)
            : [restoredOp, ...(prev.productionOrders || [])];
          break;

        case 'quotation':
          const restoredCot = { ...itemData, status: 'nova_solicitacao' };
          const existingCotIdx = (prev.quotations || []).findIndex(q => q.id === record.originalId);
          nextDb.quotations = existingCotIdx >= 0
            ? prev.quotations.map(q => q.id === record.originalId ? restoredCot : q)
            : [restoredCot, ...(prev.quotations || [])];
          break;

        case 'purchaseOrder':
          const restoredPc = { ...itemData, status: 'emitido' };
          const existingPcIdx = (prev.orders || []).findIndex(o => o.id === record.originalId);
          nextDb.orders = existingPcIdx >= 0
            ? prev.orders.map(o => o.id === record.originalId ? restoredPc : o)
            : [restoredPc, ...(prev.orders || [])];
          break;

        case 'shoppingItem':
          const restoredShop = { ...itemData, completed: false, status: 'aguardando_cotacao' };
          const existingShopIdx = (prev.gescompShoppingList || []).findIndex(i => i.id === record.originalId);
          nextDb.gescompShoppingList = existingShopIdx >= 0
            ? prev.gescompShoppingList.map(i => i.id === record.originalId ? restoredShop : i)
            : [restoredShop, ...(prev.gescompShoppingList || [])];
          break;

        case 'task':
          const restoredTask = { ...itemData, completed: false };
          const existingTaskIdx = (prev.gescompTasks || []).findIndex(t => t.id === record.originalId);
          nextDb.gescompTasks = existingTaskIdx >= 0
            ? prev.gescompTasks.map(t => t.id === record.originalId ? restoredTask : t)
            : [restoredTask, ...(prev.gescompTasks || [])];
          break;

        case 'workCenter':
          const restoredWc = { ...itemData, ativo: true };
          const existingWcIdx = (prev.workCenters || []).findIndex(w => w.id === record.originalId);
          nextDb.workCenters = existingWcIdx >= 0
            ? prev.workCenters.map(w => w.id === record.originalId ? restoredWc : w)
            : [restoredWc, ...(prev.workCenters || [])];
          break;

        case 'warehouse':
          const restoredWh = { ...itemData, ativo: true };
          const existingWhIdx = (prev.warehouses || []).findIndex(w => w.id === record.originalId);
          nextDb.warehouses = existingWhIdx >= 0
            ? prev.warehouses.map(w => w.id === record.originalId ? restoredWh : w)
            : [restoredWh, ...(prev.warehouses || [])];
          break;

        case 'bomVersion':
          const restoredBom = { ...itemData, status: 'ativa' };
          const existingBomIdx = (prev.bomVersions || []).findIndex(b => b.id === record.originalId);
          nextDb.bomVersions = existingBomIdx >= 0
            ? prev.bomVersions.map(b => b.id === record.originalId ? restoredBom : b)
            : [restoredBom, ...(prev.bomVersions || [])];
          break;

        default:
          break;
      }

      // Remove da Lixeira
      nextDb.deletedItems = (prev.deletedItems || []).filter(r => r.id !== recordId);
      nextDb.auditLogs = [restoredAudit, ...(prev.auditLogs || [])];
      return nextDb;
    }, `RESTORE_${record.entityType.toUpperCase()}`);

    if (undoItem?.id === recordId) {
      setUndoItem(null);
    }

    return { success: true };
  }, [db.deletedItems, canUserAccessModule, updateDb, user, undoItem]);

  // Exclusão definitiva (purgar da lixeira)
  const purgeItem = useCallback(async (recordId: string): Promise<{ success: boolean }> => {
    await updateDb(prev => ({
      ...prev,
      deletedItems: (prev.deletedItems || []).filter(r => r.id !== recordId)
    }), 'PURGE_DELETED_ITEM');

    if (undoItem?.id === recordId) {
      setUndoItem(null);
    }

    return { success: true };
  }, [updateDb, undoItem]);

  return (
    <DeleteContext.Provider value={{
      requestDelete,
      restoreItem,
      purgeItem,
      deletedItems: db.deletedItems || [],
      canUserAccessModule
    }}>
      {children}

      {/* Modal Universal de Confirmação de Exclusão */}
      {modalOptions && (
        <ConfirmDeleteModal
          isOpen={modalOpen}
          onClose={() => {
            if (!isDeleting) {
              setModalOpen(false);
              setModalOptions(null);
            }
          }}
          onConfirm={handleConfirmDelete}
          title={modalOptions.title}
          itemName={modalOptions.itemName}
          itemType={modalOptions.itemType}
          isSoftDelete={modalOptions.isSoftDelete}
          warningMessage={modalOptions.warningMessage}
          dependencies={modalOptions.dependencies}
          isLoading={isDeleting}
        />
      )}

      {/* Toast de Desfazer Imediato (Camada 1 - 10s) */}
      <UndoToast
        deletedItem={undoItem}
        durationMs={10000}
        onUndo={() => {
          if (undoItem) {
            restoreItem(undoItem.id);
          }
        }}
        onDismiss={() => setUndoItem(null)}
      />
    </DeleteContext.Provider>
  );
};

export const useDelete = () => {
  const context = useContext(DeleteContext);
  if (!context) {
    throw new Error('useDelete must be used within a DeleteProvider');
  }
  return context;
};
