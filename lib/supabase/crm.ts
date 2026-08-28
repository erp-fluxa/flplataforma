import { createClient } from './server'
import { Database } from '@/types/database.types'

export type Customer = Database['public']['Tables']['customers']['Row']
export type Deal = Database['public']['Tables']['deals']['Row']
export type SalesOrder = Database['public']['Tables']['sales_orders']['Row']

export async function getCustomers(): Promise<Customer[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('customers')
      .select('*')
      .order('nome', { ascending: true })

    if (error || !data) return []
    return data as Customer[]
  } catch (err) {
    console.error('[getCustomers Error]', err)
    return []
  }
}

export async function getDeals(): Promise<Deal[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('deals')
      .select(`
        *,
        customers(nome, telefone, email)
      `)
      .order('criado_em', { ascending: false })

    if (error || !data) return []
    return data as Deal[]
  } catch (err) {
    console.error('[getDeals Error]', err)
    return []
  }
}

export async function getSalesOrders(): Promise<SalesOrder[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('sales_orders')
      .select(`
        *,
        customers(nome, cnpj_cpf, telefone, email)
      `)
      .order('criado_em', { ascending: false })

    if (error || !data) return []
    return data as SalesOrder[]
  } catch (err) {
    console.error('[getSalesOrders Error]', err)
    return []
  }
}
