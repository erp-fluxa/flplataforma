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
      suppliers: {
        Row: {
          id: string
          company_id: string
          nome: string
          cnpj: string | null
          contato_nome: string | null
          email: string | null
          telefone: string | null
          cidade: string | null
          uf: string | null
          categorias: string[] | null
          ativo: boolean
          observacoes: string | null
          criado_em: string
        }
      }
      requisitions: {
        Row: {
          id: string
          company_id: string
          numero: string
          solicitante: string
          setor: string
          prioridade: 'baixa' | 'normal' | 'alta' | 'urgente'
          status: 'rascunho' | 'pendente' | 'aprovada' | 'em_cotacao' | 'rejeitada'
          justificativa: string | null
          data_necessidade: string | null
          criado_em: string
        }
      }
      quotations: {
        Row: {
          id: string
          company_id: string
          numero: string
          titulo: string
          solicitante: string | null
          comprador: string
          fornecedor_id: string | null
          status: 'nova_solicitacao' | 'em_cotacao' | 'em_analise' | 'aprovada' | 'cancelada'
          prioridade: 'baixa' | 'normal' | 'alta' | 'urgente'
          prazo: string | null
          valor_estimado: number
          valor_final: number
          observacoes: string | null
          criado_em: string
        }
      }
      orders: {
        Row: {
          id: string
          company_id: string
          numero: string
          quotation_id: string | null
          supplier_id: string
          condicao_pagamento: string | null
          prazo_entrega: string | null
          frete: number
          desconto: number
          valor_total: number
          status: 'emitido' | 'parcial' | 'concluido' | 'cancelado'
          observacoes: string | null
          criado_em: string
        }
      }
      customers: {
        Row: {
          id: string
          company_id: string
          nome: string
          razao_social: string | null
          cnpj_cpf: string | null
          ie: string | null
          email: string | null
          telefone: string | null
          endereco: string | null
          cidade: string | null
          uf: string | null
          cep: string | null
          origem: string | null
          status: 'lead' | 'prospect' | 'cliente' | 'inativo'
          observacoes: string | null
          criado_em: string
        }
      }
      deals: {
        Row: {
          id: string
          company_id: string
          customer_id: string | null
          titulo: string
          etapa: 'prospeccao' | 'qualificacao' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'
          valor_estimado: number
          probabilidade: number
          linha_interesse: string | null
          responsavel_nome: string | null
          data_fechamento_prevista: string | null
          motivo_perda: string | null
          criado_em: string
          atualizado_em: string
        }
      }
      sales_orders: {
        Row: {
          id: string
          company_id: string
          numero: string
          customer_id: string
          deal_id: string | null
          valor_total: number
          sinal_entrada: number
          numero_parcelas: number
          prazo_fabricacao_dias: number
          status: 'orcamento' | 'aprovado' | 'em_producao' | 'faturado' | 'entregue' | 'cancelado'
          vendedor_nome: string | null
          condicoes_pagamento: string | null
          observacoes: string | null
          criado_em: string
        }
      }
      roles: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          permissoes: string[]
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
