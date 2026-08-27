'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateQuotationPayload {
  titulo: string
  solicitante?: string
  comprador?: string
  fornecedor_id?: string
  prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente'
  prazo?: string
  valor_estimado?: number
  observacoes?: string
}

export async function createQuotation(payload: CreateQuotationPayload) {
  try {
    const supabase = createClient()
    const numero = 'COT-' + Math.floor(1000 + Math.random() * 9000)

    const { error } = await (supabase as any)
      .from('quotations')
      .insert({
        id: 'cot-' + Math.random().toString(36).substring(2, 9),
        company_id: 'comp-1',
        numero,
        titulo: payload.titulo,
        solicitante: payload.solicitante || 'Carlos Compras',
        comprador: payload.comprador || 'Carlos Compras',
        fornecedor_id: payload.fornecedor_id || null,
        status: 'em_cotacao',
        prioridade: payload.prioridade || 'normal',
        prazo: payload.prazo || null,
        valor_estimado: payload.valor_estimado || 0,
        observacoes: payload.observacoes || null
      })

    if (error) return { success: false, error: error.message }

    revalidatePath('/compras')
    revalidatePath('/')

    return { success: true, numero }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createSupplier(payload: {
  nome: string
  cnpj?: string
  contato_nome?: string
  email?: string
  telefone?: string
  cidade?: string
  uf?: string
}) {
  try {
    const supabase = createClient()

    const { error } = await (supabase as any)
      .from('suppliers')
      .insert({
        id: 'sup-' + Math.random().toString(36).substring(2, 9),
        company_id: 'comp-1',
        nome: payload.nome,
        cnpj: payload.cnpj || null,
        contato_nome: payload.contato_nome || null,
        email: payload.email || null,
        telefone: payload.telefone || null,
        cidade: payload.cidade || null,
        uf: payload.uf || null,
        ativo: true
      })

    if (error) return { success: false, error: error.message }

    revalidatePath('/compras')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createPurchaseOrder(payload: {
  quotation_id?: string
  supplier_id: string
  condicao_pagamento?: string
  prazo_entrega?: string
  valor_total: number
  observacoes?: string
}) {
  try {
    const supabase = createClient()
    const numero = 'PC-' + Math.floor(1000 + Math.random() * 9000)

    const { error } = await (supabase as any)
      .from('orders')
      .insert({
        id: 'pc-' + Math.random().toString(36).substring(2, 9),
        company_id: 'comp-1',
        numero,
        quotation_id: payload.quotation_id || null,
        supplier_id: payload.supplier_id,
        condicao_pagamento: payload.condicao_pagamento || '30 dias',
        prazo_entrega: payload.prazo_entrega || '10 dias úteis',
        valor_total: payload.valor_total,
        status: 'emitido',
        observacoes: payload.observacoes || null
      })

    if (error) return { success: false, error: error.message }

    revalidatePath('/compras')
    revalidatePath('/')

    return { success: true, numero }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
