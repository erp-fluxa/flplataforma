export type ItemType = 'materia_prima' | 'muc' | 'produto_acabado' | 'insumo';

export interface UserPreferences {
  sidebarCollapsed?: boolean;
  theme?: 'dark' | 'light';
  notificationsSound?: boolean;
}

export interface UserRole {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  roleId: string;
  role?: UserRole;
  permissoes?: string[];
  allowedCompanyIds?: string[];
  active: boolean;
  preferences?: UserPreferences;
  createdAt?: string;
  created_at?: string;
}

export interface Company {
  id: string;
  nome: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  fantasia?: string;
  cnpj: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  regimeTributario?: string;
  logo_url?: string;
  logo_sidebar_url?: string;
  logo_plataforma_url?: string;
  logo_icone_url?: string;
  logo_texto_url?: string;
  logo_institucional_url?: string;
  isMatriz?: boolean;
  ativa?: boolean;
  active?: boolean;
  excluidaEm?: string;
  criadoEm?: string;
}

export interface MaterialCategory {
  id: string;
  nome: string;
  tipo: 'MP' | 'MUC' | 'PA' | 'GERAL';
  cor?: string;
  ativo: boolean;
}

export interface Product {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  categoria?: string;
  categoriaId?: string;
  tipo?: 'MP' | 'MUC' | 'PA' | string;
  tipo_item?: ItemType | string;
  tipoItem?: string;
  linha?: string;
  areaUtil?: string;
  volumeConstrucao?: string;
  cinematica?: string;
  hotend?: string;
  eletronica?: string;
  potenciaNominal?: string;
  pesoKg?: number;
  dimensoes?: string;
  estoqueMinimo: number;
  pontoReposicao?: number;
  custoMedioCents?: number;
  precoReferencia?: number;
  precoVendaCents?: number;
  ativo: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  version?: number;
  createdAt?: string;
}

export interface Warehouse {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'central' | 'materia_prima' | 'produto_acabado' | 'consumo' | 'quarentena' | 'terceiros' | 'refugo' | string;
  companyId?: string;
  ativo: boolean;
}

export interface WarehouseLocation {
  id: string;
  warehouseId: string;
  codigo: string;
  descricao?: string;
  ativo: boolean;
}

export interface StockBalance {
  id: string;
  productId: string;
  warehouseId: string;
  companyId?: string;
  locationId?: string | null;
  quantidade: number; // in milli-units (e.g. 1000 = 1.000)
  custoMedio?: number; // in cents
}

export interface StockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  companyId?: string;
  tipo: 'entrada' | 'saida' | 'saldo_inicial' | 'ajuste_inventario' | 'producao' | 'separacao' | string;
  quantidade: number;
  sinal: number; // 1 or -1
  custoUnitario?: number;
  origemTipo?: string;
  origemId?: string;
  observacao?: string;
  criadoEm?: string;
  criadoPor?: string;
}

export interface StockReservation {
  id: string;
  productId: string;
  warehouseId: string;
  productionOrderId?: string;
  salesOrderId?: string;
  quantidade: number;
  status: 'ativa' | 'consumida' | 'cancelada';
  criadoEm: string;
}

export interface BOMVersion {
  id: string;
  productId: string;
  versao: string;
  descricao?: string;
  status: 'ativa' | 'em_revisao' | 'obsoleta';
  vigenteDe: string;
  criadoEm: string;
}

export interface BOMItem {
  id: string;
  bomVersionId: string;
  componentProductId: string;
  quantidade: number; // milli-units
  perdaPercentual?: number;
  opcional?: boolean;
  observacao?: string;
}

export interface WorkCenter {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  capacidadeHora?: number;
  custoHoraCents?: number;
  ativo: boolean;
}

export interface ProductionOrder {
  id: string;
  codigo: string;
  productId: string;
  bomVersionId: string;
  salesOrderId?: string;
  salesOrderCodigo?: string;
  quantidadePlanejada: number;
  quantidadeProduzida: number;
  quantidadeRefugo: number;
  status: 'planejada' | 'aguardando_material' | 'material_reservado' | 'separacao_pendente' | 'liberada' | 'em_producao' | 'pausada' | 'concluida' | 'cancelada';
  dataInicioPrevista: string;
  dataEntregaPrevista: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  companyId?: string;
  criadoEm: string;
}

