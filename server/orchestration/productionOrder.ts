import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { getNextSequence } from '../db/index';
import { avaliarEstoqueMinimo } from './stockAlerts';

const DB_PATH = path.join(process.cwd(), 'data.db');

/**
 * Explosão Recursiva de Ficha Técnica (BOM Multinível) com Detecção de Ciclos
 */
export function explodirFichaTecnica(
  db: any,
  bomVersionId: string,
  quantidadeOPMilli: number,
  visitados: Set<string> = new Set(),
  profundidade: number = 0
): { componentProductId: string; quantidadeNecessariaMilli: number; operacaoId?: string; observacao?: string }[] {
  if (profundidade > 20) {
    throw new Error('Profundidade máxima de explosão da Ficha Técnica excedida. Verifique possíveis ciclos na estrutura.');
  }

  if (visitados.has(bomVersionId)) {
    throw new Error(`Ciclo recursivo detectado na Ficha Técnica (BOM Version ${bomVersionId}). A operação foi cancelada para proteger o sistema.`);
  }

  visitados.add(bomVersionId);

  const versao = (db.bomVersions || []).find((v: any) => v.id === bomVersionId);
  if (!versao) {
    return [];
  }

  const itens = (db.bomItems || []).filter((it: any) => it.bomVersionId === bomVersionId);
  const resultado: { componentProductId: string; quantidadeNecessariaMilli: number; operacaoId?: string; observacao?: string }[] = [];

  for (const it of itens) {
    // Quantidade com fator de perda: qtdUnit * (1 + perda/100) * qtdOP
    const perdaFator = 1 + ((it.perdaPercentual || 0) / 10000); // 500 = 5%
    const qtdItemTotalMilli = Math.round((it.quantidade * (quantidadeOPMilli / 1000)) * perdaFator);

    const compProd = (db.products || []).find((p: any) => p.id === it.componentProductId);

    // Se o componente for produzível e tiver BOM ativa própria -> sub-explosão
    if (compProd && compProd.produzivel) {
      const subVersaoAtiva = (db.bomVersions || []).find((v: any) => v.productId === compProd.id && v.status === 'ativa');
      if (subVersaoAtiva) {
        const subItens = explodirFichaTecnica(db, subVersaoAtiva.id, qtdItemTotalMilli, new Set(visitados), profundidade + 1);
        resultado.push(...subItens);
        continue;
      }
    }

    resultado.push({
      componentProductId: it.componentProductId,
      quantidadeNecessariaMilli: qtdItemTotalMilli,
      operacaoId: it.operacaoId,
      observacao: it.observacao
    });
  }

  return resultado;
}

/**
 * Criação e Orquestração de Ordem de Produção (OP)
 */
