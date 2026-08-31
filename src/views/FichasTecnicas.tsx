import React, { useState } from 'react';
import { Layers, Plus, Trash2, Edit, Eye, Power, PowerOff, CheckCircle } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { useDelete } from '../context/DeleteContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { fmtQtd, uid } from '../lib/formatters';
import { BOMVersion, BOMItem } from '../types';

export const FichasTecnicas: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();
  const { requestDelete } = useDelete();

  const [modalNovaBomOpen, setModalNovaBomOpen] = useState(false);
  const [modalNovoItemOpen, setModalNovoItemOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState<BOMVersion | null>(null);
  const [selectedBomId, setSelectedBomId] = useState<string>('');
  const [editingBomId, setEditingBomId] = useState<string | null>(null);

  // Form Nova BOM
  const [selectedProdId, setSelectedProdId] = useState(db.products.find(p => p.tipo_item === 'produto_acabado')?.id || '');
  const [versaoNome, setVersaoNome] = useState('v1.0 (Ativa)');
  const [versaoDesc, setVersaoDesc] = useState('');

  // Form Novo Componente
  const [selectedComponentId, setSelectedComponentId] = useState(db.products.find(p => p.tipo_item === 'materia_prima')?.id || '');
  const [componentQtd, setComponentQtd] = useState(1);
  const [componentObs, setComponentObs] = useState('');

  const handleOpenNew = () => {
    setEditingBomId(null);
    setSelectedProdId(db.products.find(p => p.tipo_item === 'produto_acabado')?.id || '');
    setVersaoNome('v1.0 (Ativa)');
    setVersaoDesc('');
    setModalNovaBomOpen(true);
  };

  const handleOpenEdit = (bom: BOMVersion) => {
    setEditingBomId(bom.id);
    setSelectedProdId(bom.productId);
    setVersaoNome(bom.versao);
    setVersaoDesc(bom.descricao || '');
    setModalNovaBomOpen(true);
  };

  const handleOpenView = (bom: BOMVersion) => {
    setSelectedBom(bom);
    setModalViewOpen(true);
  };

  const handleToggleAtivo = async (bom: BOMVersion) => {
    const isAtiva = bom.status === 'ativa';
    const nextStatus = isAtiva ? 'obsoleta' : 'ativa';

    await updateDb(prev => ({
      ...prev,
      bomVersions: prev.bomVersions.map(b => b.id === bom.id ? { ...b, status: nextStatus } : b)
    }), 'BOM_STATUS_TOGGLED');

    alert(`Ficha Técnica ${bom.versao} ${nextStatus === 'obsoleta' ? 'inativada / obsoleta' : 'ativada'}!`);
  };

  const handleDeleteBom = (bom: BOMVersion) => {
    const prod = db.products.find(p => p.id === bom.productId);
    const itensCount = (db.bomItems || []).filter(i => i.bomVersionId === bom.id).length;
    const deps: string[] = [];
    if (itensCount > 0) deps.push(`Possui ${itensCount} componente(s) estruturado(s) nesta versão.`);

    requestDelete({
      title: 'Excluir Ficha Técnica (BOM)',
      itemName: `Ficha ${bom.versao} — ${prod?.descricao || 'Produto'}`,
      itemType: 'Ficha Técnica',
      entityType: 'bomVersion',
      moduleKey: 'producao',
      originalId: bom.id,
      itemData: bom,
      isSoftDelete: true,
      dependencies: deps,
      warningMessage: 'Ao confirmar, a ficha técnica será movida para a lixeira.',
      onDelete: async () => {
        await updateDb(prev => ({
          ...prev,
          bomVersions: prev.bomVersions.filter(b => b.id !== bom.id),
          bomItems: (prev.bomItems || []).filter(i => i.bomVersionId !== bom.id)
        }), 'BOM_DELETED');
      }
    });
  };

  const handleCriarOuEditarBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId) return;

    if (editingBomId) {
      await updateDb(prev => ({
        ...prev,
        bomVersions: prev.bomVersions.map(b => b.id === editingBomId ? {
          ...b,
          productId: selectedProdId,
          versao: versaoNome,
          descricao: versaoDesc
        } : b)
      }), 'BOM_UPDATED');

      setModalNovaBomOpen(false);
      alert('Ficha Técnica atualizada com sucesso!');
      return;
    }

    const novaBom: BOMVersion = {
      id: uid('bom'),
      productId: selectedProdId,
      versao: versaoNome,
      descricao: versaoDesc || `Ficha Técnica ${db.products.find(p => p.id === selectedProdId)?.descricao}`,
      status: 'ativa',
      vigenteDe: new Date().toISOString().split('T')[0],
      criadoEm: new Date().toISOString()
    };

    await updateDb(prev => ({
      ...prev,
      bomVersions: [novaBom, ...(prev.bomVersions || [])]
    }), 'BOM_VERSION_CREATED');

    setModalNovaBomOpen(false);
    alert('Ficha Técnica criada com sucesso!');
  };

  const handleAdicionarComponente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBomId || !selectedComponentId) return;

    const novoItem: BOMItem = {
      id: uid('bomit'),
      bomVersionId: selectedBomId,
      componentProductId: selectedComponentId,
      quantidade: componentQtd * 1000,
      opcional: false,
      observacao: componentObs
    };

    await updateDb(prev => ({
      ...prev,
      bomItems: [...(prev.bomItems || []), novoItem]
    }), 'BOM_ITEM_ADDED');

    setModalNovoItemOpen(false);
    setComponentObs('');
    alert('Componente adicionado à ficha técnica!');
  };

  const handleRemoverComponente = (bomItem: BOMItem) => {
    const prod = db.products.find(p => p.id === bomItem.componentProductId);
    requestDelete({
      title: 'Remover Componente da Ficha Técnica',
      itemName: `${prod?.descricao || 'Componente'} (Qtd: ${fmtQtd(bomItem.quantidade, prod?.unidade)})`,
      itemType: 'Componente da BOM',
      entityType: 'bomVersion',
      moduleKey: 'producao',
      originalId: bomItem.id,
      itemData: bomItem,
      isSoftDelete: true,
      warningMessage: 'O componente será desvinculado desta versão da ficha técnica.',
      onDelete: async () => {
        await updateDb(prev => ({
          ...prev,
          bomItems: prev.bomItems.filter(i => i.id !== bomItem.id)
        }), 'BOM_ITEM_REMOVED');
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600 dark:text-teal-400" />
            Engenharia de Produto & Fichas Técnicas (BOM)
          </h2>
          <p className="text-xs text-slate-500">
            Estrutura de materiais, componentes e insumos requeridos para a fabricação de cada modelo JP3D.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenNew}
        >
          Nova Ficha Técnica
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(db.bomVersions || []).map(bom => {
          const prod = db.products.find(p => p.id === bom.productId);
          const items = (db.bomItems || []).filter(i => i.bomVersionId === bom.id);

          return (
            <Card key={bom.id} title={prod?.descricao || bom.versao}>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Versão: <b className="text-brand-600 dark:text-teal-400">{bom.versao}</b></span>
                  <div className="flex items-center gap-2">
                    <Badge variant={bom.status === 'ativa' ? 'success' : 'neutral'}>{bom.status.toUpperCase()}</Badge>

                    {/* AÇÕES DA BOM */}
                    <button onClick={() => handleOpenView(bom)} className="p-1 text-slate-500 hover:text-brand-500" title="Visualizar">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleOpenEdit(bom)} className="p-1 text-slate-500 hover:text-amber-500" title="Editar">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggleAtivo(bom)} className="p-1 text-slate-500 hover:text-orange-500" title="Inativar/Ativar">
                      {bom.status === 'ativa' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleDeleteBom(bom)} className="p-1 text-slate-500 hover:text-rose-500" title="Excluir">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px]">{bom.descricao}</p>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Componentes da Estrutura:</span>
                    <Button
                      variant="soft"
                      size="sm"
                      icon={<Plus className="w-3 h-3" />}
                      onClick={() => { setSelectedBomId(bom.id); setModalNovoItemOpen(true); }}
                    >
                      Adicionar Componente
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {items.map(it => {
                      const comp = db.products.find(p => p.id === it.componentProductId);
                      return (
                        <div key={it.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{comp?.descricao || it.componentProductId}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Consumo: {fmtQtd(it.quantidade, comp?.unidade || 'UN')} {it.observacao && `(${it.observacao})`}</span>
                          </div>
                          <button
                            onClick={() => handleRemoverComponente(it)}
                            className="p-1 text-slate-400 hover:text-rose-500"
                            title="Remover Componente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {items.length === 0 && (
                      <p className="text-center py-3 text-slate-400 text-[11px]">Nenhum componente vinculado a esta ficha.</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* MODAL VIEW BOM */}
      <Modal isOpen={modalViewOpen} onClose={() => setModalViewOpen(false)} title={`Estrutura da Ficha — ${selectedBom?.versao}`}>
        {selectedBom && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-brand-600 dark:text-teal-400 block">{selectedBom.versao}</span>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {db.products.find(p => p.id === selectedBom.productId)?.descricao}
              </h3>
              <p className="text-slate-400">{selectedBom.descricao}</p>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">Lista Completa de Insumos & Consumo:</span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {(db.bomItems || []).filter(i => i.bomVersionId === selectedBom.id).map(it => {
                  const comp = db.products.find(p => p.id === it.componentProductId);
                  return (
                    <div key={it.id} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{comp?.descricao}</span>
                        <span className="text-[11px] text-slate-400 font-mono">SKU: {comp?.codigo} {it.observacao && `| ${it.observacao}`}</span>
                      </div>
                      <span className="font-mono font-bold text-brand-600 dark:text-teal-400 text-sm">
                        {fmtQtd(it.quantidade, comp?.unidade || 'UN')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: NOVA / EDITAR BOM */}
      <Modal isOpen={modalNovaBomOpen} onClose={() => setModalNovaBomOpen(false)} title={editingBomId ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica (BOM)'}>
        <form onSubmit={handleCriarOuEditarBom} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Modelo de Impressora (PA) *</label>
            <select
              value={selectedProdId}
              onChange={e => setSelectedProdId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            >
              {db.products.filter(p => p.tipo_item === 'produto_acabado').map(pa => (
                <option key={pa.id} value={pa.id}>[{pa.codigo}] {pa.descricao}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Versão *</label>
            <input
              type="text"
              value={versaoNome}
              onChange={e => setVersaoNome(e.target.value)}
              placeholder="Ex: v1.0 (Ativa)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
            <input
              type="text"
              value={versaoDesc}
              onChange={e => setVersaoDesc(e.target.value)}
              placeholder="Ex: Estrutura padrão CoreXY para corte de acrílico"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovaBomOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">{editingBomId ? 'Salvar Alterações' : 'Salvar Ficha Técnica'}</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: NOVO COMPONENTE */}
      <Modal isOpen={modalNovoItemOpen} onClose={() => setModalNovoItemOpen(false)} title="Adicionar Componente à Ficha">
        <form onSubmit={handleAdicionarComponente} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Componente / Matéria-Prima *</label>
            <select
              value={selectedComponentId}
              onChange={e => setSelectedComponentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            >
              {db.products.filter(p => p.tipo_item === 'materia_prima' || p.tipo_item === 'muc').map(p => (
                <option key={p.id} value={p.id}>[{p.codigo}] {p.descricao}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantidade por Unidade de PA *</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={componentQtd}
              onChange={e => setComponentQtd(parseFloat(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Observação / Posição</label>
            <input
              type="text"
              value={componentObs}
              onChange={e => setComponentObs(e.target.value)}
              placeholder="Ex: 2 motores no eixo X/Y"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovoItemOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">Vincular Componente</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
