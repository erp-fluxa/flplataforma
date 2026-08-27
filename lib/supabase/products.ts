import { createClient } from './server'
import { Database } from '@/types/database.types'

export type Product = Database['public']['Tables']['products']['Row']
export type MaterialCategory = Database['public']['Tables']['material_categories']['Row']

export interface ProductWithStock extends Product {
  estoque_total: number
  status_estoque: 'critico' | 'atencao' | 'ok'
}

export async function getProducts(options?: {
  tipo_item?: 'materia_prima' | 'uso_consumo' | 'produto_acabado'
  busca?: string
}): Promise<ProductWithStock[]> {
  try {
    const supabase = createClient()
    let query = (supabase as any)
      .from('products')
      .select(`
        *,
        stock_balances(quantidade)
      `)
      .eq('excluido', false)
      .order('codigo', { ascending: true })

    if (options?.tipo_item) {
      query = query.eq('tipo_item', options.tipo_item)
    }

    if (options?.busca) {
      query = query.or(`codigo.ilike.%${options.busca}%,descricao.ilike.%${options.busca}%`)
    }

    const { data, error } = await query

    if (error || !data) {
      console.warn('[getProducts Supabase Error]', error)
      return []
    }

    return data.map((p: any) => {
      const estoque_total = Array.isArray(p.stock_balances)
        ? p.stock_balances.reduce((acc: number, b: any) => acc + Number(b.quantidade || 0), 0)
        : 0

      let status_estoque: 'critico' | 'atencao' | 'ok' = 'ok'
      if (p.estoque_minimo > 0 && estoque_total <= p.estoque_minimo) {
        status_estoque = 'critico'
      } else if (p.ponto_reposicao > 0 && estoque_total <= p.ponto_reposicao) {
        status_estoque = 'atencao'
      }

      return {
        ...p,
        estoque_total,
        status_estoque
      }
    })
  } catch (err) {
    console.error('[getProducts Exception]', err)
    return []
  }
}

export async function getCategories(): Promise<MaterialCategory[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('material_categories')
      .select('*')
      .order('nome', { ascending: true })

    if (error || !data) return []
    return data as MaterialCategory[]
  } catch (err) {
    console.error('[getCategories Error]', err)
    return []
  }
}
