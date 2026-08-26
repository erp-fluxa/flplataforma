import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ======================= BLOCO 1: GOVERNANÇA, USUÁRIOS E AUDITORIA =======================

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  approvalLimitCents: integer('approval_limit_cents').default(0), // Limite em R$ (centavos). 0 = Sem alçada; null = Ilimitado
  permissions: text('permissions').notNull().default('[]'), // JSON array
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  roleId: text('role_id').notNull().references(() => roles.id),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  preferences: text('preferences').default('{"sidebarCollapsed":false}'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const userPermissionOverrides = sqliteTable('user_permission_overrides', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  permissionKey: text('permission_key').notNull(),
  effect: text('effect').notNull(), // 'allow' | 'deny' | 'inherit'
  createdAt: text('created_at').notNull()
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull()
});

export const revokedTokens = sqliteTable('revoked_tokens', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  userId: text('user_id').notNull(),
  revokedAt: text('revoked_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  reason: text('reason')
});

export const sequences = sqliteTable('sequences', {
  name: text('name').primaryKey(),
  current: integer('current').notNull().default(0)
});

export const companySettings = sqliteTable('company_settings', {
  id: text('id').primaryKey(),
  razaoSocial: text('razao_social').notNull(),
  nomeFantasia: text('nome_fantasia').notNull(),
  cnpj: text('cnpj').notNull(),
  ie: text('ie'),
  endereco: text('endereco'),
  bairro: text('bairro'),
  cidade: text('cidade'),
  uf: text('uf'),
  cep: text('cep'),
  email: text('email'),
  telefone: text('telefone'),
  logoDark: text('logo_dark'),
  logoWhite: text('logo_white'),
  seqReqPrefix: text('seq_req_prefix').default('REQ-'),
  seqCotPrefix: text('seq_cot_prefix').default('COT-'),
  seqPcPrefix: text('seq_pc_prefix').default('PC-'),
  seqOpPrefix: text('seq_op_prefix').default('OP-'),
  seqPvPrefix: text('seq_pv_prefix').default('PV-'),
  seqOsPrefix: text('seq_os_prefix').default('OS-'),
  seqTkPrefix: text('seq_tk_prefix').default('TK-'),
  alertasAtivos: integer('alertas_ativos', { mode: 'boolean' }).default(true),
  percentualHistereseResolucao: integer('percentual_histerese').default(5),
  horarioDigest: text('horario_digest').default('08:00'),
  diasParaEscalonamento: integer('dias_escalonamento').default(2),
  horarioVarreduraDiaria: text('horario_varredura').default('06:00'),
  janelaConsumoMedioDias: integer('janela_consumo_dias').default(90),
  lastBackup: text('last_backup'),
  updatedAt: text('updated_at').notNull()
});

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  userName: text('user_name').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  details: text('details'), // JSON string
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull()
});

// ======================= BLOCO 2: CADASTROS BÁSICOS & PRODUTOS =======================

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  cnpj: text('cnpj'),
  contatoNome: text('contato_nome'),
  email: text('email'),
  telefone: text('telefone'),
  cidade: text('cidade'),
  uf: text('uf'),
  categorias: text('categorias').default('[]'),
  ativo: integer('ativo', { mode: 'boolean' }).default(true),
  observacoes: text('observacoes')
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  codigo: text('codigo').notNull().unique(),
  descricao: text('descricao').notNull(),
  unidade: text('unidade').notNull().default('UN'),
  categoria: text('categoria'),
  tipo: text('tipo').notNull().default('materia_prima'), // 'materia_prima' | 'componente' | 'produto_acabado' | 'servico'
  precoReferencia: integer('preco_referencia'), // Centavos
  estoqueMinimo: integer('estoque_minimo').default(0), // Milésimos
  estoqueMaximo: integer('estoque_maximo').default(0), // Milésimos
  pontoReposicao: integer('ponto_reposicao'), // Milésimos
  loteEconomico: integer('lote_economico').default(1000), // Milésimos
  leadTimeCompraDias: integer('lead_time_compra_dias').default(5),
  controlaLote: integer('controla_lote', { mode: 'boolean' }).default(false),
  controlaSerie: integer('controla_serie', { mode: 'boolean' }).default(false),
  produzivel: integer('produzivel', { mode: 'boolean' }).default(false),
  sobEncomenda: integer('sob_encomenda', { mode: 'boolean' }).default(true),
  linha: text('linha'), // 'CV' | 'CX'
  volumeXy: text('volume_xy'), // ex: "800×800 mm"
  eixoZ: text('eixo_z'), // ex: "150 mm"
  sinalEntradaCents: integer('sinal_entrada_cents'), // Centavos
  destaqueComercial: text('destaque_comercial'),
  prazoFabricacaoDias: integer('prazo_fabricacao_dias').default(60),
  alertaEstoqueAtivo: integer('alerta_estoque_ativo', { mode: 'boolean' }).default(true),
  alertaResponsavelId: text('alerta_responsavel_id'),
  consumoMedioDiario: integer('consumo_medio_diario').default(0) // Milésimos/dia
});

