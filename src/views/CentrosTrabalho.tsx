import React, { useState } from 'react';
import { Cpu, Plus, CheckCircle, Eye, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { fmtMoeda, uid } from '../lib/formatters';
import { WorkCenter } from '../types';

export const CentrosTrabalho: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();

  const [modalNovoCentroOpen, setModalNovoCentroOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedCentro, setSelectedCentro] = useState<WorkCenter | null>(null);
  const [editingCentroId, setEditingCentroId] = useState<string | null>(null);

  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('Montagem');
  const [capacidadeHora, setCapacidadeHora] = useState(2);
  const [custoHoraReais, setCustoHoraReais] = useState(120);

  const handleOpenNew = () => {
    setEditingCentroId(null);
    setCodigo('');
    setNome('');
    setTipo('Montagem');
    setCapacidadeHora(2);
    setCustoHoraReais(120);
    setModalNovoCentroOpen(true);
  };

  const handleOpenEdit = (wc: WorkCenter) => {
    setEditingCentroId(wc.id);
    setCodigo(wc.codigo);
    setNome(wc.nome);
    setTipo(wc.tipo);
    setCapacidadeHora(wc.capacidadeHora);
    setCustoHoraReais((wc.custoHoraCents || 0) / 100);
    setModalNovoCentroOpen(true);
  };

  const handleOpenView = (wc: WorkCenter) => {
    setSelectedCentro(wc);
    setModalViewOpen(true);
  };

  const handleToggleAtivo = async (wc: WorkCenter) => {
    const nextStatus = !wc.ativo;

    await updateDb(prev => ({
      ...prev,
      workCenters: prev.workCenters.map(item => item.id === wc.id ? { ...item, ativo: nextStatus } : item)
    }), 'WORK_CENTER_STATUS_TOGGLED');

    alert(`Centro de Trabalho ${wc.nome} ${nextStatus ? 'ativado' : 'inativado'}!`);
  };

  const handleDelete = async (wc: WorkCenter) => {
    if (confirm(`Tem certeza que deseja excluir o Centro de Trabalho ${wc.nome}?`)) {
      await updateDb(prev => ({
        ...prev,
        workCenters: prev.workCenters.filter(item => item.id !== wc.id)
      }), 'WORK_CENTER_DELETED');
      alert(`Centro ${wc.nome} excluído!`);
    }
  };

  const handleCriarOuEditarCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nome.trim()) return;

    if (editingCentroId) {
      await updateDb(prev => ({
        ...prev,
        workCenters: prev.workCenters.map(wc => wc.id === editingCentroId ? {
          ...wc,
          codigo: codigo.toUpperCase().trim(),
          nome: nome.trim(),
          tipo,
          capacidadeHora,
          custoHoraCents: Math.round(custoHoraReais * 100)
        } : wc)
      }), 'WORK_CENTER_UPDATED');

      setModalNovoCentroOpen(false);
      alert('Centro de Trabalho atualizado com sucesso!');
      return;
    }

    const novoCentro: WorkCenter = {
      id: uid('wc'),
      codigo: codigo.toUpperCase().trim(),
      nome: nome.trim(),
      tipo,
      capacidadeHora,
      custoHoraCents: Math.round(custoHoraReais * 100),
      ativo: true
    };

    await updateDb(prev => ({
      ...prev,
      workCenters: [...(prev.workCenters || []), novoCentro]
    }), 'WORK_CENTER_CREATED');

    setModalNovoCentroOpen(false);
    alert('Centro de Trabalho cadastrado com sucesso!');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-600 dark:text-teal-400" />
            Centros de Trabalho & Postos Operacionais
          </h2>
          <p className="text-xs text-slate-500">
            Cadastre os postos de usinagem, bancadas de montagem mecânica, eletrônica e calibração.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenNew}
        >
          Novo Centro de Trabalho
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(db.workCenters || []).map(wc => (
          <Card key={wc.id} title={wc.nome}>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-teal-400">{wc.codigo}</span>
                <Badge variant={wc.ativo !== false ? 'info' : 'neutral'}>{wc.tipo}</Badge>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Capacidade:</span>
                  <b className="text-slate-200">{wc.capacidadeHora} un/hora</b>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Custo Operacional:</span>
                  <b className="text-emerald-400 font-mono">{fmtMoeda(wc.custoHoraCents || 0)}/h</b>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1">
                {/* 1. VISUALIZAR */}
                <button
                  onClick={() => handleOpenView(wc)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Visualizar Centro"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                {/* 2. EDITAR */}
                <button
                  onClick={() => handleOpenEdit(wc)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Editar Centro"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                {/* 3. INATIVAR / ATIVAR */}
                <button
                  onClick={() => handleToggleAtivo(wc)}
                  className={`p-1.5 rounded-lg transition-colors ${wc.ativo !== false ? 'text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-emerald-500 hover:bg-emerald-950/40'}`}
                  title={wc.ativo !== false ? 'Inativar Posto' : 'Ativar Posto'}
                >
                  {wc.ativo !== false ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                </button>

                {/* 4. EXCLUIR */}
                <button
                  onClick={() => handleDelete(wc)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Excluir Centro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* MODAL VIEW CENTRO */}
      <Modal isOpen={modalViewOpen} onClose={() => setModalViewOpen(false)} title={`Ficha do Posto — ${selectedCentro?.nome}`}>
        {selectedCentro && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-brand-600 dark:text-teal-400 text-sm">{selectedCentro.codigo}</span>
                <Badge variant="info">{selectedCentro.tipo}</Badge>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedCentro.nome}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Capacidade Produtiva</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedCentro.capacidadeHora} un/hora</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Taxa Horária Operacional</span>
                <span className="font-mono font-bold text-emerald-500">{fmtMoeda(selectedCentro.custoHoraCents || 0)}/hora</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL NOVO / EDITAR CENTRO */}
      <Modal isOpen={modalNovoCentroOpen} onClose={() => setModalNovoCentroOpen(false)} title={editingCentroId ? 'Editar Centro de Trabalho' : 'Novo Centro de Trabalho'}>
        <form onSubmit={handleCriarOuEditarCentro} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Código do Posto *</label>
              <input
                type="text"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                placeholder="Ex: CT-CORTE-01"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Operação *</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                <option value="Usinagem">Usinagem & Corte de Perfis</option>
                <option value="Montagem">Montagem Mecânica CoreXY</option>
                <option value="Eletrônica">Chicote Elétrico & Firmware</option>
                <option value="Qualidade">Teste & Calibração 48h</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Centro de Trabalho *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Bancada de Montagem de Cabeçote Direct Drive"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Capacidade (un/hora)</label>
              <input
                type="number"
                min="1"
                value={capacidadeHora}
                onChange={e => setCapacidadeHora(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Custo Hora (R$/h)</label>
              <input
                type="number"
                step="0.01"
                value={custoHoraReais}
                onChange={e => setCustoHoraReais(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovoCentroOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">{editingCentroId ? 'Salvar Alterações' : 'Salvar Centro'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
