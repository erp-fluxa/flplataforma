import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qdakxhuonxsnukgkybym.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYWt4aHVvbnhzbnVrZ2t5YnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MjMyNjQsImV4cCI6MjEwMzA5OTI2NH0.qO_91gcFjsCd-BfZ2mvbThIqBxmbu2tKCwq3W4WWbjg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function inspectStock() {
  console.log('=== INSPEÇÃO DE SALDOS E DADOS DE ESTOQUE ===\n')

  try {
    const { data: backups, error: bErr } = await supabase
      .from('system_backups')
      .select('id, versao, tipo, criado_em, dados')
      .order('criado_em', { ascending: false })
      .limit(1)

    if (bErr) {
      console.error('[Backup Error]', bErr)
    }

    if (backups && backups.length > 0 && backups[0]?.dados) {
      const db = backups[0].dados
      console.log(`[Backup Cloud] Versão: ${backups[0].versao}, Criado em: ${backups[0].criado_em}`)
      console.log(`- Total Produtos: ${db.products?.length || 0}`)
      console.log(`- Total Vendas: ${db.salesOrders?.length || 0}`)
      console.log(`- Total OPs: ${db.productionOrders?.length || 0}`)
      console.log(`- Total Saldos em StockBalances: ${db.stockBalances?.length || 0}`)
      console.log(`- Total Movimentações: ${db.stockMovements?.length || 0}`)
      console.log(`- Total Reservas: ${db.stockReservations?.length || 0}`)

      console.log('\n--- Análise de Produtos com Saldo Físico ou Disponível Negativo ---')
      let encontrouProblema = false

      const activeReservations = (db.stockReservations || []).filter((r) => r.status === 'ativa')
      const activeOpIds = new Set((db.productionOrders || []).map((o) => o.id))
      const activePvIds = new Set((db.salesOrders || []).map((p) => p.id))

      const orfanReservations = activeReservations.filter((r) =>
        (r.productionOrderId && !activeOpIds.has(r.productionOrderId)) ||
        (r.salesOrderId && !activePvIds.has(r.salesOrderId))
      )

      if (orfanReservations.length > 0) {
        encontrouProblema = true
        console.log(`⚠️ ENCONTRADAS ${orfanReservations.length} RESERVAS ÓRFÃS (de Vendas/OPs excluídas mas não estornadas):`)
        orfanReservations.forEach((r) => {
          const prod = (db.products || []).find((p) => p.id === r.productId)
          console.log(`  - Reserva ID: ${r.id} | Produto: [${prod?.codigo || r.productId}] ${prod?.descricao || ''} | Qtd Reservada: ${r.quantidade} | OP Origem: ${r.productionOrderId} | PV Origem: ${r.salesOrderId}`)
        })
      } else {
        console.log('Nenhuma reserva órfã encontrada no backup cloud.')
      }

      (db.products || []).forEach((prod) => {
        const bal = (db.stockBalances || []).find((b) => b.productId === prod.id)
        const saldoFisico = bal?.quantidade || 0
        const reservado = activeReservations
          .filter((r) => r.productId === prod.id)
          .reduce((sum, r) => sum + Number(r.quantidade || 0), 0)
        const disponivel = saldoFisico - reservado

        if (saldoFisico < 0 || disponivel < 0 || reservado > 0) {
          encontrouProblema = true
          console.log(`- Produto [${prod.codigo}] ${prod.descricao}:`)
          console.log(`    Físico: ${saldoFisico} | Reservado: ${reservado} | Disponível Líquido: ${disponivel} ${disponivel < 0 ? '❌ (NEGATIVO / DÉFICIT)' : ''}`)
        }
      })

      if (!encontrouProblema) {
        console.log('Nenhum saldo negativo no backup cloud no momento.')
      }
    } else {
      console.log('Nenhum backup encontrado na tabela system_backups.')
    }
  } catch (err) {
    console.error('[Exception]', err)
  }
}

inspectStock().catch(console.error)
