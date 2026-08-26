// shared/flow.ts — Máquina de Estados e Motor do Fluxo Integrado JP3D
// Vendas -> Produção -> Estoque -> Compras + Suporte + Alertas de Estoque Mínimo

export type DocumentType =
  | 'requisition'
  | 'quotation'
  | 'order'
  | 'sales_order'
  | 'production_order'
  | 'picking_order'
  | 'ticket'
  | 'stock_alert';

export type StockSeverityLevel = 'ok' | 'atencao' | 'critico' | 'zerado';

export interface StockLevelEvaluation {
  nivel: StockSeverityLevel;
  label: string;
  badgeClasses: string;
  icon: string;
  colorHex: string;
  disponivel: number;
  minimo: number;
  pontoReposicao: number;
  percentualMinimo: number;
  emAlerta: boolean;
  deveNotificarImediato: boolean; // critico e zerado = true; atencao = false (vai para digest)
}

/**
 * Função pura para cálculo do nível de estoque com base no DISPONÍVEL (físico - reservado).
 * NUNCA com string literal solta em componente.
 * Regra de Histerese: só resolve o alerta se disponivel >= minimo * (1 + percentualHisterese/100) (default: 5%)
 */
export function nivelEstoque(
  disponivel: number,
  minimo: number,
  pontoReposicao: number | null | undefined,
  options?: {
    percentualHisterese?: number; // padrão 5% (1.05)
    nivelAtual?: StockSeverityLevel | null;
  }
): StockLevelEvaluation {
  const pReposicao = (pontoReposicao !== null && pontoReposicao !== undefined && pontoReposicao > 0)
    ? pontoReposicao
    : minimo;

  const histereseMultiplier = 1 + ((options?.percentualHisterese ?? 5) / 100);
  const limiarResolucao = Math.round(minimo * histereseMultiplier);

  let nivel: StockSeverityLevel;
  let label: string;
  let badgeClasses: string;
  let icon: string;
  let colorHex: string;
  let emAlerta = true;
  let deveNotificarImediato = false;

  if (disponivel <= 0) {
    nivel = 'zerado';
    label = 'Estoque Zerado';
    badgeClasses = 'bg-red-950/40 text-red-400 border-red-800 font-bold';
    icon = 'alert-triangle';
    colorHex = '#ef4444';
    deveNotificarImediato = true;
  } else if (disponivel <= minimo) {
    nivel = 'critico';
    label = 'Estoque Crítico';
    badgeClasses = 'bg-red-500/15 text-red-400 border-red-500/30';
    icon = 'alert-circle';
    colorHex = '#f87171';
    deveNotificarImediato = true;
  } else if (disponivel <= pReposicao) {
    nivel = 'atencao';
    label = 'Ponto de Reposição';
    badgeClasses = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    icon = 'clock';
    colorHex = '#fbbf24';
    deveNotificarImediato = false; // Agrupado em digest
  } else {
    // Se o alerta já estava aberto, valida histerese antes de marcar como totalmente OK
    if (options?.nivelAtual && options.nivelAtual !== 'ok' && disponivel < limiarResolucao) {
      nivel = 'atencao';
      label = 'Em Recuperação (Histerese)';
      badgeClasses = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      icon = 'refresh-cw';
      colorHex = '#f59e0b';
      deveNotificarImediato = false;
    } else {
      nivel = 'ok';
      label = 'Estoque Adequado';
      badgeClasses = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      icon = 'check-circle';
      colorHex = '#10b981';
      emAlerta = false;
    }
  }

  const percentualMinimo = minimo > 0 ? Math.round((disponivel / minimo) * 100) : 100;

  return {
    nivel,
    label,
    badgeClasses,
    icon,
    colorHex,
    disponivel,
    minimo,
    pontoReposicao: pReposicao,
    percentualMinimo,
    emAlerta,
    deveNotificarImediato
  };
}

export interface StatusDefinition {
  id: string;
  type: string;
  label: string;
  icon: string;
  badgeClasses: string;
  pillClasses: string;
  description: string;
}

