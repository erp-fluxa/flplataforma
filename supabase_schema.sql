-- ==============================================================================
-- GESCOMP — BANCO DE DADOS SUPABASE (SCHEMA SEGURO & IDEMPOTENTE)
-- ==============================================================================
-- Instruções:
-- 1. Acesse seu painel no Supabase: https://supabase.com/dashboard
-- 2. Selecione seu projeto
-- 3. No menu lateral esquerdo, clique no ícone do SQL (SQL Editor)
-- 4. Clique em "+ New query"
-- 5. Cole TODO o conteúdo abaixo e clique no botão verde "RUN" (ou Ctrl+Enter)
-- ==============================================================================

-- 1. Habilitar extensões UUID e Criptografia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CRIAÇÃO DAS TABELAS (Estrutura Completa)
-- ==============================================================================

-- 2.1 Empresas / Multi-Tenant
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    fantasia TEXT,
    razao_social TEXT,
    cnpj TEXT,
    ie TEXT,
    endereco TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT,
    cep TEXT,
    email TEXT,
    telefone TEXT,
    logo_institucional_url TEXT,
    logo_plataforma_url TEXT,
    logo_sidebar_url TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Usuários do Sistema
CREATE TABLE IF NOT EXISTS public.system_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    username TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    permissoes JSONB DEFAULT '{}'::jsonb,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Tarefas Pessoais (Gescomp Mobile)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    texto TEXT NOT NULL,
    concluido BOOLEAN NOT NULL DEFAULT FALSE,
    prioridade TEXT DEFAULT 'media',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_id UUID
);

-- 2.4 Lista de Compras (Gescomp Mobile)
CREATE TABLE IF NOT EXISTS public.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    texto TEXT NOT NULL,
    quantidade NUMERIC NOT NULL DEFAULT 1,
    unidade TEXT DEFAULT 'un',
    concluido BOOLEAN NOT NULL DEFAULT FALSE,
    categoria TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_id UUID
);

-- 2.5 Clientes e CRM
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    razao_social TEXT,
    cnpj_cpf TEXT,
    email TEXT,
    telefone TEXT,
    cidade TEXT,
    uf TEXT,
    origem TEXT,
    status TEXT DEFAULT 'lead',
    notas TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 Produtos & Matérias-Primas
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'MP',
    tipo_item TEXT NOT NULL DEFAULT 'materia_prima', -- 'materia_prima' | 'uso_consumo' | 'produto_acabado'
    unidade TEXT NOT NULL DEFAULT 'UN',
    preco_venda NUMERIC DEFAULT 0,
    custo_unitario NUMERIC DEFAULT 0,
    estoque_atual NUMERIC DEFAULT 0,
    estoque_minimo NUMERIC DEFAULT 0,
    ficha_tecnica JSONB DEFAULT '[]'::jsonb,
    versao INTEGER NOT NULL DEFAULT 1,              -- Optimistic Locking / Controle de concorrência
    excluido BOOLEAN NOT NULL DEFAULT FALSE,        -- Soft Delete permanente para MP/MUC
    excluido_em TIMESTAMPTZ,
    excluido_por TEXT,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir colunas em bancos Supabase já existentes (Migração Idempotente)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tipo_item TEXT NOT NULL DEFAULT 'materia_prima';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS versao INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS excluido BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS excluido_por TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2.7 Cotações & RFQ
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    numero BIGSERIAL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'rascunho',
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    total NUMERIC NOT NULL DEFAULT 0,
    condicoes_pagamento TEXT,
    prazo_dias INTEGER DEFAULT 15,
    validade DATE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 Ordens de Produção (Kanban)
CREATE TABLE IF NOT EXISTS public.production_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    numero BIGSERIAL,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantidade NUMERIC NOT NULL DEFAULT 1,
    etapa TEXT NOT NULL DEFAULT 'fila',
    prioridade TEXT NOT NULL DEFAULT 'normal',
    dados_tecnicos JSONB DEFAULT '{}'::jsonb,
    iniciado_em TIMESTAMPTZ,
    finalizado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 Backups do Sistema
CREATE TABLE IF NOT EXISTS public.system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    versao TEXT NOT NULL DEFAULT '2.0.0',
    dados JSONB NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'automatico',
    criado_por UUID,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. ÍNDICES DE OTIMIZAÇÃO E PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks(usuario_id);
CREATE INDEX IF NOT EXISTS idx_compras_user ON public.compras(usuario_id);
CREATE INDEX IF NOT EXISTS idx_customers_comp ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_products_comp ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_comp ON public.quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_prod_orders_comp ON public.production_orders(company_id);

-- ==============================================================================
-- 4. HABILITAÇÃO DO ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. POLÍTICAS DE ACESSO (RLS POLICIES - REINICIALIZAÇÃO SEGURA)
-- ==============================================================================

-- 5.1 Tasks
DROP POLICY IF EXISTS "tasks_policy_all" ON public.tasks;
CREATE POLICY "tasks_policy_all" ON public.tasks
    FOR ALL USING (true) WITH CHECK (true);

-- 5.2 Compras
DROP POLICY IF EXISTS "compras_policy_all" ON public.compras;
CREATE POLICY "compras_policy_all" ON public.compras
    FOR ALL USING (true) WITH CHECK (true);

-- 5.3 Companies
DROP POLICY IF EXISTS "companies_policy_all" ON public.companies;
CREATE POLICY "companies_policy_all" ON public.companies
    FOR ALL USING (true) WITH CHECK (true);

-- 5.4 System Users
DROP POLICY IF EXISTS "system_users_policy_all" ON public.system_users;
CREATE POLICY "system_users_policy_all" ON public.system_users
    FOR ALL USING (true) WITH CHECK (true);

-- 5.5 Customers
DROP POLICY IF EXISTS "customers_policy_all" ON public.customers;
CREATE POLICY "customers_policy_all" ON public.customers
    FOR ALL USING (true) WITH CHECK (true);

-- 5.6 Products
DROP POLICY IF EXISTS "products_policy_all" ON public.products;
CREATE POLICY "products_policy_all" ON public.products
    FOR ALL USING (true) WITH CHECK (true);

-- 5.7 Quotations
DROP POLICY IF EXISTS "quotations_policy_all" ON public.quotations;
CREATE POLICY "quotations_policy_all" ON public.quotations
    FOR ALL USING (true) WITH CHECK (true);

-- 5.8 Production Orders
DROP POLICY IF EXISTS "prod_orders_policy_all" ON public.production_orders;
CREATE POLICY "prod_orders_policy_all" ON public.production_orders
    FOR ALL USING (true) WITH CHECK (true);

-- 5.9 System Backups
DROP POLICY IF EXISTS "backups_policy_all" ON public.system_backups;
CREATE POLICY "backups_policy_all" ON public.system_backups
    FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- SUCESSO: O schema foi criado e configurado com sucesso no Supabase!
-- ==============================================================================
