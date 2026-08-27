import { createClient } from './server'
import { Database } from '@/types/database.types'

export type SystemBranding = Database['public']['Tables']['system_branding']['Row']

export const DEFAULT_BRANDING: SystemBranding = {
  id: 'default',
  nome_sistema: 'Gescomp ERP',
  subtitulo: 'GESTÃO DE COMPRAS E INDÚSTRIA',
  logo_institucional_url: '/assets/logo_jp3d.png',
  logo_plataforma_url: null,
  logo_sidebar_url: null,
  cor_primaria: '#0f766e',
  tema_padrao: 'dark',
  favicon_url: null,
  atualizado_em: new Date().toISOString(),
  atualizado_por: 'system'
}

/**
 * Busca o branding oficial e atualizado diretamente do Supabase.
 * Nunca lê de localStorage. É chamado server-side antes de renderizar qualquer tela.
 */
export async function getSystemBranding(): Promise<SystemBranding> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('system_branding')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()

    if (error || !data) {
      // Fallback para company settings se branding ainda estiver vazio
      const { data: comp } = await (supabase as any)
        .from('companies')
        .select('nome, fantasia, logo_institucional_url, logo_plataforma_url, logo_sidebar_url')
        .limit(1)
        .maybeSingle()

      if (comp) {
        return {
          ...DEFAULT_BRANDING,
          nome_sistema: comp.fantasia || comp.nome || DEFAULT_BRANDING.nome_sistema,
          logo_institucional_url: comp.logo_institucional_url || DEFAULT_BRANDING.logo_institucional_url,
          logo_plataforma_url: comp.logo_plataforma_url,
          logo_sidebar_url: comp.logo_sidebar_url
        }
      }

      return DEFAULT_BRANDING
    }

    return data as SystemBranding
  } catch (err) {
    console.error('[getSystemBranding Error]', err)
    return DEFAULT_BRANDING
  }
}
