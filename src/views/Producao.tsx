import React, { useState } from 'react';
import { Wrench, Plus, CheckCircle, Clock, AlertTriangle, Play, Eye, Edit, Trash2, Power, PowerOff, Layers, Cpu, Factory } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { fmtData, fmtQtd, fmtMoeda, uid } from '../lib/formatters';
import { ProductionOrder, StockMovement, StockBalance, WorkCenter, BOMVersion, BOMItem } from '../types';
import { CentrosTrabalho } from './CentrosTrabalho';
import { FichasTecnicas } from './FichasTecnicas';

interface ProducaoProps {
  defaultTab?: 'visao_geral' | 'ops' | 'centros' | 'fichas';
}

export const Producao: React.FC<ProducaoProps> = ({ defaultTab = 'visao_geral' }) => {
  const { db, updateDb, excluirOpComEstorno } = useDb();
  const { user } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'visao_geral' | 'ops' | 'centros' | 'fichas'>(defaultTab);

  // Modais de OP
  const [modalNovaOpOpen, setModalNovaOpOpen] = useState(false);
  const [modalApontamentoOpen, setModalApontamentoOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedOp, setSelectedOp] = useState<ProductionOrder | null>(null);
  const [editingOpId, setEditingOpId] = useState<string | null>(null);

  // Form Nova OP
  const [selectedProdId, setSelectedProdId] = useState(db.products.find(p => p.tipo_item === 'produto_acabado')?.id || '');
  const [qtdPlanejada, setQtdPlanejada] = useState(1);
  const [dataEntrega, setDataEntrega] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);

  // Form Apontamento
  const [qtdBoaApontada, setQtdBoaApontada] = useState(1);
  const [qtdRefugoApontada, setQtdRefugoApontada] = useState(0);

  const handleOpenNew = () => {
    setEditingOpId(null);
    setQtdPlanejada(1);
    setDataEntrega(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setModalNovaOpOpen(true);
  };

  const handleOpenEdit = (op: ProductionOrder) => {
    setEditingOpId(op.id);
    setSelectedProdId(op.productId);
    setQtdPlanejada(op.quantidadePlanejada);
    setDataEntrega(op.dataEntregaPrevista);
    setModalNovaOpOpen(true);
  };

  const handleOpenView = (op: ProductionOrder) => {
    setSelectedOp(op);
    setModalViewOpen(true);
  };

  const handleTogglePausa = async (op: ProductionOrder) => {
    const isPausada = op.status === 'pausada';
    const nextStatus = isPausada ? 'liberada' : 'pausada';

    await updateDb(prev => ({
      ...prev,
      productionOrders: prev.productionOrders.map(o => o.id === op.id ? { ...o, status: nextStatus } : o)
    }), 'OP_STATUS_TOGGLED');

    alert(`Ordem de Produção ${op.codigo} ${isPausada ? 'retomada' : 'pausada / inativada'} com sucesso!`);
  };

  const handleDelete = async (op: ProductionOrder) => {
    if (confirm(`Tem certeza que deseja excluir a Ordem de Produção ${op.codigo}?\n\nEsta ação irá remover a OP e estornar/liberar automaticamente todas as reservas de matéria-prima e movimentações associadas.`)) {
      const res = await excluirOpComEstorno(op.id, user?.name || 'PCP');
      if (res.success) {
        alert(res.detalhes || `Ordem de Produção ${op.codigo} excluída e reservas liberadas com sucesso!`);
      } else {
        alert(res.error || 'Erro ao excluir ordem de produção.');
      }
    }
  };

  const handleCriarOuEditarOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId) {
      alert('Selecione o modelo do produto acabado.');
      return;
    }

    if (editingOpId) {
      await updateDb(prev => ({
        ...prev,
        productionOrders: prev.productionOrders.map(o => o.id === editingOpId ? {
          ...o,
          productId: selectedProdId,
          quantidadePlanejada: qtdPlanejada,
          dataEntregaPrevista: dataEntrega
        } : o)
      }), 'OP_UPDATED');

      setModalNovaOpOpen(false);
      alert('Ordem de Produção atualizada com sucesso!');
      return;
    }

    const bom = db.bomVersions.find(b => b.productId === selectedProdId) || db.bomVersions[0];
    const seq = (db.productionOrders?.length || 0) + 1;
    const codigo = `OP-${String(seq).padStart(4, '0')}`;

    const novaOp: ProductionOrder = {
      id: uid('op'),
      codigo,
      productId: selectedProdId,
      bomVersionId: bom?.id || 'bom-cv1200',
      quantidadePlanejada: qtdPlanejada,
      quantidadeProduzida: 0,
      quantidadeRefugo: 0,
      status: 'liberada',
      dataInicioPrevista: new Date().toISOString().split('T')[0],
      dataEntregaPrevista: dataEntrega,
      companyId: db.currentCompanyId,
      criadoEm: new Date().toISOString()
    };

    await updateDb(prev => ({
      ...prev,
      productionOrders: [novaOp, ...(prev.productionOrders || [])],
      auditLogs: [
        {
          id: uid('log'),
          timestamp: new Date().toISOString(),
          action: 'PRODUCTION_ORDER_CREATED',
          actor: { id: user?.id || 'admin', name: user?.name || 'Admin' },
          target: { tipo: 'ORDEM_PRODUCAO', codigo },
          details: `Nova Ordem de Produção ${codigo} criada: ${qtdPlanejada} un de ${db.products.find(p => p.id === selectedProdId)?.descricao}.`
        },
        ...(prev.auditLogs || [])
      ]
    }), 'PRODUCTION_ORDER_CREATED');

    setModalNovaOpOpen(false);
    alert(`Ordem de Produção ${codigo} criada com sucesso!`);
  };

  const handleAbrirApontamento = (op: ProductionOrder) => {
    setSelectedOp(op);
    setQtdBoaApontada(Math.max(1, op.quantidadePlanejada - op.quantidadeProduzida));
    setQtdRefugoApontada(0);
    setModalApontamentoOpen(true);
  };

  const handleSalvarApontamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOp) return;

    const totalProduzido = selectedOp.quantidadeProduzida + qtdBoaApontada;
    const isConcluida = totalProduzido >= selectedOp.quantidadePlanejada;

    const bomItems = (db.bomItems || []).filter(i => i.bomVersionId === selectedOp.bomVersionId);
    const newMovements: StockMovement[] = [];
    let updatedBalances = [...(db.stockBalances || [])];

    // 1. Baixa dos componentes
    bomItems.forEach(it => {
      const qtdConsumoTotal = (it.quantidade * qtdBoaApontada);
      newMovements.push({
        id: uid('mov'),
        productId: it.componentProductId,
        warehouseId: 'wh-1',
        tipo: 'producao',
        quantidade: qtdConsumoTotal,
        sinal: -1,
        origemTipo: 'OP',
        origemId: selectedOp.id,
        observacao: `Consumo na produção da ${selectedOp.codigo}`,
        criadoEm: new Date().toISOString(),
        criadoPor: user?.name || 'Admin'
      });

      const bIdx = updatedBalances.findIndex(b => b.productId === it.componentProductId && b.warehouseId === 'wh-1');
      if (bIdx >= 0) {
        updatedBalances[bIdx] = {
          ...updatedBalances[bIdx],
          quantidade: Math.max(0, updatedBalances[bIdx].quantidade - qtdConsumoTotal)
        };
      }
    });

    // 2. Entrada do produto acabado
    newMovements.push({
      id: uid('mov'),
      productId: selectedOp.productId,
      warehouseId: 'wh-2',
      tipo: 'entrada_producao',
      quantidade: qtdBoaApontada * 1000,
      sinal: 1,
      origemTipo: 'OP',
      origemId: selectedOp.id,
      observacao: `Entrada de produção concluída ${selectedOp.codigo}`,
      criadoEm: new Date().toISOString(),
      criadoPor: user?.name || 'Admin'
    });

    const paIdx = updatedBalances.findIndex(b => b.productId === selectedOp.productId && b.warehouseId === 'wh-2');
    if (paIdx >= 0) {
      updatedBalances[paIdx] = {
        ...updatedBalances[paIdx],
        quantidade: updatedBalances[paIdx].quantidade + (qtdBoaApontada * 1000)
      };
    } else {
      updatedBalances.push({
        id: uid('bal'),
        productId: selectedOp.productId,
        warehouseId: 'wh-2',
        companyId: db.currentCompanyId,
        quantidade: qtdBoaApontada * 1000
      });
    }

    await updateDb(prev => ({
      ...prev,
      productionOrders: prev.productionOrders.map(op => op.id === selectedOp.id ? {
        ...op,
        quantidadeProduzida: totalProduzido,
        quantidadeRefugo: op.quantidadeRefugo + qtdRefugoApontada,
        status: isConcluida ? 'concluida' : 'em_producao',
        dataFimReal: isConcluida ? new Date().toISOString().split('T')[0] : op.dataFimReal
      } : op),
      stockMovements: [...(prev.stockMovements || []), ...newMovements],
      stockBalances: updatedBalances
    }), 'PRODUCTION_APPOINTMENT');

    setModalApontamentoOpen(false);
    alert(`Apontamento da ${selectedOp.codigo} realizado com sucesso! Baixa de insumos e entrada em estoque de PA atualizadas.`);
  };

  return (
    <div className="space-y-4">
      {/* Navegação de Sub-abas de Produção */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('visao_geral')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'visao_geral'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Factory className="w-4 h-4" />
          <span>Produção Industrial</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ops')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'ops'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Ordens de Produção</span>
        </button>

        <button
          onClick={() => setActiveSubTab('centros')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'centros'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Centros de Trabalho & Postos Operacionais</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fichas')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'fichas'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Fichas Técnicas (BOM)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-ABA 1: PRODUÇÃO INDUSTRIAL (VISÃO GERAL & ESTEIRA) */}
      {/* ========================================================================= */}
      {activeSubTab === 'visao_geral' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">OPs em Andamento</span>
              <span className="block text-2xl font-black text-white font-mono">5 OPs</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ Na esteira do chão de fábrica</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">OPs Concluídas no Mês</span>
              <span className="block text-2xl font-black text-white font-mono">3 máquinas</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">✓ Burn-in 12h executado</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Prazo Médio de Produção</span>
              <span className="block text-2xl font-black text-white font-mono">62 dias</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">✓ Meta de 65 dias atingida</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Itens Reservados por OPs</span>
              <span className="block text-2xl font-black text-white font-mono">24 componentes</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ Sem paradas de estoque</span>
            </div>
          </div>

          {/* Esteira de Produção */}
          <Card title="Esteira de Montagem & Postos de Fabricação JP3D">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs pt-2">
              <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-400">1. Usinagem & Perfis</span>
                  <Badge variant="info">CT-CORTE</Badge>
                </div>
                <p className="text-slate-400 text-[11px]">Corte preciso em esquadria e furação dos perfis V-Slot 4040/2020.</p>
                <div className="text-right font-mono font-bold text-white">5 un/h</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400">2. Montagem CoreXY</span>
                  <Badge variant="warning">CT-MONTAGEM</Badge>
                </div>
                <p className="text-slate-400 text-[11px]">Alinhamento de guias lineares MGN12, eixos e tensionamento de correias GT2.</p>
                <div className="text-right font-mono font-bold text-white">2 un/h</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-400">3. Chicote & Firmware</span>
                  <Badge variant="info">CT-ELETRONICA</Badge>
                </div>
                <p className="text-slate-400 text-[11px]">Instalação de placa Klipper 64-bit, drivers TMC2209 e gravação de firmware.</p>
                <div className="text-right font-mono font-bold text-white">3 un/h</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">4. Burn-in & Qualidade</span>
                  <Badge variant="success">CT-TESTE</Badge>
                </div>
                <p className="text-slate-400 text-[11px]">Calibração de nivelamento automático e teste contínuo de impressão 48h.</p>
                <div className="text-right font-mono font-bold text-white">4 un/h</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 2: ORDENS DE PRODUÇÃO */}
      {/* ========================================================================= */}
      {activeSubTab === 'ops' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                Ordens de Produção (OP)
              </h2>
              <p className="text-xs text-slate-500">
                Acompanhamento das Ordens de Produção, apontamentos em tempo real e consumo de insumos.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenNew}
            >
              Nova Ordem de Produção (OP)
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(db.productionOrders || []).map(op => {
              const prod = db.products.find(p => p.id === op.productId);
              const progresso = Math.min(100, Math.round((op.quantidadeProduzida / (op.quantidadePlanejada || 1)) * 100));

              return (
                <Card key={op.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs text-amber-500">{op.codigo}</span>
                    <Badge variant={op.status === 'concluida' ? 'success' : (op.status === 'pausada' ? 'danger' : 'info')}>
                      {op.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{prod?.descricao || 'Impressora 3D'}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">Entrega: {fmtData(op.dataEntregaPrevista)}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                      <span>Progresso: {op.quantidadeProduzida} de {op.quantidadePlanejada} un</span>
                      <span className="text-teal-400">{progresso}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    {op.status !== 'concluida' ? (
                      <Button
                        variant="amber"
                        size="sm"
                        icon={<Play className="w-3 h-3" />}
                        onClick={() => handleAbrirApontamento(op)}
                      >
                        Apontar
                      </Button>
                    ) : <span className="text-xs font-bold text-emerald-400">✓ Concluída</span>}

                    <div className="flex items-center gap-1">
                      {/* 1. VISUALIZAR */}
                      <button
                        onClick={() => handleOpenView(op)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Visualizar OP"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* 2. EDITAR */}
                      <button
                        onClick={() => handleOpenEdit(op)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Editar OP"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* 3. INATIVAR / PAUSAR */}
                      <button
                        onClick={() => handleTogglePausa(op)}
                        className={`p-1.5 rounded-lg transition-colors ${op.status !== 'pausada' ? 'text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-emerald-500 hover:bg-emerald-950/40'}`}
                        title={op.status !== 'pausada' ? 'Pausar/Inativar OP' : 'Retomar OP'}
                      >
                        {op.status !== 'pausada' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </button>

                      {/* 4. EXCLUIR */}
                      <button
                        onClick={() => handleDelete(op)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Excluir OP"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 3: CENTROS DE TRABALHO & POSTOS OPERACIONAIS */}
      {/* ========================================================================= */}
      {activeSubTab === 'centros' && (
        <CentrosTrabalho />
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 4: FICHAS TÉCNICAS (BOM) */}
      {/* ========================================================================= */}
      {activeSubTab === 'fichas' && (
        <FichasTecnicas />
      )}

      {/* MODAL VIEW OP */}
      <Modal isOpen={modalViewOpen} onClose={() => setModalViewOpen(false)} title={`Ficha da Ordem de Produção — ${selectedOp?.codigo}`}>
        {selectedOp && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-amber-500 text-sm">{selectedOp.codigo}</span>
                <Badge variant={selectedOp.status === 'concluida' ? 'success' : 'info'}>{selectedOp.status.toUpperCase()}</Badge>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {db.products.find(p => p.id === selectedOp.productId)?.descricao}
              </h3>
              <p className="text-slate-400">Início: <b>{fmtData(selectedOp.dataInicioPrevista)}</b> | Previsão Entrega: <b>{fmtData(selectedOp.dataEntregaPrevista)}</b></p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Planejado</span>
                <span className="font-mono font-black text-slate-900 dark:text-white text-base">{selectedOp.quantidadePlanejada} un</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Produzido</span>
                <span className="font-mono font-black text-emerald-500 text-base">{selectedOp.quantidadeProduzida} un</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Refugo</span>
                <span className="font-mono font-black text-rose-500 text-base">{selectedOp.quantidadeRefugo} un</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL NOVA / EDITAR OP */}
      <Modal isOpen={modalNovaOpOpen} onClose={() => setModalNovaOpOpen(false)} title={editingOpId ? 'Editar Ordem de Produção' : 'Nova Ordem de Produção (OP)'}>
        <form onSubmit={handleCriarOuEditarOp} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Modelo de Impressora 3D (PA) *</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantidade Planejada (un) *</label>
              <input
                type="number"
                min="1"
                value={qtdPlanejada}
                onChange={e => setQtdPlanejada(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data Prevista de Entrega</label>
              <input
                type="date"
                value={dataEntrega}
                onChange={e => setDataEntrega(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovaOpOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">{editingOpId ? 'Salvar Alterações' : 'Liberar Ordem de Produção'}</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL APONTAMENTO */}
      <Modal isOpen={modalApontamentoOpen} onClose={() => setModalApontamentoOpen(false)} title={`Apontamento de Produção — ${selectedOp?.codigo}`}>
        <form onSubmit={handleSalvarApontamento} className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Informe as unidades montadas e aprovadas pelo controle de qualidade. O sistema fará a <b>baixa automática dos componentes</b> em estoque e a <b>entrada da máquina pronta</b>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Qtd Aprovada (Boas) *</label>
              <input
                type="number"
                min="1"
                value={qtdBoaApontada}
                onChange={e => setQtdBoaApontada(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-black text-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Qtd Refugo / Perda</label>
              <input
                type="number"
                min="0"
                value={qtdRefugoApontada}
                onChange={e => setQtdRefugoApontada(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-bold text-rose-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalApontamentoOpen(false)}>Cancelar</Button>
            <Button variant="success" size="sm" type="submit">Confirmar & Dar Baixa no Estoque</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