// ======================= BLOCO 3: ESTOQUE, DEPÓSITOS, RESERVAS E RAZÃO =======================

export const warehouses = sqliteTable('warehouses', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(), // 'materia_prima' | 'produto_acabado' | 'expedicao' | 'refugo' | 'terceiros'
  ativo: integer('ativo', { mode: 'boolean' }).default(true)
});

export const locations = sqliteTable('locations', {
  id: text('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  codigo: text('codigo').notNull(), // ex: "A-03-02"
  descricao: text('descricao'),
  ativo: integer('ativo', { mode: 'boolean' }).default(true)
});

export const stockBalances = sqliteTable('stock_balances', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  locationId: text('location_id').references(() => locations.id),
  quantidade: integer('quantidade').notNull().default(0), // Saldo FÍSICO em milésimos
  custoMedio: integer('custo_medio').default(0) // Centavos
});

export const stockReservations = sqliteTable('stock_reservations', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  locationId: text('location_id').references(() => locations.id),
  quantidade: integer('quantidade').notNull(), // Milésimos
  origemTipo: text('origem_tipo').notNull(), // 'ordem_producao' | 'pedido_venda' | 'ticket'
  origemId: text('origem_id').notNull(),
  status: text('status').notNull().default('ativa'), // 'ativa' | 'consumida' | 'liberada' | 'cancelada'
  criadoEm: text('criado_em').notNull()
});

export const stockMovements = sqliteTable('stock_movements', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  locationId: text('location_id').references(() => locations.id),
  tipo: text('tipo').notNull(), // 'entrada_compra' | 'saida_producao' | 'entrada_producao' | 'devolucao_producao' | 'ajuste_inventario' | 'transferencia' | 'saida_venda' | 'entrada_devolucao_cliente' | 'saida_refugo'
  quantidade: integer('quantidade').notNull(), // Milésimos (sempre positiva)
  sinal: integer('sinal').notNull(), // 1 ou -1
  custoUnitario: integer('custo_unitario').default(0), // Centavos
  origemTipo: text('origem_tipo'), // 'ordem_producao' | 'pedido_compra' | 'pedido_venda' | 'ajuste' | 'ticket'
  origemId: text('origem_id'),
  estornoDeId: text('estorno_de_id'),
  loteId: text('lote_id'),
  numeroSerie: text('numero_serie'),
  userId: text('user_id'),
  observacao: text('observacao'),
  criadoEm: text('criado_em').notNull()
});

export const stockLots = sqliteTable('stock_lots', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  codigo: text('codigo').notNull(),
  numeroSerie: text('numero_serie'),
  validade: text('validade'),
  fornecedorId: text('fornecedor_id').references(() => suppliers.id),
  criadoEm: text('criado_em').notNull()
});

// ======================= BLOCO 4: ALERTAS DE ESTOQUE (PARTE 6) & NOTIFICAÇÕES =======================

