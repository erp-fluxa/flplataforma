-- ==============================================================================
-- FASE 2.4: CRM, CLIENTES, FUNIL DE VENDAS, PEDIDOS DE VENDA & USUÁRIOS (RBAC)
-- Migration 05: 20260827_05_fase2_crm_vendas_e_usuarios.sql (Corrigida)
-- ==============================================================================

-- 1. CLIENTES & CONTATOS COMERCIAIS
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY DEFAULT ('cli-' || substr(gen_random_uuid()::text, 1, 8)),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE DEFAULT 'comp-1',
    nome TEXT NOT NULL,
    razao_social TEXT,
    cnpj_cpf TEXT,
    ie TEXT,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    cidade TEXT,
    uf TEXT,
    cep TEXT,
    origem TEXT DEFAULT 'indicacao', -- 'indicacao' | 'google' | 'instagram' | 'feira' | 'prospeccao'
    status TEXT NOT NULL DEFAULT 'cliente', -- 'lead' | 'prospect' | 'cliente' | 'inativo'
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed de Clientes de Exemplo
INSERT INTO public.customers (id, nome, razao_social, cnpj_cpf, email, telefone, cidade, uf, status) VALUES
    ('cli-1', 'Visual Art Comunicação Visual', 'Visual Art Placas & Luminosos Ltda', '11.222.333/0001-44', 'contato@visualart.com.br', '(47) 3322-5500', 'Blumenau', 'SC', 'cliente'),
    ('cli-2', 'Cenografia Criativa Brasil', 'Cenografia Criativa Produções Artísticas ME', '22.333.444/0001-55', 'cenografia@criativabrasil.com.br', '(11) 97777-3333', 'São Paulo', 'SP', 'cliente')
ON CONFLICT (id) DO NOTHING;

-- 2. FUNIL COMERCIAL / OPORTUNIDADES (CRM DEALS & LEADS)
CREATE TABLE IF NOT EXISTS public.deals (
    id TEXT PRIMARY KEY DEFAULT ('deal-' || substr(gen_random_uuid()::text, 1, 8)),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE DEFAULT 'comp-1',
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    etapa TEXT NOT NULL DEFAULT 'prospeccao', -- 'prospeccao' | 'qualificacao' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'
    valor_estimado INTEGER DEFAULT 0,         -- Centavos BRL (ex: 4200000 = R$ 42.000,00)
    probabilidade INTEGER DEFAULT 50,         -- 0 a 100%
    linha_interesse TEXT DEFAULT 'CV',        -- 'CV' | 'CX' | 'insumos' | 'servicos'
    responsavel_nome TEXT DEFAULT 'João Marcos',
    data_fechamento_prevista DATE,
    motivo_perda TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PEDIDOS DE VENDA INDUSTRIAIS
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id TEXT PRIMARY KEY DEFAULT ('pv-' || substr(gen_random_uuid()::text, 1, 8)),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE DEFAULT 'comp-1',
    numero TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    deal_id TEXT REFERENCES public.deals(id) ON DELETE SET NULL,
    valor_total INTEGER NOT NULL DEFAULT 0,    -- Centavos BRL
    sinal_entrada INTEGER DEFAULT 0,          -- Centavos BRL
    numero_parcelas INTEGER DEFAULT 1,
    prazo_fabricacao_dias INTEGER DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'orcamento', -- 'orcamento' | 'aprovado' | 'em_producao' | 'faturado' | 'entregue' | 'cancelado'
    vendedor_nome TEXT DEFAULT 'João Marcos',
    condicoes_pagamento TEXT DEFAULT 'Entrada 30% + saldo no faturamento',
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id TEXT PRIMARY KEY DEFAULT ('pvit-' || substr(gen_random_uuid()::text, 1, 8)),
    sales_order_id TEXT NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    quantidade NUMERIC NOT NULL DEFAULT 1,
    preco_unitario INTEGER NOT NULL,
    desconto INTEGER DEFAULT 0
);

-- 4. PAPÉIS E PERMISSÕES (RBAC)
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    permissoes JSONB DEFAULT '[]'::jsonb
);

INSERT INTO public.roles (id, nome, descricao, permissoes) VALUES
    ('super_admin', 'Super Administrador', 'Acesso irrestrito a todas as funções e finanças', '["*"]'::jsonb),
    ('admin', 'Administrador', 'Gestão geral do sistema e aprovações', '["*"]'::jsonb),
    ('comprador', 'Comprador Industrial', 'Gestão de cotações RFQ, fornecedores e pedidos', '["compras", "estoque_leitura", "produtos_leitura"]'::jsonb),
    ('producao', 'Engenharia / PCP', 'Ordens de produção, Kanban e fichas técnicas', '["producao", "estoque", "produtos"]'::jsonb),
    ('comercial', 'Comercial & Vendas', 'CRM, funil de oportunidades e pedidos de venda', '["vendas", "crm", "produtos_leitura"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 5. HABILITAÇÃO DO ROW LEVEL SECURITY
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS RLS PERMISSIVAS
DROP POLICY IF EXISTS "customers_all" ON public.customers;
CREATE POLICY "customers_all" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "deals_all" ON public.deals;
CREATE POLICY "deals_all" ON public.deals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sales_orders_all" ON public.sales_orders;
CREATE POLICY "sales_orders_all" ON public.sales_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sales_order_items_all" ON public.sales_order_items;
CREATE POLICY "sales_order_items_all" ON public.sales_order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "roles_all" ON public.roles;
CREATE POLICY "roles_all" ON public.roles FOR ALL USING (true) WITH CHECK (true);
