// src/types/index.ts — Tipagens TypeScript do Sistema ERP Cotalis JP3D

export type PermissionKey =
  // Compras & Cotações
  | 'compras.requisicoes.ver'
  | 'compras.requisicoes.criar'
  | 'compras.requisicoes.editar'
  | 'compras.requisicoes.excluir'
  | 'compras.requisicoes.aprovar'
  | 'compras.cotacoes.ver'
  | 'compras.cotacoes.criar'
  | 'compras.cotacoes.editar'
  | 'compras.cotacoes.excluir'
  | 'compras.cotacoes.aprovar'
  | 'compras.cotacoes.converter_pedido'
  | 'compras.cotacoes.bloquear'
  | 'compras.pedidos.ver'
  | 'compras.pedidos.criar'
  | 'compras.pedidos.receber'
  | 'compras.pedidos.cancelar'
  | 'compras.fornecedores.ver'
  | 'compras.fornecedores.gerenciar'
  | 'compras.produtos.ver'
  | 'compras.produtos.gerenciar'
  // Vendas
  | 'vendas.pedidos.ver'
  | 'vendas.pedidos.criar'
  | 'vendas.pedidos.editar'
  | 'vendas.pedidos.confirmar'
  | 'vendas.pedidos.cancelar'
  | 'vendas.pedidos.faturar'
  // Produção & Fichas
  | 'producao.ordens.ver'
  | 'producao.ordens.criar'
  | 'producao.ordens.editar'
  | 'producao.ordens.liberar'
  | 'producao.ordens.apontar'
  | 'producao.ordens.concluir'
  | 'producao.ordens.cancelar'
  | 'producao.fichas.ver'
  | 'producao.fichas.criar'
  | 'producao.fichas.editar'
  | 'producao.fichas.ativar'
  | 'producao.fichas.excluir'
  | 'producao.apontamento.apontar'
  | 'producao.apontamento.refugar'
  | 'producao.apontamento.pausar'
  // Estoque, Separação & Alertas
  | 'estoque.materiaprima.ver'
  | 'estoque.materiaprima.gerenciar'
  | 'estoque.materiaprima.importar'
  | 'estoque.modelos.ver'
  | 'estoque.modelos.gerenciar'
  | 'estoque.separacao.ver'
  | 'estoque.separacao.executar'
  | 'estoque.separacao.cancelar'
  | 'estoque.movimentacoes.ver'
  | 'estoque.movimentacoes.criar'
  | 'estoque.movimentacoes.estornar'
  | 'estoque.movimentacoes.permitir_negativo'
  | 'estoque.inventario.ver'
  | 'estoque.inventario.criar'
  | 'estoque.inventario.aprovar_ajuste'
  | 'estoque.alertas.ver'
  | 'estoque.alertas.receber'
  | 'estoque.alertas.reconhecer'
  | 'estoque.alertas.silenciar'
  | 'estoque.alertas.configurar'
  // Suporte & Pós-Venda
  | 'suporte.tickets.ver'
  | 'suporte.tickets.criar'
  | 'suporte.tickets.editar'
  | 'suporte.tickets.atribuir'
  | 'suporte.tickets.responder'
  | 'suporte.tickets.resolver'
  | 'suporte.tickets.fechar'
  | 'suporte.pecas.solicitar'
  | 'suporte.pecas.aprovar_cobranca'
  // Configurações
  | 'config.usuarios.ver'
  | 'config.usuarios.gerenciar'
  | 'config.funcoes.ver'
  | 'config.funcoes.gerenciar'
  | 'config.empresa.ver'
  | 'config.empresa.editar'
  | 'config.auditoria.ver'
  | 'config.producao.ver'
  | 'config.producao.editar'
  | 'config.suporte.ver'
  | 'config.suporte.editar';

export interface UserPreferences {
  sidebarCollapsed?: boolean;
  theme?: 'dark' | 'light';
  viewModeCotacoes?: 'kanban' | 'lista';
  notificacoesWhatsapp?: boolean;
  notificacoesEmail?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  active: boolean;
  preferences?: UserPreferences;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  approvalLimitCents: number | null; // null = ilimitado, 0 = sem alçada
  permissions: PermissionKey[];
}

export interface MaterialCategory {
  id: string;
  nome: string;
  tipo: 'MP' | 'MUC';
  descricao?: string;
  sistema?: boolean;
}

