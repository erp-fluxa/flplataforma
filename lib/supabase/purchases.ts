import { createClient } from './server'
import { Database } from '@/types/database.types'

export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type Requisition = Database['public']['Tables']['requisitions']['Row']
export type Quotation = Database['public']['Tables']['quotations']['Row']
export type PurchaseOrder = Database['public']['Tables']['orders']['Row']

export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('suppliers')
      .select('*')
      .order('nome', { ascending: true })

    if (error || !data) return []
    return data as Supplier[]
  } catch (err) {
    console.error('[getSuppliers Error]', err)
    return []
  }
}

export async function getQuotations(): Promise<Quotation[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('quotations')
      .select(`
        *,
        suppliers(nome)
      `)
      .order('criado_em', { ascending: false })

    if (error || !data) return []
    return data as Quotation[]
  } catch (err) {
    console.error('[getQuotations Error]', err)
    return []
  }
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('orders')
      .select(`
        *,
        suppliers(nome, cnpj, email)
      `)
      .order('criado_em', { ascending: false })

    if (error || !data) return []
    return data as PurchaseOrder[]
  } catch (err) {
    console.error('[getPurchaseOrders Error]', err)
    return []
  }
}

export async function getRequisitions(): Promise<Requisition[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('requisitions')
      .select('*')
      .order('criado_em', { ascending: false })

    if (error || !data) return []
    return data as Requisition[]
  } catch (err) {
    console.error('[getRequisitions Error]', err)
    return []
  }
}