export function criarOrdemProducao(
  db: any,
  params: {
    salesOrderId?: string;
    salesOrderItemId?: string;
    productId: string;
    modeloMaquina?: string;
    quantidadeMilli: number;
    tipo?: 'normal' | 'retrabalho' | 'estoque';
    prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente';
    dataPrevistaInicio?: string;
    dataPrevistaFim?: string;
    responsavelId?: string;
    observacoes?: string;
    userId?: string;
  }
): any {
  const prod = (db.products || []).find((p: any) => p.id === params.productId);
  if (!prod) throw new Error('Produto da OP não encontrado.');

  // Localiza ou congela a Ficha Técnica ativa
  let bomVersionId = null;
  const versaoAtiva = (db.bomVersions || []).find((v: any) => v.productId === params.productId && v.status === 'ativa');
  if (versaoAtiva) {
    bomVersionId = versaoAtiva.id;
  }

  const prefix = db.company?.seqOpPrefix || 'OP-';
  let nextNum: number;
  try {
    const sqlite = new DatabaseSync(DB_PATH);
    nextNum = getNextSequence(sqlite, 'op');
    sqlite.close();
  } catch (e) {
    nextNum = (db.productionOrders || []).length + 1;
  }
  const opNumero = `${prefix}${String(nextNum).padStart(4, '0')}`;
  const opId = `op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowStr = new Date().toISOString();

  const novaOP = {
    id: opId,
    numero: opNumero,
    salesOrderId: params.salesOrderId || null,
    salesOrderItemId: params.salesOrderItemId || null,
    productId: params.productId,
    modeloMaquina: params.modeloMaquina || prod.descricao,
    bomVersionId,
    quantidade: params.quantidadeMilli,
    quantidadeProduzida: 0,
    quantidadeRefugo: 0,
    prioridade: params.prioridade || 'normal',
    dataPrevistaInicio: params.dataPrevistaInicio || nowStr.split('T')[0],
    dataPrevistaFim: params.dataPrevistaFim || null,
    dataInicioReal: null,
    dataFimReal: null,
    status: 'planejada',
    tipo: params.tipo || 'normal',
    ticketId: null,
    posicaoKanban: 0,
    responsavelId: params.responsavelId || null,
    observacoes: params.observacoes || '',
    criadoEm: nowStr
  };

  if (!db.productionOrders) db.productionOrders = [];
  db.productionOrders.push(novaOP);

  // Se não possui ficha técnica ativa, mantém em planejada com aviso
  if (!bomVersionId) {
    return { op: novaOP, materiais: [], faltas: [], osGerada: false, aviso: 'Ficha técnica não vinculada ou inexistente.' };
  }

  // 1. Explode materiais da BOM
  const materiaisExplodidos = explodirFichaTecnica(db, bomVersionId, params.quantidadeMilli);
  let temFalta = false;
  const listaFaltas: any[] = [];
  const materiaisGravados: any[] = [];

  if (!db.productionOrderMaterials) db.productionOrderMaterials = [];
  if (!db.stockReservations) db.stockReservations = [];

  for (const mat of materiaisExplodidos) {
    const matProdId = mat.componentProductId;
    const qtdNecessaria = mat.quantidadeNecessariaMilli;

    // Calcula saldo disponível real
    const saldoFisico = (db.stockBalances || [])
      .filter((b: any) => b.productId === matProdId)
      .reduce((acc: number, b: any) => acc + (b.quantidade || 0), 0);

    const reservadoAtivo = (db.stockReservations || [])
      .filter((r: any) => r.productId === matProdId && r.status === 'ativa')
      .reduce((acc: number, r: any) => acc + (r.quantidade || 0), 0);

    const disponivel = Math.max(0, saldoFisico - reservadoAtivo);

    let qtdReservar = 0;
    let qtdFalta = 0;

    if (disponivel >= qtdNecessaria) {
      qtdReservar = qtdNecessaria;
      qtdFalta = 0;
    } else {
      qtdReservar = disponivel;
      qtdFalta = qtdNecessaria - disponivel;
      temFalta = true;
    }

    // Cria Reserva de Estoque para o saldo disponível
    if (qtdReservar > 0) {
      db.stockReservations.push({
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: matProdId,
        warehouseId: db.warehouses?.[0]?.id || 'wh-1',
        locationId: null,
        quantidade: qtdReservar,
        origemTipo: 'ordem_producao',
        origemId: opId,
        status: 'ativa',
        criadoEm: nowStr
      });

      // Avalia alerta pós-reserva (redução de disponível)
      try {
        avaliarEstoqueMinimo(db, matProdId, { origemTipo: 'reserva', origemId: opId, userId: params.userId });
      } catch (e) {}
    }

    const opMat = {
      id: `opmat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productionOrderId: opId,
      componentProductId: matProdId,
      quantidadeNecessaria: qtdNecessaria,
      quantidadeReservada: qtdReservar,
      quantidadeSeparada: 0,
      quantidadeConsumida: 0,
      quantidadeDevolvida: 0,
      faltaQuantidade: qtdFalta,
      requisitionId: null
    };

    db.productionOrderMaterials.push(opMat);
    materiaisGravados.push(opMat);

    if (qtdFalta > 0) {
      listaFaltas.push({ componentProductId: matProdId, faltaQuantidade: qtdFalta, opMatId: opMat.id });
    }
  }

  // 2. Define status e gera OS ou Requisição de Falta
  let osGerada = false;
  if (temFalta) {
    novaOP.status = 'aguardando_material';
    gerarRequisicaoDeFalta(db, novaOP, listaFaltas, params.userId);
  } else {
    novaOP.status = 'material_reservado';
    gerarOSSeparacao(db, novaOP);
    osGerada = true;
  }

  return { op: novaOP, materiais: materiaisGravados, faltas: listaFaltas, osGerada };
}

/**
 * Gera Requisição de Compra Unificada para componentes em falta
 */
