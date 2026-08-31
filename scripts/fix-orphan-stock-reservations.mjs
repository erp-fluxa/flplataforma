/**
 * SCRIPT DE CORREÇÃO PONTUAL (Aguardando Aprovação do Usuário)
 *
 * Finalidade:
 * 1. Identificar no backup de estado (system_backups / localStorage) reservas de estoque ativas
 *    cujas Ordens de Produção ou Pedidos de Venda de origem não existem mais (reservas órfãs).
 * 2. Remover essas reservas órfãs específicas, restaurando os saldos disponíveis ao seu estado real.
 * 3. Gravar log de auditoria no histórico da empresa.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qdakxhuonxsnukgkybym.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYWt4aHVvbnhzbnVrZ2t5YnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MjMyNjQsImV4cCI6MjEwMzA5OTI2NH0.qO_91gcFjsCd-BfZ2mvbThIqBxmbu2tKCwq3W4WWbjg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function executarCorrecaoSaldosCorrompidos() {
  console.log('Iniciando reconciliação e correção de saldos órfãos...')

  const { data: backups, error } = await supabase
    .from('system_backups')
    .select('id, versao, tipo, criado_em, dados')
    .order('criado_em', { ascending: false })
    .limit(1)

  if (error || !backups || backups.length === 0 || !backups[0]?.dados) {
    console.error('Nenhum backup encontrado para ajuste.')
    return
  }

  const db = backups[0].dados
  const activeOpIds = new Set((db.productionOrders || []).map((o) => o.id))
  const activePvIds = new Set((db.salesOrders || []).map((p) => p.id))

  const orfas = (db.stockReservations || []).filter((r) =>
    (r.productionOrderId && !activeOpIds.has(r.productionOrderId)) ||
    (r.salesOrderId && !activePvIds.has(r.salesOrderId))
  )

  console.log(`Reservas órfãs identificadas: ${orfas.length}`)
  orfas.forEach(r => {
    console.log(`- Removendo reserva órfã ID: ${r.id} (Produto: ${r.productId}, Qtd: ${r.quantidade})`)
  })

  const reservasCorrigidas = (db.stockReservations || []).filter((r) =>
    (!r.productionOrderId || activeOpIds.has(r.productionOrderId)) &&
    (!r.salesOrderId || activePvIds.has(r.salesOrderId))
  )

  const novoDb = {
    ...db,
    stockReservations: reservasCorrigidas,
    auditLogs: [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'CORRECTION_ORPHAN_STOCK_RESERVATIONS',
        actor: { id: 'admin', name: 'Administrador (Script de Correção)' },
        target: { tipo: 'ESTOQUE' },
        details: `Correção manual autorizada: ${orfas.length} reserva(s) órfã(s) removida(s), restaurando os saldos disponíveis.`
      },
      ...(db.auditLogs || [])
    ]
  }

  const { error: insErr } = await supabase.from('system_backups').insert([{
    versao: '2.0.0',
    dados: novoDb,
    tipo: 'manual_reconciliation'
  }])

  if (insErr) {
    console.error('Erro ao salvar correção:', insErr)
  } else {
    console.log('✔ Correção de saldos concluída e sincronizada com sucesso!')
  }
}