export const stockAlerts = sqliteTable('stock_alerts', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  nivel: text('nivel').notNull(), // 'atencao' | 'critico' | 'zerado'
  disponivelNoDisparo: integer('disponivel_no_disparo').notNull(), // Milésimos
  estoqueMinimoNoDisparo: integer('estoque_minimo_no_disparo').notNull(),
  pontoReposicaoNoDisparo: integer('ponto_reposicao_no_disparo').notNull(),
  origemTipo: text('origem_tipo').notNull(), // 'movimentacao' | 'reserva' | 'inventario' | 'varredura_diaria' | 'manual'
  origemId: text('origem_id'),
  status: text('status').notNull().default('aberto'), // 'aberto' | 'reconhecido' | 'em_reposicao' | 'resolvido' | 'silenciado'
  reconhecidoPor: text('reconhecido_por'),
  reconhecidoEm: text('reconhecido_em'),
  silenciadoAte: text('silenciado_ate'),
  requisitionId: text('requisition_id'),
  productionOrderId: text('production_order_id'),
  resolvidoEm: text('resolvido_em'),
  resolvidoPorque: text('resolvido_porque'), // 'reposicao' | 'ajuste_minimo' | 'cancelado' | 'manual'
  criadoEm: text('criado_em').notNull(),
  atualizadoEm: text('atualizado_em').notNull()
});

export const stockAlertEvents = sqliteTable('stock_alert_events', {
  id: text('id').primaryKey(),
  alertId: text('alert_id').notNull().references(() => stockAlerts.id),
  tipo: text('tipo').notNull(), // 'aberto' | 'escalou' | 'reduziu' | 'reconhecido' | 'silenciado' | 'requisicao_criada' | 'op_criada' | 'resolvido' | 'reaberto'
  nivelAnterior: text('nivel_anterior'),
  nivelNovo: text('nivel_novo'),
  disponivel: integer('disponivel').notNull(),
  userId: text('user_id'),
  detalhes: text('detalhes'), // JSON
  criadoEm: text('criado_em').notNull()
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  tipo: text('tipo').notNull(), // 'alerta_estoque' | 'op_liberada' | 'sla_alerta' | 'geral'
  titulo: text('titulo').notNull(),
  mensagem: text('mensagem').notNull(),
  documentoTipo: text('documento_tipo'),
  documentoId: text('documento_id'),
  lidaEm: text('lida_em'),
  criadoEm: text('criado_em').notNull()
});

// ======================= BLOCO 5: FICHA TÉCNICA (BOM) & ROTEIRO =======================

export const bomVersions = sqliteTable('bom_versions', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  versao: text('versao').notNull(), // ex: "v1.0"
  descricao: text('descricao'),
  status: text('status').notNull().default('rascunho'), // 'rascunho' | 'ativa' | 'obsoleta'
  vigenteDe: text('vigente_de'),
  vigenteAte: text('vigente_ate'),
  criadoEm: text('criado_em').notNull()
});

export const bomItems = sqliteTable('bom_items', {
  id: text('id').primaryKey(),
  bomVersionId: text('bom_version_id').notNull().references(() => bomVersions.id),
  componentProductId: text('component_product_id').notNull().references(() => products.id),
  quantidade: integer('quantidade').notNull(), // Milésimos por 1 unidade do pai
  perdaPercentual: integer('perda_percentual').default(0), // Ex: 500 = 5.0%
  operacaoId: text('operacao_id'),
  opcional: integer('opcional', { mode: 'boolean' }).default(false),
  observacao: text('observacao')
});

export const workCenters = sqliteTable('work_centers', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(), // 'maquina' | 'bancada' | 'celula' | 'externo'
  capacidadeHoraDia: integer('capacidade_hora_dia').default(8),
  custoHora: integer('custo_hora').default(0), // Centavos
  ativo: integer('ativo', { mode: 'boolean' }).default(true)
});

