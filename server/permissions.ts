// Catálogo Unificado de Permissões (Single Source of Truth)

export interface PermissionDef {
  key: string;
  module: string;
  resource: string;
  action: string;
  label: string;
  description?: string;
  requires?: string[]; // Ex: 'editar' requires 'ver'
}

export const PERMISSIONS_CATALOG: PermissionDef[] = [
  // Compras: Requisições
  { key: 'compras.requisicoes.ver', module: 'Compras', resource: 'Requisições', action: 'ver', label: 'Visualizar Requisições' },
  { key: 'compras.requisicoes.criar', module: 'Compras', resource: 'Requisições', action: 'criar', label: 'Criar Requisições', requires: ['compras.requisicoes.ver'] },
  { key: 'compras.requisicoes.editar', module: 'Compras', resource: 'Requisições', action: 'editar', label: 'Editar Requisições', requires: ['compras.requisicoes.ver'] },
  { key: 'compras.requisicoes.excluir', module: 'Compras', resource: 'Requisições', action: 'excluir', label: 'Excluir Requisições', requires: ['compras.requisicoes.ver'] },
  { key: 'compras.requisicoes.aprovar', module: 'Compras', resource: 'Requisições', action: 'aprovar', label: 'Aprovar / Reprovar Requisições', requires: ['compras.requisicoes.ver'] },

  // Compras: Cotações & Kanban
  { key: 'compras.cotacoes.ver', module: 'Compras', resource: 'Cotações (Kanban)', action: 'ver', label: 'Visualizar Cotações & Kanban' },
  { key: 'compras.cotacoes.criar', module: 'Compras', resource: 'Cotações (Kanban)', action: 'criar', label: 'Criar Novas Cotações', requires: ['compras.cotacoes.ver'] },
  { key: 'compras.cotacoes.editar', module: 'Compras', resource: 'Cotações (Kanban)', action: 'editar', label: 'Editar & Mover no Kanban', requires: ['compras.cotacoes.ver'] },
  { key: 'compras.cotacoes.excluir', module: 'Compras', resource: 'Cotações (Kanban)', action: 'excluir', label: 'Excluir Cotações', requires: ['compras.cotacoes.ver'] },
  { key: 'compras.cotacoes.aprovar', module: 'Compras', resource: 'Cotações (Kanban)', action: 'aprovar', label: 'Aprovar / Reprovar Cotações', requires: ['compras.cotacoes.ver'] },
  { key: 'compras.cotacoes.converter_pedido', module: 'Compras', resource: 'Cotações (Kanban)', action: 'converter_pedido', label: 'Converter Cotação em Pedido', requires: ['compras.cotacoes.ver', 'compras.pedidos.criar'] },
  { key: 'compras.cotacoes.bloquear', module: 'Compras', resource: 'Cotações (Kanban)', action: 'bloquear', label: 'Bloquear / Desbloquear Cotações', requires: ['compras.cotacoes.ver'] },

  // Compras: Pedidos
  { key: 'compras.pedidos.ver', module: 'Compras', resource: 'Pedidos de Compra', action: 'ver', label: 'Visualizar Pedidos' },
  { key: 'compras.pedidos.criar', module: 'Compras', resource: 'Pedidos de Compra', action: 'criar', label: 'Emitir Pedidos de Compra', requires: ['compras.pedidos.ver'] },
  { key: 'compras.pedidos.receber', module: 'Compras', resource: 'Pedidos de Compra', action: 'receber', label: 'Registrar Recebimento de Mercadorias', requires: ['compras.pedidos.ver'] },
  { key: 'compras.pedidos.cancelar', module: 'Compras', resource: 'Pedidos de Compra', action: 'cancelar', label: 'Cancelar Pedidos de Compra', requires: ['compras.pedidos.ver'] },

  // Cadastros: Fornecedores & Produtos
  { key: 'compras.fornecedores.ver', module: 'Cadastros', resource: 'Fornecedores', action: 'ver', label: 'Visualizar Fornecedores' },
  { key: 'compras.fornecedores.gerenciar', module: 'Cadastros', resource: 'Fornecedores', action: 'gerenciar', label: 'Cadastrar / Editar Fornecedores', requires: ['compras.fornecedores.ver'] },
  { key: 'compras.produtos.ver', module: 'Cadastros', resource: 'Catálogo de Produtos', action: 'ver', label: 'Visualizar Catálogo' },
  { key: 'compras.produtos.gerenciar', module: 'Cadastros', resource: 'Catálogo de Produtos', action: 'gerenciar', label: 'Cadastrar / Editar Produtos', requires: ['compras.produtos.ver'] },

  // Estoque & Matéria-Prima 3D
  { key: 'estoque.materiaprima.ver', module: 'Estoque 3D', resource: 'Matéria-Prima', action: 'ver', label: 'Visualizar Insumos (Filamentos/Resinas)' },
  { key: 'estoque.materiaprima.gerenciar', module: 'Estoque 3D', resource: 'Matéria-Prima', action: 'gerenciar', label: 'Cadastrar / Editar Matéria-Prima', requires: ['estoque.materiaprima.ver'] },
  { key: 'estoque.materiaprima.importar', module: 'Estoque 3D', resource: 'Matéria-Prima', action: 'importar', label: 'Importar Planilha CSV/Excel', requires: ['estoque.materiaprima.ver'] },
  { key: 'estoque.modelos.ver', module: 'Estoque 3D', resource: 'Modelos Prontos', action: 'ver', label: 'Visualizar Peças em Estoque' },
  { key: 'estoque.modelos.gerenciar', module: 'Estoque 3D', resource: 'Modelos Prontos', action: 'gerenciar', label: 'Cadastrar / Ajustar Peças Prontas', requires: ['estoque.modelos.ver'] },

  // Produção 3D & Engenharia
  { key: 'producao.fichas.ver', module: 'Produção 3D', resource: 'Fichas Técnicas', action: 'ver', label: 'Visualizar Fichas Técnicas' },
  { key: 'producao.fichas.gerenciar', module: 'Produção 3D', resource: 'Fichas Técnicas', action: 'gerenciar', label: 'Cadastrar / Editar Fichas Técnicas', requires: ['producao.fichas.ver'] },
  { key: 'producao.op.ver', module: 'Produção 3D', resource: 'Ordens de Produção', action: 'ver', label: 'Visualizar OPs' },
  { key: 'producao.op.gerenciar', module: 'Produção 3D', resource: 'Ordens de Produção', action: 'gerenciar', label: 'Criar / Concluir OPs (Baixa de Estoque)', requires: ['producao.op.ver'] },

  // Vendas
  { key: 'vendas.faturamento.ver', module: 'Vendas', resource: 'Modelos Vendidos', action: 'ver', label: 'Visualizar Faturamento' },
  { key: 'vendas.faturamento.criar', module: 'Vendas', resource: 'Modelos Vendidos', action: 'criar', label: 'Registrar Venda (Baixa de Modelo)', requires: ['vendas.faturamento.ver'] },

  // Configurações & Governança
  { key: 'config.usuarios.ver', module: 'Configurações', resource: 'Usuários', action: 'ver', label: 'Visualizar Usuários' },
  { key: 'config.usuarios.gerenciar', module: 'Configurações', resource: 'Usuários', action: 'gerenciar', label: 'Criar / Editar / Overrides de Usuários', requires: ['config.usuarios.ver'] },
  { key: 'config.funcoes.ver', module: 'Configurações', resource: 'Funções e Acessos', action: 'ver', label: 'Visualizar Funções & Matriz' },
  { key: 'config.funcoes.gerenciar', module: 'Configurações', resource: 'Funções e Acessos', action: 'gerenciar', label: 'Editar Matriz de Permissões & Limites R$', requires: ['config.funcoes.ver'] },
  { key: 'config.empresa.ver', module: 'Configurações', resource: 'Empresa & Numeração', action: 'ver', label: 'Visualizar Dados JP3D' },
  { key: 'config.empresa.editar', module: 'Configurações', resource: 'Empresa & Numeração', action: 'editar', label: 'Alterar Dados JP3D, Logo e Prefixos', requires: ['config.empresa.ver'] },
  { key: 'config.auditoria.ver', module: 'Configurações', resource: 'Log de Auditoria', action: 'ver', label: 'Visualizar Log de Auditoria' },
  { key: 'config.backup.executar', module: 'Configurações', resource: 'Backup', action: 'executar', label: 'Fazer Backup / Restaurar Banco de Dados' }
];