export interface Product {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  categoria?: string;
  tipo: 'PA' | 'MP' | 'MUC' | 'materia_prima' | 'componente' | 'produto_acabado' | 'servico';
  precoReferencia?: number; // Centavos
  custoMedioCents?: number; // Centavos
  estoqueMinimo?: number; // Milésimos
  estoqueMaximo?: number; // Milésimos
  pontoReposicao?: number; // Milésimos
  loteEconomico?: number; // Milésimos
  leadTimeCompraDias?: number;
  fornecedorId?: string;
  localizacao?: string;
  controlaLote?: boolean;
  controlaSerie?: boolean;
  produzivel?: boolean;
  sobEncomenda?: boolean;
  linha?: 'CV' | 'CX';
  volumeXy?: string;
  eixoZ?: string;
  sinalEntradaCents?: number;
  destaqueComercial?: string;
  prazoFabricacaoDias?: number;
  alertaEstoqueAtivo?: boolean;
  alertaResponsavelId?: string;
  consumoMedioDiario?: number; // Milésimos
}

// Alertas de Estoque (Parte 6)
export interface StockAlert {
  id: string;
  productId: string;
  nivel: 'atencao' | 'critico' | 'zerado';
  disponivelNoDisparo: number; // Milésimos
  estoqueMinimoNoDisparo: number;
  pontoReposicaoNoDisparo: number;
  origemTipo: 'movimentacao' | 'reserva' | 'inventario' | 'varredura_diaria' | 'manual';
  origemId?: string;
  status: 'aberto' | 'reconhecido' | 'em_reposicao' | 'resolvido' | 'silenciado';
  reconhecidoPor?: string;
  reconhecidoEm?: string;
  silenciadoAte?: string;
  requisitionId?: string;
  productionOrderId?: string;
  resolvidoEm?: string;
  resolvidoPorque?: 'reposicao' | 'ajuste_minimo' | 'cancelado' | 'manual';
  criadoEm: string;
  atualizadoEm: string;
}

export interface StockAlertEvent {
  id: string;
  alertId: string;
  tipo: 'aberto' | 'escalou' | 'reduziu' | 'reconhecido' | 'silenciado' | 'requisicao_criada' | 'op_criada' | 'resolvido' | 'reaberto';
  nivelAnterior?: string;
  nivelNovo?: string;
  disponivel: number;
  userId?: string;
  detalhes?: any;
  criadoEm: string;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  tipo: 'alerta_estoque' | 'op_liberada' | 'sla_alerta' | 'geral';
  titulo: string;
  mensagem: string;
  documentoTipo?: string;
  documentoId?: string;
  lidaEm?: string;
  criadoEm: string;
}

// Vendas
export interface Customer {
  id: string;
  nome: string;
  cnpjCpf?: string;
  contatoNome?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  uf?: string;
  endereco?: string;
  observacoes?: string;
  ativo?: boolean;
}

export interface SalesOrder {
  id: string;
  numero: string;
  customerId: string;
  vendedorId?: string;
  condicaoPagamento?: string;
  formaPagamento?: string;
  prazoEntrega?: string;
  dataEntregaPrometida?: string;
  frete?: number; // Centavos
  desconto?: number; // Centavos
  status: 'orcamento' | 'confirmado' | 'em_producao' | 'parcial' | 'pronto_expedicao' | 'faturado' | 'entregue' | 'cancelado';
  observacoes?: string;
  criadoEm: string;
}

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  productId: string;
  descricao: string;
  unidade: string;
  quantidade: number; // Milésimos
  precoUnitario: number; // Centavos
  modeloMaquina?: string;
  bomVersionId?: string;
  configuracao?: string;
  quantidadeProduzida?: number;
  quantidadeEntregue?: number;
}

// Ficha Técnica (BOM)
export interface BOMVersion {
  id: string;
  productId: string;
  versao: string;
  descricao?: string;
  status: 'rascunho' | 'ativa' | 'obsoleta';
  vigenteDe?: string;
  vigenteAte?: string;
  criadoEm: string;
}

export interface BOMItem {
  id: string;
  bomVersionId: string;
  componentProductId: string;
  quantidade: number; // Milésimos
  perdaPercentual?: number;
  operacaoId?: string;
  opcional?: boolean;
  observacao?: string;
}