export const routingOperations = sqliteTable('routing_operations', {
  id: text('id').primaryKey(),
  bomVersionId: text('bom_version_id').notNull().references(() => bomVersions.id),
  sequencia: integer('sequencia').notNull(),
  nome: text('nome').notNull(),
  workCenterId: text('work_center_id').references(() => workCenters.id),
  tempoSetupMin: integer('tempo_setup_min').default(0),
  tempoUnitarioMin: integer('tempo_unitario_min').default(0),
  instrucoes: text('instrucoes')
});

// ======================= BLOCO 6: VENDAS (CLIENTES & PV) =======================

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  cnpjCpf: text('cnpj_cpf'),
  contatoNome: text('contato_nome'),
  email: text('email'),
  telefone: text('telefone'),
  cidade: text('cidade'),
  uf: text('uf'),
  endereco: text('endereco'),
  observacoes: text('observacoes'),
  ativo: integer('ativo', { mode: 'boolean' }).default(true)
});

export const salesOrders = sqliteTable('sales_orders', {
  id: text('id').primaryKey(),
  numero: text('numero').notNull().unique(), // "PV-0001"
  customerId: text('customer_id').notNull().references(() => customers.id),
  vendedorId: text('vendedor_id'),
  condicaoPagamento: text('condicao_pagamento'),
  formaPagamento: text('forma_pagamento'),
  prazoEntrega: text('prazo_entrega'),
  dataEntregaPrometida: text('data_entrega_prometida'),
  frete: integer('frete').default(0), // Centavos
  desconto: integer('desconto').default(0), // Centavos
  status: text('status').notNull().default('orcamento'), // 'orcamento' | 'confirmado' | 'em_producao' | 'parcial' | 'pronto_expedicao' | 'faturado' | 'entregue' | 'cancelado'
  observacoes: text('observacoes'),
  criadoEm: text('criado_em').notNull()
});

export const salesOrderItems = sqliteTable('sales_order_items', {
  id: text('id').primaryKey(),
  salesOrderId: text('sales_order_id').notNull().references(() => salesOrders.id),
  productId: text('product_id').notNull().references(() => products.id),
  descricao: text('descricao').notNull(),
  unidade: text('unidade').notNull().default('UN'),
  quantidade: integer('quantidade').notNull(), // Milésimos
  precoUnitario: integer('preco_unitario').notNull(), // Centavos
  modeloMaquina: text('modelo_maquina'),
  bomVersionId: text('bom_version_id').references(() => bomVersions.id),
  configuracao: text('configuracao'), // JSON
  quantidadeProduzida: integer('quantidade_produzida').default(0),
  quantidadeEntregue: integer('quantidade_entregue').default(0)
});

// ======================= BLOCO 7: PRODUÇÃO, SEPARAÇÃO & CHÃO DE FÁBRICA =======================

export const productionOrders = sqliteTable('production_orders', {
  id: text('id').primaryKey(),
  numero: text('numero').notNull().unique(), // "OP-0001"
  salesOrderId: text('sales_order_id').references(() => salesOrders.id),
  salesOrderItemId: text('sales_order_item_id').references(() => salesOrderItems.id),
  productId: text('product_id').notNull().references(() => products.id),
  modeloMaquina: text('modelo_maquina'),
  bomVersionId: text('bom_version_id').references(() => bomVersions.id),
  quantidade: integer('quantidade').notNull(), // Milésimos
  quantidadeProduzida: integer('quantidade_produzida').default(0),
  quantidadeRefugo: integer('quantidade_refugo').default(0),
  prioridade: text('prioridade').notNull().default('normal'), // 'baixa' | 'normal' | 'alta' | 'urgente'
  dataPrevistaInicio: text('data_prevista_inicio'),
  dataPrevistaFim: text('data_prevista_fim'),
  dataInicioReal: text('data_inicio_real'),
  dataFimReal: text('data_fim_real'),
  status: text('status').notNull().default('planejada'), // 'planejada' | 'aguardando_material' | 'material_reservado' | 'separacao_pendente' | 'liberada' | 'em_producao' | 'pausada' | 'concluida' | 'cancelada'
  tipo: text('tipo').notNull().default('normal'), // 'normal' | 'retrabalho' | 'estoque'
  ticketId: text('ticket_id'),
  posicaoKanban: integer('posicao_kanban').default(0),
  responsavelId: text('responsavel_id'),
  observacoes: text('observacoes'),
  criadoEm: text('criado_em').notNull()
});

