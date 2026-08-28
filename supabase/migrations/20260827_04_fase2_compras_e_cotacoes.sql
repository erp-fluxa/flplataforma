-- ==============================================================================
-- FASE 2.3: COMPRAS, FORNECEDORES, COTAÇÕES RFQ & PEDIDOS DE COMPRA
-- Migration 04: 20260827_04_fase2_compras_e_cotacoes.sql (100% Compatível com UUID/TEXT)
-- ==============================================================================

-- 1. FORNECEDORES HOMOLOGADOS
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    nome TEXT NOT NULL,
    cnpj TEXT,
    contato_nome TEXT,
    email TEXT,
    telefone TEXT,
    cidade TEXT,
    uf TEXT,
    categorias TEXT[] DEFAULT ARRAY[]::TEXT[],
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed de Fornecedores Homologados
INSERT INTO public.suppliers (nome, cnpj, contato_nome, email, telefone, cidade, uf, categorias, ativo)
SELECT 'Polímeros Sul Ltda', '12.345.678/0001-90', 'Marcos Silva', 'vendas@polimerossul.com.br', '(49) 3622-1000', 'São Miguel do Oeste', 'SC', ARRAY['Filamento', 'Resina'], true
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE nome = 'Polímeros Sul Ltda');

INSERT INTO public.suppliers (nome, cnpj, contato_nome, email, telefone, cidade, uf, categorias, ativo)
SELECT '3D Tech Insumos Brasil', '98.765.432/0001-10', 'Carla Souza', 'contato@3dtech.com.br', '(11) 98888-2222', 'Joinville', 'SC', ARRAY['Filamento', 'Componente Mecânico'], true
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE nome = '3D Tech Insumos Brasil');

-- 2. REQUISIÇÕES INTERNAS DE COMPRA
CREATE TABLE IF NOT EXISTS public.requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    numero TEXT NOT NULL,
    solicitante TEXT NOT NULL,
    setor TEXT NOT NULL,
    prioridade TEXT NOT NULL DEFAULT 'normal', -- 'baixa' | 'normal' | 'alta' | 'urgente'
    status TEXT NOT NULL DEFAULT 'rascunho',   -- 'rascunho' | 'pendente' | 'aprovada' | 'em_cotacao' | 'rejeitada'
    justificativa TEXT,
    data_necessidade DATE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
    product_id UUID,
    descricao TEXT NOT NULL,
    unidade TEXT NOT NULL DEFAULT 'UN',
    quantidade NUMERIC NOT NULL,
    observacao TEXT
);

-- 3. COTAÇÕES & RFQ (REQUEST FOR QUOTATION)
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    numero TEXT NOT NULL,
    titulo TEXT NOT NULL,
    solicitante TEXT,
    comprador TEXT NOT NULL DEFAULT 'Carlos Compras',
    fornecedor_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'nova_solicitacao', -- 'nova_solicitacao' | 'em_cotacao' | 'em_analise' | 'aprovada' | 'cancelada'
    prioridade TEXT NOT NULL DEFAULT 'normal',
    prazo DATE,
    valor_estimado INTEGER DEFAULT 0, -- Centavos BRL
    valor_final INTEGER DEFAULT 0,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_id UUID,
    descricao TEXT NOT NULL,
    unidade TEXT NOT NULL DEFAULT 'UN',
    quantidade NUMERIC NOT NULL,
    valor_unitario INTEGER DEFAULT 0,
    vencedor_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL
);

-- 4. PEDIDOS DE COMPRA (ORDENS DE COMPRA EMITIDAS)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    numero TEXT NOT NULL,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    condicao_pagamento TEXT DEFAULT '30 dias',
    prazo_entrega TEXT DEFAULT '10 dias úteis',
    frete INTEGER DEFAULT 0,
    desconto INTEGER DEFAULT 0,
    valor_total INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'emitido', -- 'emitido' | 'parcial' | 'concluido' | 'cancelado'
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID,
    descricao TEXT NOT NULL,
    unidade TEXT NOT NULL DEFAULT 'UN',
    quantidade NUMERIC NOT NULL,
    preco_unitario INTEGER NOT NULL,
    quantidade_recebida NUMERIC DEFAULT 0
);

-- 5. HABILITAÇÃO DO ROW LEVEL SECURITY
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS RLS PERMISSIVAS
DROP POLICY IF EXISTS "suppliers_all" ON public.suppliers;
CREATE POLICY "suppliers_all" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "requisitions_all" ON public.requisitions;
CREATE POLICY "requisitions_all" ON public.requisitions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "req_items_all" ON public.requisition_items;
CREATE POLICY "req_items_all" ON public.requisition_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "quotations_all" ON public.quotations;
CREATE POLICY "quotations_all" ON public.quotations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "quot_items_all" ON public.quotation_items;
CREATE POLICY "quot_items_all" ON public.quotation_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orders_all" ON public.orders;
CREATE POLICY "orders_all" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_all" ON public.order_items;
CREATE POLICY "order_items_all" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
