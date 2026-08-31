'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateOpPayload {
  product_id: string
  quantidade: number
  prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente'
  data_prevista_fim?: string
  observacoes?: string
}

export async function createProductionOrder(payload: CreateOpPayload) {
  try {
    const supabase = createClient()
    const opId = 'op-' + Math.random().toString(36).substring(2, 9)
    const numero = 'OP-' + Math.floor(1000 + Math.random() * 9000)

    // 1. Criar Ordem de Produção
    const { error: opErr } = await (supabase as any)
      .from('production_orders')
      .insert({
        id: opId,
        company_id: 'comp-1',
        numero,
        product_id: payload.product_id,
        quantidade: payload.quantidade,
        prioridade: payload.prioridade || 'normal',
        status: 'planejada',
        data_prevista_inicio: new Date().toISOString().split('T')[0],
        data_prevista_fim: payload.data_prevista_fim || null,
        observacoes: payload.observacoes || null,
        posicao_kanban: 0,
        criado_em: new Date().toISOString()
      })

    if (opErr) {
      return { success: false, error: opErr.message }
    }

    // 2. Empenhar materiais a partir da BOM ativa do produto (se existir)
    const { data: bom } = await (supabase as any)
      .from('bom_versions')
      .select('id, bom_items(component_product_id, quantidade, perda_percentual)')
      .eq('product_id', payload.product_id)
      .eq('status', 'ativa')
      .maybeSingle()

    if (bom && Array.isArray(bom.bom_items) && bom.bom_items.length > 0) {
      const materialsToInsert = bom.bom_items.map((bi: any) => ({
        id: 'opmat-' + Math.random().toString(36).substring(2, 9),
        production_order_id: opId,
        component_product_id: bi.component_product_id,
        quantidade_necessaria: Number(bi.quantidade) * Number(payload.quantidade),
        quantidade_reservada: 0,
        quantidade_separada: 0,
        quantidade_consumida: 0,
        status: 'pendente'
      }))

      await (supabase as any).from('production_order_materials').insert(materialsToInsert)
    }

    revalidatePath('/producao')
    revalidatePath('/estoque')
    revalidatePath('/')

    return { success: true, numero }
  } catch (err: any) {
    console.error('[createProductionOrder Error]', err)
    return { success: false, error: err.message || 'Falha ao criar ordem de produção' }
  }
}

export async function updateOpStatus(
  opId: string,
  novoStatus: 'planejada' | 'separacao' | 'producao' | 'qualidade' | 'concluida' | 'cancelada'
) {
  try {
    const supabase = createClient()
    const updateData: any = {
      status: novoStatus,
      atualizado_em: new Date().toISOString()
    }

    if (novoStatus === 'producao') {
      updateData.data_inicio_real = new Date().toISOString()
    } else if (novoStatus === 'concluida') {
      updateData.data_fim_real = new Date().toISOString()
    }

    const { error } = await (supabase as any)
      .from('production_orders')
      .update(updateData)
      .eq('id', opId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/producao')
    revalidatePath('/estoque')
    revalidatePath('/')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteProductionOrderWithRollback(opId: string) {
  try {
    const supabase = createClient()

    // 1. Buscar a OP para obter número
    const { data: op } = await (supabase as any)
      .from('production_orders')
      .select('id, numero')
      .eq('id', opId)
      .maybeSingle()

    // 2. Estornar movimentações de estoque originadas por esta OP
    const { data: movements } = await (supabase as any)
      .from('stock_movements')
      .select('*')
      .eq('origem_id', opId)

    if (movements && movements.length > 0) {
      for (const mov of movements) {
        if (mov.tipo === 'saida' || mov.sinal === -1) {
          await (supabase as any).from('stock_movements').insert({
            id: 'mov-' + Math.random().toString(36).substring(2, 9),
            product_id: mov.product_id,
            warehouse_id: mov.warehouse_id,
            tipo: 'entrada',
            quantidade: mov.quantidade,
            sinal: 1,
            custo_unitario: mov.custo_unitario || 0,
            usuario_nome: 'Sistema (Estorno OP)',
            observacao: `Estorno de saída/consumo referente à exclusão da ${op?.numero || opId}`
          })

          const { data: bal } = await (supabase as any)
            .from('stock_balances')
            .select('id, quantidade')
            .eq('product_id', mov.product_id)
            .eq('warehouse_id', mov.warehouse_id)
            .maybeSingle()

          if (bal) {
            await (supabase as any)
              .from('stock_balances')
              .update({
                quantidade: Number(bal.quantidade || 0) + Number(mov.quantidade || 0),
                atualizado_em: new Date().toISOString()
              })
              .eq('id', bal.id)
          }
        }
      }
    }

    // 3. Remover materiais vinculados à OP
    await (supabase as any)
      .from('production_order_materials')
      .delete()
      .eq('production_order_id', opId)

    // 4. Deletar a OP
    const { error: delErr } = await (supabase as any)
      .from('production_orders')
      .delete()
      .eq('id', opId)

    if (delErr) return { success: false, error: delErr.message }

    revalidatePath('/producao')
    revalidatePath('/estoque')
    revalidatePath('/')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao excluir OP com estorno' }
  }
}
