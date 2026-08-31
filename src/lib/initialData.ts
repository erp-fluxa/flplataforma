import { DatabaseState } from '../types';

export const INITIAL_DATABASE: DatabaseState = {
  currentCompanyId: 'comp-1',
  company: {
    id: 'comp-1',
    nome: 'FLUXA INDUSTRIA E SERVICOS LTDA — MATRIZ SC',
    fantasia: 'Fluxa ERP Industrial',
    razaoSocial: 'FLUXA INDUSTRIA E SERVICOS LTDA',
    nomeFantasia: 'Fluxa ERP Industrial',
    cnpj: '12.345.678/0001-90',
    inscricaoEstadual: '258.963.147.110',
    endereco: 'Rua das Indústrias, 1200 - Distrito Industrial',
    cidade: 'Joinville',
    uf: 'SC',
    telefone: '(47) 3456-7890',
    email: 'contato@fluxa.com.br',
    regimeTributario: 'Lucro Presumido',
    isMatriz: true,
    ativa: true
  },
  companies: [
    {
      id: 'comp-1',
      nome: 'FLUXA INDUSTRIA E SERVICOS LTDA — MATRIZ SC',
      fantasia: 'Fluxa — Matriz SC',
      razaoSocial: 'FLUXA INDUSTRIA E SERVICOS LTDA',
      nomeFantasia: 'Fluxa — Matriz SC',
      cnpj: '12.345.678/0001-90',
      inscricaoEstadual: '258.963.147.110',
      endereco: 'Rua das Indústrias, 1200',
      cidade: 'Joinville',
      uf: 'SC',
      isMatriz: true,
      ativa: true
    },
    {
      id: 'comp-2',
      nome: 'FLUXA FILIAIS & INSUMOS INDUSTRIAL LTDA — FILIAL PR',
      fantasia: 'Fluxa — Filial PR',
      razaoSocial: 'FLUXA FILIAIS & INSUMOS INDUSTRIAL LTDA',
      nomeFantasia: 'Fluxa — Filial PR',
      cnpj: '12.345.678/0002-71',
      cidade: 'Curitiba',
      uf: 'PR',
      isMatriz: false,
      ativa: true
    }
  ],
  customLogos: {
    fluxa: 'assets/fluxa_logo_texto.png',
    logo_icone: 'assets/fluxa_logo_icone.png',
    logo_texto: 'assets/fluxa_logo_texto.png',
    jp3d: 'assets/logo_jp3d.png',
    sidebar: 'assets/fluxa_logo_icone.png',
    _v: Date.now()
  },
  users: [
    {
      id: 'usr-admin',
      name: 'Super Admin',
      username: 'admin',
      email: 'admin@fluxa.com.br',
      password: '041219',
      roleId: 'super_admin',
      role: { id: 'super_admin', name: 'Super Admin' },
      permissoes: ['*'],
      active: true,
      preferences: { sidebarCollapsed: false, theme: 'dark' }
    },
    {
      id: 'usr-joao-marcos',
      name: 'João Marcos',
      username: 'joaomarcos',
      email: 'joao@fluxa.com.br',
      password: '123',
      roleId: 'super_admin',
      role: { id: 'super_admin', name: 'Super Admin' },
      permissoes: ['*'],
      active: true,
      preferences: { sidebarCollapsed: false, theme: 'dark' }
    },
    {
      id: 'usr-carlos',
      name: 'Carlos Compras',
      username: 'carlos',
      email: 'carlos@fluxa.com.br',
      password: '123',
      roleId: 'role-comprador-sr',
      role: { id: 'role-comprador-sr', name: 'Comprador Sênior' },
      active: true,
      preferences: { sidebarCollapsed: false, theme: 'dark' }
    },
    {
      id: 'usr-marcelo',
      name: 'Eng. Marcelo',
      username: 'marcelo',
      email: 'marcelo@fluxa.com.br',
      password: '123',
      roleId: 'role-producao',
      role: { id: 'role-producao', name: 'Engenheiro de Produção' },
      active: true,
      preferences: { sidebarCollapsed: false, theme: 'dark' }
    }
  ],
  materialCategories: [
    { id: 'cat-fil', nome: 'Filamento 3D (Termoplásticos)', tipo: 'MP', cor: 'teal', ativo: true },
    { id: 'cat-mec', nome: 'Componentes Mecânicos & Estrutura', tipo: 'MP', cor: 'blue', ativo: true },
    { id: 'cat-elet', nome: 'Eletrônica & Automação Industrial', tipo: 'MP', cor: 'amber', ativo: true },
    { id: 'cat-ferr', nome: 'Ferramentas & Fixação (Parafusos)', tipo: 'MUC', cor: 'slate', ativo: true },
    { id: 'cat-epi', nome: 'EPIs & Segurança', tipo: 'MUC', cor: 'rose', ativo: true },
    { id: 'cat-emb', nome: 'Embalagens & Logística', tipo: 'MUC', cor: 'purple', ativo: true },
    { id: 'cat-limp', nome: 'Limpeza & Manutenção Geral', tipo: 'MUC', cor: 'emerald', ativo: true }
  ],
  products: [
    // PRODUTOS ACABADOS (PA)
    { id: 'p-cv800',  codigo: 'JP3D-CV800',  descricao: 'Impressora 3D JP3D CV800 (800×800×150mm)', unidade: 'UN', categoria: 'Impressora 3D', tipo: 'PA', tipo_item: 'produto_acabado', linha: 'Comunicação Visual', areaUtil: '800×800×150mm', volumeConstrucao: '96 Litros', cinematica: 'CoreXY Industrial', hotend: 'Volcano High Flow 1.2mm', eletronica: 'Klipper 64-bit + Drivers TMC2209', potenciaNominal: '850W', pesoKg: 65, dimensoes: '1100×1050×600mm', estoqueMinimo: 1000, precoVendaCents: 2490000, custoMedioCents: 1420000, ativo: true },
    { id: 'p-cv1000', codigo: 'JP3D-CV1000', descricao: 'Impressora 3D JP3D CV1000 (1000×1000×150mm)', unidade: 'UN', categoria: 'Impressora 3D', tipo: 'PA', tipo_item: 'produto_acabado', linha: 'Comunicação Visual', areaUtil: '1000×1000×150mm', volumeConstrucao: '150 Litros', cinematica: 'CoreXY Industrial', hotend: 'Volcano High Flow 1.2mm', eletronica: 'Klipper 64-bit + Drivers TMC2209', potenciaNominal: '1200W', pesoKg: 85, dimensoes: '1350×1300×600mm', estoqueMinimo: 1000, precoVendaCents: 3190000, custoMedioCents: 1850000, ativo: true },
    { id: 'p-cv1200', codigo: 'JP3D-CV1200', descricao: 'Impressora 3D JP3D CV1200 (1200×1200×370mm)', unidade: 'UN', categoria: 'Impressora 3D', tipo: 'PA', tipo_item: 'produto_acabado', linha: 'Comunicação Visual', areaUtil: '1200×1200×370mm', volumeConstrucao: '532 Litros', cinematica: 'CoreXY Industrial Reforçado', hotend: 'SuperVolcano Dual 1.2/1.8mm', eletronica: 'Klipper Industrial + Tela 7" Touch', potenciaNominal: '2000W', pesoKg: 130, dimensoes: '1600×1550×900mm', estoqueMinimo: 1000, precoVendaCents: 4290000, custoMedioCents: 2480000, ativo: true },
    { id: 'p-cv1500', codigo: 'JP3D-CV1500', descricao: 'Impressora 3D JP3D CV1500 (1500×1500×370mm)', unidade: 'UN', categoria: 'Impressora 3D', tipo: 'PA', tipo_item: 'produto_acabado', linha: 'Comunicação Visual', areaUtil: '1500×1500×370mm', volumeConstrucao: '832 Litros', cinematica: 'CoreXY Industrial Reforçado', hotend: 'SuperVolcano Dual 1.8mm', eletronica: 'Klipper Industrial + Tela 7" Touch', potenciaNominal: '2800W', pesoKg: 180, dimensoes: '1950×1900×900mm', estoqueMinimo: 1000, precoVendaCents: 5890000, custoMedioCents: 3410000, ativo: true },

    // MATÉRIA-PRIMA (MP)
    { id: 'p-fil-petg',   codigo: 'MP-FIL-PETG-BLK', descricao: 'Filamento PETG 1.75mm Preto Carretel 1kg', unidade: 'KG', categoria: 'Filamento', tipo: 'MP', tipo_item: 'materia_prima', estoqueMinimo: 50000, pontoReposicao: 80000, custoMedioCents: 11000, precoReferencia: 11000, ativo: true },
    { id: 'p-fil-pla',    codigo: 'MP-FIL-PLA-WHT',  descricao: 'Filamento PLA 1.75mm Branco Carretel 1kg', unidade: 'KG', categoria: 'Filamento', tipo: 'MP', tipo_item: 'materia_prima', estoqueMinimo: 30000, pontoReposicao: 50000, custoMedioCents: 9000,  precoReferencia: 9000,  ativo: true },
    { id: 'p-fil-asa',    codigo: 'MP-FIL-ASA-GRY',  descricao: 'Filamento ASA UV Resistente Cinza 1kg', unidade: 'KG', categoria: 'Filamento', tipo: 'MP', tipo_item: 'materia_prima', estoqueMinimo: 20000, pontoReposicao: 35000, custoMedioCents: 13000, precoReferencia: 13000, ativo: true },
    { id: 'p-guia-mgn12', codigo: 'MP-MEC-MGN12H',   descricao: 'Guia Linear MGN12H com Patim de Precisão', unidade: 'UN', categoria: 'Mecânica', tipo: 'MP', tipo_item: 'materia_prima', estoqueMinimo: 20000, pontoReposicao: 40000, custoMedioCents: 12000, precoReferencia: 12000, ativo: true },
    { id: 'p-nema23',     codigo: 'MP-MOT-NEMA23',   descricao: 'Motor de Passo NEMA 23 Alto Torque 2.8Nm', unidade: 'UN', categoria: 'Eletrônica', tipo: 'MP', tipo_item: 'materia_prima', estoqueMinimo: 10000, pontoReposicao: 20000, custoMedioCents: 18500, precoReferencia: 18500, ativo: true },
    { id: 'p-nema17',     codigo: 'MP-MOT-NEMA17',   descricao: 'Motor de Passo NEMA 17 48mm 0.59Nm', unidade: 'UN', categoria: 'Eletrônica', tipo: 'MP', tipo_item: 'materia_prima', estoqueMinimo: 15000, pontoReposicao: 30000, custoMedioCents: 7500,  precoReferencia: 7500,  ativo: true },
    { id: 'p-mcu-klip',   codigo: 'MP-AUT-MCU64',    descricao: 'Placa Controladora 64-bit 8 Drivers TMC2209', unidade: 'UN', categoria: 'Eletrônica', tipo: 'MP', tipo_item: 'materia_prima', estoqueMinimo: 5000,  pontoReposicao: 10000, custoMedioCents: 45000, precoReferencia: 45000, ativo: true },

    // USO E CONSUMO (MUC)
    { id: 'p-muc-pla-teste', codigo: 'MUC-PLA-TESTE', descricao: 'Filamento PLA 1.75mm Rolo Teste 1kg', unidade: 'ROLO', categoria: 'Filamento (Teste)', tipo: 'MUC', tipo_item: 'muc', estoqueMinimo: 5000, custoMedioCents: 8500, precoReferencia: 8500, ativo: true },
    { id: 'p-muc-parafuso',  codigo: 'MUC-PARAFUSO-M3', descricao: 'Caixa de Parafusos Allen M3x12 Inox (500un)', unidade: 'CX', categoria: 'Ferramenta', tipo: 'MUC', tipo_item: 'muc', estoqueMinimo: 10000, custoMedioCents: 4200, precoReferencia: 4200, ativo: true },
    { id: 'p-muc-epi-luva',  codigo: 'MUC-EPI-LUVA', descricao: 'Luva Nitrílica de Proteção Térmica/Mecânica', unidade: 'PAR', categoria: 'EPI', tipo: 'MUC', tipo_item: 'muc', estoqueMinimo: 15000, custoMedioCents: 1800, precoReferencia: 1800, ativo: true },
    { id: 'p-muc-embalagem', codigo: 'MUC-EMB-CAIXA', descricao: 'Caixa de Madeira / Palete Reforçado Envio', unidade: 'UN', categoria: 'Embalagem', tipo: 'MUC', tipo_item: 'muc', estoqueMinimo: 5000, custoMedioCents: 25000, precoReferencia: 25000, ativo: true },
    { id: 'p-muc-limpeza',   codigo: 'MUC-LIMPEZA-IPA', descricao: 'Álcool Isopropílico 99,8% Limpeza Mesa 1L', unidade: 'L', categoria: 'Limpeza', tipo: 'MUC', tipo_item: 'muc', estoqueMinimo: 8000, custoMedioCents: 2200, precoReferencia: 2200, ativo: true }
  ],
  warehouses: [
    { id: 'wh-1', codigo: 'DEP-MP', nome: 'Depósito Central de Matéria-Prima & Insumos', tipo: 'materia_prima', companyId: 'comp-1', ativo: true },
    { id: 'wh-2', codigo: 'DEP-PA', nome: 'Depósito de Produtos Acabados (Expedição)', tipo: 'produto_acabado', companyId: 'comp-1', ativo: true }
  ],
  locations: [
    { id: 'loc-1', warehouseId: 'wh-1', codigo: 'RUA-A-01', descricao: 'Prateleira de Filamentos', ativo: true },
    { id: 'loc-2', warehouseId: 'wh-1', codigo: 'RUA-B-02', descricao: 'Gavetas de Motores e Guias', ativo: true },
    { id: 'loc-3', warehouseId: 'wh-2', codigo: 'EXP-01', descricao: 'Área de Embalagem e Despacho', ativo: true }
  ],
  // Saldos zerados conforme solicitação de negócio
  stockBalances: [],
  stockMovements: [],
  stockReservations: [],
  bomVersions: [
    { id: 'bom-cv800',  productId: 'p-cv800',  versao: 'v1.0 (Ativa)', descricao: 'Ficha Técnica JP3D CV800 — 800×800×150mm', status: 'ativa', vigenteDe: '2026-01-01', criadoEm: '2026-01-01' },
    { id: 'bom-cv1000', productId: 'p-cv1000', versao: 'v1.0 (Ativa)', descricao: 'Ficha Técnica JP3D CV1000 — 1000×1000×150mm', status: 'ativa', vigenteDe: '2026-01-01', criadoEm: '2026-01-01' },
    { id: 'bom-cv1200', productId: 'p-cv1200', versao: 'v1.0 (Ativa)', descricao: 'Ficha Técnica JP3D CV1200 — 1200×1200×370mm (Mais Vendida)', status: 'ativa', vigenteDe: '2026-01-01', criadoEm: '2026-01-01' },
    { id: 'bom-cv1500', productId: 'p-cv1500', versao: 'v1.0 (Ativa)', descricao: 'Ficha Técnica JP3D CV1500 — 1500×1500×370mm', status: 'ativa', vigenteDe: '2026-01-01', criadoEm: '2026-01-01' }
  ],
  bomItems: [
    { id: 'bomit-1', bomVersionId: 'bom-cv1200', componentProductId: 'p-guia-mgn12', quantidade: 6000, perdaPercentual: 0, opcional: false, observacao: '6 guias lineares MGN12' },
    { id: 'bomit-2', bomVersionId: 'bom-cv1200', componentProductId: 'p-nema23', quantidade: 2000, perdaPercentual: 0, opcional: false, observacao: '2 motores Nema 23 X/Y' },
    { id: 'bomit-3', bomVersionId: 'bom-cv1200', componentProductId: 'p-nema17', quantidade: 4000, perdaPercentual: 0, opcional: false, observacao: '4 motores Nema 17 Z' },
    { id: 'bomit-4', bomVersionId: 'bom-cv1200', componentProductId: 'p-mcu-klip', quantidade: 1000, perdaPercentual: 0, opcional: false, observacao: '1 placa Klipper 64-bit' }
  ],
  workCenters: [
    { id: 'wc-1', codigo: 'CT-CORTE', nome: 'Corte e Usinagem de Perfis de Alumínio', tipo: 'Usinagem', capacidadeHora: 5, custoHoraCents: 8500, ativo: true },
    { id: 'wc-2', codigo: 'CT-MONTAGEM', nome: 'Bancada de Montagem Mecânica CoreXY', tipo: 'Montagem', capacidadeHora: 2, custoHoraCents: 12000, ativo: true },
    { id: 'wc-3', codigo: 'CT-ELETRONICA', nome: 'Bancada de Chicote Elétrico & Firmware', tipo: 'Eletrônica', capacidadeHora: 3, custoHoraCents: 14000, ativo: true },
    { id: 'wc-4', codigo: 'CT-TESTE', nome: 'Cabine de Teste e Calibração 48h', tipo: 'Qualidade', capacidadeHora: 4, custoHoraCents: 6000, ativo: true }
  ],
  productionOrders: [],
  pickingOrders: [],
  customers: [
    { id: 'cli-1', nome: 'Comunicação Visual Horizonte Ltda', cnpjCpf: '22.333.444/0001-55', contatoNome: 'Arq. Gustavo Ramos', email: 'compras@cvhorizonte.com.br', telefone: '(41) 3344-5566', cidade: 'Curitiba', uf: 'PR', ativo: true },
    { id: 'cli-2', nome: 'SignTech Painéis e Fachadas S.A.', cnpjCpf: '55.666.777/0001-88', contatoNome: 'Eng. Cristina Alves', email: 'suprimentos@signtech.com.br', telefone: '(11) 3900-8800', cidade: 'São Paulo', uf: 'SP', ativo: true }
  ],
  suppliers: [
    { id: 'for-1', razaoSocial: '3D Filamentos Indústria e Comércio Ltda', nomeFantasia: 'Filamentos Brasil', cnpj: '11.222.333/0001-44', contatoNome: 'Roberto Vendas', email: 'vendas@filamentosbrasil.com.br', telefone: '(11) 4002-8922', categoriaPrincipal: 'Filamento', avaliacao: 5, ativo: true },
    { id: 'for-2', razaoSocial: 'Motion Tech Guias e Automação Industrial', nomeFantasia: 'Motion Tech', cnpj: '33.444.555/0001-66', contatoNome: 'Patrícia Comercial', email: 'comercial@motiontech.ind.br', telefone: '(19) 3800-7700', categoriaPrincipal: 'Mecânica', avaliacao: 5, ativo: true }
  ],
  quotations: [],
  quotationItems: [],
  quotationPrices: [],
  orders: [],
  salesOrders: [],
  gescompTasks: [],
  gescompShoppingList: [
    {
      id: 'shop-01',
      userId: 'usr-admin',
      item: 'Perfil Guia U 90mm Galvanizado Steel Frame 3m',
      categoria: 'Steel Frame / Estruturas',
      unidade: 'M',
      quantidade: 150,
      prioridade: 'urgente',
      dataNecessariaAte: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      fornecedorSugeridoId: 'for-2',
      fornecedorSugeridoNome: 'Motion Tech / Aço Brasil',
      projetoCentroCusto: 'PRJ-005 (Manutenção e Reformas)',
      observacoes: 'Material em falta urgente para montagem da estrutura modular.',
      status: 'aprovado',
      cotacoes: [
        {
          id: 'q-01-1',
          supplierId: 'for-2',
          supplierName: 'Motion Tech / Aço Brasil',
          precoUnitarioCents: 3850,
          prazoEntregaDias: 2,
          condicaoPagamento: '28 DDL',
          vencedor: true
        },
        {
          id: 'q-01-2',
          supplierId: 'for-1',
          supplierName: 'Filamentos & Metais Brasil',
          precoUnitarioCents: 4200,
          prazoEntregaDias: 5,
          condicaoPagamento: '30 DDL',
          vencedor: false
        }
      ],
      fornecedorVencedorId: 'for-2',
      fornecedorVencedorNome: 'Motion Tech / Aço Brasil',
      valorUnitarioVencedorCents: 3850,
      historicoStatus: [
        {
          id: 'h-01',
          paraStatus: 'aguardando_cotacao',
          data: new Date(Date.now() - 3 * 86400000).toISOString(),
          usuarioNome: 'Eng. Marcelo'
        },
        {
          id: 'h-02',
          deStatus: 'aguardando_cotacao',
          paraStatus: 'aprovado',
          data: new Date().toISOString(),
          usuarioNome: 'Super Admin'
        }
      ],
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 'shop-02',
      userId: 'usr-admin',
      item: 'Lã de Vidro / Isolamento Termoacústico 50mm Rolo 12m²',
      categoria: 'Isolamento Termoacústico',
      unidade: 'M²',
      quantidade: 80,
      prioridade: 'normal',
      dataNecessariaAte: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
      fornecedorSugeridoId: 'for-1',
      fornecedorSugeridoNome: '3D Filamentos & Suprimentos',
      projetoCentroCusto: 'Matriz SC — Produção JP3D',
      observacoes: 'Isolamento para cabines acústicas das impressoras industriais.',
      status: 'em_cotacao',
      cotacoes: [
        {
          id: 'q-02-1',
          supplierId: 'for-1',
          supplierName: '3D Filamentos & Suprimentos',
          precoUnitarioCents: 2490,
          prazoEntregaDias: 4,
          condicaoPagamento: 'À Vista com Desconto',
          vencedor: false
        }
      ],
      historicoStatus: [
        {
          id: 'h-03',
          paraStatus: 'em_cotacao',
          data: new Date().toISOString(),
          usuarioNome: 'Carlos Compras'
        }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 'shop-03',
      userId: 'usr-admin',
      item: 'Caixa de Parafusos Autoatarraxantes 4.2x13mm Ponta Broca (1.000 un)',
      categoria: 'Fixadores & Parafusos (MUC)',
      unidade: 'CX',
      quantidade: 10,
      prioridade: 'programada',
      dataNecessariaAte: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      projetoCentroCusto: 'Almoxarifado Central',
      observacoes: 'Reposição de estoque de fixadores para o próximo mês.',
      status: 'aguardando_cotacao',
      cotacoes: [],
      historicoStatus: [
        {
          id: 'h-04',
          paraStatus: 'aguardando_cotacao',
          data: new Date().toISOString(),
          usuarioNome: 'Super Admin'
        }
      ],
      createdAt: new Date().toISOString()
    }
  ],
  auditLogs: [
    {
      id: 'log-init',
      timestamp: new Date().toISOString(),
      action: 'SYSTEM_INITIALIZED',
      actor: { id: 'usr-admin', name: 'Super Admin' },
      details: 'Sistema Fluxa ERP inicializado com arquitetura modular React e Supabase Cloud.'
    }
  ]
};