// ======================= SINGLE SOURCE OF TRUTH: STATUS CONFIGURATION =======================
export const DOCUMENT_STATUS_CONFIG: Record<string, StatusDefinition> = {
  // --- REQUISIÇÕES DE COMPRA ---
  'req:rascunho': {
    id: 'rascunho',
    type: 'requisition',
    label: 'Rascunho',
    icon: 'edit',
    badgeClasses: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    pillClasses: 'border-slate-500/40 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40',
    description: 'Requisição em elaboração pelo solicitante'
  },
  'req:aguardando_aprovacao': {
    id: 'aguardando_aprovacao',
    type: 'requisition',
    label: 'Aguardando Aprovação',
    icon: 'clock',
    badgeClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    pillClasses: 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40',
    description: 'Aguardando aprovação técnica ou gerencial do setor'
  },
  'req:aprovada': {
    id: 'aprovada',
    type: 'requisition',
    label: 'Aprovada',
    icon: 'check',
    badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    pillClasses: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40',
    description: 'Requisição aprovada e pronta para cotação'
  },
  'req:em_cotacao': {
    id: 'em_cotacao',
    type: 'requisition',
    label: 'Em Cotação',
    icon: 'cot',
    badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    pillClasses: 'border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40',
    description: 'Demanda em processo de coleta de propostas no mercado'
  },
  'req:atendida_parcial': {
    id: 'atendida_parcial',
    type: 'requisition',
    label: 'Atendida Parcial',
    icon: 'box',
    badgeClasses: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    pillClasses: 'border-teal-500/40 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40',
    description: 'Parte dos itens foi comprada/recebida'
  },
  'req:atendida': {
    id: 'atendida',
    type: 'requisition',
    label: 'Atendida',
    icon: 'check',
    badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    pillClasses: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40',
    description: 'Demanda totalmente suprida e entregue'
  },
  'req:reprovada': {
    id: 'reprovada',
    type: 'requisition',
    label: 'Reprovada',
    icon: 'x',
    badgeClasses: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800',
    pillClasses: 'border-red-500/40 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40',
    description: 'Requisição reprovada com justificativa'
  },
  'req:cancelada': {
    id: 'cancelada',
    type: 'requisition',
    label: 'Cancelada',
    icon: 'trash',
    badgeClasses: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    pillClasses: 'border-slate-500/40 text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-900/60',
    description: 'Cancelada pelo solicitante ou compras'
  },

  // --- COTAÇÕES (11 COLUNAS KANBAN) ---
  'quo:nova_solicitacao': {
    id: 'nova_solicitacao',
    type: 'quotation',
    label: 'Nova Solicitação',
    icon: 'plus',
    badgeClasses: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    pillClasses: 'border-slate-500/40 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40',
    description: 'Demanda recebida no setor de compras'
  },
  'quo:em_analise': {
    id: 'em_analise',
    type: 'quotation',
    label: 'Em Análise',
    icon: 'eye',
    badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    pillClasses: 'border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40',
    description: 'Especificação técnica e pré-seleção de fornecedores'
  },
  'quo:enviada_fornecedor': {
    id: 'enviada_fornecedor',
    type: 'quotation',
    label: 'Enviada ao Fornecedor',
    icon: 'up',
    badgeClasses: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    pillClasses: 'border-indigo-500/40 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40',
    description: 'RFQ disparada formalmente aos parceiros homologados'
  },
  'quo:aguardando_resposta': {
    id: 'aguardando_resposta',
    type: 'quotation',
    label: 'Aguardando Resposta',
    icon: 'clock',
    badgeClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    pillClasses: 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40',
    description: 'No prazo de envio de propostas comerciais pelos fornecedores'
  },
  'quo:cotacao_recebida': {
    id: 'cotacao_recebida',
    type: 'quotation',
    label: 'Cotação Recebida',
    icon: 'down',
    badgeClasses: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    pillClasses: 'border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40',
    description: 'Propostas registradas no sistema prontas para equalização'
  },
  'quo:em_comparacao': {
    id: 'em_comparacao',
    type: 'quotation',
    label: 'Em Comparação',
    icon: 'cot',
    badgeClasses: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    pillClasses: 'border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40',
    description: 'Equalização de preços, prazos e condições comerciais (Split Award)'
  },
  'quo:aguardando_aprovacao': {
    id: 'aguardando_aprovacao',
    type: 'quotation',
    label: 'Aguardando Aprovação',
    icon: 'alert',
    badgeClasses: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    pillClasses: 'border-orange-500/40 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40',
    description: 'Submetida para validação de alçada em R$'
  },
  'quo:aprovada': {
    id: 'aprovada',
    type: 'quotation',
    label: 'Aprovada',
    icon: 'check',
    badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    pillClasses: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40',
    description: 'Cotação aprovada pela alçada competente; pronta para conversão'
  },
  'quo:reprovada': {
    id: 'reprovada',
    type: 'quotation',
    label: 'Reprovada',
    icon: 'x',
    badgeClasses: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800',
    pillClasses: 'border-red-500/40 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40',
    description: 'Proposta reprovada com justificativa formal registrada'
  },
  'quo:convertida_pedido': {
    id: 'convertida_pedido',
    type: 'quotation',
    label: 'Convertida em Pedido',
    icon: 'ped',
    badgeClasses: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    pillClasses: 'border-teal-500/40 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40',
    description: 'Pedido(s) de Compra timbrado(s) emitido(s) com sucesso'
  },
  'quo:arquivada': {
    id: 'arquivada',
    type: 'quotation',
    label: 'Arquivada',
    icon: 'box',
    badgeClasses: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    pillClasses: 'border-slate-500/40 text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-900/60',
    description: 'Cotação encerrada e arquivada para consulta histórica'
  },

  // --- PEDIDOS DE COMPRA ---
  'ord:rascunho': {
    id: 'rascunho',
    type: 'order',
    label: 'Rascunho',
    icon: 'edit',
    badgeClasses: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    pillClasses: 'border-slate-500/40 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40',
    description: 'Pedido de compra em elaboração'
  },
  'ord:emitido': {
    id: 'emitido',
    type: 'order',
    label: 'Emitido',
    icon: 'ped',
    badgeClasses: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    pillClasses: 'border-teal-500/40 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40',
    description: 'Pedido de compra oficial emitido e enviado ao fornecedor'
  },
  'ord:confirmado_fornecedor': {
    id: 'confirmado_fornecedor',
    type: 'order',
    label: 'Confirmado Fornecedor',
    icon: 'check',
    badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    pillClasses: 'border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40',
    description: 'Fornecedor confirmou aceite de preço e prazo de entrega'
  },
  'ord:recebido_parcial': {
    id: 'recebido_parcial',
    type: 'order',
    label: 'Recebido Parcial',
    icon: 'box',
    badgeClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    pillClasses: 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40',
    description: 'Parte dos itens foi entregue e conferida no almoxarifado'
  },
  'ord:recebido': {
    id: 'recebido',
    type: 'order',
    label: 'Recebido no Estoque',
    icon: 'check',
    badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    pillClasses: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40',
    description: 'Itens recebidos integralmente com entrada efetuada no estoque'
  },
  'ord:cancelado': {
    id: 'cancelado',
    type: 'order',
    label: 'Cancelado',
    icon: 'x',
    badgeClasses: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800',
    pillClasses: 'border-red-500/40 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40',
    description: 'Pedido cancelado por desistência ou descumprimento'
  },

  // --- PEDIDOS DE VENDA (PV) ---
  'pv:orcamento': {
    id: 'orcamento',
    type: 'sales_order',
    label: 'Orçamento',
    icon: 'file-text',
    badgeClasses: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    pillClasses: 'border-slate-400 text-slate-600 bg-slate-50',
    description: 'Proposta comercial enviada ao cliente'
  },
  'pv:confirmado': {
    id: 'confirmado',
    type: 'sales_order',
    label: 'Confirmado',
    icon: 'check-circle',
    badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    pillClasses: 'border-blue-500/40 text-blue-700 bg-blue-50',
    description: 'Venda confirmada pelo cliente; OPs geradas'
  },
  'pv:em_producao': {
    id: 'em_producao',
    type: 'sales_order',
    label: 'Em Produção',
    icon: 'factory',
    badgeClasses: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    pillClasses: 'border-purple-500/40 text-purple-700 bg-purple-50',
    description: 'Máquinas e itens em fabricação no chão de fábrica'
  },
  'pv:parcial': {
    id: 'parcial',
    type: 'sales_order',
    label: 'Produzido Parcial',
    icon: 'box',
    badgeClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    pillClasses: 'border-amber-500/40 text-amber-700 bg-amber-50',
    description: 'Parte dos itens do pedido já está concluída'
  },
  'pv:pronto_expedicao': {
    id: 'pronto_expedicao',
    type: 'sales_order',
    label: 'Pronto p/ Expedição',
    icon: 'truck',
    badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    pillClasses: 'border-emerald-500/40 text-emerald-700 bg-emerald-50',
    description: 'Todos os itens produzidos e prontos para faturamento e envio'
  },
  'pv:faturado': {
    id: 'faturado',
    type: 'sales_order',
    label: 'Faturado',
    icon: 'check',
    badgeClasses: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    pillClasses: 'border-teal-500/40 text-teal-700 bg-teal-50',
    description: 'Nota fiscal emitida'
  },
  'pv:entregue': {
    id: 'entregue',
    type: 'sales_order',
    label: 'Entregue',
    icon: 'check',
    badgeClasses: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    pillClasses: 'border-slate-400 text-slate-600 bg-slate-50',
    description: 'Pedido entregue com sucesso ao cliente'
  },
  'pv:cancelado': {
    id: 'cancelado',
    type: 'sales_order',
    label: 'Cancelado',
    icon: 'x',
    badgeClasses: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800',
    pillClasses: 'border-red-500/40 text-red-700 bg-red-50',
    description: 'Pedido de venda cancelado'
  },

  // --- ORDENS DE PRODUÇÃO (OP) ---
  'op:planejada': {
    id: 'planejada',
    type: 'production_order',
    label: 'Planejada',
    icon: 'calendar',
    badgeClasses: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    pillClasses: 'border-slate-400 text-slate-600 bg-slate-50',
    description: 'OP criada no planejamento; aguardando reserva de materiais'
  },
  'op:aguardando_material': {
    id: 'aguardando_material',
    type: 'production_order',
    label: 'Aguardando Material',
    icon: 'alert-triangle',
    badgeClasses: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800',
    pillClasses: 'border-red-500/40 text-red-700 bg-red-50',
    description: 'Falta saldo de componentes; requisição de compra vinculada'
  },
  'op:material_reservado': {
    id: 'material_reservado',
    type: 'production_order',
    label: 'Material Reservado',
    icon: 'lock',
    badgeClasses: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    pillClasses: 'border-indigo-500/40 text-indigo-700 bg-indigo-50',
    description: '100% dos componentes reservados no estoque; OS gerada'
  },
  'op:separacao_pendente': {
    id: 'separacao_pendente',
    type: 'production_order',
    label: 'Separação Pendente',
    icon: 'package',
    badgeClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    pillClasses: 'border-amber-500/40 text-amber-700 bg-amber-50',
    description: 'OS de separação aberta na fila do almoxarifado'
  },
  'op:liberada': {
    id: 'liberada',
    type: 'production_order',
    label: 'Liberada p/ Produção',
    icon: 'play',
    badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    pillClasses: 'border-blue-500/40 text-blue-700 bg-blue-50',
    description: 'Material separado; liberada para apontamento no chão de fábrica'
  },
  'op:em_producao': {
    id: 'em_producao',
    type: 'production_order',
    label: 'Em Produção',
    icon: 'hard-hat',
    badgeClasses: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    pillClasses: 'border-purple-500/40 text-purple-700 bg-purple-50',
    description: 'Operações sendo executadas e apontadas pelos operadores'
  },
  'op:pausada': {
    id: 'pausada',
    type: 'production_order',
    label: 'Pausada',
    icon: 'pause',
    badgeClasses: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    pillClasses: 'border-orange-500/40 text-orange-700 bg-orange-50',
    description: 'OP temporariamente pausada com motivo registrado'
  },
  'op:concluida': {
    id: 'concluida',
    type: 'production_order',
    label: 'Concluída',
    icon: 'check-circle',
    badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    pillClasses: 'border-emerald-500/40 text-emerald-700 bg-emerald-50',
    description: 'Produção finalizada; entrada de produto acabado no estoque'
  },
  'op:cancelada': {
    id: 'cancelada',
    type: 'production_order',
    label: 'Cancelada',
    icon: 'x',
    badgeClasses: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800',
    pillClasses: 'border-red-500/40 text-red-700 bg-red-50',
    description: 'Ordem de produção cancelada; reservas liberadas'
  },

  // --- OS DE SEPARAÇÃO (PICKING) ---
  'os:aberta': {
    id: 'aberta',
    type: 'picking_order',
    label: 'Aberta na Fila',
    icon: 'inbox',
    badgeClasses: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    pillClasses: 'border-slate-400 text-slate-600 bg-slate-50',
    description: 'Aguardando início de coleta pelo almoxarife'
  },
  'os:em_separacao': {
    id: 'em_separacao',
    type: 'picking_order',
    label: 'Em Coleta',
    icon: 'package',
    badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    pillClasses: 'border-blue-500/40 text-blue-700 bg-blue-50',
    description: 'Almoxarife executando a rota de separação'
  },
  'os:parcial': {
    id: 'parcial',
    type: 'picking_order',
    label: 'Separada Parcial',
    icon: 'alert-circle',
    badgeClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    pillClasses: 'border-amber-500/40 text-amber-700 bg-amber-50',
    description: 'Parte dos itens separada; divergência ou falta registrada'
  },
  'os:separada': {
    id: 'separada',
    type: 'picking_order',
    label: 'Separada / Concluída',
    icon: 'check',
    badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    pillClasses: 'border-emerald-500/40 text-emerald-700 bg-emerald-50',
    description: 'Todos os materiais coletados e baixados; OP liberada'
  },
  'os:cancelada': {
    id: 'cancelada',
    type: 'picking_order',
    label: 'Cancelada',
    icon: 'x',
    badgeClasses: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800',
    pillClasses: 'border-red-500/40 text-red-700 bg-red-50',
    description: 'OS cancelada'
  },

  // --- TICKETS DE SUPORTE ---
  'tk:novo': {
    id: 'novo',
    type: 'ticket',
    label: 'Novo Ticket',
    icon: 'bell',
    badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    pillClasses: 'border-blue-500/40 text-blue-700 bg-blue-50',
    description: 'Ticket aberto aguardando triagem'
  },
  'tk:em_triagem': {
    id: 'em_triagem',
    type: 'ticket',
    label: 'Em Triagem',
    icon: 'eye',
    badgeClasses: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    pillClasses: 'border-indigo-500/40 text-indigo-700 bg-indigo-50',
    description: 'Classificação técnica e atribuição de responsável'
  },
  'tk:em_atendimento': {
    id: 'em_atendimento',
    type: 'ticket',
    label: 'Em Atendimento',
    icon: 'headphones',
    badgeClasses: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    pillClasses: 'border-purple-500/40 text-purple-700 bg-purple-50',
    description: 'Técnico atuando na solução'
  },
  'tk:aguardando_cliente': {
    id: 'aguardando_cliente',
    type: 'ticket',
    label: 'Aguardando Cliente',
    icon: 'user-check',
    badgeClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    pillClasses: 'border-amber-500/40 text-amber-700 bg-amber-50',
    description: 'Aguardando retorno ou teste do cliente (SLA pausado)'
  },
  'tk:aguardando_peca': {
    id: 'aguardando_peca',
    type: 'ticket',
    label: 'Aguardando Peça',
    icon: 'package',
    badgeClasses: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    pillClasses: 'border-orange-500/40 text-orange-700 bg-orange-50',
    description: 'Peça de reposição solicitada (SLA pausado)'
  },
  'tk:em_campo': {
    id: 'em_campo',
    type: 'ticket',
    label: 'Atendimento em Campo',
    icon: 'map-pin',
    badgeClasses: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    pillClasses: 'border-teal-500/40 text-teal-700 bg-teal-50',
    description: 'Técnico deslocado para atendimento presencial'
  },
  'tk:resolvido': {
    id: 'resolvido',
    type: 'ticket',
    label: 'Resolvido',
    icon: 'check-circle',
    badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    pillClasses: 'border-emerald-500/40 text-emerald-700 bg-emerald-50',
    description: 'Solução aplicada com sucesso'
  },
  'tk:fechado': {
    id: 'fechado',
    type: 'ticket',
    label: 'Fechado',
    icon: 'archive',
    badgeClasses: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    pillClasses: 'border-slate-400 text-slate-500 bg-slate-50',
    description: 'Ticket encerrado definitivamente'
  },
  'tk:cancelado': {
    id: 'cancelado',
    type: 'ticket',
    label: 'Cancelado',
    icon: 'x',
    badgeClasses: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800',
    pillClasses: 'border-red-500/40 text-red-700 bg-red-50',
    description: 'Ticket cancelado'
  },

  // --- ALERTAS DE ESTOQUE (PARTE 6) ---
  'alert:aberto': {
    id: 'aberto',
    type: 'stock_alert',
    label: 'Alerta Aberto',
    icon: 'alert-triangle',
    badgeClasses: 'bg-red-500/15 text-red-400 border-red-500/30 font-semibold',
    pillClasses: 'border-red-500/40 text-red-400 bg-red-950/30',
    description: 'Saldo disponível abaixo do mínimo/ponto de reposição'
  },
  'alert:reconhecido': {
    id: 'reconhecido',
    type: 'stock_alert',
    label: 'Reconhecido',
    icon: 'check-square',
    badgeClasses: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    pillClasses: 'border-blue-500/40 text-blue-400 bg-blue-950/30',
    description: 'Gestor assumiu o alerta e está tratando a reposição'
  },
  'alert:em_reposicao': {
    id: 'em_reposicao',
    type: 'stock_alert',
    label: 'Em Reposição',
    icon: 'shopping-cart',
    badgeClasses: 'bg-teal-500/15 text-teal-400 border-teal-500/30 font-medium',
    pillClasses: 'border-teal-500/40 text-teal-400 bg-teal-950/30',
    description: 'Requisição de Compra ou OP vinculada em andamento'
  },
  'alert:resolvido': {
    id: 'resolvido',
    type: 'stock_alert',
    label: 'Resolvido',
    icon: 'check-circle',
    badgeClasses: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    pillClasses: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30',
    description: 'Saldo reposto com histerese de segurança'
  },
  'alert:silenciado': {
    id: 'silenciado',
    type: 'stock_alert',
    label: 'Silenciado (Soneca)',
    icon: 'bell-off',
    badgeClasses: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    pillClasses: 'border-slate-500/40 text-slate-400 bg-slate-900/40',
    description: 'Notificações pausadas até data limite justificada'
  }
};

