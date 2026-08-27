'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SaveProductPayload {
  id?: string
  codigo: string
  descricao: string
  unidade: string
  categoria?: string | null
  tipo_item: 'materia_prima' | 'uso_consumo' | 'produto_acabado'
  preco_referencia?: number
  custo_unitario?: number
  estoque_minimo?: number
  estoque_maximo?: number
  ponto_reposicao?: number
  lead_time_dias?: number
  produzivel?: boolean
  sob_encomenda?: boolean
  linha?: string | null
  volume_xy?: string | null
  eixo_z?: string | null
}

export async function saveProduct(payload: SaveProductPayload) {
  try {
    const supabase = createClient()

    const record = {
      ...payload,
      atualizado_em: new Date().toISOString()
    }

    let res
    if (payload.id) {
      res = await (supabase as any)
        .from('products')
        .update(record)
        .eq('id', payload.id)
        .select()
        .single()
    } else {
      res = await (supabase as any)
        .from('products')
        .insert({
          ...record,
          id: 'p-' + Math.random().toString(36).substring(2, 9)
        })
        .select()
        .single()
    }

    if (res.error) {
      return { success: false, error: res.error.message }
    }

    revalidatePath('/produtos')
    revalidatePath('/estoque')
    revalidatePath('/')

    return { success: true, product: res.data }
  } catch (err: any) {
    console.error('[saveProduct Error]', err)
    return { success: false, error: err.message || 'Falha ao salvar produto' }
  }
}

export async function deleteProduct(productId: string) {
  try {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('products')
      .update({
        excluido: true,
        excluido_em: new Date().toISOString(),
        excluido_por: 'admin'
      })
      .eq('id', productId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/produtos')
    revalidatePath('/estoque')
    revalidatePath('/')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
