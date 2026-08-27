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
      material_categories: {
        Row: {
          id: string
          nome: string
          tipo: 'MP' | 'MUC'
          sistema: boolean
          criado_em: string
        }
      }
      products: {
        Row: {
          id: string
          company_id: string
          codigo: string
          descricao: string
          unidade: string
          categoria: string | null
          tipo_item: 'materia_prima' | 'uso_consumo' | 'produto_acabado'
          preco_referencia: number
          custo_unitario: number
          estoque_minimo: number
          estoque_maximo: number
          ponto_reposicao: number
          lote_economico: number
          lead_time_dias: number
          produzivel: boolean
          sob_encomenda: boolean
          linha: string | null
          volume_xy: string | null
          eixo_z: string | null
          alerta_estoque_ativo: boolean
          versao: number
          excluido: boolean
          excluido_em: string | null
          excluido_por: string | null
          atualizado_em: string
          criado_em: string
        }
      }
      warehouses: {
        Row: {
          id: string
          company_id: string
          nome: string
          tipo: 'materia_prima' | 'produto_acabado' | 'expedicao' | 'refugo'
          ativo: boolean
          criado_em: string
        }
      }
      locations: {
        Row: {
          id: string
          warehouse_id: string
          codigo: string
          descricao: string | null
          criado_em: string
        }
      }
      stock_balances: {
        Row: {
          id: string
          product_id: string
          warehouse_id: string
          location_id: string | null
          quantidade: number
          custo_medio: number
          atualizado_em: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          warehouse_id: string
          location_id: string | null
          tipo: 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'consumo_op'
          quantidade: number
          sinal: number
          custo_unitario: number
          origem_tipo: string | null
          origem_id: string | null
          usuario_nome: string
          observacao: string | null
          criado_em: string
        }
      }
      stock_alerts: {
        Row: {
          id: string
          product_id: string
          nivel: 'critico' | 'atencao' | 'ok'
          disponivel_no_disparo: number
          estoque_minimo_no_disparo: number
          status: 'aberto' | 'resolvido' | 'silenciado'
          reconhecido_por: string | null
          reconhecido_em: string | null
          criado_em: string
          atualizado_em: string
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