/**
 * Recupera a definição centralizada do status
 */
export function getStatusDef(type: string, status: string): StatusDefinition {
  let prefix = type;
  if (type === 'requisition' || type === 'req') prefix = 'req';
  else if (type === 'quotation' || type === 'quo') prefix = 'quo';
  else if (type === 'order' || type === 'ord') prefix = 'ord';
  else if (type === 'sales_order' || type === 'pv') prefix = 'pv';
  else if (type === 'production_order' || type === 'op') prefix = 'op';
  else if (type === 'picking_order' || type === 'os') prefix = 'os';
  else if (type === 'ticket' || type === 'tk') prefix = 'tk';
  else if (type === 'stock_alert' || type === 'alert') prefix = 'alert';

  const key = `${prefix}:${status}`;
  if (DOCUMENT_STATUS_CONFIG[key]) {
    return DOCUMENT_STATUS_CONFIG[key];
  }

  return {
    id: status,
    type: prefix,
    label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    icon: 'info',
    badgeClasses: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
    pillClasses: 'border-slate-400 text-slate-600 bg-slate-50',
    description: 'Status'
  };
}

/**
 * Gera HTML de Badge uniforme e sem string literal solta
 */
export function getStatusBadgeHTML(type: string, status: string): string {
  const def = getStatusDef(type, status);
  return `<span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${def.badgeClasses}">
    <span>${def.label}</span>
  </span>`;
}

