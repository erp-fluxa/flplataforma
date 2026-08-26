// server/orchestration/procurementCycle.ts — Fechamento do Ciclo de Compras, Entrada Física e Liberação de OPs

import { avaliarEstoqueMinimo } from './stockAlerts';
import { gerarOSSeparacao } from './productionOrder';

/**
 * Recebimento de Pedido de Compra e Atendimento Automático de Faltas em OPs
 */
export function receberPedidoCompra(
  db: any,
  orderId: string,
  itensRecebidos: { orderItemId: string; quantidadeRecebidaMilli: number; emQuarentena?: boolean }[],
  userId?: string
): any {
  const ord = (db.orders || []).find((o: any) => o.id === orderId);
  if (!ord) throw new Error('Pedido de compra não encontrado.');

  const nowStr = new Date().toISOString();
  if (!db.stockMovements) db.stockMovements = [];
  if (!db.stockBalances) db.stockBalances = [];
  if (!db.stockReservations) db.stockReservations = [];

  const produtosAfetados: string[] = [];

  for (const rec of itensRecebidos) {
    const oIt = (db.orderItems || []).find((i: any) => i.id === rec.orderItemId);
    if (!oIt) continue;

    const qtdMilli = rec.quantidadeRecebidaMilli;
    oIt.quantidadeRecebida = (oIt.quantidadeRecebida || 0) + qtdMilli;

    // Localiza produto correspondente com validação estrita
    let prod = (db.products || []).find((p: any) => p.id === oIt.productId || p.descricao.toLowerCase() === oIt.descricao.toLowerCase());
    if (!prod) {
      throw new Error(`O item '${oIt.descricao}' não possui produto correspondente cadastrado no sistema. Vincule um produto válido antes do recebimento.`);
    }

    const prodId = prod.id;
    if (!produtosAfetados.includes(prodId)) produtosAfetados.push(prodId);

    // Identifica depósito (Quarentena IQC ou Almoxarifado Matéria-Prima)
    const whQuarentena = (db.warehouses || []).find((w: any) => w.tipo === 'quarentena');
    const whDestinoId = rec.emQuarentena && whQuarentena ? whQuarentena.id : (db.warehouses?.[0]?.id || 'wh-1');

    // 1. Gera Movimentação de Entrada no Livro-Razão (stock_movements)
    db.stockMovements.push({
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: prodId,
      warehouseId: whDestinoId,
      locationId: null,
      tipo: 'entrada_compra',
      quantidade: qtdMilli,
      sinal: 1,
      custoUnitario: oIt.precoUnitario || 0,
      origemTipo: 'pedido_compra',
      origemId: ord.id,
      userId: userId || null,
      observacao: `Recebimento NF Pedido ${ord.numero}${rec.emQuarentena ? ' [EM QUARENTENA IQC]' : ''}`,
      criadoEm: nowStr
    });

    // 2. Atualiza Saldo Físico em cache (stock_balances)
    const balance = db.stockBalances.find((b: any) => b.productId === prodId && b.warehouseId === whDestinoId);
    if (balance) {
      balance.quantidade = (balance.quantidade || 0) + qtdMilli;
    } else {
      db.stockBalances.push({
        id: `bal-${Date.now()}`,
        productId: prodId,
        warehouseId: whDestinoId,
        locationId: null,
        quantidade: qtdMilli,
        custoMedio: oIt.precoUnitario || 0
      });
    }

    // Se o item entrou em quarentena, não aloca imediatamente nas OPs até liberação IQC
    if (rec.emQuarentena) continue;

    // 3. Atendimento de Faltas Pendentes em OPs (Ordenadas por prioridade)
    let saldoDisponivelAlocar = qtdMilli;
    const prioridadePeso: Record<string, number> = { urgente: 4, alta: 3, normal: 2, baixa: 1 };

    const opsAguardando = (db.productionOrders || [])
      .filter((o: any) => o.status === 'aguardando_material')
      .sort((a: any, b: any) => {
        const pesoDiff = (prioridadePeso[b.prioridade] || 2) - (prioridadePeso[a.prioridade] || 2);
        if (pesoDiff !== 0) return pesoDiff;
        return new Date(a.dataPrevistaInicio || 0).getTime() - new Date(b.dataPrevistaInicio || 0).getTime();
      });

    for (const op of opsAguardando) {
      if (saldoDisponivelAlocar <= 0) break;

      const opMat = (db.productionOrderMaterials || []).find((m: any) => m.productionOrderId === op.id && m.componentProductId === prodId && m.faltaQuantidade > 0);
      if (opMat) {
        const alocar = Math.min(saldoDisponivelAlocar, opMat.faltaQuantidade);
        opMat.faltaQuantidade -= alocar;
        opMat.quantidadeReservada = (opMat.quantidadeReservada || 0) + alocar;
        saldoDisponivelAlocar -= alocar;

        // Cria reserva
        db.stockReservations.push({
          id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: prodId,
          warehouseId: whDestinoId,
          locationId: null,
          quantidade: alocar,
          origemTipo: 'ordem_producao',
          origemId: op.id,
          status: 'ativa',
          criadoEm: nowStr
        });

        // Verifica se todas as faltas da OP foram supridas
        const todasFaltas = (db.productionOrderMaterials || []).filter((m: any) => m.productionOrderId === op.id);
        const aindaTemFalta = todasFaltas.some((m: any) => m.faltaQuantidade > 0);

        if (!aindaTemFalta) {
          op.status = 'material_reservado';
          gerarOSSeparacao(db, op);
        }
      }
    }
  }

  ord.status = 'recebido';

  // 4. Avalia Estoque Mínimo pós-recebimento para todos os produtos afetados
  for (const pid of produtosAfetados) {
    try {
      avaliarEstoqueMinimo(db, pid, { origemTipo: 'movimentacao', origemId: ord.id, userId });
    } catch (e) {}
  }

  return ord;
}