export const productionOrderMaterials = sqliteTable('production_order_materials', {
  id: text('id').primaryKey(),
  productionOrderId: text('production_order_id').notNull().references(() => productionOrders.id),
  componentProductId: text('component_product_id').notNull().references(() => products.id),
  quantidadeNecessaria: integer('quantidade_necessaria').notNull(), // Milésimos
  quantidadeReservada: integer('quantidade_reservada').default(0),
  quantidadeSeparada: integer('quantidade_separada').default(0),
  quantidadeConsumida: integer('quantidade_consumida').default(0),
  quantidadeDevolvida: integer('quantidade_devolvida').default(0),
  faltaQuantidade: integer('falta_quantidade').default(0),
  requisitionId: text('requisition_id')
});

export const pickingOrders = sqliteTable('picking_orders', {
  id: text('id').primaryKey(),
  numero: text('numero').notNull().unique(), // "OS-0001"
  productionOrderId: text('production_order_id').notNull().references(() => productionOrders.id),
  status: text('status').notNull().default('aberta'), // 'aberta' | 'em_separacao' | 'separada' | 'parcial' | 'cancelada'
  responsavelId: text('responsavel_id'),
  iniciadoEm: text('iniciado_em'),
  concluidoEm: text('concluido_em'),
  observacoes: text('observacoes')
});

export const pickingItems = sqliteTable('picking_items', {
  id: text('id').primaryKey(),
  pickingOrderId: text('picking_order_id').notNull().references(() => pickingOrders.id),
  productionOrderMaterialId: text('production_order_material_id').notNull().references(() => productionOrderMaterials.id),
  componentProductId: text('component_product_id').notNull().references(() => products.id),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  locationId: text('location_id').references(() => locations.id),
  quantidadeSolicitada: integer('quantidade_solicitada').notNull(), // Milésimos
  quantidadeSeparada: integer('quantidade_separada').default(0),
  loteId: text('lote_id'),
  status: text('status').notNull().default('pendente'), // 'pendente' | 'separado' | 'falta' | 'substituido'
  observacao: text('observacao')
});

export const productionEvents = sqliteTable('production_events', {
  id: text('id').primaryKey(),
  productionOrderId: text('production_order_id').notNull().references(() => productionOrders.id),
  operationId: text('operation_id'),
  tipo: text('tipo').notNull(), // 'inicio' | 'pausa' | 'retomada' | 'apontamento' | 'refugo' | 'conclusao' | 'devolucao_material'
  quantidadeBoa: integer('quantidade_boa').default(0),
  quantidadeRefugo: integer('quantidade_refugo').default(0),
  motivoRefugo: text('motivo_refugo'),
  operadorId: text('operador_id'),
  workCenterId: text('work_center_id').references(() => workCenters.id),
  minutos: integer('minutos').default(0),
  observacao: text('observacao'),
  criadoEm: text('criado_em').notNull()
});

// ======================= BLOCO 8: SUPORTE & PÓS-VENDA =======================

