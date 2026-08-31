import React, { useState } from 'react';
import { Target, Plus, Phone, Mail, FileText, Send, CheckCircle, XCircle, ArrowRight, Eye, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { useDelete } from '../context/DeleteContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { fmtMoeda, fmtData, uid } from '../lib/formatters';
import { SalesOrder, ProductionOrder } from '../types';

export interface Lead {
  id: string;
  clienteId?: string | null;
  nome: string;
  cnpjCpf?: string;
  email?: string;
  telefone?: string;
  modeloId: string;
  valorEstimadoCents: number;
  descontoPercent?: number;
  status: 'novo' | 'qualificacao' | 'proposta' | 'negociacao' | 'fechado_ganho' | 'fechado_perdido';
  proximaAcao?: string;
  dataMudancaStatus?: string;
  usuarioResponsavel?: string;
  criadoEm: string;
  prazoEntregaDias?: number;
  condicaoPagamento?: string;
  observacoes?: string;
  motivoPerda?: string;
}

export const CRM: React.FC = () => {
  const { db, updateDb, processarVendaAutomatica } = useDb();
  const { user } = useAuth();
  const { requestDelete } = useDelete();

  // Leads do DB ou estado padrão inicial
  const [leads, setLeads] = useState<Lead[]>(() => {
    return (db as any).crmLeads || [
      {
        id: 'lead-1',
        nome: 'Tech3D Protótipos Ltda',
        cnpjCpf: '12.345.678/0001-90',
        email: 'contato@tech3d.com.br',
        telefone: '(11) 98765-4321',
        modeloId: 'p-cv1200',
        valorEstimadoCents: 4290000,
        status: 'negociacao',
        proximaAcao: 'Alinhar minuta contratual e sinal de 50%',
        dataMudancaStatus: new Date().toISOString(),
        usuarioResponsavel: user?.name || 'Comercial',
        criadoEm: new Date().toISOString(),
        prazoEntregaDias: 45,
        condicaoPagamento: 'Sinal 50% + Saldo na Entrega'
      },
      {
        id: 'lead-2',
        nome: 'Indústria Metalúrgica Avançada',
        cnpjCpf: '98.765.432/0001-10',
        email: 'compras@metalavancada.com.br',
        telefone: '(19) 99887-1122',
        modeloId: 'p-cv1500',
        valorEstimadoCents: 5890000,
        status: 'proposta',
        proximaAcao: 'Aguardando validação da diretoria técnica',
        dataMudancaStatus: new Date().toISOString(),
        usuarioResponsavel: user?.name || 'Comercial',
        criadoEm: new Date().toISOString(),
        prazoEntregaDias: 60,
        condicaoPagamento: 'À vista com 5% de desconto'
      },
      {
        id: 'lead-3',
        nome: 'Laboratório de Manufatura Aditiva',
        cnpjCpf: '45.112.334/0001-55',
        email: 'lab@manufatura.edu.br',
        telefone: '(41) 99112-3344',
        modeloId: 'p-cv800',
        valorEstimadoCents: 2490000,
        status: 'novo',
        proximaAcao: 'Agendar demonstração da tecnologia de corte',
        dataMudancaStatus: new Date().toISOString(),
        usuarioResponsavel: user?.name || 'Comercial',
        criadoEm: new Date().toISOString(),
        prazoEntregaDias: 30,
        condicaoPagamento: 'Faturamento 30/60 dias'
      }
    ];
  });

  // Modais
  const [modalNovoLeadOpen, setModalNovoLeadOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);

  // Form Lead
  const [nomeCliente, setNomeCliente] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [modeloId, setModeloId] = useState(db.products.find(p => p.tipo_item === 'produto_acabado')?.id || 'p-cv1200');
  const [valorReais, setValorReais] = useState(42900);
  const [statusEtapa, setStatusEtapa] = useState<Lead['status']>('novo');
  const [proximaAcao, setProximaAcao] = useState('');
  const [condicaoPagamento, setCondicaoPagamento] = useState('Sinal 50% + Saldo na Entrega');

  const stages: { id: Lead['status']; label: string; color: string; badgeCls: string }[] = [
    { id: 'novo', label: 'Novo Lead', color: 'border-blue-500/40 bg-blue-950/20', badgeCls: 'bg-blue-900/50 text-blue-300' },
    { id: 'qualificacao', label: 'Qualificação Técnica', color: 'border-amber-500/40 bg-amber-950/20', badgeCls: 'bg-amber-900/50 text-amber-300' },
    { id: 'proposta', label: 'Proposta Emitida', color: 'border-purple-500/40 bg-purple-950/20', badgeCls: 'bg-purple-900/50 text-purple-300' },
    { id: 'negociacao', label: 'Em Negociação', color: 'border-teal-500/40 bg-teal-950/20', badgeCls: 'bg-teal-900/50 text-teal-300' },
    { id: 'fechado_ganho', label: 'Fechado Ganho', color: 'border-emerald-500/40 bg-emerald-950/20', badgeCls: 'bg-emerald-900/50 text-emerald-300' },
    { id: 'fechado_perdido', label: 'Perdido', color: 'border-rose-500/40 bg-rose-950/20', badgeCls: 'bg-rose-900/50 text-rose-300' }
  ];

  const handleOpenNew = () => {
    setEditingLeadId(null);
    setNomeCliente('');
    setCnpjCpf('');
    setEmail('');
    setTelefone('');
    setModeloId(db.products.find(p => p.tipo_item === 'produto_acabado')?.id || 'p-cv1200');
    setValorReais(42900);
    setStatusEtapa('novo');
    setProximaAcao('Contato inicial com comprador');
    setCondicaoPagamento('Sinal 50% + Saldo na Entrega');
    setModalNovoLeadOpen(true);
  };

  const handleOpenEdit = (l: Lead) => {
    setEditingLeadId(l.id);
    setNomeCliente(l.nome);
    setCnpjCpf(l.cnpjCpf || '');
    setEmail(l.email || '');
    setTelefone(l.telefone || '');
    setModeloId(l.modeloId);
    setValorReais(l.valorEstimadoCents / 100);
    setStatusEtapa(l.status);
    setProximaAcao(l.proximaAcao || '');
    setCondicaoPagamento(l.condicaoPagamento || 'Sinal 50% + Saldo na Entrega');
    setModalNovoLeadOpen(true);
  };

  const handleOpenView = (l: Lead) => {
    setSelectedLead(l);
    setModalViewOpen(true);
  };

  const handleMoverEtapa = async (leadId: string, novaEtapa: Lead['status']) => {
    const updated = leads.map(l => l.id === leadId ? {
      ...l,
      status: novaEtapa,
      dataMudancaStatus: new Date().toISOString()
    } : l);

    setLeads(updated);
    await updateDb(prev => ({
      ...prev,
      crmLeads: updated
    } as any), 'LEAD_STAGE_MOVED');
  };

  const handleDeleteLead = (leadId: string) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    requestDelete({
      title: 'Excluir Oportunidade do Funil Comercial',
      itemName: `${targetLead.nome} (${fmtMoeda(targetLead.valorEstimadoCents)})`,
      itemType: 'Oportunidade Comercial',
      entityType: 'customer',
      moduleKey: 'vendas',
      originalId: leadId,
      itemData: targetLead,
      isSoftDelete: true,
      warningMessage: 'Ao confirmar, a oportunidade será movida para a lixeira.',
      onDelete: async () => {
        const updated = leads.filter(l => l.id !== leadId);
        setLeads(updated);
        await updateDb(prev => ({
          ...prev,
          crmLeads: updated
        } as any), 'LEAD_DELETED');
      }
    });
  };

  const handleFecharNegocio = async (lead: Lead) => {
    if (confirm(`Fechar negócio com ${lead.nome}? O sistema processará a baixa/reserva de estoque e gerará a Ordem de Produção (OP)!`)) {
      const res = await processarVendaAutomatica(
        {
          customerId: lead.clienteId || 'cli-1',
          previsaoEntrega: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          valorTotalCents: lead.valorEstimadoCents,
          condicaoPagamento: lead.condicaoPagamento || 'Sinal 50% + Saldo na Entrega'
        },
        [
          {
            productId: lead.modeloId || 'p-cv1200',
            quantidade: 1000,
            precoUnitarioCents: lead.valorEstimadoCents
          }
        ],
        user?.name || 'Comercial'
      );

      if (res.success) {
        const updatedLeads = leads.map(l => l.id === lead.id ? { ...l, status: 'fechado_ganho' as const } : l);
        setLeads(updatedLeads);
        await updateDb(prev => ({
          ...prev,
          crmLeads: updatedLeads
        } as any), 'LEAD_CLOSED_WON');

        const opText = res.opsGeradas.length > 0 ? ` e gerada a Ordem de Produção ${res.opsGeradas.map(o => o.codigo).join(', ')}` : ' (atendido diretamente pelo saldo pronto em estoque)';
        alert(`Negócio Fechado com Sucesso! Gerado o Pedido de Venda ${res.pv.codigo}${opText}.`);
      } else {
        alert(res.error || 'Erro ao processar fechamento de venda.');
      }
    }
  };

  const handleCriarOuEditarLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente.trim()) return;

    if (editingLeadId) {
      const updated = leads.map(l => l.id === editingLeadId ? {
        ...l,
        nome: nomeCliente.trim(),
        cnpjCpf: cnpjCpf.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        modeloId,
        valorEstimadoCents: Math.round(valorReais * 100),
        status: statusEtapa,
        proximaAcao: proximaAcao.trim(),
        condicaoPagamento: condicaoPagamento.trim()
      } : l);

      setLeads(updated);
      await updateDb(prev => ({ ...prev, crmLeads: updated } as any), 'LEAD_UPDATED');
      setModalNovoLeadOpen(false);
      alert('Lead atualizado!');
      return;
    }

    const novoLead: Lead = {
      id: uid('lead'),
      nome: nomeCliente.trim(),
      cnpjCpf: cnpjCpf.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      modeloId,
      valorEstimadoCents: Math.round(valorReais * 100),
      status: statusEtapa,
      proximaAcao: proximaAcao.trim() || 'Agendar contato comercial',
      dataMudancaStatus: new Date().toISOString(),
      usuarioResponsavel: user?.name || 'Comercial',
      criadoEm: new Date().toISOString(),
      prazoEntregaDias: 45,
      condicaoPagamento: condicaoPagamento.trim()
    };

    const nextLeads = [novoLead, ...leads];
    setLeads(nextLeads);
    await updateDb(prev => ({ ...prev, crmLeads: nextLeads } as any), 'LEAD_CREATED');
    setModalNovoLeadOpen(false);
    alert('Novo Lead cadastrado no Funil!');
  };

  return (
    <div className="space-y-4">
      {/* Topo com Botão Novo Lead */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-600 dark:text-teal-400" />
            CRM & Funil de Prospecção Comercial
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhamento ponta a ponta da prospecção de máquinas 3D industriais.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenNew}
        >
          Novo Lead
        </Button>
      </div>

      {/* Kanban de Etapas */}
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1">
        {stages.map(st => {
          const stageLeads = leads.filter(l => l.status === st.id);
          const totalVal = stageLeads.reduce((acc, l) => acc + l.valorEstimadoCents, 0);

          return (
            <div key={st.id} className={`flex flex-col rounded-2xl border ${st.color} p-3 w-80 shrink-0`}>
              <div className="flex items-center justify-between px-1 py-1 mb-1">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">{st.label}</span>
                <span className="rounded-full bg-white dark:bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-white">
                  {stageLeads.length}
                </span>
              </div>
              <div className="text-[11px] font-bold text-slate-400 px-1 mb-3">
                Total: <span className="font-mono text-white">{fmtMoeda(totalVal)}</span>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5 min-h-[150px]">
                {stageLeads.map(l => {
                  const prod = db.products.find(p => p.id === l.modeloId);

                  return (
                    <div key={l.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-1">
                        <b className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">{l.nome}</b>
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold shrink-0 ${st.badgeCls}`}>
                          {st.label}
                        </span>
                      </div>

                      <div className="space-y-0.5 text-[11px]">
                        <div className="text-slate-400 font-mono text-[10px]">CNPJ: {l.cnpjCpf || '—'}</div>
                        <div className="font-bold text-teal-400">🤖 Modelo: {prod?.descricao || 'Impressora 3D'}</div>
                        <div className="font-mono font-extrabold text-white text-xs pt-0.5">{fmtMoeda(l.valorEstimadoCents)}</div>
                      </div>

                      {l.proximaAcao && (
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-[11px]">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">📌 Próxima Ação</span>
                          <span className="font-medium text-slate-300">{l.proximaAcao}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1">
                        <select
                          value={l.status}
                          onChange={e => handleMoverEtapa(l.id, e.target.value as Lead['status'])}
                          className="text-[10.5px] font-bold rounded-lg border border-slate-700 bg-slate-800 text-slate-200 px-1.5 py-1 outline-none flex-1 max-w-[130px]"
                        >
                          {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>

                        <div className="flex items-center gap-1">
                          {l.status !== 'fechado_ganho' && l.status !== 'fechado_perdido' && (
                            <button
                              onClick={() => handleFecharNegocio(l)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] font-bold"
                              title="Fechar Negócio e Gerar PV+OP"
                            >
                              ✓ Fechar
                            </button>
                          )}

                          <button onClick={() => handleOpenView(l)} className="p-1 text-slate-400 hover:text-brand-400" title="Visualizar">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleOpenEdit(l)} className="p-1 text-slate-400 hover:text-amber-400" title="Editar">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteLead(l.id)} className="p-1 text-slate-400 hover:text-rose-400" title="Excluir">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL VIEW LEAD */}
      <Modal isOpen={modalViewOpen} onClose={() => setModalViewOpen(false)} title={`Ficha da Oportunidade — ${selectedLead?.nome}`}>
        {selectedLead && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-teal-400 uppercase text-[10px]">{selectedLead.status}</span>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedLead.nome}</h3>
              <p className="text-slate-400">CNPJ: {selectedLead.cnpjCpf || '—'} | Contato: {selectedLead.telefone || '—'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Modelo Solicitado</span>
                <span className="font-bold text-white">{db.products.find(p => p.id === selectedLead.modeloId)?.descricao}</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Valor Estimado</span>
                <span className="font-mono font-bold text-emerald-400 text-base">{fmtMoeda(selectedLead.valorEstimadoCents)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL NOVO / EDITAR LEAD */}
      <Modal isOpen={modalNovoLeadOpen} onClose={() => setModalNovoLeadOpen(false)} title={editingLeadId ? 'Editar Lead' : 'Novo Lead Comercial'}>
        <form onSubmit={handleCriarOuEditarLead} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Empresa / Cliente *</label>
              <input
                type="text"
                value={nomeCliente}
                onChange={e => setNomeCliente(e.target.value)}
                placeholder="Ex: Alfa Impressões e Painéis"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CNPJ / CPF</label>
              <input
                type="text"
                value={cnpjCpf}
                onChange={e => setCnpjCpf(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="(47) 99999-8888"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="compras@cliente.com.br"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Modelo Desejado</label>
              <select
                value={modeloId}
                onChange={e => setModeloId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                {db.products.filter(p => p.tipo_item === 'produto_acabado').map(pa => (
                  <option key={pa.id} value={pa.id}>[{pa.codigo}] {pa.descricao}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Estimado (R$)</label>
              <input
                type="number"
                step="0.01"
                value={valorReais}
                onChange={e => setValorReais(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Etapa do Funil</label>
              <select
                value={statusEtapa}
                onChange={e => setStatusEtapa(e.target.value as Lead['status'])}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Próxima Ação Comercial</label>
            <input
              type="text"
              value={proximaAcao}
              onChange={e => setProximaAcao(e.target.value)}
              placeholder="Ex: Agendar visita e enviar catálogo técnico"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovoLeadOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">{editingLeadId ? 'Salvar Alterações' : 'Cadastrar Lead'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
