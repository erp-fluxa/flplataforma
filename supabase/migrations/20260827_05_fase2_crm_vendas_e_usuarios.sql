-- ==============================================================================
-- FASE 2.4: CRM, CLIENTES, FUNIL DE VENDAS, PEDIDOS DE VENDA & USUÁRIOS (RBAC)
-- Migration 05: 20260827_05_fase2_crm_vendas_e_usuarios.sql (100% Compatível com UUID/TEXT)
-- ==============================================================================

-- 1. HABILITAR EXTENSÕES DE UUID CASO NÃO ESTEJAM
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CLIENTES & CONTATOS COMERCIAIS
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
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
    origem TEXT DEFAULT 'indicacao',
    status TEXT NOT NULL DEFAULT 'cliente',
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir colunas novas caso a tabela já existisse no Supabase
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cnpj_cpf TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'indicacao';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'cliente';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Seed de Clientes com UUID compatível
INSERT INTO public.customers (nome, razao_social, cnpj_cpf, email, telefone, cidade, uf, status)
SELECT 'Visual Art Comunicação Visual', 'Visual Art Placas & Luminosos Ltda', '11.222.333/0001-44', 'contato@visualart.com.br', '(47) 3322-5500', 'Blumenau', 'SC', 'cliente'
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE nome = 'Visual Art Comunicação Visual');

INSERT INTO public.customers (nome, razao_social, cnpj_cpf, email, telefone, cidade, uf, status)
SELECT 'Cenografia Criativa Brasil', 'Cenografia Criativa Produções Artísticas ME', '22.333.444/0001-55', 'cenografia@criativabrasil.com.br', '(11) 97777-3333', 'São Paulo', 'SP', 'cliente'
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE nome = 'Cenografia Criativa Brasil');

-- 3. FUNIL COMERCIAL / OPORTUNIDADES (CRM DEALS & LEADS)
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    etapa TEXT NOT NULL DEFAULT 'prospeccao', -- 'prospeccao' | 'qualificacao' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'
    valor_estimado INTEGER DEFAULT 0,         -- Centavos BRL
    probabilidade INTEGER DEFAULT 50,
    linha_interesse TEXT DEFAULT 'CV',
    responsavel_nome TEXT DEFAULT 'João Marcos',
    data_fechamento_prevista DATE,
    motivo_perda TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PEDIDOS DE VENDA INDUSTRIAIS
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    numero TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    valor_total INTEGER NOT NULL DEFAULT 0,
    sinal_entrada INTEGER DEFAULT 0,
    numero_parcelas INTEGER DEFAULT 1,
    prazo_fabricacao_dias INTEGER DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'orcamento',
    vendedor_nome TEXT DEFAULT 'João Marcos',
    condicoes_pagamento TEXT DEFAULT 'Entrada 30% + saldo no faturamento',
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    product_id UUID,
    descricao TEXT NOT NULL,
    quantidade NUMERIC NOT NULL DEFAULT 1,
    preco_unitario INTEGER NOT NULL,
    desconto INTEGER DEFAULT 0
);

-- 5. PAPÉIS E PERMISSÕES (RBAC)
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

-- 6. HABILITAÇÃO DO ROW LEVEL SECURITY
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS RLS PERMISSIVAS
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
