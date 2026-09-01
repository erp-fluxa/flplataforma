import React, { useMemo, useState } from 'react';
import { 
  AlertTriangle, Clock, ShoppingCart, TrendingUp, CheckCircle, 
  ArrowRight, Sparkles, Building, DollarSign, Calendar, Flame,
  FileSpreadsheet, Plus, Check, ShieldAlert, Award, PackageCheck,
  AlertCircle, ChevronRight, Zap, RefreshCw, BarChart3, Users, HelpCircle
} from 'lucide-react';
import { useDb } from '../context/DbContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { fmtMoeda, fmtQtd, fmtData } from '../lib/formatters';
import { Quotation, PurchaseOrder, Product, Supplier, ShoppingItem, ProductionOrder } from '../types';

export interface DashboardComprasProps {
  onNavigateTab?: (tab: 'compra_rapida' | 'cotacoes' | 'pedidos' | 'lista' | 'tarefas', extra?: any) => void;
  onOpenNewCotacao?: (productId?: string, defaultQtd?: number) => void;
}

export const DashboardCompras: React.FC<DashboardComprasProps> = ({ 
  onNavigateTab,
  onOpenNewCotacao 
}) => {
  const { db } = useDb();
  const [modalPreReqOpen, setModalPreReqOpen] = useState(false);

  const hoje = new Date();

  // =========================================================================
  // 1. DADOS: SEÇÃO 1 — AÇÃO IMEDIATA
  // =========================================================================

  // 1.1 Itens travando produção
  const itensTravandoProducao = useMemo(() => {
    const opsTravadas = (db.productionOrders || []).filter(
      op => op.status === 'aguardando_material' || op.status === 'planejada' || op.status === 'em_producao'
    );

    const travamentos: {
      productId: string;
      productName: string;
      productCode: string;
      unidade: string;
      saldoDisponivel: number;
      qtdNecessaria: number;
      qtdFaltante: number;
      opId: string;
      opCodigo: string;
      diasTravado: number;
    }[] = [];

    opsTravadas.forEach(op => {
      const bomItems = (db.bomItems || []).filter(b => b.bomVersionId === op.bomVersionId);
      
      bomItems.forEach(bi => {
        const prod = (db.products || []).find(p => p.id === bi.componentProductId);
        if (!prod) return;

        const saldoFisico = (db.stockBalances || [])
          .filter(b => b.productId === prod.id)
          .reduce((acc, b) => acc + (b.quantidade || 0), 0) / 1000;

        const saldoReservado = (db.stockReservations || [])
          .filter(r => r.productId === prod.id && r.status === 'ativa' && r.productionOrderId !== op.id)
          .reduce((acc, r) => acc + (r.quantidade || 0), 0) / 1000;

        const saldoDisponivel = Math.max(0, saldoFisico - saldoReservado);
        const qtdNecessaria = ((bi.quantidade || 1000) / 1000) * (op.quantidadePlanejada || 1);

        if (saldoDisponivel < qtdNecessaria || saldoFisico <= 0) {
          const criadoEm = op.criadoEm ? new Date(op.criadoEm) : hoje;
          const diffDays = Math.max(1, Math.floor((hoje.getTime() - criadoEm.getTime()) / (1000 * 60 * 60 * 24)));

          travamentos.push({
            productId: prod.id,
            productName: prod.descricao,
            productCode: prod.codigo,
            unidade: prod.unidade || 'UN',
            saldoDisponivel,
            qtdNecessaria,
            qtdFaltante: Math.max(0, qtdNecessaria - saldoDisponivel),
            opId: op.id,
            opCodigo: op.codigo,
            diasTravado: diffDays
          });
        }
      });
    });

    return travamentos;
  }, [db.productionOrders, db.bomItems, db.products, db.stockBalances, db.stockReservations]);

  // 1.2 Cotações vencendo (prazo <= 48h ou vencidas e ainda não finalizadas)
  const cotacoesVencendo = useMemo(() => {
    return (db.quotations || []).filter(q => {
      if (q.status === 'convertida_pedido' || q.status === 'arquivada' || q.status === 'aprovada') return false;
      if (!q.dataLimite) return false;

      const dataLimite = new Date(q.dataLimite + 'T23:59:59');
      const diffHoras = (dataLimite.getTime() - hoje.getTime()) / (1000 * 60 * 60);

      return diffHoras <= 48;
    }).map(q => {
      const dataLimite = new Date(q.dataLimite + 'T23:59:59');
      const diffHoras = Math.round((dataLimite.getTime() - hoje.getTime()) / (1000 * 60 * 60));
      const precos = (db.quotationPrices || []).filter(p => p.quotationId === q.id && p.precoUnitarioCents > 0);
      return {
        ...q,
        diffHoras,
        respondidosCount: precos.length
      };
    }).sort((a, b) => a.diffHoras - b.diffHoras);
  }, [db.quotations, db.quotationPrices]);

  // 1.3 Ruptura sem ação (abaixo do estoque mínimo sem cotação nem pedido de compra em andamento)
  const rupturasSemAcao = useMemo(() => {
    return (db.products || []).filter(p => {
      if (!p.ativo || p.deleted_at) return false;
      const minStock = p.estoqueMinimo || 0;
      if (minStock <= 0) return false;

      const saldoFisico = (db.stockBalances || [])
        .filter(b => b.productId === p.id)
        .reduce((acc, b) => acc + (b.quantidade || 0), 0) / 1000;

      if (saldoFisico >= minStock) return false;

      const temCotacaoAberta = (db.quotationItems || []).some(qi => {
        if (qi.productId !== p.id) return false;
        const q = (db.quotations || []).find(cot => cot.id === qi.quotationId);
        return q && q.status !== 'convertida_pedido' && q.status !== 'arquivada';
      });

      const temPedidoAberto = (db.orders || []).some(o => {
        if (o.status === 'recebido' || o.status === 'cancelado') return false;
        if (o.productId === p.id) return true;
        if (o.items && o.items.some(it => it.productId === p.id)) return true;
        return false;
      });

      return !temCotacaoAberta && !temPedidoAberto;
    }).map(p => {
      const saldoFisico = (db.stockBalances || [])
        .filter(b => b.productId === p.id)
        .reduce((acc, b) => acc + (b.quantidade || 0), 0) / 1000;
      return {
        ...p,
        saldoFisico,
        deficit: Math.max(0, (p.estoqueMinimo || 0) - saldoFisico)
      };
    }).sort((a, b) => b.deficit - a.deficit);
  }, [db.products, db.stockBalances, db.quotationItems, db.quotations, db.orders]);

  const totalAcoesImediatas = itensTravandoProducao.length + cotacoesVencendo.length + rupturasSemAcao.length;

  // =========================================================================
  // 2. DADOS: SEÇÃO 2 — DECISÕES PENDENTES
  // =========================================================================
  const cotacoesProntasDecisao = useMemo(() => {
    return (db.quotations || []).filter(q => {
      if (q.status === 'convertida_pedido' || q.status === 'arquivada') return false;
      const precos = (db.quotationPrices || []).filter(p => p.quotationId === q.id && p.precoUnitarioCents > 0);
      return precos.length >= 1;
    }).map(q => {
      const precos = (db.quotationPrices || []).filter(p => p.quotationId === q.id && p.precoUnitarioCents > 0);
      const precosOrdenados = [...precos].sort((a, b) => a.precoUnitarioCents - b.precoUnitarioCents);
      const menorPreco = precosOrdenados[0];
      const maiorPreco = precosOrdenados[precosOrdenados.length - 1];

      const prazosOrdenados = [...precos].filter(p => (p.prazoEntregaDias || 0) > 0).sort((a, b) => (a.prazoEntregaDias || 0) - (b.prazoEntregaDias || 0));
      const menorPrazo = prazosOrdenados[0] || menorPreco;

      const fornMenor = (db.suppliers || []).find(s => s.id === menorPreco?.supplierId);
      const fornPrazo = (db.suppliers || []).find(s => s.id === menorPrazo?.supplierId);

      const economia = maiorPreco && menorPreco ? Math.max(0, maiorPreco.precoUnitarioCents - menorPreco.precoUnitarioCents) : 0;

      return {
        ...q,
        totalFornecedoresRespondidos: precos.length,
        menorPrecoCents: menorPreco?.precoUnitarioCents || 0,
        fornecedorMenorNome: fornMenor?.nomeFantasia || fornMenor?.razaoSocial || 'Fornecedor',
        menorPrazoDias: menorPrazo?.prazoEntregaDias || 0,
        fornecedorMenorPrazoNome: fornPrazo?.nomeFantasia || fornPrazo?.razaoSocial || 'Fornecedor',
        economiaEstimadaCents: economia
      };
    });
  }, [db.quotations, db.quotationPrices, db.suppliers]);

  const shoppingPendentes = useMemo(() => {
    return (db.gescompShoppingList || []).filter(
      i => i.status !== 'convertido_pedido' && i.status !== 'cancelado'
    );
  }, [db.gescompShoppingList]);

  // =========================================================================
  // 3. DADOS: SEÇÃO 3 — FINANCEIRO & PERFORMANCE
  // =========================================================================
  const pedidosAbertos = useMemo(() => {
    return (db.orders || []).filter(o => o.status !== 'recebido' && o.status !== 'cancelado');
  }, [db.orders]);

  const valorComprometidoTotal = useMemo(() => {
    return pedidosAbertos.reduce((acc, o) => acc + (o.valorTotalCents || 0), 0);
  }, [pedidosAbertos]);

  const economiaMes = useMemo(() => {
    const cotacoesFinalizadas = (db.quotations || []).filter(
      q => q.status === 'convertida_pedido' || q.status === 'aprovada'
    );

    let totalEconomizadoCents = 0;
    let totalBaseCotadaCents = 0;

    cotacoesFinalizadas.forEach(q => {
      const precos = (db.quotationPrices || []).filter(p => p.quotationId === q.id && p.precoUnitarioCents > 0);
      if (precos.length >= 2) {
        const maxPrice = Math.max(...precos.map(p => p.precoUnitarioCents));
        const winner = precos.find(p => p.selecionado)?.precoUnitarioCents || Math.min(...precos.map(p => p.precoUnitarioCents));
        totalEconomizadoCents += Math.max(0, maxPrice - winner);
        totalBaseCotadaCents += maxPrice;
      }
    });

    const percentualSaving = totalBaseCotadaCents > 0 
      ? Math.round((totalEconomizadoCents / totalBaseCotadaCents) * 100) 
      : 0;

    return {
      valorCents: totalEconomizadoCents,
      percentual: percentualSaving
    };
  }, [db.quotations, db.quotationPrices]);

  const curvaAbcItens = useMemo(() => {
    const comprasPorProduto = new Map<string, { product: Product; totalCents: number; qtdTotal: number }>();

    (db.orders || []).forEach(order => {
      if (order.status === 'cancelado') return;
      
      if (order.items && order.items.length > 0) {
        order.items.forEach(it => {
          const prod = (db.products || []).find(p => p.id === it.productId);
          if (!prod) return;
          const current = comprasPorProduto.get(prod.id) || { product: prod, totalCents: 0, qtdTotal: 0 };
          current.totalCents += it.valorTotalCents || (it.precoUnitarioCents * it.quantidade);
          current.qtdTotal += it.quantidade;
          comprasPorProduto.set(prod.id, current);
        });
      } else if (order.productId) {
        const prod = (db.products || []).find(p => p.id === order.productId);
        if (!prod) return;
        const current = comprasPorProduto.get(prod.id) || { product: prod, totalCents: 0, qtdTotal: 0 };
        current.totalCents += order.valorTotalCents || 0;
        current.qtdTotal += 1;
        comprasPorProduto.set(prod.id, current);
      }
    });

    const lista = Array.from(comprasPorProduto.values()).sort((a, b) => b.totalCents - a.totalCents);
    const gastoTotalGeral = lista.reduce((acc, i) => acc + i.totalCents, 0);

    let acumuladoCents = 0;
    return lista.map(item => {
      acumuladoCents += item.totalCents;
      const percentualAcumulado = gastoTotalGeral > 0 ? (acumuladoCents / gastoTotalGeral) * 100 : 0;
      const percentualIndividual = gastoTotalGeral > 0 ? (item.totalCents / gastoTotalGeral) * 100 : 0;

      let classe: 'A' | 'B' | 'C' = 'C';
      if (percentualAcumulado <= 80) classe = 'A';
      else if (percentualAcumulado <= 95) classe = 'B';
      else classe = 'C';

      return {
        ...item,
        percentualIndividual: Math.round(percentualIndividual * 10) / 10,
        classe
      };
    }).slice(0, 7);
  }, [db.orders, db.products]);

  // =========================================================================
  // 4. DADOS: SEÇÃO 4 — FORNECEDORES
  // =========================================================================
  const performanceFornecedores = useMemo(() => {
    const fornecedorStats = new Map<string, { supplier: Supplier; totalPedidos: number; noPrazo: number; atrasados: number }>();

    (db.orders || []).forEach(order => {
      const sup = (db.suppliers || []).find(s => s.id === order.supplierId);
      if (!sup) return;

      const current = fornecedorStats.get(sup.id) || { supplier: sup, totalPedidos: 0, noPrazo: 0, atrasados: 0 };
      current.totalPedidos += 1;

      const prevEntrega = order.previsaoEntrega ? new Date(order.previsaoEntrega + 'T23:59:59') : null;
      const dataReal = order.dataEntregaReal ? new Date(order.dataEntregaReal) : null;

      if (dataReal && prevEntrega) {
        if (dataReal <= prevEntrega) current.noPrazo += 1;
        else current.atrasados += 1;
      } else if (order.status === 'recebido') {
        current.noPrazo += 1;
      } else if (prevEntrega && hoje > prevEntrega && order.status !== 'recebido' && order.status !== 'cancelado') {
        current.atrasados += 1;
      } else {
        current.noPrazo += 1;
      }

      fornecedorStats.set(sup.id, current);
    });

    return Array.from(fornecedorStats.values())
      .map(item => {
        const taxaPontualidade = item.totalPedidos > 0 ? Math.round((item.noPrazo / item.totalPedidos) * 100) : 100;
        return {
          ...item,
          taxaPontualidade
        };
      })
      .sort((a, b) => a.taxaPontualidade - b.taxaPontualidade);
  }, [db.orders, db.suppliers]);

  const fornecedoresInativos = useMemo(() => {
    const noventaDiasAtras = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);

    return (db.suppliers || []).filter(sup => {
      if (sup.ativo === false) return false;

      const pedidos = (db.orders || []).filter(o => o.supplierId === sup.id);

      let ultimaData: Date | null = null;
      pedidos.forEach(p => {
        if (p.criadoEm) {
          const d = new Date(p.criadoEm);
          if (!ultimaData || d > ultimaData) ultimaData = d;
        }
      });

      if (!ultimaData) return true;
      return ultimaData < noventaDiasAtras;
    }).slice(0, 5);
  }, [db.suppliers, db.orders]);

  // =========================================================================
  // 5. DADOS: SEÇÃO 5 — RADAR (Chegando em Breve)
  // =========================================================================
  const pedidosChegando = useMemo(() => {
    return (db.orders || []).filter(o => {
      if (o.status === 'recebido' || o.status === 'cancelado') return false;
      if (!o.previsaoEntrega) return false;

      const dataPrev = new Date(o.previsaoEntrega + 'T23:59:59');
      const diffDias = Math.round((dataPrev.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias >= 0 && diffDias <= 30;
    }).map(o => {
      const sup = (db.suppliers || []).find(s => s.id === o.supplierId);
      const dataPrev = new Date(o.previsaoEntrega + 'T23:59:59');
      const diffDias = Math.round((dataPrev.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      const opVinculada = (db.productionOrders || []).find(
        op => op.status === 'aguardando_material' || op.status === 'planejada'
      );

      return {
        ...o,
        fornecedorNome: sup?.nomeFantasia || sup?.razaoSocial || 'Fornecedor',
        diffDias,
        opVinculadaCodigo: opVinculada?.codigo
      };
    }).sort((a, b) => a.diffDias - b.diffDias);
  }, [db.orders, db.suppliers, db.productionOrders]);

  return (
    <div className="space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      
      {/* CABEÇALHO DO DASHBOARD DE COMPRAS */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Zap className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Dashboard de Compras & Ação Operacional</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Painel priorizado por criticidade: resolva rupturas, decida cotações e controle prazos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModalPreReqOpen(true)}
            icon={<HelpCircle className="w-3.5 h-3.5 text-slate-400" />}
            className="text-xs font-bold"
          >
            Pré-requisitos & Métricas
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab ? onNavigateTab('cotacoes') : onOpenNewCotacao?.()}
            className="bg-brand-700 hover:bg-brand-800 text-xs font-bold shadow-sm"
          >
            Nova Cotação / RFQ
          </Button>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* 🔴 SEÇÃO 1 — AÇÃO IMEDIATA (DESTAQUE MÁXIMO, COR DE ALERTA NO TOPO) */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl border-2 border-rose-600/40 bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-900 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Flame className="w-4 h-4 text-rose-400 animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <span>SEÇÃO 1 — AÇÃO IMEDIATA</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[11px] font-bold">
                  {totalAcoesImediatas} {totalAcoesImediatas === 1 ? 'pendência crítica' : 'pendências críticas'}
                </span>
              </span>
              <p className="text-[11.5px] text-slate-300">
                Itens que impactam diretamente o chão de fábrica, cotações expirando e produtos em ruptura sem pedido.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          
          {/* 1.1 ITENS TRAVANDO PRODUÇÃO */}
          <div className="p-4 rounded-xl border border-rose-900/50 bg-rose-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Itens Travando Produção</span>
              </span>
              <Badge variant={itensTravandoProducao.length > 0 ? 'danger' : 'success'}>
                {itensTravandoProducao.length}
              </Badge>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {itensTravandoProducao.map((it, idx) => (
                <div 
                  key={`${it.productId}-${it.opId}-${idx}`}
                  className="p-2.5 rounded-xl border border-rose-900/60 bg-slate-950/80 hover:bg-slate-900 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] text-rose-400 font-bold block">{it.productCode}</span>
                      <span className="font-bold text-slate-100 truncate block">{it.productName}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold shrink-0">
                      OP {it.opCodigo}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Falta: <b className="text-rose-400 font-bold">{it.qtdFaltante} {it.unidade}</b></span>
                    <span className="font-mono text-slate-400">Travada há {it.diasTravado}d</span>
                  </div>

                  <button
                    onClick={() => {
                      if (onNavigateTab) onNavigateTab('cotacoes');
                      else onOpenNewCotacao?.(it.productId, it.qtdFaltante);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Cotar Insumo Imediatamente</span>
                  </button>
                </div>
              ))}

              {itensTravandoProducao.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-emerald-400">Nenhum item travando produção</span>
                  <span className="text-[10.5px]">Todas as OPs estão com insumos atendidos.</span>
                </div>
              )}
            </div>
          </div>

          {/* 1.2 COTAÇÕES VENCENDO (<= 48h) */}
          <div className="p-4 rounded-xl border border-amber-900/50 bg-amber-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Cotações Vencendo (≤ 48h)</span>
              </span>
              <Badge variant={cotacoesVencendo.length > 0 ? 'warning' : 'success'}>
                {cotacoesVencendo.length}
              </Badge>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {cotacoesVencendo.map(q => (
                <div 
                  key={q.id}
                  className="p-2.5 rounded-xl border border-amber-900/60 bg-slate-950/80 hover:bg-slate-900 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] text-amber-400 font-bold block">{q.codigo}</span>
                      <span className="font-bold text-slate-100 truncate block">{q.descricao}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                      {q.diffHoras <= 0 ? 'Expirou' : `${q.diffHoras}h restantes`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Respostas: <b className="text-amber-300">{q.respondidosCount} fornecedores</b></span>
                    <span>Prazo: {q.dataLimite ? fmtData(q.dataLimite) : 'Hoje'}</span>
                  </div>

                  <button
                    onClick={() => onNavigateTab ? onNavigateTab('cotacoes') : null}
                    className="w-full py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
                  >
                    <span>Equalizar & Tomar Decisão</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {cotacoesVencendo.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-emerald-400">Nenhuma cotação prestes a vencer</span>
                  <span className="text-[10.5px]">Prazos de cotação sob controle.</span>
                </div>
              )}
            </div>
          </div>

          {/* 1.3 RUPTURA SEM AÇÃO */}
          <div className="p-4 rounded-xl border border-rose-900/50 bg-rose-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Ruptura Sem Ação</span>
              </span>
              <Badge variant={rupturasSemAcao.length > 0 ? 'danger' : 'success'}>
                {rupturasSemAcao.length}
              </Badge>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {rupturasSemAcao.map(p => (
                <div 
                  key={p.id}
                  className="p-2.5 rounded-xl border border-rose-900/60 bg-slate-950/80 hover:bg-slate-900 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] text-rose-400 font-bold block">{p.codigo}</span>
                      <span className="font-bold text-slate-100 truncate block">{p.descricao}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold shrink-0">
                      Abaixo do Mín.
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Estoque: <b className="text-rose-400">{p.saldoFisico}</b> / Mín: <b>{p.estoqueMinimo}</b></span>
                    <span>Déficit: <b className="text-rose-300">-{p.deficit} {p.unidade}</b></span>
                  </div>

                  <button
                    onClick={() => {
                      if (onNavigateTab) onNavigateTab('cotacoes');
                      else onOpenNewCotacao?.(p.id, p.deficit);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Iniciar Cotação deste Item</span>
                  </button>
                </div>
              ))}

              {rupturasSemAcao.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-emerald-400">Estoque Mínimo Coberto</span>
                  <span className="text-[10.5px]">Todos os itens críticos já possuem cotação ou pedido.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>


      {/* ========================================================================= */}
      {/* 🟡 SEÇÃO 2 — DECISÕES PENDENTES */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl border border-amber-500/30 bg-[#0F172A]/90 dark:bg-[#0B1222] shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                SEÇÃO 2 — DECISÕES PENDENTES DO COMPRADOR
              </span>
              <p className="text-[11.5px] text-slate-400">
                Cotações com propostas recebidas prontas para seleção de vencedor e lista de suprimentos da fábrica.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          
          {/* 2.1 COTAÇÕES PRONTAS PARA DECISÃO */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                <span>Cotações Prontas para Decisão</span>
              </span>
              <Badge variant={cotacoesProntasDecisao.length > 0 ? 'info' : 'neutral'}>
                {cotacoesProntasDecisao.length} prontas
              </Badge>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {cotacoesProntasDecisao.map(q => (
                <div 
                  key={q.id}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10.5px] text-teal-400 font-bold">{q.codigo}</span>
                      <h4 className="font-extrabold text-slate-100">{q.descricao}</h4>
                    </div>
                    <Badge variant="success">{q.totalFornecedoresRespondidos} propostas</Badge>
                  </div>

                  {/* Comparativo Resumido */}
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">⭐ Menor Preço</span>
                      <span className="font-extrabold text-emerald-400 font-mono">
                        {fmtMoeda(q.menorPrecoCents)}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">{q.fornecedorMenorNome}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">⚡ Menor Prazo</span>
                      <span className="font-extrabold text-amber-300 font-mono">
                        {q.menorPrazoDias > 0 ? `${q.menorPrazoDias} dias` : 'Imediato'}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">{q.fornecedorMenorPrazoNome}</span>
                    </div>
                  </div>

                  {q.economiaEstimadaCents > 0 && (
                    <div className="text-[10.5px] font-bold text-emerald-400 flex items-center justify-between">
                      <span>Economia estimada (saving):</span>
                      <span className="font-mono">{fmtMoeda(q.economiaEstimadaCents)}</span>
                    </div>
                  )}

                  <button
                    onClick={() => onNavigateTab ? onNavigateTab('cotacoes') : null}
                    className="w-full py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Escolher Vencedor & Emitir Pedido</span>
                  </button>
                </div>
              ))}

              {cotacoesProntasDecisao.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhuma cotação com propostas pendentes de aprovação no momento.
                </div>
              )}
            </div>
          </div>

          {/* 2.2 ITENS PENDENTES DA LISTA DE COMPRAS RÁPIDAS */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                <span>Lista Rápida de Suprimentos (Fábrica / Manutenção)</span>
              </span>
              <Badge variant={shoppingPendentes.length > 0 ? 'warning' : 'neutral'}>
                {shoppingPendentes.length} pendentes
              </Badge>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {shoppingPendentes.map(item => (
                <div 
                  key={item.id}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 transition-all flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-100 block truncate">{item.item}</span>
                    <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                      <span>Qtd: <b>{item.quantidade} {item.unidade || 'UN'}</b></span>
                      <span>•</span>
                      <span className="capitalize">{item.categoria || 'Geral'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={item.prioridade === 'urgente' ? 'danger' : 'warning'}>
                      {item.prioridade || 'Normal'}
                    </Badge>
                    <button
                      onClick={() => onNavigateTab ? onNavigateTab('compra_rapida') : null}
                      className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-bold"
                      title="Gerar Cotação / Comprar"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {shoppingPendentes.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhum item pendente na lista de compras rápidas.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>


      {/* ========================================================================= */}
      {/* 🔵 SEÇÃO 3 — FINANCEIRO E PERFORMANCE */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl border border-blue-500/30 bg-[#0F172A]/90 dark:bg-[#0B1222] shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-blue-400 uppercase tracking-wider">
                SEÇÃO 3 — FINANCEIRO & PERFORMANCE DE COMPRAS
              </span>
              <p className="text-[11.5px] text-slate-400">
                Comprometimento orçamentário, savings economizados e curva ABC dos principais insumos.
              </p>
            </div>
          </div>
        </div>

        {/* CARDS KPI FINANCEIRO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">Valor Comprometido em Aberto</span>
            <span className="text-2xl font-black text-slate-100 font-mono tracking-tight block">
              {fmtMoeda(valorComprometidoTotal)}
            </span>
            <span className="text-[11px] text-blue-400 font-medium block">
              Distribuído em {pedidosAbertos.length} pedidos de compra
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">Economia em Cotações (Savings)</span>
            <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight block">
              {fmtMoeda(economiaMes.valorCents)}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium block">
              ↑ Economia média de {economiaMes.percentual}% vs maior preço cotado
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">Itens Classe A (Maior Impacto)</span>
            <span className="text-2xl font-black text-amber-300 font-mono tracking-tight block">
              {curvaAbcItens.filter(i => i.classe === 'A').length} itens
            </span>
            <span className="text-[11px] text-amber-400/90 font-medium block">
              Representam ~80% de todo o gasto financeiro de compras
            </span>
          </div>

        </div>

        {/* TABELA COMPACTA CURVA ABC */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Curva ABC de Itens Comprados (Concentração Financeira)</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Ordenado por volume em R$</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2">Item / Código</th>
                  <th className="px-3 py-2">Classe</th>
                  <th className="px-3 py-2 text-right">Volume Total</th>
                  <th className="px-3 py-2 text-right">% do Gasto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {curvaAbcItens.map(it => (
                  <tr key={it.product.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-slate-100">{it.product.descricao}</div>
                      <div className="font-mono text-[10.5px] text-slate-400">{it.product.codigo}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={it.classe === 'A' ? 'danger' : (it.classe === 'B' ? 'warning' : 'neutral')}>
                        Classe {it.classe}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-200">
                      {fmtMoeda(it.totalCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-400">
                      {it.percentualIndividual}%
                    </td>
                  </tr>
                ))}

                {curvaAbcItens.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                      Nenhum histórico de pedidos de compra processado para cálculo da Curva ABC.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* 🟣 SEÇÃO 4 — FORNECEDORES */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl border border-purple-500/30 bg-[#0F172A]/90 dark:bg-[#0B1222] shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-purple-400 uppercase tracking-wider">
                SEÇÃO 4 — PERFORMANCE & HOMOLOGAÇÃO DE FORNECEDORES
              </span>
              <p className="text-[11.5px] text-slate-400">
                Pontualidade de entrega (destaque aos piores) e fornecedores inativos para reativação de cotações.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          
          {/* 4.1 PERFORMANCE DE PRAZO (PIORES PRIMEIRO) */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Performance de Prazo (Ranking por Pontualidade)</span>
              </span>
              <span className="text-[10.5px] text-slate-400">Piores no topo</span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {performanceFornecedores.map(item => (
                <div 
                  key={item.supplier.id}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 transition-all flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-100 block truncate">
                      {item.supplier.nomeFantasia || item.supplier.razaoSocial}
                    </span>
                    <span className="text-[10.5px] text-slate-400">
                      {item.totalPedidos} {item.totalPedidos === 1 ? 'pedido avaliado' : 'pedidos avaliados'} ({item.atrasados} atrasos)
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`font-mono font-black text-sm block ${
                      item.taxaPontualidade < 70 ? 'text-rose-400' : (item.taxaPontualidade < 90 ? 'text-amber-400' : 'text-emerald-400')
                    }`}>
                      {item.taxaPontualidade}%
                    </span>
                    <span className="text-[9.5px] text-slate-400 uppercase font-bold">No Prazo</span>
                  </div>
                </div>
              ))}

              {performanceFornecedores.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Nenhum pedido de compra concluído para calcular índice de pontualidade.
                </div>
              )}
            </div>
          </div>

          {/* 4.2 FORNECEDORES INATIVOS (> 90 DIAS) */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-purple-400" />
                <span>Fornecedores sem Cotação Recente (&gt; 90 dias)</span>
              </span>
              <Badge variant="neutral">{fornecedoresInativos.length} inativos</Badge>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {fornecedoresInativos.map(sup => (
                <div 
                  key={sup.id}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 transition-all flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-100 block truncate">
                      {sup.nomeFantasia || sup.razaoSocial}
                    </span>
                    <span className="text-[10.5px] text-slate-400">
                      {sup.categoriaPrincipal || 'Suprimentos'} • CNPJ: {sup.cnpj}
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigateTab ? onNavigateTab('cotacoes') : null}
                    className="py-1 px-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[11px] font-bold shrink-0"
                  >
                    Convidar p/ Cotação
                  </button>
                </div>
              ))}

              {fornecedoresInativos.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Todos os fornecedores homologados foram cotados nos últimos 90 dias.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>


      {/* ========================================================================= */}
      {/* 🟢 SEÇÃO 5 — RADAR (CHEGANDO EM BREVE & PROJEÇÃO DE PRODUÇÃO) */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl border border-emerald-500/30 bg-[#0F172A]/90 dark:bg-[#0B1222] shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                SEÇÃO 5 — RADAR DE SUPRIMENTOS A CAMINHO
              </span>
              <p className="text-[11.5px] text-slate-400">
                Pedidos com previsão de entrega nos próximos 7 a 30 dias cruzados com as Ordens de Produção.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {pedidosChegando.map(order => (
            <div 
              key={order.id}
              className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 transition-all flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-teal-400">{order.codigo}</span>
                  <span className="font-bold text-slate-100">{order.fornecedorNome}</span>
                  {order.opVinculadaCodigo && (
                    <Badge variant="info">Vinculado à OP {order.opVinculadaCodigo}</Badge>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Previsão: <b>{fmtData(order.previsaoEntrega)}</b> ({order.diffDias === 0 ? 'Entrega Hoje!' : `em ${order.diffDias} dias`})
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-slate-100 text-sm">
                  {fmtMoeda(order.valorTotalCents)}
                </span>
                <Badge variant={order.status === 'emitido' ? 'warning' : 'success'}>
                  {order.status === 'emitido' ? 'Em Transporte' : 'Confirmado'}
                </Badge>
              </div>
            </div>
          ))}

          {pedidosChegando.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              Nenhum pedido de compra com entrega prevista para os próximos 30 dias.
            </div>
          )}
        </div>
      </div>


      {/* MODAL DE PRÉ-REQUISITOS & METODOLOGIA DAS MÉTRICAS */}
      <Modal
        isOpen={modalPreReqOpen}
        onClose={() => setModalPreReqOpen(false)}
        title="📋 Metodologia & Pré-Requisitos do Dashboard de Compras"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-slate-300 leading-relaxed">
            Todas as métricas deste dashboard são calculadas em <b>tempo real</b> com base nas tabelas do Supabase, sem dados estáticos.
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900 space-y-1">
              <span className="font-bold text-emerald-400 block">1. Itens Travando Produção</span>
              <p className="text-slate-400 text-[11px]">
                Cruza as Ordens de Produção em status <code>aguardando_material</code> / <code>planejada</code> com a estrutura de materiais da BOM e o saldo disponível em estoque.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900 space-y-1">
              <span className="font-bold text-emerald-400 block">2. Economia do Mês (Savings)</span>
              <p className="text-slate-400 text-[11px]">
                Calcula a diferença entre o maior preço cotado entre os fornecedores participantes e o preço vencedor fechado na cotação.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900 space-y-1">
              <span className="font-bold text-amber-400 block">3. Performance de Prazo (Pré-requisito Identificado)</span>
              <p className="text-slate-400 text-[11px]">
                Utiliza a data de recebimento do pedido comparada com o campo <code>previsaoEntrega</code>. O campo <code>dataEntregaReal</code> agora é registrado automaticamente no recebimento do pedido para refinamento contínuo do histórico.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setModalPreReqOpen(false)}>Fechar</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

