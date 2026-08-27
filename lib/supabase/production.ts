import { createClient } from './server'
import { Database } from '@/types/database.types'

export type ProductionOrder = Database['public']['Tables']['production_orders']['Row']
export type BomVersion = Database['public']['Tables']['bom_versions']['Row']
export type WorkCenter = Database['public']['Tables']['work_centers']['Row']

export interface ProductionOrderWithDetails extends ProductionOrder {
  products?: {
    codigo: string
    descricao: string
    unidade: string
    linha: string | null
  }
  materials?: {
    id: string
    component_product_id: string
    quantidade_necessaria: number
    quantidade_separada: number
    status: string
    products?: {
      codigo: string
      descricao: string
      unidade: string
    }
  }[]
}

export interface BomWithItems extends BomVersion {
  products?: {
    codigo: string
    descricao: string
    unidade: string
  }
  items?: {
    id: string
    quantidade: number
    observacao: string | null
    products?: {
      codigo: string
      descricao: string
      unidade: string
      custo_unitario: number
    }
  }[]
}

export async function getProductionOrders(): Promise<ProductionOrderWithDetails[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('production_orders')
      .select(`
        *,
        products(codigo, descricao, unidade, linha),
        production_order_materials(
          id, component_product_id, quantidade_necessaria, quantidade_separada, status,
          products(codigo, descricao, unidade)
        )
      `)
      .order('posicao_kanban', { ascending: true })
      .order('criado_em', { ascending: false })

    if (error || !data) {
      console.warn('[getProductionOrders Error]', error)
      return []
    }

    return data.map((d: any) => ({
      ...d,
      materials: d.production_order_materials
    }))
  } catch (err) {
    console.error('[getProductionOrders Exception]', err)
    return []
  }
}

export async function getBomList(): Promise<BomWithItems[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('bom_versions')
      .select(`
        *,
        products(codigo, descricao, unidade),
        bom_items(
          id, quantidade, observacao,
          products(codigo, descricao, unidade, custo_unitario)
        )
      `)
      .order('criado_em', { ascending: false })

    if (error || !data) return []
    return data.map((d: any) => ({
      ...d,
      items: d.bom_items
    }))
  } catch (err) {
    console.error('[getBomList Error]', err)
    return []
  }
}

export async function getWorkCenters(): Promise<WorkCenter[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('work_centers')
      .select('*')
      .order('nome', { ascending: true })

    if (error || !data) return []
    return data as WorkCenter[]
  } catch (err) {
    console.error('[getWorkCenters Error]', err)
    return []
  }
}
