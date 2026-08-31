import React, { useState } from 'react';
import { Warehouse, Plus, MapPin, Eye, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { useDelete } from '../context/DeleteContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { uid } from '../lib/formatters';
import { Warehouse as WarehouseType, Location } from '../types';

export const Depositos: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();
  const { requestDelete } = useDelete();

  const [modalNovoDepositoOpen, setModalNovoDepositoOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedDeposito, setSelectedDeposito] = useState<WarehouseType | null>(null);
  const [editingDepositoId, setEditingDepositoId] = useState<string | null>(null);

  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'materia_prima' | 'produto_acabado' | 'geral' | 'quarentena'>('materia_prima');

  const handleOpenNew = () => {
    setEditingDepositoId(null);
    setCodigo('');
    setNome('');
    setTipo('materia_prima');
    setModalNovoDepositoOpen(true);
  };

  const handleOpenEdit = (w: WarehouseType) => {
    setEditingDepositoId(w.id);
    setCodigo(w.codigo);
    setNome(w.nome);
    setTipo(w.tipo || 'materia_prima');
    setModalNovoDepositoOpen(true);
  };

  const handleOpenView = (w: WarehouseType) => {
    setSelectedDeposito(w);
    setModalViewOpen(true);
  };

  const handleToggleAtivo = async (w: WarehouseType) => {
    const nextStatus = !w.ativo;

    await updateDb(prev => ({
      ...prev,
      warehouses: prev.warehouses.map(item => item.id === w.id ? { ...item, ativo: nextStatus } : item)
    }), 'WAREHOUSE_STATUS_TOGGLED');

    alert(`Depósito ${w.nome} ${nextStatus ? 'ativado' : 'inativado'}!`);
  };

  const handleDelete = (w: WarehouseType) => {
    requestDelete({
      title: 'Excluir Depósito / Almoxarifado',
      itemName: `[${w.codigo}] ${w.nome}`,
      itemType: 'Depósito',
      entityType: 'warehouse',
      moduleKey: 'estoque',
      originalId: w.id,
      itemData: w,
      isSoftDelete: true,
      warningMessage: 'Ao confirmar, o depósito será movido para a lixeira.',
      onDelete: async () => {
        await updateDb(prev => ({
          ...prev,
          warehouses: prev.warehouses.filter(item => item.id !== w.id)
        }), 'WAREHOUSE_DELETED');
      }
    });
  };

  const handleCriarOuEditarDeposito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nome.trim()) return;

    if (editingDepositoId) {
      await updateDb(prev => ({
        ...prev,
        warehouses: prev.warehouses.map(w => w.id === editingDepositoId ? {
          ...w,
          codigo: codigo.toUpperCase().trim(),
          nome: nome.trim(),
          tipo
        } : w)
      }), 'WAREHOUSE_UPDATED');

      setModalNovoDepositoOpen(false);
      alert('Depósito atualizado com sucesso!');
      return;
    }

    const novoDep: WarehouseType = {
      id: uid('wh'),
      codigo: codigo.toUpperCase().trim(),
      nome: nome.trim(),
      tipo,
      companyId: db.currentCompanyId,
      ativo: true
    };

    await updateDb(prev => ({
      ...prev,
      warehouses: [...(prev.warehouses || []), novoDep]
    }), 'WAREHOUSE_CREATED');

    setModalNovoDepositoOpen(false);
    alert('Depósito cadastrado com sucesso!');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-brand-600 dark:text-teal-400" />
            Depósitos & Almoxarifados Físicos
          </h2>
          <p className="text-xs text-slate-500">
            Cadastre os estoques físicos de matéria-prima, produtos acabados, quarentena e expedição.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenNew}
        >
          Novo Depósito
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(db.warehouses || []).map(w => {
          const locs = (db.locations || []).filter(l => l.warehouseId === w.id);
          const totalItens = (db.stockBalances || []).filter(b => b.warehouseId === w.id && (b.quantidade || 0) > 0).length;

          return (
            <Card key={w.id} title={w.nome}>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-teal-400">{w.codigo}</span>
                  <Badge variant={w.ativo !== false ? 'success' : 'neutral'}>
                    {w.tipo.toUpperCase().replace('_', ' ')}
                  </Badge>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Localizações / Ruas:</span>
                    <b className="text-slate-200">{locs.length} cadastradas</b>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Itens com Saldo:</span>
                    <b className="text-emerald-400 font-mono">{totalItens} itens</b>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1">
                  {/* 1. VISUALIZAR */}
                  <button
                    onClick={() => handleOpenView(w)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Visualizar Depósito"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {/* 2. EDITAR */}
                  <button
                    onClick={() => handleOpenEdit(w)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Editar Depósito"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  {/* 3. INATIVAR / ATIVAR */}
                  <button
                    onClick={() => handleToggleAtivo(w)}
                    className={`p-1.5 rounded-lg transition-colors ${w.ativo !== false ? 'text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-emerald-500 hover:bg-emerald-950/40'}`}
                    title={w.ativo !== false ? 'Inativar Depósito' : 'Ativar Depósito'}
                  >
                    {w.ativo !== false ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                  </button>

                  {/* 4. EXCLUIR */}
                  <button
                    onClick={() => handleDelete(w)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Excluir Depósito"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* MODAL VIEW DEPÓSITO */}
      <Modal isOpen={modalViewOpen} onClose={() => setModalViewOpen(false)} title={`Ficha do Depósito — ${selectedDeposito?.nome}`}>
        {selectedDeposito && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-brand-600 dark:text-teal-400 text-sm">{selectedDeposito.codigo}</span>
                <Badge variant={selectedDeposito.ativo !== false ? 'success' : 'neutral'}>{selectedDeposito.ativo !== false ? 'ATIVO' : 'INATIVO'}</Badge>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedDeposito.nome}</h3>
              <p className="text-slate-400">Tipo de Armazenagem: <b>{selectedDeposito.tipo?.toUpperCase()}</b></p>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">Ruas e Posições Físicas:</span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {(db.locations || []).filter(l => l.warehouseId === selectedDeposito.id).map(loc => (
                  <div key={loc.id} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                    <span className="font-mono font-bold text-teal-400">{loc.codigo}</span>
                    <span className="text-slate-300">{loc.descricao}</span>
                  </div>
                ))}
                {(db.locations || []).filter(l => l.warehouseId === selectedDeposito.id).length === 0 && (
                  <div className="p-3 text-center text-slate-400">Nenhuma localização cadastrada neste depósito.</div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL NOVO / EDITAR DEPÓSITO */}
      <Modal isOpen={modalNovoDepositoOpen} onClose={() => setModalNovoDepositoOpen(false)} title={editingDepositoId ? 'Editar Depósito' : 'Novo Depósito / Almoxarifado'}>
        <form onSubmit={handleCriarOuEditarDeposito} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Código do Depósito *</label>
              <input
                type="text"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                placeholder="Ex: DEP-CENTRAL"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Estoque *</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                <option value="materia_prima">Matéria-Prima & Insumos</option>
                <option value="produto_acabado">Produtos Acabados (Expedição)</option>
                <option value="geral">Geral / Misto</option>
                <option value="quarentena">Quarentena / Qualidade</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Depósito *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Almoxarifado Central de Insumos"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovoDepositoOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">{editingDepositoId ? 'Salvar Alterações' : 'Cadastrar Depósito'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
