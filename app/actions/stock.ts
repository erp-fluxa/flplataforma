'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface StockMovementPayload {
  product_id: string
  warehouse_id: string
  location_id?: string | null
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  custo_unitario?: number
  observacao?: string
}

export async function createStockMovement(payload: StockMovementPayload) {
  try {
    const supabase = createClient()
    const sinal = payload.tipo === 'saida' ? -1 : 1
    const qtdFinal = Math.abs(payload.quantidade)

    // 1. Inserir no KARDEX
    const { error: movError } = await (supabase as any)
      .from('stock_movements')
      .insert({
        id: 'mov-' + Math.random().toString(36).substring(2, 9),
        product_id: payload.product_id,
        warehouse_id: payload.warehouse_id,
        location_id: payload.location_id || null,
        tipo: payload.tipo,
        quantidade: qtdFinal,
        sinal,
        custo_unitario: payload.custo_unitario || 0,
        usuario_nome: 'Admin',
        observacao: payload.observacao || null
      })

    if (movError) {
      return { success: false, error: movError.message }
    }

    // 2. Buscar saldo existente
    const { data: balance } = await (supabase as any)
      .from('stock_balances')
      .select('id, quantidade')
      .eq('product_id', payload.product_id)
      .eq('warehouse_id', payload.warehouse_id)
      .maybeSingle()

    if (balance) {
      const novaQtd = Math.max(0, Number(balance.quantidade || 0) + (qtdFinal * sinal))
      await (supabase as any)
        .from('stock_balances')
        .update({
          quantidade: novaQtd,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', balance.id)
    } else {
      await (supabase as any)
        .from('stock_balances')
        .insert({
          id: 'bal-' + Math.random().toString(36).substring(2, 9),
          product_id: payload.product_id,
          warehouse_id: payload.warehouse_id,
          quantidade: Math.max(0, qtdFinal * (sinal === -1 ? 0 : 1)),
          atualizado_em: new Date().toISOString()
        })
    }

    revalidatePath('/estoque')
    revalidatePath('/produtos')
    revalidatePath('/')

    return { success: true }
  } catch (err: any) {
    console.error('[createStockMovement Error]', err)
    return { success: false, error: err.message || 'Falha ao movimentar estoque' }
  }
}
