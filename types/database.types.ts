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
      bom_versions: {
        Row: {
          id: string
          product_id: string
          versao: string
          descricao: string
          status: 'rascunho' | 'ativa' | 'obsoleta'
          vigente_de: string | null
          vigente_ate: string | null
          criado_em: string
        }
      }
      bom_items: {
        Row: {
          id: string
          bom_version_id: string
          component_product_id: string
          quantidade: number
          perda_percentual: number
          opcional: boolean
          observacao: string | null
          criado_em: string
        }
      }
      work_centers: {
        Row: {
          id: string
          nome: string
          tipo: 'bancada' | 'celula' | 'maquina' | 'linha'
          capacidade_hora_dia: number
          custo_hora: number
          ativo: boolean
          criado_em: string
        }
      }
      routing_operations: {
        Row: {
          id: string
          bom_version_id: string
          sequencia: number
          nome: string
          work_center_id: string | null
          tempo_setup_min: number
          tempo_unitario_min: number
          instrucoes: string | null
          criado_em: string
        }
      }
      production_orders: {
        Row: {
          id: string
          company_id: string
          numero: string
          product_id: string
          bom_version_id: string | null
          quantidade: number
          quantidade_produzida: number
          quantidade_refugo: number
          prioridade: 'baixa' | 'normal' | 'alta' | 'urgente'
          status: 'planejada' | 'separacao' | 'producao' | 'qualidade' | 'concluida' | 'cancelada'
          data_prevista_inicio: string | null
          data_prevista_fim: string | null
          data_inicio_real: string | null
          data_fim_real: string | null
          responsavel_nome: string | null
          observacoes: string | null
          posicao_kanban: number
          criado_em: string
          atualizado_em: string
        }
      }
      production_order_materials: {
        Row: {
          id: string
          production_order_id: string
          component_product_id: string
          quantidade_necessaria: number
          quantidade_reservada: number
          quantidade_separada: number
          quantidade_consumida: number
          status: 'pendente' | 'separado' | 'consumido'
          criado_em: string
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
