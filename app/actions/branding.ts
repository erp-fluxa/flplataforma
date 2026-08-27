'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface UpdateBrandingPayload {
  nome_sistema?: string
  subtitulo?: string
  logo_institucional_url?: string | null
  logo_plataforma_url?: string | null
  logo_sidebar_url?: string | null
  cor_primaria?: string
  tema_padrao?: string
}

export async function updateSystemBranding(payload: UpdateBrandingPayload) {
  try {
    const supabase = createClient()

    const updateData = {
      id: 'default',
      ...payload,
      atualizado_em: new Date().toISOString(),
      atualizado_por: 'admin'
    }

    const { data, error } = await (supabase as any)
      .from('system_branding')
      .upsert(updateData)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao salvar branding no Supabase: ${error.message}`)
    }

    // Revalidação em tempo real em todas as rotas
    revalidatePath('/login')
    revalidatePath('/')
    revalidatePath('/configuracoes')

    return { success: true, branding: data }
  } catch (err: any) {
    console.error('[updateSystemBranding Error]', err)
    return { success: false, error: err.message || 'Falha ao atualizar branding' }
  }
}
