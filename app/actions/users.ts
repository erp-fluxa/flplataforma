'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSystemUser(payload: {
  nome: string
  username: string
  email?: string
  role: string
}) {
  try {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('system_users')
      .insert({
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        company_id: 'comp-1',
        nome: payload.nome,
        username: payload.username.toLowerCase().trim(),
        email: payload.email || `${payload.username.toLowerCase().trim()}@gescomp.com.br`,
        role: payload.role,
        ativo: true
      })

    if (error) return { success: false, error: error.message }

    revalidatePath('/usuarios')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