// Consolidador de Demanda: Agrupa itens de múltiplas requisições somando quantidades
export function consolidateRequisitionItems(
  requisitions: { id: string; numero: string; solicitante: string; items: { id: string; descricao: string; unidade: string; quantidade: number }[] }[]
): {
  consolidatedItems: {
    descricao: string;
    unidade: string;
    quantidadeTotal: number;
    origens: { requisitionId: string; reqNumero: string; solicitante: string; reqItemId: string; quantidade: number }[];
  }[];
  requisitionIds: string[];
} {
  const itemMap = new Map<string, {
    descricao: string;
    unidade: string;
    quantidadeTotal: number;
    origens: { requisitionId: string; reqNumero: string; solicitante: string; reqItemId: string; quantidade: number }[];
  }>();

  const reqIds: string[] = [];

  for (const req of requisitions) {
    reqIds.push(req.id);
    for (const it of req.items) {
      const key = `${it.descricao.trim().toLowerCase()}_${it.unidade.trim().toLowerCase()}`;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          descricao: it.descricao.trim(),
          unidade: it.unidade.trim(),
          quantidadeTotal: 0,
          origens: []
        });
      }

      const entry = itemMap.get(key)!;
      entry.quantidadeTotal += it.quantidade;
      entry.origens.push({
        requisitionId: req.id,
        reqNumero: req.numero,
        solicitante: req.solicitante,
        reqItemId: it.id,
        quantidade: it.quantidade
      });
    }
  }

  return {
    consolidatedItems: Array.from(itemMap.values()),
    requisitionIds: reqIds
  };
}