export interface PickingOrder {
  id: string;
  codigo: string;
  tipo: 'OP' | 'PV' | 'TRANSFERENCIA';
  referenciaId: string;
  status: 'aberta' | 'em_separacao' | 'parcial' | 'separada' | 'concluida' | 'cancelada';
  solicitante?: string;
  criadoEm: string;
}

export interface Customer {
  id: string;
  nome: string;
  cnpjCpf: string;
  contatoNome?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  uf?: string;
  ativo: boolean;
}

export interface Supplier {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  contatoNome?: string;
  email?: string;
  telefone?: string;
  categoriaPrincipal?: string;
  avaliacao?: number;
  ativo: boolean;
}

export interface Quotation {
  id: string;
  codigo: string;
  descricao: string;
  status: 'nova_solicitacao' | 'em_analise' | 'enviada_fornecedor' | 'aguardando_resposta' | 'cotacao_recebida' | 'em_comparacao' | 'aguardando_aprovacao' | 'aprovada' | 'reprovada' | 'convertida_pedido' | 'arquivada';
  dataAbertura: string;
  dataLimite?: string;
  solicitanteId?: string;
  companyId?: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  productId: string;
  quantidade: number;
  observacao?: string;
}

export interface QuotationSupplierPrice {
  id: string;
  quotationId: string;
  supplierId: string;
  productId: string;
  precoUnitarioCents: number;
  prazoEntregaDias: number;
  condicaoPagamento?: string;
  selecionado?: boolean;
}

export interface PurchaseOrder {
  id: string;
  codigo: string;
  supplierId: string;
  quotationId?: string;
  status: 'rascunho' | 'emitido' | 'confirmado_fornecedor' | 'recebido_parcial' | 'recebido' | 'cancelado';
  valorTotalCents: number;
  condicaoPagamento?: string;
  previsaoEntrega: string;
  companyId?: string;
  criadoEm: string;
}

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  productId: string;
  quantidade: number;
  precoUnitarioCents: number;
  valorTotalCents: number;
  produzido?: boolean;
  productionOrderId?: string;
  productionOrderCodigo?: string;
}

export interface SalesOrder {
  id: string;
  codigo: string;
  customerId: string;
  status: 'orcamento' | 'confirmado' | 'em_producao' | 'parcial' | 'pronto_expedicao' | 'faturado' | 'entregue' | 'cancelado';
  valorTotalCents: number;
  condicaoPagamento?: string;
  previsaoEntrega: string;
  items?: SalesOrderItem[];
  productionOrderIds?: string[];
  productionOrderCodigos?: string[];
  companyId?: string;
  criadoEm: string;
}

export interface FluxaTask {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  priority?: 'baixa' | 'normal' | 'alta' | 'urgente';
  dueDate?: string;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  userId: string;
  item: string;
  quantity?: string;
  completed: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: {
    id: string;
    name: string;
  };
  target?: {
    tipo: string;
    id?: string;
    codigo?: string;
  };
  details: string;
}

export interface CustomLogos {
  fluxa?: string | null;
  logo_icone?: string | null;
  logo_texto?: string | null;
  jp3d?: string | null;
  sidebar?: string | null;
  _v?: number | string;
}

export interface DatabaseState {
  company: Company;
  companies: Company[];
  users: User[];
  currentCompanyId: string;
  customLogos: CustomLogos;
  materialCategories: MaterialCategory[];
  products: Product[];
  warehouses: Warehouse[];
  locations: WarehouseLocation[];
  stockBalances: StockBalance[];
  stockMovements: StockMovement[];
  stockReservations: StockReservation[];
  bomVersions: BOMVersion[];
  bomItems: BOMItem[];
  workCenters: WorkCenter[];
  productionOrders: ProductionOrder[];
  pickingOrders: PickingOrder[];
  customers: Customer[];
  suppliers: Supplier[];
  quotations: Quotation[];
  quotationItems: QuotationItem[];
  quotationPrices: QuotationSupplierPrice[];
  orders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  gescompTasks: FluxaTask[];
  gescompShoppingList: ShoppingItem[];
  auditLogs: AuditLog[];
  userPermissionOverrides?: Record<string, Record<string, boolean>>;
  customNavLabels?: Record<string, string>;
  lastBackup?: string;
}
