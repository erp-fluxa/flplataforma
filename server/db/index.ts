import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { DEFAULT_ROLES } from '../permissions';

const dbPath = path.join(process.cwd(), 'data.db');
const sqlite = new DatabaseSync(dbPath);
sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = sqlite;

/**
 * Inicialização do Banco de Dados SQLite DDL e Seeding
 */
export function initDatabase() {
  // Inicialização de tabelas essenciais via DDL SQLite se não existirem
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      approval_limit_cents INTEGER DEFAULT 0,
      permissions TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role_id TEXT NOT NULL REFERENCES roles(id),
      active INTEGER NOT NULL DEFAULT 1,
      preferences TEXT DEFAULT '{"sidebarCollapsed":false}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_permission_overrides (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      permission_key TEXT NOT NULL,
      effect TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revoked_tokens (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      revoked_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      reason TEXT
    );

    CREATE TABLE IF NOT EXISTS sequences (
      name TEXT PRIMARY KEY,
      current INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS company_settings (
      id TEXT PRIMARY KEY,
      razao_social TEXT NOT NULL,
      nome_fantasia TEXT NOT NULL,
      cnpj TEXT NOT NULL,
      ie TEXT,
      endereco TEXT,
      bairro TEXT,
      cidade TEXT,
      uf TEXT,
      cep TEXT,
      email TEXT,
      telefone TEXT,
      logo_dark TEXT,
      logo_white TEXT,
      seq_req_prefix TEXT DEFAULT 'REQ-',
      seq_cot_prefix TEXT DEFAULT 'COT-',
      seq_pc_prefix TEXT DEFAULT 'PC-',
      seq_op_prefix TEXT DEFAULT 'OP-',
      seq_pv_prefix TEXT DEFAULT 'PV-',
      seq_os_prefix TEXT DEFAULT 'OS-',
      seq_tk_prefix TEXT DEFAULT 'TK-',
      alertas_ativos INTEGER DEFAULT 1,
      percentual_histerese INTEGER DEFAULT 5,
      horario_digest TEXT DEFAULT '08:00',
      dias_escalonamento INTEGER DEFAULT 2,
      horario_varredura TEXT DEFAULT '06:00',
      janela_consumo_dias INTEGER DEFAULT 90,
      last_backup TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      cnpj TEXT,
      contato_nome TEXT,
      email TEXT,
      telefone TEXT,
      cidade TEXT,
      uf TEXT,
      categorias TEXT DEFAULT '[]',
      ativo INTEGER DEFAULT 1,
      observacoes TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      codigo TEXT NOT NULL UNIQUE,
      descricao TEXT NOT NULL,
      unidade TEXT NOT NULL DEFAULT 'UN',
      categoria TEXT,
      tipo TEXT NOT NULL DEFAULT 'materia_prima',
      preco_referencia INTEGER,
      estoque_minimo INTEGER DEFAULT 0,
      estoque_maximo INTEGER DEFAULT 0,
      ponto_reposicao INTEGER,
      lote_economico INTEGER DEFAULT 1000,
      lead_time_compra_dias INTEGER DEFAULT 5,
      controla_lote INTEGER DEFAULT 0,
      controla_serie INTEGER DEFAULT 0,
      produzivel INTEGER DEFAULT 0,
      alerta_estoque_ativo INTEGER DEFAULT 1,
      alerta_responsavel_id TEXT,
      consumo_medio_diario INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS stock_balances (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      location_id TEXT,
      quantidade INTEGER NOT NULL DEFAULT 0,
      custo_medio INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stock_reservations (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      location_id TEXT,
      quantidade INTEGER NOT NULL,
      origem_tipo TEXT NOT NULL,
      origem_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ativa',
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      location_id TEXT,
      tipo TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      sinal INTEGER NOT NULL,
      custo_unitario INTEGER DEFAULT 0,
      origem_tipo TEXT,
      origem_id TEXT,
      estorno_de_id TEXT,
      lote_id TEXT,
      numero_serie TEXT,
      user_id TEXT,
      observacao TEXT,
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_alerts (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      nivel TEXT NOT NULL,
      disponivel_no_disparo INTEGER NOT NULL,
      estoque_minimo_no_disparo INTEGER NOT NULL,
      ponto_reposicao_no_disparo INTEGER NOT NULL,
      origem_tipo TEXT NOT NULL,
      origem_id TEXT,
      status TEXT NOT NULL DEFAULT 'aberto',
      reconhecido_por TEXT,
      reconhecido_em TEXT,
      silenciado_ate TEXT,
      requisition_id TEXT,
      production_order_id TEXT,
      resolvido_em TEXT,
      resolvido_porque TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      documento_tipo TEXT,
      documento_id TEXT,
      lida_em TEXT,
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bom_versions (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      versao TEXT NOT NULL,
      descricao TEXT,
      status TEXT NOT NULL DEFAULT 'rascunho',
      vigente_de TEXT,
      vigente_ate TEXT,
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bom_items (
      id TEXT PRIMARY KEY,
      bom_version_id TEXT NOT NULL REFERENCES bom_versions(id),
      component_product_id TEXT NOT NULL REFERENCES products(id),
      quantidade INTEGER NOT NULL,
      perda_percentual INTEGER DEFAULT 0,
      operacao_id TEXT,
      opcional INTEGER DEFAULT 0,
      observacao TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      cnpj_cpf TEXT,
      contato_nome TEXT,
      email TEXT,
      telefone TEXT,
      cidade TEXT,
      uf TEXT,
      endereco TEXT,
      observacoes TEXT,
      ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sales_orders (
      id TEXT PRIMARY KEY,
      numero TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      vendedor_id TEXT,
      condicao_pagamento TEXT,
      forma_pagamento TEXT,
      prazo_entrega TEXT,
      data_entrega_prometida TEXT,
      frete INTEGER DEFAULT 0,
      desconto INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'orcamento',
      observacoes TEXT,
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales_order_items (
      id TEXT PRIMARY KEY,
      sales_order_id TEXT NOT NULL REFERENCES sales_orders(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      descricao TEXT NOT NULL,
      unidade TEXT NOT NULL DEFAULT 'UN',
      quantidade INTEGER NOT NULL,
      preco_unitario INTEGER NOT NULL,
      modelo_maquina TEXT,
      bom_version_id TEXT REFERENCES bom_versions(id),
      configuracao TEXT,
      quantidade_produzida INTEGER DEFAULT 0,
      quantidade_entregue INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS production_orders (
      id TEXT PRIMARY KEY,
      numero TEXT NOT NULL UNIQUE,
      sales_order_id TEXT REFERENCES sales_orders(id),
      sales_order_item_id TEXT REFERENCES sales_order_items(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      modelo_maquina TEXT,
      bom_version_id TEXT REFERENCES bom_versions(id),
      quantidade INTEGER NOT NULL,
      quantidade_produzida INTEGER DEFAULT 0,
      quantidade_refugo INTEGER DEFAULT 0,
      prioridade TEXT NOT NULL DEFAULT 'normal',
      data_prevista_inicio TEXT,
      data_prevista_fim TEXT,
      data_inicio_real TEXT,
      data_fim_real TEXT,
      status TEXT NOT NULL DEFAULT 'planejada',
      tipo TEXT NOT NULL DEFAULT 'normal',
      ticket_id TEXT,
      posicao_kanban INTEGER DEFAULT 0,
      responsavel_id TEXT,
      observacoes TEXT,
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS production_order_materials (
      id TEXT PRIMARY KEY,
      production_order_id TEXT NOT NULL REFERENCES production_orders(id),
      component_product_id TEXT NOT NULL REFERENCES products(id),
      quantidade_necessaria INTEGER NOT NULL,
      quantidade_reservada INTEGER DEFAULT 0,
      quantidade_separada INTEGER DEFAULT 0,
      quantidade_consumida INTEGER DEFAULT 0,
      quantidade_devolvida INTEGER DEFAULT 0,
      falta_quantidade INTEGER DEFAULT 0,
      requisition_id TEXT
    );

    CREATE TABLE IF NOT EXISTS picking_orders (
      id TEXT PRIMARY KEY,
      numero TEXT NOT NULL UNIQUE,
      production_order_id TEXT NOT NULL REFERENCES production_orders(id),
      status TEXT NOT NULL DEFAULT 'aberta',
      responsavel_id TEXT,
      iniciado_em TEXT,
      concluido_em TEXT,
      observacoes TEXT
    );

    CREATE TABLE IF NOT EXISTS picking_items (
      id TEXT PRIMARY KEY,
      picking_order_id TEXT NOT NULL REFERENCES picking_orders(id),
      production_order_material_id TEXT NOT NULL REFERENCES production_order_materials(id),
      component_product_id TEXT NOT NULL REFERENCES products(id),
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      location_id TEXT,
      quantidade_solicitada INTEGER NOT NULL,
      quantidade_separada INTEGER DEFAULT 0,
      lote_id TEXT,
      status TEXT NOT NULL DEFAULT 'pendente',
      observacao TEXT
    );

    CREATE TABLE IF NOT EXISTS requisitions (
      id TEXT PRIMARY KEY,
      numero TEXT NOT NULL UNIQUE,
      solicitante TEXT NOT NULL,
      setor TEXT NOT NULL,
      centro_custo TEXT,
      prioridade TEXT NOT NULL DEFAULT 'normal',
      data_necessidade TEXT,
      justificativa TEXT,
      status TEXT NOT NULL DEFAULT 'rascunho',
      motivo_reprovacao TEXT,
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS requisition_items (
      id TEXT PRIMARY KEY,
      requisition_id TEXT NOT NULL REFERENCES requisitions(id),
      product_id TEXT,
      descricao TEXT NOT NULL,
      unidade TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      observacao TEXT
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      numero TEXT NOT NULL UNIQUE,
      origem TEXT NOT NULL DEFAULT 'padrao',
      comparacao_base TEXT NOT NULL DEFAULT 'a_vista',
      requisition_id TEXT REFERENCES requisitions(id),
      titulo TEXT NOT NULL,
      solicitante TEXT,
      comprador TEXT NOT NULL,
      fornecedor TEXT,
      fornecedor_id TEXT,
      status TEXT NOT NULL DEFAULT 'nova_solicitacao',
      prioridade TEXT NOT NULL DEFAULT 'normal',
      prazo TEXT NOT NULL,
      valor_estimado INTEGER,
      valor_final INTEGER,
      bloqueado INTEGER DEFAULT 0,
      motivo_bloqueio TEXT,
      motivo_reprovacao TEXT,
      observacoes TEXT,
      anexos TEXT DEFAULT '[]',
      comentarios TEXT DEFAULT '[]',
      historico TEXT DEFAULT '[]',
      order_id TEXT,
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotation_items (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES quotations(id),
      descricao TEXT NOT NULL,
      unidade TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      valor_estimado_unit INTEGER,
      vencedor_supplier_id TEXT,
      vencedor_preco_unit INTEGER,
      preco_a_vista_unit INTEGER,
      preco_parcelado_unit INTEGER,
      numero_parcelas INTEGER DEFAULT 1,
      convertido INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quotation_suppliers (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES quotations(id),
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      contato_cotacao TEXT,
      forma_envio TEXT DEFAULT 'email',
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotation_history (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES quotations(id),
      status_de TEXT,
      status_para TEXT NOT NULL,
      observacao TEXT,
      usuario_id TEXT NOT NULL,
      usuario_nome TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      numero TEXT NOT NULL UNIQUE,
      quotation_id TEXT REFERENCES quotations(id),
      requisition_id TEXT,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      condicao_pagamento TEXT,
      prazo_entrega TEXT,
      frete INTEGER DEFAULT 0,
      desconto INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'emitido',
      criado_em TEXT NOT NULL,
      observacoes TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      quotation_item_id TEXT,
      descricao TEXT NOT NULL,
      unidade TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      preco_unitario INTEGER NOT NULL,
      quantidade_recebida INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      numero TEXT NOT NULL UNIQUE,
      titulo TEXT NOT NULL,
      descricao TEXT,
      customer_id TEXT REFERENCES customers(id),
      sales_order_id TEXT REFERENCES sales_orders(id),
      production_order_id TEXT REFERENCES production_orders(id),
      product_id TEXT REFERENCES products(id),
      numero_serie TEXT,
      categoria TEXT NOT NULL DEFAULT 'duvida',
      canal TEXT NOT NULL DEFAULT 'whatsapp',
      prioridade TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'novo',
      responsavel_id TEXT,
      solicitante_nome TEXT,
      solicitante_contato TEXT,
      sla_primeira_resposta_ate TEXT,
      sla_resolucao_ate TEXT,
      primeira_resposta_em TEXT,
      resolvido_em TEXT,
      fechado_em TEXT,
      em_garantia INTEGER DEFAULT 1,
      posicao_kanban INTEGER DEFAULT 0,
      criado_em TEXT NOT NULL
    );
  `);

  seedInitialData();
}

/**
 * Popula dados padrão se o banco estiver vazio
 */
function seedInitialData() {
  const now = new Date().toISOString();

  // 1. Roles Padrão
  const roleCount = sqlite.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };
  if (roleCount.count === 0) {
    const insertRole = sqlite.prepare(`
      INSERT INTO roles (id, name, description, approval_limit_cents, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const role of DEFAULT_ROLES) {
      insertRole.run(
        role.id,
        role.name,
        role.description,
        role.approvalLimitCents,
        JSON.stringify(role.permissions),
        now,
        now
      );
    }
  }

  // 2. Empresa JP3D
  const companyCount = sqlite.prepare('SELECT COUNT(*) as count FROM company_settings').get() as { count: number };
  if (companyCount.count === 0) {
    sqlite.prepare(`
      INSERT INTO company_settings (
        id, razao_social, nome_fantasia, cnpj, ie, endereco, bairro, cidade, uf, cep, email, telefone, seq_req_prefix, seq_cot_prefix, seq_pc_prefix, seq_op_prefix, seq_pv_prefix, seq_os_prefix, seq_tk_prefix, alertas_ativos, percentual_histerese, updated_at
      ) VALUES (
        'comp-1', 'JP3D INDUSTRIA E COMERCIO LTDA', 'JP3D Industrial', '50.746.777/0001-78', 'ISENTO', 'Rua Industrial JP3D, 100', 'Distrito Industrial', 'São Paulo', 'SP', '01000-000', 'contato@jp3d.com.br', '(11) 99999-9999', 'REQ-', 'COT-', 'PC-', 'OP-', 'PV-', 'OS-', 'TK-', 1, 5, ?
      )
    `).run(now);
  }

  // 3. Usuário Administrador Inicial
  const userCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const passwordHash = bcrypt.hashSync('041219', 10);
    sqlite.prepare(`
      INSERT INTO users (id, name, email, password_hash, role_id, active, preferences, created_at, updated_at)
      VALUES ('usr-admin', 'Administrador JP3D', 'admin@jp3d.com.br', ?, 'role-admin', 1, '{"sidebarCollapsed":false}', ?, ?)
    `).run(passwordHash, now, now);
  }

  // 4. Depósitos Padrão
  const whCount = sqlite.prepare('SELECT COUNT(*) as count FROM warehouses').get() as { count: number };
  if (whCount.count === 0) {
    const insertWh = sqlite.prepare('INSERT INTO warehouses (id, nome, tipo, ativo) VALUES (?, ?, ?, 1)');
    insertWh.run('wh-1', 'Almoxarifado Matéria-Prima', 'materia_prima');
    insertWh.run('wh-2', 'Depósito Produto Acabado', 'produto_acabado');
    insertWh.run('wh-3', 'Expedição', 'expedicao');
    insertWh.run('wh-4', 'Refugo / Descarte', 'refugo');
  }
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function persistDbState(dbState: any, sqlite: DatabaseSync): void {
  const tableMap: Record<string, string> = {
    users: 'users',
    roles: 'roles',
    userPermissionOverrides: 'user_permission_overrides',
    products: 'products',
    warehouses: 'warehouses',
    stockBalances: 'stock_balances',
    stockReservations: 'stock_reservations',
    stockMovements: 'stock_movements',
    stockAlerts: 'stock_alerts',
    stockAlertEvents: 'stock_alert_events',
    bomVersions: 'bom_versions',
    bomItems: 'bom_items',
    customers: 'customers',
    salesOrders: 'sales_orders',
    salesOrderItems: 'sales_order_items',
    productionOrders: 'production_orders',
    productionOrderMaterials: 'production_order_materials',
    pickingOrders: 'picking_orders',
    pickingItems: 'picking_items',
    requisitions: 'requisitions',
    requisitionItems: 'requisition_items',
    quotations: 'quotations',
    quotationItems: 'quotation_items',
    quotationSuppliers: 'quotation_suppliers',
    quotationHistory: 'quotation_history',
    orders: 'orders',
    orderItems: 'order_items',
    tickets: 'tickets',
    notifications: 'notifications'
  };

  for (const [stateKey, tableName] of Object.entries(tableMap)) {
    const rows = dbState[stateKey];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    for (const row of rows) {
      try {
        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(', ');
        const colsSql = cols.map(c => `"${camelToSnake(c)}"`).join(', ');
        const stmt = sqlite.prepare(
          `INSERT OR REPLACE INTO ${tableName} (${colsSql}) VALUES (${placeholders})`
        );
        stmt.run(...cols.map(c => {
          const val = row[c];
          if (typeof val === 'boolean') return val ? 1 : 0;
          if (typeof val === 'object' && val !== null) return JSON.stringify(val);
          return val ?? null;
        }));
      } catch (e) {
        console.error(`Erro ao persistir ${tableName}:`, e);
      }
    }
  }
}

export function getNextSequence(sqlite: DatabaseSync, name: string): number {
  sqlite.prepare(`INSERT OR IGNORE INTO sequences (name, current) VALUES (?, 0)`).run(name);
  sqlite.prepare(`UPDATE sequences SET current = current + 1 WHERE name = ?`).run(name);
  const row = sqlite.prepare(`SELECT current FROM sequences WHERE name = ?`).get(name) as { current: number } | undefined;
  return row?.current || 1;
}
