// server/orchestration/stockAlerts.ts — Serviço de Alertas de Estoque Mínimo (PARTE 6)
// Idempotente, pós-commit e com suporte a histerese de resolução (5%)

import { nivelEstoque, StockSeverityLevel } from '../../shared/flow';

export interface StockAlertContext {
  origemTipo: 'movimentacao' | 'reserva' | 'inventario' | 'varredura_diaria' | 'manual';
  origemId?: string;
  userId?: string;
  percentualHisterese?: number; // Padrão: 5%
}

export interface StockEvaluationResult {
  productId: string;
  saldoFisico: number;
  reservadoAtivo: number;
  disponivel: number;
  estoqueMinimo: number;
  pontoReposicao: number;
  nivel: StockSeverityLevel;
  acaoTomada: 'criado' | 'escalado' | 'reduzido' | 'resolvido' | 'mantido' | 'ignorado';
  alertId?: string;
  notificacaoEnviada: boolean;
}

/**
 * Avalia o nível de estoque mínimo de um produto com base no DISPONÍVEL.
 * Idempotente e executado pós-commit.
 */
export function avaliarEstoqueMinimo(
  db: any,
  productId: string,
  contexto: StockAlertContext
): StockEvaluationResult {
  const p = db.products.find((prod: any) => prod.id === productId);
  if (!p) {
    throw new Error(`Produto ${productId} não encontrado.`);
  }

  const estoqueMinimo = p.estoqueMinimo || 0;
  const pontoReposicao = p.pontoReposicao || (estoqueMinimo + (p.consumoMedioDiario || 0) * (p.leadTimeCompraDias || 5));

  // 1. Calcula Saldo Físico nos depósitos válidos (ignora refugo e terceiros)
  const depositosValidos = (db.warehouses || [])
    .filter((w: any) => w.ativo !== false && w.tipo !== 'refugo' && w.tipo !== 'terceiros')
    .map((w: any) => w.id);

  let saldoFisico = 0;
  (db.stockBalances || []).forEach((b: any) => {
    if (b.productId === productId && (depositosValidos.length === 0 || depositosValidos.includes(b.warehouseId))) {
      saldoFisico += (b.quantidade || 0);
    }
  });

  // 2. Calcula Reservas Ativas
  let reservadoAtivo = 0;
  (db.stockReservations || []).forEach((r: any) => {
    if (r.productId === productId && r.status === 'ativa') {
      reservadoAtivo += (r.quantidade || 0);
    }
  });

  // Disponível Real
  const disponivel = saldoFisico - reservadoAtivo;

  // 3. Busca alerta aberto existente para o produto
  const alertaAberto = (db.stockAlerts || []).find((a: any) =>
    a.productId === productId && ['aberto', 'reconhecido', 'em_reposicao', 'silenciado'].includes(a.status)
  );

  const percentualHisterese = contexto.percentualHisterese ?? db.company?.percentualHistereseResolucao ?? 5;

  // 4. Avalia Nível via função pura com histerese
  const avaliacao = nivelEstoque(disponivel, estoqueMinimo, pontoReposicao, {
    percentualHisterese,
    nivelAtual: alertaAberto ? alertaAberto.nivel : null
  });

  let acaoTomada: 'criado' | 'escalado' | 'reduzido' | 'resolvido' | 'mantido' | 'ignorado' = 'mantido';
  let notificacaoEnviada = false;
  const nowStr = new Date().toISOString();

  // Verifica se o produto tem alerta ativo e se não está silenciado no momento
  const alertasGlobaisAtivos = db.company?.alertasAtivos !== false;
  const itemAlertaAtivo = p.alertaEstoqueAtivo !== false && alertasGlobaisAtivos;
  const estaSilenciado = alertaAberto && alertaAberto.silenciadoAte && new Date(alertaAberto.silenciadoAte) > new Date();

  const severidadeOrdem: Record<string, number> = { ok: 0, atencao: 1, critico: 2, zerado: 3 };

  if (avaliacao.emAlerta) {
    if (!alertaAberto) {
      // Cria NOVO alerta
      const newAlertId = `alt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const novoAlerta = {
        id: newAlertId,
        productId,
        nivel: avaliacao.nivel,
        disponivelNoDisparo: disponivel,
        estoqueMinimoNoDisparo: estoqueMinimo,
        pontoReposicaoNoDisparo: pontoReposicao,
        origemTipo: contexto.origemTipo,
        origemId: contexto.origemId || null,
        status: 'aberto',
        reconhecidoPor: null,
        reconhecidoEm: null,
        silenciadoAte: null,
        requisitionId: null,
        productionOrderId: null,
        resolvidoEm: null,
        resolvidoPorque: null,
        criadoEm: nowStr,
        atualizadoEm: nowStr
      };

      if (!db.stockAlerts) db.stockAlerts = [];
      db.stockAlerts.push(novoAlerta);

      // Evento de abertura (append-only)
      if (!db.stockAlertEvents) db.stockAlertEvents = [];
      db.stockAlertEvents.push({
        id: `altev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        alertId: newAlertId,
        tipo: 'aberto',
        nivelAnterior: null,
        nivelNovo: avaliacao.nivel,
        disponivel,
        userId: contexto.userId || null,
        detalhes: { motivo: `Disponível (${disponivel}) atingiu nível ${avaliacao.nivel}` },
        criadoEm: nowStr
      });

      acaoTomada = 'criado';

      if (itemAlertaAtivo && !estaSilenciado) {
        criarNotificacao(db, {
          tipo: 'alerta_estoque',
          titulo: `Estoque ${avaliacao.nivel === 'zerado' ? 'ZERADO' : avaliacao.nivel.toUpperCase()}: ${p.descricao}`,
          mensagem: `Disponível ${disponivel / 1000} ${p.unidade || 'UN'}, mínimo ${estoqueMinimo / 1000} ${p.unidade || 'UN'}.`,
          documentoTipo: 'product',
          documentoId: productId,
          responsavelId: p.alertaResponsavelId
        });
        notificacaoEnviada = true;
      }
    } else {
      // Alerta já existe: verificar se escalou ou reduziu
      const nivelAntigoNum = severidadeOrdem[alertaAberto.nivel] || 0;
      const nivelNovoNum = severidadeOrdem[avaliacao.nivel] || 0;

      if (nivelNovoNum > nivelAntigoNum) {
        // Escalou severidade
        const nivelAnterior = alertaAberto.nivel;
        alertaAberto.nivel = avaliacao.nivel;
        alertaAberto.atualizadoEm = nowStr;

        if (!db.stockAlertEvents) db.stockAlertEvents = [];
        db.stockAlertEvents.push({
          id: `altev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          alertId: alertaAberto.id,
          tipo: 'escalou',
          nivelAnterior,
          nivelNovo: avaliacao.nivel,
          disponivel,
          userId: contexto.userId || null,
          detalhes: { motivo: `Escalada de severidade: ${nivelAnterior} -> ${avaliacao.nivel}` },
          criadoEm: nowStr
        });

        acaoTomada = 'escalado';

        if (itemAlertaAtivo && !estaSilenciado) {
          criarNotificacao(db, {
            tipo: 'alerta_estoque',
            titulo: `Agravamento de Estoque (${avaliacao.nivel.toUpperCase()}): ${p.descricao}`,
            mensagem: `Saldo disponível caiu para ${disponivel / 1000} ${p.unidade || 'UN'}.`,
            documentoTipo: 'product',
            documentoId: productId,
            responsavelId: p.alertaResponsavelId
          });
          notificacaoEnviada = true;
        }
      } else if (nivelNovoNum < nivelAntigoNum) {
        // Reduziu severidade
        const nivelAnterior = alertaAberto.nivel;
        alertaAberto.nivel = avaliacao.nivel;
        alertaAberto.atualizadoEm = nowStr;

        if (!db.stockAlertEvents) db.stockAlertEvents = [];
        db.stockAlertEvents.push({
          id: `altev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          alertId: alertaAberto.id,
          tipo: 'reduziu',
          nivelAnterior,
          nivelNovo: avaliacao.nivel,
          disponivel,
          userId: contexto.userId || null,
          detalhes: { motivo: `Redução de severidade: ${nivelAnterior} -> ${avaliacao.nivel}` },
          criadoEm: nowStr
        });

        acaoTomada = 'reduzido';
      }
    }
  } else {
    // Nível OK: se havia alerta aberto, resolve com histerese
    if (alertaAberto) {
      alertaAberto.status = 'resolvido';
      alertaAberto.resolvidoEm = nowStr;
      alertaAberto.resolvidoPorque = 'reposicao';
      alertaAberto.atualizadoEm = nowStr;

      if (!db.stockAlertEvents) db.stockAlertEvents = [];
      db.stockAlertEvents.push({
        id: `altev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        alertId: alertaAberto.id,
        tipo: 'resolvido',
        nivelAnterior: alertaAberto.nivel,
        nivelNovo: 'ok',
        disponivel,
        userId: contexto.userId || null,
        detalhes: { motivo: `Resolvido automaticamente por reposição acima do limiar com histerese` },
        criadoEm: nowStr
      });

      acaoTomada = 'resolvido';
    }
  }

  return {
    productId,
    saldoFisico,
    reservadoAtivo,
    disponivel,
    estoqueMinimo,
    pontoReposicao,
    nivel: avaliacao.nivel,
    acaoTomada,
    alertId: alertaAberto ? alertaAberto.id : undefined,
    notificacaoEnviada
  };
}

/**
 * Avaliação em lote sem N+1
 */
export function avaliarEstoqueMinimoEmLote(
  db: any,
  productIds: string[],
  contexto: StockAlertContext
): StockEvaluationResult[] {
  return productIds.map(pid => avaliarEstoqueMinimo(db, pid, contexto));
}

/**
 * Criação de notificação in-app
 */
function criarNotificacao(
  db: any,
  opts: {
    tipo: string;
    titulo: string;
    mensagem: string;
    documentoTipo?: string;
    documentoId?: string;
    responsavelId?: string;
  }
) {
  if (!db.notifications) db.notifications = [];
  const notif = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId: opts.responsavelId || null,
    tipo: opts.tipo,
    titulo: opts.titulo,
    mensagem: opts.mensagem,
    documentoTipo: opts.documentoTipo || 'product',
    documentoId: opts.documentoId || null,
    lidaEm: null,
    criadoEm: new Date().toISOString()
  };
  db.notifications.unshift(notif);
}
