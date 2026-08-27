-- ==============================================================================
-- FASE 2.2: ENGENHARIA (BOM), PCP, ORDENS DE PRODUÇÃO & KANBAN INDUSTRIAL
-- Migration 03: 20260827_03_fase2_pcp_e_producao.sql
-- ==============================================================================

-- 1. FICHAS TÉCNICAS / VERSÕES BOM (BILL OF MATERIALS)
CREATE TABLE IF NOT EXISTS public.bom_versions (
    id TEXT PRIMARY KEY DEFAULT ('bom-' || substr(gen_random_uuid()::text, 1, 8)),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    versao TEXT NOT NULL DEFAULT 'v1.0 (Ativa)',
    descricao TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ativa', -- 'rascunho' | 'ativa' | 'obsoleta'
    vigente_de DATE DEFAULT CURRENT_DATE,
    vigente_ate DATE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. COMPONENTES E ITENS DA FICHA TÉCNICA
CREATE TABLE IF NOT EXISTS public.bom_items (
    id TEXT PRIMARY KEY DEFAULT ('bomit-' || substr(gen_random_uuid()::text, 1, 8)),
    bom_version_id TEXT NOT NULL REFERENCES public.bom_versions(id) ON DELETE CASCADE,
    component_product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantidade NUMERIC NOT NULL DEFAULT 1,
    perda_percentual NUMERIC DEFAULT 0,
    opcional BOOLEAN NOT NULL DEFAULT FALSE,
    observacao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CENTROS DE TRABALHO & POSTOS OPERACIONAIS
CREATE TABLE IF NOT EXISTS public.work_centers (
    id TEXT PRIMARY KEY DEFAULT ('wc-' || substr(gen_random_uuid()::text, 1, 8)),
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'bancada', -- 'bancada' | 'celula' | 'maquina' | 'linha'
    capacidade_hora_dia NUMERIC NOT NULL DEFAULT 8,
    custo_hora INTEGER NOT NULL DEFAULT 6500, -- Centavos BRL (ex: R$ 65,00/h)
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.work_centers (id, nome, tipo, capacidade_hora_dia, custo_hora, ativo) VALUES
    ('wc-1', 'Bancada de Montagem Estrutural e Eixos', 'bancada', 8, 6500, true),
    ('wc-2', 'Célula de Eletrônica, Klipper e Calibração', 'celula', 8, 9000, true),
    ('wc-3', 'Bancada de Testes de Qualidade e Burn-in 12h', 'bancada', 8, 7500, true)
ON CONFLICT (id) DO NOTHING;

-- 4. ROTEIROS DE OPERAÇÃO DA ENGENHARIA
CREATE TABLE IF NOT EXISTS public.routing_operations (
    id TEXT PRIMARY KEY DEFAULT ('rop-' || substr(gen_random_uuid()::text, 1, 8)),
    bom_version_id TEXT NOT NULL REFERENCES public.bom_versions(id) ON DELETE CASCADE,
    sequencia INTEGER NOT NULL DEFAULT 10,
    nome TEXT NOT NULL,
    work_center_id TEXT REFERENCES public.work_centers(id) ON DELETE SET NULL,
    tempo_setup_min INTEGER DEFAULT 15,
    tempo_unitario_min INTEGER DEFAULT 120,
    instrucoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ORDENS DE PRODUÇÃO (PCP & KANBAN)
CREATE TABLE IF NOT EXISTS public.production_orders (
    id TEXT PRIMARY KEY DEFAULT ('op-' || substr(gen_random_uuid()::text, 1, 8)),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE DEFAULT 'comp-1',
    numero TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    bom_version_id TEXT REFERENCES public.bom_versions(id) ON DELETE SET NULL,
    quantidade NUMERIC NOT NULL DEFAULT 1,
    quantidade_produzida NUMERIC NOT NULL DEFAULT 0,
    quantidade_refugo NUMERIC NOT NULL DEFAULT 0,
    prioridade TEXT NOT NULL DEFAULT 'normal', -- 'baixa' | 'normal' | 'alta' | 'urgente'
    status TEXT NOT NULL DEFAULT 'planejada',   -- 'planejada' | 'separacao' | 'producao' | 'qualidade' | 'concluida' | 'cancelada'
    data_prevista_inicio DATE DEFAULT CURRENT_DATE,
    data_prevista_fim DATE,
    data_inicio_real TIMESTAMPTZ,
    data_fim_real TIMESTAMPTZ,
    responsavel_nome TEXT DEFAULT 'Eng. Marcelo',
    observacoes TEXT,
    posicao_kanban INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. MATERIAIS EMPENHADOS POR ORDEM DE PRODUÇÃO
CREATE TABLE IF NOT EXISTS public.production_order_materials (
    id TEXT PRIMARY KEY DEFAULT ('opmat-' || substr(gen_random_uuid()::text, 1, 8)),
    production_order_id TEXT NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    component_product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantidade_necessaria NUMERIC NOT NULL,
    quantidade_reservada NUMERIC DEFAULT 0,
    quantidade_separada NUMERIC DEFAULT 0,
    quantidade_consumida NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'separado' | 'consumido'
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. HABILITAÇÃO DO ROW LEVEL SECURITY
ALTER TABLE public.bom_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_order_materials ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS RLS PERMISSIVAS
DROP POLICY IF EXISTS "bom_versions_all" ON public.bom_versions;
CREATE POLICY "bom_versions_all" ON public.bom_versions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "bom_items_all" ON public.bom_items;
CREATE POLICY "bom_items_all" ON public.bom_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "work_centers_all" ON public.work_centers;
CREATE POLICY "work_centers_all" ON public.work_centers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "routing_operations_all" ON public.routing_operations;
CREATE POLICY "routing_operations_all" ON public.routing_operations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "production_orders_all" ON public.production_orders;
CREATE POLICY "production_orders_all" ON public.production_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "prod_materials_all" ON public.production_order_materials;
CREATE POLICY "prod_materials_all" ON public.production_order_materials FOR ALL USING (true) WITH CHECK (true);