export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey(),
  numero: text('numero').notNull().unique(), // "TK-0001"
  titulo: text('titulo').notNull(),
  descricao: text('descricao'),
  customerId: text('customer_id').references(() => customers.id),
  salesOrderId: text('sales_order_id').references(() => salesOrders.id),
  productionOrderId: text('production_order_id').references(() => productionOrders.id),
  productId: text('product_id').references(() => products.id),
  numeroSerie: text('numero_serie'),
  categoria: text('categoria').notNull().default('duvida'), // 'duvida' | 'defeito' | 'instalacao' | 'manutencao' | 'garantia' | 'pedido_peca' | 'melhoria' | 'outro'
  canal: text('canal').notNull().default('whatsapp'), // 'telefone' | 'email' | 'whatsapp' | 'presencial' | 'portal'
  prioridade: text('prioridade').notNull().default('normal'), // 'baixa' | 'normal' | 'alta' | 'critica'
  status: text('status').notNull().default('novo'), // 'novo' | 'em_triagem' | 'em_atendimento' | 'aguardando_cliente' | 'aguardando_peca' | 'em_campo' | 'resolvido' | 'fechado' | 'cancelado'
  responsavelId: text('responsavel_id'),
  solicitanteNome: text('solicitante_nome'),
  solicitanteContato: text('solicitante_contato'),
  slaPrimeiraRespostaAte: text('sla_primeira_resposta_ate'),
  slaResolucaoAte: text('sla_resolucao_ate'),
  primeiraRespostaEm: text('primeira_resposta_em'),
  resolvidoEm: text('resolvido_em'),
  fechadoEm: text('fechado_em'),
  emGarantia: integer('em_garantia', { mode: 'boolean' }).default(true),
  posicaoKanban: integer('posicao_kanban').default(0),
  criadoEm: text('criado_em').notNull()
});

export const ticketMessages = sqliteTable('ticket_messages', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull().references(() => tickets.id),
  tipo: text('tipo').notNull(), // 'nota_interna' | 'resposta_cliente' | 'mensagem_cliente' | 'evento'
  autorId: text('autor_id'),
  conteudo: text('conteudo').notNull(),
  criadoEm: text('criado_em').notNull()
});

export const ticketParts = sqliteTable('ticket_parts', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull().references(() => tickets.id),
  productId: text('product_id').notNull().references(() => products.id),
  quantidade: integer('quantidade').notNull(), // Milésimos
  origem: text('origem').notNull().default('estoque'), // 'estoque' | 'compra'
  status: text('status').notNull().default('solicitada'), // 'solicitada' | 'reservada' | 'separada' | 'entregue' | 'cancelada'
  reservationId: text('reservation_id'),
  requisitionId: text('requisition_id'),
  cobrar: integer('cobrar', { mode: 'boolean' }).default(false)
});

export const slaPolicies = sqliteTable('sla_policies', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  prioridade: text('prioridade').notNull(),
  minutosPrimeiraResposta: integer('minutos_primeira_resposta').notNull(),
  minutosResolucao: integer('minutos_resolucao').notNull(),
  considerarHorarioComercial: integer('considerar_horario_comercial', { mode: 'boolean' }).default(true),
  ativo: integer('ativo', { mode: 'boolean' }).default(true)
});

// ======================= BLOCO 9: COMPRAS & COTAÇÕES (EXISTENTES / INTEGRADOS) =======================

export const requisitions = sqliteTable('requisitions', {
  id: text('id').primaryKey(),
  numero: text('numero').notNull().unique(),
  solicitante: text('solicitante').notNull(),
  setor: text('setor').notNull(),
  centroCusto: text('centro_custo'),
  prioridade: text('prioridade').notNull().default('normal'),
  dataNecessidade: text('data_necessidade'),
  justificativa: text('justificativa'),
  status: text('status').notNull().default('rascunho'),
  motivoReprovacao: text('motivo_reprovacao'),
  criadoEm: text('criado_em').notNull()
});

export const requisitionItems = sqliteTable('requisition_items', {
  id: text('id').primaryKey(),
  requisitionId: text('requisition_id').notNull().references(() => requisitions.id),
  productId: text('product_id'),
  descricao: text('descricao').notNull(),
  unidade: text('unidade').notNull(),
  quantidade: integer('quantidade').notNull(),
  observacao: text('observacao')
});

