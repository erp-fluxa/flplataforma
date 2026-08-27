import { createClient } from './server'
import { Database } from '@/types/database.types'

export type Warehouse = Database['public']['Tables']['warehouses']['Row']
export type StockBalance = Database['public']['Tables']['stock_balances']['Row']
export type StockMovement = Database['public']['Tables']['stock_movements']['Row']

export interface StockSummaryItem {
  product_id: string
  codigo: string
  descricao: string
  unidade: string
  tipo_item: string
  estoque_minimo: number
  ponto_reposicao: number
  saldos_por_deposito: {
    warehouse_id: string
    warehouse_nome: string
    quantidade: number
  }[]
  total_geral: number
  status: 'critico' | 'atencao' | 'ok'
}

export async function getWarehouses(): Promise<Warehouse[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('warehouses')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error || !data) return []
    return data as Warehouse[]
  } catch (err) {
    console.error('[getWarehouses Error]', err)
    return []
  }
}

export async function getStockMovements(limit = 50): Promise<StockMovement[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('stock_movements')
      .select(`
        *,
        products(codigo, descricao, unidade),
        warehouses(nome)
      `)
      .order('criado_em', { ascending: false })
      .limit(limit)

    if (error || !data) return []
    return data as any[]
  } catch (err) {
    console.error('[getStockMovements Error]', err)
    return []
  }
}

export async function getStockOverview(): Promise<StockSummaryItem[]> {
  try {
    const supabase = createClient()
    const { data: prods } = await (supabase as any)
      .from('products')
      .select(`
        id, codigo, descricao, unidade, tipo_item, estoque_minimo, ponto_reposicao,
        stock_balances(warehouse_id, quantidade, warehouses(nome))
      `)
      .eq('excluido', false)
      .order('codigo', { ascending: true })

    if (!prods) return []

    return prods.map((p: any) => {
      const saldos = Array.isArray(p.stock_balances)
        ? p.stock_balances.map((sb: any) => ({
            warehouse_id: sb.warehouse_id,
            warehouse_nome: sb.warehouses?.nome || 'Depósito',
            quantidade: Number(sb.quantidade || 0)
          }))
        : []

      const total_geral = saldos.reduce((acc: number, s: any) => acc + s.quantidade, 0)

      let status: 'critico' | 'atencao' | 'ok' = 'ok'
      if (p.estoque_minimo > 0 && total_geral <= p.estoque_minimo) {
        status = 'critico'
      } else if (p.ponto_reposicao > 0 && total_geral <= p.ponto_reposicao) {
        status = 'atencao'
      }

      return {
        product_id: p.id,
        codigo: p.codigo,
        descricao: p.descricao,
        unidade: p.unidade,
        tipo_item: p.tipo_item,
        estoque_minimo: Number(p.estoque_minimo || 0),
        ponto_reposicao: Number(p.ponto_reposicao || 0),
        saldos_por_deposito: saldos,
        total_geral,
        status
      }
    })
  } catch (err) {
    console.error('[getStockOverview Error]', err)
    return []
  }
}
