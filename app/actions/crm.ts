'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCustomer(payload: {
  nome: string
  razao_social?: string
  cnpj_cpf?: string
  email?: string
  telefone?: string
  cidade?: string
  uf?: string
  origem?: string
}) {
  try {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('customers')
      .insert({
        id: 'cli-' + Math.random().toString(36).substring(2, 9),
        company_id: 'comp-1',
        nome: payload.nome,
        razao_social: payload.razao_social || null,
        cnpj_cpf: payload.cnpj_cpf || null,
        email: payload.email || null,
        telefone: payload.telefone || null,
        cidade: payload.cidade || null,
        uf: payload.uf || null,
        origem: payload.origem || 'indicacao',
        status: 'cliente'
      })

    if (error) return { success: false, error: error.message }

    revalidatePath('/vendas')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createDeal(payload: {
  customer_id?: string
  titulo: string
  valor_estimado?: number
  linha_interesse?: string
  responsavel_nome?: string
}) {
  try {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('deals')
      .insert({
        id: 'deal-' + Math.random().toString(36).substring(2, 9),
        company_id: 'comp-1',
        customer_id: payload.customer_id || null,
        titulo: payload.titulo,
        etapa: 'prospeccao',
        valor_estimado: payload.valor_estimado || 0,
        probabilidade: 50,
        linha_interesse: payload.linha_interesse || 'CV',
        responsavel_nome: payload.responsavel_nome || 'João Marcos'
      })

    if (error) return { success: false, error: error.message }

    revalidatePath('/vendas')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateDealStage(
  dealId: string,
  novaEtapa: 'prospeccao' | 'qualificacao' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'
) {
  try {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('deals')
      .update({
        etapa: novaEtapa,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', dealId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/vendas')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createSalesOrder(payload: {
  customer_id: string
  deal_id?: string
  valor_total: number
  sinal_entrada?: number
  numero_parcelas?: number
  prazo_fabricacao_dias?: number
  vendedor_nome?: string
  observacoes?: string
}) {
  try {
    const supabase = createClient()
    const numero = 'PV-' + Math.floor(1000 + Math.random() * 9000)

    const { error } = await (supabase as any)
      .from('sales_orders')
      .insert({
        id: 'pv-' + Math.random().toString(36).substring(2, 9),
        company_id: 'comp-1',
        numero,
        customer_id: payload.customer_id,
        deal_id: payload.deal_id || null,
        valor_total: payload.valor_total,
        sinal_entrada: payload.sinal_entrada || 0,
        numero_parcelas: payload.numero_parcelas || 1,
        prazo_fabricacao_dias: payload.prazo_fabricacao_dias || 60,
        status: 'orcamento',
        vendedor_nome: payload.vendedor_nome || 'João Marcos',
        observacoes: payload.observacoes || null
      })

    if (error) return { success: false, error: error.message }

    revalidatePath('/vendas')
    revalidatePath('/')
    return { success: true, numero }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteSalesOrderWithRollback(salesOrderId: string) {
  try {
    const supabase = createClient()

    // 1. Buscar a venda para saber número/detalhes
    const { data: pv } = await (supabase as any)
      .from('sales_orders')
      .select('id, numero')
      .eq('id', salesOrderId)
      .maybeSingle()

    // 2. Buscar OPs vinculadas a esta venda
    const { data: ops } = await (supabase as any)
      .from('production_orders')
      .select('id, numero')
      .eq('sales_order_id', salesOrderId)

    const opIds = (ops || []).map((o: any) => o.id)

    // 3. Estornar movimentações de estoque originadas por esta venda ou por suas OPs
    const { data: movements } = await (supabase as any)
      .from('stock_movements')
      .select('*')
      .or(`origem_id.eq.${salesOrderId},origem_id.in.(${opIds.length > 0 ? opIds.join(',') : 'null'})`)

    if (movements && movements.length > 0) {
      for (const mov of movements) {
        if (mov.tipo === 'saida' || mov.sinal === -1) {
          // Estorno de saída: insere entrada e repõe saldo
          await (supabase as any).from('stock_movements').insert({
            id: 'mov-' + Math.random().toString(36).substring(2, 9),
            product_id: mov.product_id,
            warehouse_id: mov.warehouse_id,
            tipo: 'entrada',
            quantidade: mov.quantidade,
            sinal: 1,
            custo_unitario: mov.custo_unitario || 0,
            usuario_nome: 'Sistema (Estorno)',
            observacao: `Estorno de saída referente à exclusão da Venda ${pv?.numero || salesOrderId}`
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

    // 4. Remover materiais e OPs vinculadas
    if (opIds.length > 0) {
      await (supabase as any)
        .from('production_order_materials')
        .delete()
        .in('production_order_id', opIds)

      await (supabase as any)
        .from('production_orders')
        .delete()
        .in('id', opIds)
    }

    // 5. Deletar a Venda
    const { error: delErr } = await (supabase as any)
      .from('sales_orders')
      .delete()
      .eq('id', salesOrderId)

    if (delErr) return { success: false, error: delErr.message }

    revalidatePath('/vendas')
    revalidatePath('/producao')
    revalidatePath('/estoque')
    revalidatePath('/')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao excluir venda com estorno' }
  }
}
