import { createClient } from './server'
import { Database } from '@/types/database.types'

export type SystemUser = Database['public']['Tables']['system_users']['Row']
export type Role = Database['public']['Tables']['roles']['Row']

export async function getSystemUsers(): Promise<SystemUser[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('system_users')
      .select('*')
      .order('nome', { ascending: true })

    if (error || !data) return []
    return data as SystemUser[]
  } catch (err) {
    console.error('[getSystemUsers Error]', err)
    return []
  }
}

export async function getRoles(): Promise<Role[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('roles')
      .select('*')
      .order('nome', { ascending: true })

    if (error || !data) return []
    return data as Role[]
  } catch (err) {
    console.error('[getRoles Error]', err)
    return []
  }
}