export function gerarRequisicaoDeFalta(db: any, op: any, faltas: any[], userId?: string): any {
  if (!faltas.length) return null;

  const prefix = db.company?.seqReqPrefix || 'REQ-';
  const nextNum = (db.requisitions || []).length + 1;
  const reqNumero = `${prefix}${String(nextNum).padStart(4, '0')}`;
  const reqId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowStr = new Date().toISOString();

  const novaReq = {
    id: reqId,
    numero: reqNumero,
    solicitante: 'PCP / Planejamento Automático',
    setor: 'Produção',
    centroCusto: 'Fábrica',
    prioridade: op.prioridade || 'alta',
    dataNecessidade: op.dataPrevistaInicio || null,
    justificativa: `Falta de material para ${op.numero} (${op.modeloMaquina})`,
    status: 'aprovada', // Já entra aprovada para cotação imediata
    motivoReprovacao: null,
    criadoEm: nowStr
  };

  if (!db.requisitions) db.requisitions = [];
  if (!db.requisitionItems) db.requisitionItems = [];

  db.requisitions.push(novaReq);

  for (const f of faltas) {
    const prod = (db.products || []).find((p: any) => p.id === f.componentProductId);
    const reqItId = `reqit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    db.requisitionItems.push({
      id: reqItId,
      requisitionId: reqId,
      productId: f.componentProductId,
      descricao: prod ? prod.descricao : 'Insumo 3D',
      unidade: prod ? prod.unidade : 'UN',
      quantidade: f.faltaQuantidade,
      observacao: `Demanda vinculada à ${op.numero}`
    });

    // Vincula na OP Material
    const opMat = (db.productionOrderMaterials || []).find((m: any) => m.id === f.opMatId);
    if (opMat) opMat.requisitionId = reqId;
  }

  return novaReq;
}

/**
 * Gera OS de Separação (Picking) ordenada pela rota física
 */
export function gerarOSSeparacao(db: any, op: any): any {
  const prefix = db.company?.seqOsPrefix || 'OS-';
  const nextNum = (db.pickingOrders || []).length + 1;
  const osNumero = `${prefix}${String(nextNum).padStart(4, '0')}`;
  const osId = `os-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowStr = new Date().toISOString();

  const novaOS = {
    id: osId,
    numero: osNumero,
    productionOrderId: op.id,
    status: 'aberta',
    responsavelId: null,
    iniciadoEm: null,
    concluidoEm: null,
    observacoes: `Separação para ${op.numero} - ${op.modeloMaquina}`
  };

  if (!db.pickingOrders) db.pickingOrders = [];
  if (!db.pickingItems) db.pickingItems = [];

  db.pickingOrders.push(novaOS);

  // Itens da OS
  const mats = (db.productionOrderMaterials || []).filter((m: any) => m.productionOrderId === op.id);

  for (const m of mats) {
    const loc = (db.locations || []).find((l: any) => l.warehouseId === db.warehouses?.[0]?.id);

    db.pickingItems.push({
      id: `pkit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pickingOrderId: osId,
      productionOrderMaterialId: m.id,
      componentProductId: m.componentProductId,
      warehouseId: db.warehouses?.[0]?.id || 'wh-1',
      locationId: loc ? loc.id : null,
      quantidadeSolicitada: m.quantidadeReservada || m.quantidadeNecessaria,
      quantidadeSeparada: 0,
      loteId: null,
      status: 'pendente',
      observacao: ''
    });
  }

  op.status = 'separacao_pendente';
  return novaOS;
}

/**
 * Confirmação de Separação de Materiais (Baixa Efetiva do Estoque)
 */
export function confirmarSeparacao(
  db: any,
  pickingOrderId: string,
  itensSeparados: { pickingItemId: string; quantidadeSeparadaMilli: number; status?: string }[],
  userId?: string
): any {
  const os = (db.pickingOrders || []).find((o: any) => o.id === pickingOrderId);
  if (!os) throw new Error('OS de separação não encontrada.');

  const op = (db.productionOrders || []).find((o: any) => o.id === os.productionOrderId);
  const nowStr = new Date().toISOString();

  let tudoSeparado = true;

  if (!db.stockMovements) db.stockMovements = [];

  for (const item of itensSeparados) {
    const pkIt = (db.pickingItems || []).find((i: any) => i.id === item.pickingItemId);
    if (!pkIt) continue;

    pkIt.quantidadeSeparada = item.quantidadeSeparadaMilli;
    pkIt.status = item.status || (item.quantidadeSeparadaMilli >= pkIt.quantidadeSolicitada ? 'separado' : 'parcial');

    if (pkIt.quantidadeSeparada < pkIt.quantidadeSolicitada) {
      tudoSeparado = false;
    }

    // 1. Gera Saída Efetiva no Livro-Razão (stock_movements)
    if (item.quantidadeSeparadaMilli > 0) {
      db.stockMovements.push({
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: pkIt.componentProductId,
        warehouseId: pkIt.warehouseId,
        locationId: pkIt.locationId || null,
        tipo: 'saida_producao',
        quantidade: item.quantidadeSeparadaMilli,
        sinal: -1,
        custoUnitario: 0,
        origemTipo: 'ordem_producao',
        origemId: op ? op.id : null,
        userId: userId || null,
        observacao: `Baixa física para ${op ? op.numero : 'Produção'}`,
        criadoEm: nowStr
      });

      // 2. Atualiza Saldo Físico em cache (stock_balances)
      const balance = (db.stockBalances || []).find((b: any) => b.productId === pkIt.componentProductId && b.warehouseId === pkIt.warehouseId);
      if (balance) {
        balance.quantidade = Math.max(0, (balance.quantidade || 0) - item.quantidadeSeparadaMilli);
      }

      // 3. Consome a Reserva
      const res = (db.stockReservations || []).find((r: any) => r.productId === pkIt.componentProductId && r.origemId === (op ? op.id : '') && r.status === 'ativa');
      if (res) {
        res.status = 'consumida';
      }

      // 4. Avalia Estoque Mínimo pós-baixa física
      try {
        avaliarEstoqueMinimo(db, pkIt.componentProductId, { origemTipo: 'movimentacao', userId });
      } catch (e) {}
    }
  }

  if (tudoSeparado) {
    os.status = 'separada';
    os.concluidoEm = nowStr;
    if (op) op.status = 'liberada';
  } else {
    os.status = 'parcial';
    if (op) op.status = 'separacao_pendente';
  }

  return { os, op, tudoSeparado };
}

/**
 * Conclusão da Ordem de Produção com entrada do produto acabado
 */
export function concluirOrdemProducao(
  db: any,
  opId: string,
  numeroSerie?: string,
  userId?: string
): any {
  const op = (db.productionOrders || []).find((o: any) => o.id === opId);
  if (!op) throw new Error('OP não encontrada.');

  const nowStr = new Date().toISOString();
  op.status = 'concluida';
  op.dataFimReal = nowStr;
  op.quantidadeProduzida = op.quantidade;

  // Entrada de Produto Acabado no Estoque (stock_movements)
  const whAcabado = (db.warehouses || []).find((w: any) => w.tipo === 'produto_acabado') || db.warehouses?.[0];

  if (!db.stockMovements) db.stockMovements = [];
  db.stockMovements.push({
    id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    productId: op.productId,
    warehouseId: whAcabado ? whAcabado.id : 'wh-1',
    locationId: null,
    tipo: 'entrada_producao',
    quantidade: op.quantidade,
    sinal: 1,
    custoUnitario: 0,
    origemTipo: 'ordem_producao',
    origemId: op.id,
    numeroSerie: numeroSerie || null,
    userId: userId || null,
    observacao: `Entrada de produção concluída da ${op.numero}`,
    criadoEm: nowStr
  });

  // Atualiza cache de saldo
  const balance = (db.stockBalances || []).find((b: any) => b.productId === op.productId && b.warehouseId === (whAcabado ? whAcabado.id : 'wh-1'));
  if (balance) {
    balance.quantidade = (balance.quantidade || 0) + op.quantidade;
  } else {
    if (!db.stockBalances) db.stockBalances = [];
    db.stockBalances.push({
      id: `bal-${Date.now()}`,
      productId: op.productId,
      warehouseId: whAcabado ? whAcabado.id : 'wh-1',
      locationId: null,
      quantidade: op.quantidade,
      custoMedio: 0
    });
  }

  // Se a OP está vinculada a um Pedido de Venda -> atualiza PV
  if (op.salesOrderId) {
    const pv = (db.salesOrders || []).find((s: any) => s.id === op.salesOrderId);
    if (pv) {
      const item = (db.salesOrderItems || []).find((it: any) => it.id === op.salesOrderItemId);
      if (item) {
        item.quantidadeProduzida = (item.quantidadeProduzida || 0) + op.quantidade;
      }
      pv.status = 'pronto_expedicao';
    }
  }

  return op;
}

/**
 * Cancelamento de Ordem de Produção com liberação atômica de reservas e cancelamento de OS
 */
export function cancelarOrdemProducao(
  db: any,
  opId: string,
  motivo?: string,
  userId?: string
): any {
  const op = (db.productionOrders || []).find((o: any) => o.id === opId);
  if (!op) throw new Error('Ordem de Produção não encontrada.');

  if (op.status === 'concluida') {
    throw new Error('Não é possível cancelar uma Ordem de Produção já concluída.');
  }

  const nowStr = new Date().toISOString();
  op.status = 'cancelada';
  op.observacoes = `${op.observacoes || ''} [CANCELADA: ${motivo || 'Sem motivo registrado'}]`;

  // 1. Varrer e liberar todas as reservas ativas da OP
  const reservasAfetadas: string[] = [];
  (db.stockReservations || []).forEach((r: any) => {
    if (r.origemId === opId && r.status === 'ativa') {
      r.status = 'liberada';
      if (!reservasAfetadas.includes(r.productId)) {
        reservasAfetadas.push(r.productId);
      }
    }
  });

  // 2. Cancelar OS de separação vinculadas
  (db.pickingOrders || []).forEach((os: any) => {
    if (os.productionOrderId === opId && os.status !== 'concluida') {
      os.status = 'cancelada';
    }
  });

  // 3. Reavaliar níveis de estoque mínimo para os produtos cujas reservas foram liberadas
  for (const pid of reservasAfetadas) {
    try {
      avaliarEstoqueMinimo(db, pid, { origemTipo: 'manual', origemId: opId, userId });
    } catch (e) {}
  }

  return op;
}