export interface WorkCenter {
  id: string;
  nome: string;
  tipo: 'maquina' | 'bancada' | 'celula' | 'externo';
  capacidadeHoraDia?: number;
  custoHora?: number; // Centavos
  ativo?: boolean;
}

export interface RoutingOperation {
  id: string;
  bomVersionId: string;
  sequencia: number;
  nome: string;
  workCenterId?: string;
  tempoSetupMin?: number;
  tempoUnitarioMin?: number;
  instrucoes?: string;
}

// Produção
export interface ProductionOrder {
  id: string;
  numero: string;
  salesOrderId?: string;
  salesOrderItemId?: string;
  productId: string;
  modeloMaquina?: string;
  bomVersionId?: string;
  quantidade: number; // Milésimos
  quantidadeProduzida?: number;
  quantidadeRefugo?: number;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  dataPrevistaInicio?: string;
  dataPrevistaFim?: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  status: 'planejada' | 'aguardando_material' | 'material_reservado' | 'separacao_pendente' | 'liberada' | 'em_producao' | 'pausada' | 'concluida' | 'cancelada';
  tipo: 'normal' | 'retrabalho' | 'estoque';
  ticketId?: string;
  posicaoKanban?: number;
  responsavelId?: string;
  observacoes?: string;
  criadoEm: string;
}

export interface ProductionOrderMaterial {
  id: string;
  productionOrderId: string;
  componentProductId: string;
  quantidadeNecessaria: number; // Milésimos
  quantidadeReservada: number;
  quantidadeSeparada: number;
  quantidadeConsumida: number;
  quantidadeDevolvida: number;
  faltaQuantidade: number;
  requisitionId?: string;
}

export interface PickingOrder {
  id: string;
  numero: string;
  productionOrderId: string;
  status: 'aberta' | 'em_separacao' | 'separada' | 'parcial' | 'cancelada';
  responsavelId?: string;
  iniciadoEm?: string;
  concluidoEm?: string;
  observacoes?: string;
}

export interface PickingItem {
  id: string;
  pickingOrderId: string;
  productionOrderMaterialId: string;
  componentProductId: string;
  warehouseId: string;
  locationId?: string;
  quantidadeSolicitada: number; // Milésimos
  quantidadeSeparada: number;
  loteId?: string;
  status: 'pendente' | 'separado' | 'falta' | 'substituido';
  observacao?: string;
}

// Suporte
export interface Ticket {
  id: string;
  numero: string;
  titulo: string;
  descricao?: string;
  customerId?: string;
  salesOrderId?: string;
  productionOrderId?: string;
  productId?: string;
  numeroSerie?: string;
  categoria: 'duvida' | 'defeito' | 'instalacao' | 'manutencao' | 'garantia' | 'pedido_peca' | 'melhoria' | 'outro';
  canal: 'telefone' | 'email' | 'whatsapp' | 'presencial' | 'portal';
  prioridade: 'baixa' | 'normal' | 'alta' | 'critica';
  status: 'novo' | 'em_triagem' | 'em_atendimento' | 'aguardando_cliente' | 'aguardando_peca' | 'em_campo' | 'resolvido' | 'fechado' | 'cancelado';
  responsavelId?: string;
  solicitanteNome?: string;
  solicitanteContato?: string;
  slaPrimeiraRespostaAte?: string;
  slaResolucaoAte?: string;
  primeiraRespostaEm?: string;
  resolvidoEm?: string;
  fechadoEm?: string;
  emGarantia?: boolean;
  posicaoKanban?: number;
  criadoEm: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  tipo: 'nota_interna' | 'resposta_cliente' | 'mensagem_cliente' | 'evento';
  autorId?: string;
  conteudo: string;
  criadoEm: string;
}

export interface TicketPart {
  id: string;
  ticketId: string;
  productId: string;
  quantidade: number; // Milésimos
  origem: 'estoque' | 'compra';
  status: 'solicitada' | 'reservada' | 'separada' | 'entregue' | 'cancelada';
  reservationId?: string;
  requisitionId?: string;
  cobrar?: boolean;
}

export interface CompanySettings {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  ie?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  email?: string;
  telefone?: string;
  seqReqPrefix?: string;
  seqCotPrefix?: string;
  seqPcPrefix?: string;
  seqOpPrefix?: string;
  seqPvPrefix?: string;
  seqOsPrefix?: string;
  seqTkPrefix?: string;
  alertasAtivos?: boolean;
  ativo?: boolean;
}