export const DEFAULT_ROLES = [
  {
    id: 'role-admin',
    name: 'Administrador',
    description: 'Acesso total e irrestrito a todos os módulos, configurações e governança do sistema.',
    approvalLimitCents: null, // Ilimitado
    permissions: PERMISSIONS_CATALOG.map(p => p.key)
  },
  {
    id: 'role-comprador-sr',
    name: 'Comprador Sênior',
    description: 'Gestão completa de cotações, pedidos, fornecedores e aprovações até R$ 50.000,00.',
    approvalLimitCents: 5000000, // R$ 50.000,00
    permissions: [
      'compras.requisicoes.ver', 'compras.requisicoes.criar', 'compras.requisicoes.editar', 'compras.requisicoes.aprovar',
      'compras.cotacoes.ver', 'compras.cotacoes.criar', 'compras.cotacoes.editar', 'compras.cotacoes.aprovar', 'compras.cotacoes.converter_pedido', 'compras.cotacoes.bloquear',
      'compras.pedidos.ver', 'compras.pedidos.criar', 'compras.pedidos.receber', 'compras.pedidos.cancelar',
      'compras.fornecedores.ver', 'compras.fornecedores.gerenciar', 'compras.produtos.ver', 'compras.produtos.gerenciar',
      'estoque.materiaprima.ver', 'estoque.modelos.ver', 'config.empresa.ver'
    ]
  },
  {
    id: 'role-comprador-jr',
    name: 'Comprador Júnior',
    description: 'Criação e acompanhamento de cotações e pedidos com alçada de aprovação até R$ 5.000,00.',
    approvalLimitCents: 500000, // R$ 5.000,00
    permissions: [
      'compras.requisicoes.ver', 'compras.requisicoes.criar',
      'compras.cotacoes.ver', 'compras.cotacoes.criar', 'compras.cotacoes.editar', 'compras.cotacoes.converter_pedido',
      'compras.pedidos.ver', 'compras.pedidos.criar', 'compras.fornecedores.ver', 'compras.produtos.ver',
      'estoque.materiaprima.ver', 'estoque.modelos.ver'
    ]
  },
  {
    id: 'role-producao',
    name: 'Engenharia & Produção',
    description: 'Gestão de ordens de produção, fichas técnicas e requisição de insumos 3D.',
    approvalLimitCents: 0,
    permissions: [
      'compras.requisicoes.ver', 'compras.requisicoes.criar',
      'estoque.materiaprima.ver', 'estoque.modelos.ver',
      'producao.fichas.ver', 'producao.fichas.gerenciar',
      'producao.op.ver', 'producao.op.gerenciar'
    ]
  },
  {
    id: 'role-visualizador',
    name: 'Visualizador',
    description: 'Acesso somente-leitura para consultas e relatórios.',
    approvalLimitCents: 0,
    permissions: [
      'compras.requisicoes.ver', 'compras.cotacoes.ver', 'compras.pedidos.ver',
      'compras.fornecedores.ver', 'compras.produtos.ver',
      'estoque.materiaprima.ver', 'estoque.modelos.ver', 'producao.fichas.ver', 'producao.op.ver', 'vendas.faturamento.ver'
    ]
  }
];

// Helper de resolução de permissões: Role Permissions + Overrides
export function resolveUserPermissions(rolePermissions: string[], overrides: { permissionKey: string; effect: string }[]): Set<string> {
  const result = new Set<string>(rolePermissions);
  for (const o of overrides) {
    if (o.effect === 'allow') {
      result.add(o.permissionKey);
    } else if (o.effect === 'deny') {
      result.delete(o.permissionKey);
    }
  }
  return result;
}
