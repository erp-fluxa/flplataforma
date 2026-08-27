export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      system_branding: {
        Row: {
          id: string
          nome_sistema: string
          subtitulo: string
          logo_institucional_url: string | null
          logo_plataforma_url: string | null
          logo_sidebar_url: string | null
          cor_primaria: string
          tema_padrao: string
          favicon_url: string | null
          atualizado_em: string
          atualizado_por: string | null
        }
        Insert: {
          id?: string
          nome_sistema?: string
          subtitulo?: string
          logo_institucional_url?: string | null
          logo_plataforma_url?: string | null
          logo_sidebar_url?: string | null
          cor_primaria?: string
          tema_padrao?: string
          favicon_url?: string | null
          atualizado_em?: string
          atualizado_por?: string | null
        }
        Update: {
          id?: string
          nome_sistema?: string
          subtitulo?: string
          logo_institucional_url?: string | null
          logo_plataforma_url?: string | null
          logo_sidebar_url?: string | null
          cor_primaria?: string
          tema_padrao?: string
          favicon_url?: string | null
          atualizado_em?: string
          atualizado_por?: string | null
        }
      }
      companies: {
        Row: {
          id: string
          nome: string
          fantasia: string | null
          razao_social: string | null
          cnpj: string | null
          ie: string | null
          endereco: string | null
          bairro: string | null
          cidade: string | null
          uf: string | null
          cep: string | null
          email: string | null
          telefone: string | null
          logo_institucional_url: string | null
          logo_plataforma_url: string | null
          logo_sidebar_url: string | null
          ativo: boolean
          criado_em: string
        }
      }
      system_users: {
        Row: {
          id: string
          company_id: string | null
          nome: string
          username: string
          email: string | null
          role: string
          permissoes: Json | null
          ativo: boolean
          criado_em: string
        }
      }
    }
  }
}