export const quotations = sqliteTable('quotations', {
  id: text('id').primaryKey(),
  numero: text('numero').notNull().unique(),
  origem: text('origem').notNull().default('padrao'),
  comparacaoBase: text('comparacao_base').notNull().default('a_vista'),
  requisitionId: text('requisition_id').references(() => requisitions.id),
  titulo: text('titulo').notNull(),
  solicitante: text('solicitante'),
  comprador: text('comprador').notNull(),
  fornecedor: text('fornecedor'),
  fornecedorId: text('fornecedor_id'),
  status: text('status').notNull().default('nova_solicitacao'),
  prioridade: text('prioridade').notNull().default('normal'),
  prazo: text('prazo').notNull(),
  valorEstimado: integer('valor_estimado'),
  valorFinal: integer('valor_final'),
  bloqueado: integer('bloqueado', { mode: 'boolean' }).default(false),
  motivoBloqueio: text('motivo_bloqueio'),
  motivoReprovacao: text('motivo_reprovacao'),
  observacoes: text('observacoes'),
  anexos: text('anexos').default('[]'),
  comentarios: text('comentarios').default('[]'),
  historico: text('historico').default('[]'),
  orderId: text('order_id'),
  criadoEm: text('criado_em').notNull()
});

export const quotationItems = sqliteTable('quotation_items', {
  id: text('id').primaryKey(),
  quotationId: text('quotation_id').notNull().references(() => quotations.id),
  descricao: text('descricao').notNull(),
  unidade: text('unidade').notNull(),
  quantidade: integer('quantidade').notNull(),
  valorEstimadoUnit: integer('valor_estimado_unit'),
  vencedorSupplierId: text('vencedor_supplier_id'),
  vencedorPrecoUnit: integer('vencedor_preco_unit'),
  precoAVistaUnit: integer('preco_a_vista_unit'),
  precoParceladoUnit: integer('preco_parcelado_unit'),
  numeroParcelas: integer('numero_parcelas').default(1),
  convertido: integer('convertido', { mode: 'boolean' }).default(false)
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  numero: text('numero').notNull().unique(),
  quotationId: text('quotation_id').references(() => quotations.id),
  requisitionId: text('requisition_id'),
  supplierId: text('supplier_id').notNull().references(() => suppliers.id),
  condicaoPagamento: text('condicao_pagamento'),
  prazoEntrega: text('prazo_entrega'),
  frete: integer('frete').default(0),
  desconto: integer('desconto').default(0),
  status: text('status').notNull().default('emitido'),
  criadoEm: text('criado_em').notNull(),
  observacoes: text('observacoes')
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  quotationItemId: text('quotation_item_id'),
  descricao: text('descricao').notNull(),
  unidade: text('unidade').notNull(),
  quantidade: integer('quantidade').notNull(),
  precoUnitario: integer('preco_unitario').notNull(),
  quantidadeRecebida: integer('quantidade_recebida').default(0)
});

// ======================= BLOCO 10: RASTREABILIDADE & EVENTOS UNIFICADOS =======================

export const documentLinks = sqliteTable('document_links', {
  id: text('id').primaryKey(),
  sourceType: text('source_type').notNull(), // 'pedido_venda' | 'ordem_producao' | 'os_separacao' | 'requisicao' | 'cotacao' | 'pedido_compra' | 'ticket' | 'movimentacao'
  sourceId: text('source_id').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  createdAt: text('created_at').notNull()
});

export const flowEvents = sqliteTable('flow_events', {
  id: text('id').primaryKey(),
  documentType: text('document_type').notNull(),
  documentId: text('document_id').notNull(),
  eventType: text('event_type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  userId: text('user_id'),
  userName: text('user_name').notNull(),
  createdAt: text('created_at').notNull(),
  metadata: text('metadata') // JSON
});

export const itemFulfillment = sqliteTable('item_fulfillment', {
  id: text('id').primaryKey(),
  requisitionItemId: text('requisition_item_id').notNull(),
  quotationItemId: text('quotation_item_id'),
  orderItemId: text('order_item_id'),
  requestedQty: integer('requested_qty').notNull(),
  quotedQty: integer('quoted_qty').default(0),
  orderedQty: integer('ordered_qty').default(0),
  receivedQty: integer('received_qty').default(0),
  status: text('status').notNull().default('pendente')
});
