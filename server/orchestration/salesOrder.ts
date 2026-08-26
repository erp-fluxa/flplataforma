import { criarOrdemProducao, cancelarOrdemProducao } from './productionOrder';

/**
 * Confirma Pedido de Venda e dispara a geração automática de OPs / Reservas
 */
export function confirmarPedidoVenda(
  db: any,
  salesOrderId: string,
  opts?: { agruparPorModelo?: boolean; userId?: string }
): any {
  const pv = (db.salesOrders || []).find((s: any) => s.id === salesOrderId);
  if (!pv) throw new Error('Pedido de Venda não encontrado.');

  const itens = (db.salesOrderItems || []).filter((it: any) => it.salesOrderId === salesOrderId);
  if (!itens.length) throw new Error('O Pedido de Venda precisa ter ao menos um item.');

  // Idempotência: Se já existem OPs geradas para o pedido, não duplica
  const opsExistentes = (db.productionOrders || []).filter((o: any) => o.salesOrderId === salesOrderId);
  if (opsExistentes.length > 0) {
    return { pv, ops: opsExistentes, jaConfirmado: true };
  }

  const opsGeradas: any[] = [];
  const nowStr = new Date().toISOString();

  for (const it of itens) {
    const prod = (db.products || []).find((p: any) => p.id === it.productId);
    if (!prod) continue;

    if (prod.produzivel) {
      // 1. Congela a versão de Ficha Técnica ativa
      const versaoAtiva = (db.bomVersions || []).find((v: any) => v.productId === prod.id && v.status === 'ativa');
      if (versaoAtiva) {
        it.bomVersionId = versaoAtiva.id;
      }

      // 2. Opção de Agrupamento de OPs
      if (opts?.agruparPorModelo === false && it.quantidade > 1000) {
        // Gera 1 OP por unidade física
        const totalUnidades = Math.round(it.quantidade / 1000);
        for (let i = 0; i < totalUnidades; i++) {
          const res = criarOrdemProducao(db, {
            salesOrderId: pv.id,
            salesOrderItemId: it.id,
            productId: prod.id,
            modeloMaquina: it.modeloMaquina || prod.descricao,
            quantidadeMilli: 1000,
            prioridade: 'normal',
            dataPrevistaFim: pv.dataEntregaPrometida,
            userId: opts?.userId
          });
          opsGeradas.push(res.op);
        }
      } else {
        // Gera 1 OP consolidada para o item
        const res = criarOrdemProducao(db, {
          salesOrderId: pv.id,
          salesOrderItemId: it.id,
          productId: prod.id,
          modeloMaquina: it.modeloMaquina || prod.descricao,
          quantidadeMilli: it.quantidade,
          prioridade: 'normal',
          dataPrevistaFim: pv.dataEntregaPrometida,
          userId: opts?.userId
        });
        opsGeradas.push(res.op);
      }
    } else {
      // Produto de revenda: reserva produto acabado
      if (!db.stockReservations) db.stockReservations = [];
      db.stockReservations.push({
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: prod.id,
        warehouseId: db.warehouses?.[0]?.id || 'wh-1',
        locationId: null,
        quantidade: it.quantidade,
        origemTipo: 'pedido_venda',
        origemId: pv.id,
        status: 'ativa',
        criadoEm: nowStr
      });
    }
  }

  pv.status = 'em_producao';
  return { pv, ops: opsGeradas, jaConfirmado: false };
}

/**
 * Cancelamento de Pedido de Venda com cascata em OPs e reservas
 */
export function cancelarPedidoVenda(
  db: any,
  salesOrderId: string,
  motivo?: string,
  userId?: string
): any {
  const pv = (db.salesOrders || []).find((s: any) => s.id === salesOrderId);
  if (!pv) throw new Error('Pedido de Venda não encontrado.');

  if (['faturado', 'entregue'].includes(pv.status)) {
    throw new Error('Não é possível cancelar um Pedido de Venda já faturado ou entregue.');
  }

  pv.status = 'cancelado';
  pv.observacoes = `${pv.observacoes || ''} [CANCELADO: ${motivo || 'Sem motivo registrado'}]`;

  // 1. Cancelar OPs vinculadas em cascata
  const ops = (db.productionOrders || []).filter((o: any) => o.salesOrderId === salesOrderId);
  for (const op of ops) {
    if (op.status !== 'concluida') {
      try {
        cancelarOrdemProducao(db, op.id, `Pedido de Venda ${pv.numero} cancelado`, userId);
      } catch (e) {}
    }
  }

  // 2. Liberar reservas de revenda vinculadas diretamente ao PV
  (db.stockReservations || []).forEach((r: any) => {
    if (r.origemTipo === 'pedido_venda' && r.origemId === salesOrderId && r.status === 'ativa') {
      r.status = 'liberada';
    }
  });

  return pv;
}
