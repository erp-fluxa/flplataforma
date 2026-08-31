import React, { useState } from 'react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { fmtMoeda, fmtQtd } from '../lib/formatters';

type DashTab = 'estoque' | 'comercial' | 'compras' | 'producao' | 'financeiro' | 'pipeline';

export const Dashboard: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const { db } = useDb();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<DashTab>('estoque');

  const sectorTabs = [
    { id: 'estoque', label: 'Estoque' },
    { id: 'comercial', label: 'Comercial' },
    { id: 'compras', label: 'Compras' },
    { id: 'producao', label: 'Produção' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'pipeline', label: '🔄 Pipeline Macro (Fluxo Vendas ➔ Suporte)' }
  ];

  // =================== DADOS DE ESTOQUE ===================
  const totalQty = (db.stockBalances || []).reduce((acc, b) => acc + (b.quantidade || 0), 0) / 1000;
  const totalValue = (db.stockBalances || []).reduce((acc, b) => acc + ((b.quantidade || 0) / 1000) * ((b.custoMedio || 0) / 100), 0);
  const lowStockCount = (db.products || []).filter(p => p.ativo).length;
  const turnoverRate = 1.2;

  const topGiroEstoque = [
    { name: 'FIL-PETG-2KG', val: 85 },
    { name: 'COMP-ROL-LIN', val: 52 },
    { name: 'COMP-GUIA-MGN12', val: 44 },
    { name: 'COMP-BICO-1.2', val: 38 },
    { name: 'ELET-DRV-TMC', val: 26 }
  ];

  const catDonutEstoque = [
    { label: 'Filamentos', valStr: 'R$ 18.500', color: '#2a78d6', percent: 25 },
    { label: 'Estrutura Mecânica', valStr: 'R$ 34.200', color: '#1baf7a', percent: 36 },
    { label: 'Eletrônica Klipper', valStr: 'R$ 28.400', color: '#eb6834', percent: 26 },
    { label: 'Sistema Extrusão', valStr: 'R$ 12.600', color: '#eda100', percent: 13 }
  ];

  // =================== DADOS COMERCIAIS ===================
  const vendasMeses = [
    { mes: 'Mar', cv: 2, cx: 1 },
    { mes: 'Abr', cv: 3, cx: 2 },
    { mes: 'Mai', cv: 2, cx: 2 },
    { mes: 'Jun', cv: 4, cx: 3 },
    { mes: 'Jul', cv: 3, cx: 2 },
    { mes: 'Ago', cv: 5, cx: 4 }
  ];

  // =================== DADOS DE COMPRAS ===================
  const comprasStatus = [
    { label: 'Pendente', val: 2, color: '#eda100' },
    { label: 'Enviado', val: 4, color: '#2a78d6' },
    { label: 'Confirmado', val: 6, color: '#1baf7a' },
    { label: 'Atrasado', val: 1, color: '#eb6834' }
  ];

  const topCotacoesItens = [
    { name: 'Filamento PETG 2kg', val: 6 },
    { name: 'Guia Linear MGN12', val: 4 },
    { name: 'Motor Nema 23', val: 3 },
    { name: 'MCU Klipper 64bit', val: 3 },
    { name: 'Tela Touch 7"', val: 2 }
  ];

  // =================== DADOS DE PRODUÇÃO ===================
  const opStatusDonut = [
    { label: 'Aguardando Materiais', val: 1, color: '#eb6834' },
    { label: 'Material Reservado', val: 2, color: '#eda100' },
    { label: 'Em Montagem/Burn-in', val: 2, color: '#2a78d6' },
    { label: 'Concluída', val: 3, color: '#1baf7a' }
  ];

  const leadTimeLinhas = [
    { linha: 'Linha CV (Letra Caixa)', dias: 58, color: '#2a78d6' },
    { linha: 'Linha CX (Volumétricas)', dias: 66, color: '#eb6834' }
  ];

  // =================== DADOS FINANCEIROS ===================
  const financeiroHistorico = [
    { mes: 'Mar', rec: 140000, cost: 58000 },
    { mes: 'Abr', rec: 160000, cost: 67000 },
    { mes: 'Mai', rec: 185000, cost: 78000 },
    { mes: 'Jun', rec: 210000, cost: 88000 },
    { mes: 'Jul', rec: 195000, cost: 82000 },
    { mes: 'Ago', rec: 252000, cost: 105840 }
  ];

  const getSubTitle = () => {
    if (activeTab === 'pipeline') return 'Rastreabilidade Ponta a Ponta: CRM ➔ Vendas ➔ Produção ➔ Estoque ➔ Suporte';
    return `Visão consolidada do setor: ${activeTab.toUpperCase()}`;
  };

  return (
    <div className="space-y-4 font-sans selection:bg-teal-500 selection:text-white">
      {/* 1. Header do Dashboard */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Dashboard Executiva
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
          {getSubTitle()}
        </p>
      </div>

      {/* 2. Filtros de Setor (Pills) */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800/80 pb-3 overflow-x-auto">
        {sectorTabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as DashTab)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#0d9488] text-white shadow-sm font-bold'
                  : 'bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. ABA ESTOQUE */}
      {/* ========================================================================= */}
      {activeTab === 'estoque' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] shadow-xs">
              <span className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">Quantidade Total em Estoque</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-slate-900 dark:text-white font-mono tracking-tight">{totalQty} un</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ +4.2% no almoxarifado</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] shadow-xs">
              <span className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">Valor Total em Estoque</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-slate-900 dark:text-white font-mono tracking-tight">{fmtMoeda(totalValue * 100)}</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ +2.1% no patrimônio</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] shadow-xs">
              <span className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">Itens Abaixo do Estoque Mínimo</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-slate-900 dark:text-white font-mono tracking-tight">{lowStockCount}</span>
              <span className="block text-[11px] font-semibold text-red-500 mt-1">↓ Requer atenção em compras</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] shadow-xs">
              <span className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">Giro Médio do Estoque</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-slate-900 dark:text-white font-mono tracking-tight">{turnoverRate}×</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ Rotação de insumos adequada</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico 1: TOP 5 PRODUTOS MAIS MOVIMENTADOS */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] shadow-xs flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                TOP 5 PRODUTOS MAIS MOVIMENTADOS NO MÊS
              </h3>
              <div className="space-y-3.5 my-auto">
                {topGiroEstoque.map(item => {
                  const widthPercent = (item.val / 90) * 100;
                  return (
                    <div key={item.name} className="flex items-center gap-3 text-xs">
                      <span className="w-32 font-mono font-bold text-slate-400 text-right shrink-0 truncate text-[11px]">{item.name}</span>
                      <div className="flex-1 h-6 bg-slate-950/40 dark:bg-[#070D1F] rounded-xs relative overflow-hidden border border-slate-800/40">
                        <div className="h-full bg-[#2a78d6] rounded-xs transition-all duration-500" style={{ width: `${widthPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between pl-35 pr-1 text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/40">
                  <span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span><span>60</span><span>70</span><span>80</span><span>90</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 pt-4 text-xs font-medium text-slate-300">
                <span className="w-3 h-3 bg-[#2a78d6] rounded-xs inline-block" />
                <span>Qtd Movimentada (un)</span>
              </div>
            </div>

            {/* Gráfico 2: VALOR EM ESTOQUE POR CATEGORIA */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] shadow-xs flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                VALOR EM ESTOQUE POR CATEGORIA DE COMPONENTE
              </h3>
              <div className="relative w-48 h-48 mx-auto my-3 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="34" fill="transparent" stroke="#2a78d6" strokeWidth="18" strokeDasharray="53.4 213.6" strokeDashoffset="0" />
                  <circle cx="50" cy="50" r="34" fill="transparent" stroke="#1baf7a" strokeWidth="18" strokeDasharray="76.9 213.6" strokeDashoffset="-53.4" />
                  <circle cx="50" cy="50" r="34" fill="transparent" stroke="#eb6834" strokeWidth="18" strokeDasharray="55.5 213.6" strokeDashoffset="-130.3" />
                  <circle cx="50" cy="50" r="34" fill="transparent" stroke="#eda100" strokeWidth="18" strokeDasharray="27.8 213.6" strokeDashoffset="-185.8" />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 text-xs font-medium text-slate-300">
                {catDonutEstoque.map(cat => (
                  <div key={cat.label} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs shrink-0 inline-block" style={{ backgroundColor: cat.color }} />
                    <span className="text-[11px] truncate">{cat.label}: <b className="font-mono text-white font-bold">{cat.valStr}</b></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ABA COMERCIAL */}
      {/* ========================================================================= */}
      {activeTab === 'comercial' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Número de Vendas no Mês</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">6 máquinas</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ +18.5% no período</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Receita Total no Mês</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">R$ 252.000,00</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ Meta atingida com sucesso</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Modelo Mais Vendido</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">CV1200 (4 un)</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">★ Líder de mercado industrial</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Ticket Médio por Máquina</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">R$ 42.000,00</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ Alta rentabilidade por unidade</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico 1: Vendas por Modelo nos últimos 6 meses */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                VENDAS POR MODELO NOS ÚLTIMOS 6 MESES (CV VS CX)
              </h3>
              <div className="h-56 flex items-end justify-between gap-2 px-4 pb-2 pt-6 border-b border-slate-800">
                {vendasMeses.map(v => (
                  <div key={v.mes} className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="w-full flex items-end justify-center gap-1 h-40">
                      <div className="w-4 bg-[#2a78d6] rounded-t-xs transition-all" style={{ height: `${(v.cv / 6) * 100}%` }} title={`CV: ${v.cv}`} />
                      <div className="w-4 bg-[#eb6834] rounded-t-xs transition-all" style={{ height: `${(v.cx / 6) * 100}%` }} title={`CX: ${v.cx}`} />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{v.mes}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 pt-4 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#2a78d6] rounded-xs" />
                  <span>Linha CV (Letra Caixa)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#eb6834] rounded-xs" />
                  <span>Linha CX (Volumétricas)</span>
                </div>
              </div>
            </div>

            {/* Gráfico 2: Mix de Linha Donut */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                MIX DE LINHA (% LINHA CV VS % LINHA CX)
              </h3>
              <div className="relative w-48 h-48 mx-auto my-3 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="34" fill="transparent" stroke="#2a78d6" strokeWidth="18" strokeDasharray="123.8 213.6" strokeDashoffset="0" />
                  <circle cx="50" cy="50" r="34" fill="transparent" stroke="#eb6834" strokeWidth="18" strokeDasharray="89.8 213.6" strokeDashoffset="-123.8" />
                </svg>
              </div>
              <div className="flex items-center justify-center gap-6 pt-2 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#2a78d6] rounded-xs" />
                  <span>Linha CV: <b className="font-mono text-white">58%</b></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#eb6834] rounded-xs" />
                  <span>Linha CX: <b className="font-mono text-white">42%</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ABA COMPRAS */}
      {/* ========================================================================= */}
      {activeTab === 'compras' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Pedidos de Compra em Aberto</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">4 pedidos</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↓ Suprimentos em transporte</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Valor Comprometido em Pedidos</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">R$ 68.400,00</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ Insumos contratados</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Cotações Aguardando Resposta</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">5 RFQs</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ Em equalização de fornecedores</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Prazo Médio dos Fornecedores</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">7 dias</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">✓ Lead time dentro da meta</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico 1: Pedidos por Status */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                PEDIDOS DE COMPRA POR STATUS
              </h3>
              <div className="h-56 flex items-end justify-around gap-4 px-6 pb-2 pt-6 border-b border-slate-800">
                {comprasStatus.map(st => (
                  <div key={st.label} className="flex flex-col items-center gap-2 flex-1">
                    <span className="font-mono font-bold text-white text-xs">{st.val}</span>
                    <div className="w-12 rounded-t-xs transition-all" style={{ height: `${(st.val / 7) * 100}%`, backgroundColor: st.color }} />
                    <span className="text-[11px] font-bold text-slate-400">{st.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 pt-4 text-xs font-medium text-slate-300">
                <span>Qtd de Ordens de Compra por etapa</span>
              </div>
            </div>

            {/* Gráfico 2: Top Itens com Mais Cotações */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                TOP ITENS COM MAIS COTAÇÕES ATIVAS
              </h3>
              <div className="space-y-3 my-auto">
                {topCotacoesItens.map(it => {
                  const widthPercent = (it.val / 7) * 100;
                  return (
                    <div key={it.name} className="flex items-center gap-3 text-xs">
                      <span className="w-36 font-bold text-slate-400 text-right shrink-0 truncate text-[11px]">{it.name}</span>
                      <div className="flex-1 h-6 bg-[#070D1F] rounded-xs relative overflow-hidden border border-slate-800/40">
                        <div className="h-full bg-[#1baf7a] rounded-xs flex items-center justify-end pr-2 text-[10px] font-bold text-white" style={{ width: `${widthPercent}%` }}>
                          {it.val}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-2 pt-4 text-xs font-medium text-slate-300">
                <span className="w-3 h-3 bg-[#1baf7a] rounded-xs" />
                <span>Cotações Ativas (RFQs)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ABA PRODUÇÃO */}
      {/* ========================================================================= */}
      {activeTab === 'producao' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Ordens de Produção em Andamento</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">5 OPs</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ Na esteira do chão de fábrica</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">OPs Concluídas no Mês</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">3 máquinas</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">✓ Burn-in 12h executado</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Prazo Médio de Produção</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">62 dias</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">✓ Meta de 65 dias atingida</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Itens Reservados por OPs</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">24 componentes</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ Sem paradas de estoque</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico 1: Distribuição de OPs Donut */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                DISTRIBUIÇÃO DE OPS POR STATUS DO PCP
              </h3>
              <div className="relative w-48 h-48 mx-auto my-3 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="34" fill="transparent" stroke="#eb6834" strokeWidth="18" strokeDasharray="26.7 213.6" strokeDashoffset="0" />
                  <circle cx="50" cy="50" r="34" fill="transparent" stroke="#eda100" strokeWidth="18" strokeDasharray="53.4 213.6" strokeDashoffset="-26.7" />
                  <circle cx="50" cy="50" r="34" fill="transparent" stroke="#2a78d6" strokeWidth="18" strokeDasharray="53.4 213.6" strokeDashoffset="-80.1" />
                  <circle cx="50" cy="50" r="34" fill="transparent" stroke="#1baf7a" strokeWidth="18" strokeDasharray="80.1 213.6" strokeDashoffset="-133.5" />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-medium text-slate-300">
                {opStatusDonut.map(op => (
                  <div key={op.label} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: op.color }} />
                    <span className="text-[11px] truncate">{op.label}: <b className="font-mono text-white">{op.val}</b></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfico 2: Prazo Médio por Linha */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                PRAZO MÉDIO DE FABRICAÇÃO POR LINHA (DIAS CORRIDOS)
              </h3>
              <div className="h-56 flex items-end justify-around gap-6 px-12 pb-2 pt-6 border-b border-slate-800">
                {leadTimeLinhas.map(l => (
                  <div key={l.linha} className="flex flex-col items-center gap-2 flex-1">
                    <span className="font-mono font-bold text-white text-xs">{l.dias} dias</span>
                    <div className="w-16 rounded-t-xs transition-all" style={{ height: `${(l.dias / 80) * 100}%`, backgroundColor: l.color }} />
                    <span className="text-[11px] font-bold text-slate-400 text-center">{l.linha}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 pt-4 text-xs font-medium text-slate-300">
                <span>Tempo total de montagem, eletrônica e burn-in</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ABA FINANCEIRO */}
      {/* ========================================================================= */}
      {activeTab === 'financeiro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Receita no Mês</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">R$ 252.000,00</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ Faturamento sob encomenda</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Custos no Mês</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">R$ 105.840,00</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↓ COGS dentro do orçamento</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Margem Bruta</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">58%</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">↑ Excelente rentabilidade</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D]">
              <span className="block text-[12px] text-slate-400 mb-1">Sinais / Entradas Recebidos</span>
              <span className="block text-[22px] sm:text-[24px] font-black text-white font-mono tracking-tight">R$ 86.000,00</span>
              <span className="block text-[11px] font-semibold text-emerald-500 mt-1">✓ Caixa garantido no contrato</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico 1: Receita Bruta vs Custos Industriais */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                RECEITA BRUTA VS CUSTOS INDUSTRIAIS (ÚLTIMOS 6 MESES)
              </h3>
              <div className="h-56 flex items-end justify-between gap-2 px-4 pb-2 pt-6 border-b border-slate-800">
                {financeiroHistorico.map(f => (
                  <div key={f.mes} className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="w-full flex items-end justify-center gap-1 h-40">
                      <div className="w-4 bg-[#2a78d6] rounded-t-xs" style={{ height: `${(f.rec / 300000) * 100}%` }} title={`Receita: ${fmtMoeda(f.rec * 100)}`} />
                      <div className="w-4 bg-[#eb6834] rounded-t-xs" style={{ height: `${(f.cost / 300000) * 100}%` }} title={`Custo: ${fmtMoeda(f.cost * 100)}`} />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{f.mes}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 pt-4 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#2a78d6] rounded-xs" />
                  <span>Receita (R$)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#eb6834] rounded-xs" />
                  <span>Custos Industriais (R$)</span>
                </div>
              </div>
            </div>

            {/* Gráfico 2: Sinais vs Saldo a Receber */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111A2D] flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                SINAIS RECEBIDOS VS SALDO A RECEBER POR CONTRATOS
              </h3>
              <div className="h-56 flex items-end justify-around gap-6 px-8 pb-2 pt-6 border-b border-slate-800">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <span className="font-mono font-bold text-emerald-400 text-xs">R$ 86.000</span>
                  <div className="w-20 bg-[#1baf7a] rounded-t-xs" style={{ height: '48%' }} />
                  <span className="text-[11px] font-bold text-slate-400 text-center">Sinais Recebidos</span>
                </div>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <span className="font-mono font-bold text-blue-400 text-xs">R$ 166.000</span>
                  <div className="w-20 bg-[#2a78d6] rounded-t-xs" style={{ height: '92%' }} />
                  <span className="text-[11px] font-bold text-slate-400 text-center">Saldo na Entrega</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 pt-4 text-xs font-medium text-slate-300">
                <span>Valores em Reais (R$) por etapa contratual</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. ABA PIPELINE MACRO */}
      {/* ========================================================================= */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl border border-blue-800 bg-[#111A2D] text-blue-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-[11px] uppercase tracking-wider text-blue-400">1. CRM & Lead</span>
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              </div>
              <span className="font-mono font-black text-white text-base block">3 Oportunidades</span>
              <p className="text-[11px] text-slate-400">R$ 398.000 em propostas abertas</p>
            </div>

            <div className="p-4 rounded-2xl border border-purple-800 bg-[#111A2D] text-purple-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-[11px] uppercase tracking-wider text-purple-400">2. Vendas & PV</span>
                <span className="w-2 h-2 rounded-full bg-purple-400" />
              </div>
              <span className="font-mono font-black text-white text-base block">6 Contratos</span>
              <p className="text-[11px] text-slate-400">Sinal 50% faturado</p>
            </div>

            <div className="p-4 rounded-2xl border border-amber-800 bg-[#111A2D] text-amber-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-[11px] uppercase tracking-wider text-amber-400">3. PCP & Chão Fábrica</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <span className="font-mono font-black text-white text-base block">5 OPs Ativas</span>
              <p className="text-[11px] text-slate-400">Explosão de BOM e montagem</p>
            </div>

            <div className="p-4 rounded-2xl border border-teal-800 bg-[#111A2D] text-teal-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-[11px] uppercase tracking-wider text-teal-400">4. Almoxarifado</span>
                <span className="w-2 h-2 rounded-full bg-teal-400" />
              </div>
              <span className="font-mono font-black text-white text-base block">24 Reservas</span>
              <p className="text-[11px] text-slate-400">Separação de insumos sem falta</p>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-800 bg-[#111A2D] text-emerald-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-[11px] uppercase tracking-wider text-emerald-400">5. Expedição</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <span className="font-mono font-black text-white text-base block">3 Entregues</span>
              <p className="text-[11px] text-slate-400">Burn-in 12h e despacho</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-[#111A2D] text-xs text-slate-300 space-y-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">
              Fluxo Contínuo de Rastreabilidade Operacional
            </h3>
            <div className="relative flex items-center justify-between gap-4 py-4 px-2 overflow-x-auto">
              <div className="flex flex-col items-center text-center gap-1 min-w-[120px]">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500 text-blue-400 font-black flex items-center justify-center text-sm shadow-inner">01</div>
                <span className="font-bold text-white text-[11px] mt-1">Lead / Proposta</span>
                <span className="text-[10px] text-slate-400">CRM Comercial</span>
              </div>
              <div className="text-slate-600 text-lg">➔</div>

              <div className="flex flex-col items-center text-center gap-1 min-w-[120px]">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500 text-purple-400 font-black flex items-center justify-center text-sm shadow-inner">02</div>
                <span className="font-bold text-white text-[11px] mt-1">Pedido de Venda</span>
                <span className="text-[10px] text-slate-400">Contrato Assinado</span>
              </div>
              <div className="text-slate-600 text-lg">➔</div>

              <div className="flex flex-col items-center text-center gap-1 min-w-[120px]">
                <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500 text-amber-400 font-black flex items-center justify-center text-sm shadow-inner">03</div>
                <span className="font-bold text-white text-[11px] mt-1">Geração de OP</span>
                <span className="text-[10px] text-slate-400">Explosão da BOM</span>
              </div>
              <div className="text-slate-600 text-lg">➔</div>

              <div className="flex flex-col items-center text-center gap-1 min-w-[120px]">
                <div className="w-10 h-10 rounded-2xl bg-teal-600/20 border border-teal-500 text-teal-400 font-black flex items-center justify-center text-sm shadow-inner">04</div>
                <span className="font-bold text-white text-[11px] mt-1">Separação</span>
                <span className="text-[10px] text-slate-400">Baixa Almoxarifado</span>
              </div>
              <div className="text-slate-600 text-lg">➔</div>

              <div className="flex flex-col items-center text-center gap-1 min-w-[120px]">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500 text-emerald-400 font-black flex items-center justify-center text-sm shadow-inner">05</div>
                <span className="font-bold text-white text-[11px] mt-1">Despacho & OS</span>
                <span className="text-[10px] text-slate-400">Instalação Cliente</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
