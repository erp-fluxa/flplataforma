-- ==============================================================================
-- FASE 2.1: CADASTROS MESTRES, PRODUTOS, MATÉRIAS-PRIMAS & ESTOQUE MULTI-DEPÓSITO
-- Migration 02: 20260827_02_fase2_produtos_e_estoque.sql
-- ==============================================================================

-- 1. CATEGORIAS DE MATERIAIS (MP & MUC)
CREATE TABLE IF NOT EXISTS public.material_categories (
    id TEXT PRIMARY KEY DEFAULT ('cat-' || substr(gen_random_uuid()::text, 1, 8)),
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'MP', -- 'MP' (Matéria-Prima) | 'MUC' (Materiais de Uso e Consumo)
    sistema BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed de Categorias Padrão
INSERT INTO public.material_categories (id, nome, tipo, sistema) VALUES
    ('cat-mp-1', 'Estrutura Mecânica', 'MP', true),
    ('cat-mp-2', 'Eletrônica', 'MP', true),
    ('cat-mp-3', 'Extrusão', 'MP', true),
    ('cat-mp-4', 'Mesa Aquecida', 'MP', true),
    ('cat-mp-5', 'Correias e Transmissão', 'MP', true),
    ('cat-mp-6', 'Outros (MP)', 'MP', true),
    ('cat-muc-1', 'EPI', 'MUC', true),
    ('cat-muc-2', 'Embalagem', 'MUC', true),
    ('cat-muc-3', 'Ferramenta', 'MUC', true),
    ('cat-muc-4', 'Filamento (Teste/Operação)', 'MUC', true),
    ('cat-muc-5', 'Limpeza e Manutenção', 'MUC', true),
    ('cat-muc-6', 'Outros (MUC)', 'MUC', true)
ON CONFLICT (id) DO NOTHING;

-- 2. TABELA DE PRODUTOS & MATÉRIAS-PRIMAS NORMALIZADA
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT ('p-' || substr(gen_random_uuid()::text, 1, 8)),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE DEFAULT 'comp-1',
    codigo TEXT NOT NULL UNIQUE,
    descricao TEXT NOT NULL,
    unidade TEXT NOT NULL DEFAULT 'UN',
    categoria TEXT,
    tipo_item TEXT NOT NULL DEFAULT 'materia_prima', -- 'materia_prima' | 'uso_consumo' | 'produto_acabado'
    preco_referencia INTEGER DEFAULT 0, -- Em centavos de BRL (ex: 4200000 = R$ 42.000,00)
    custo_unitario INTEGER DEFAULT 0,   -- Em centavos de BRL
    estoque_minimo NUMERIC NOT NULL DEFAULT 0,
    estoque_maximo NUMERIC DEFAULT 0,
    ponto_reposicao NUMERIC DEFAULT 0,
    lote_economico NUMERIC DEFAULT 1,
    lead_time_dias INTEGER DEFAULT 5,
    produzivel BOOLEAN NOT NULL DEFAULT FALSE,
    sob_encomenda BOOLEAN NOT NULL DEFAULT FALSE,
    linha TEXT,                         -- Linha industrial (ex: 'CV' ou 'CX')
    volume_xy TEXT,                     -- Ex: '1200x1200 mm'
    eixo_z TEXT,                        -- Ex: '370 mm'
    alerta_estoque_ativo BOOLEAN NOT NULL DEFAULT TRUE,
    versao INTEGER NOT NULL DEFAULT 1,  -- Optimistic Locking / Concorrência
    excluido BOOLEAN NOT NULL DEFAULT FALSE, -- Soft Delete
    excluido_em TIMESTAMPTZ,
    excluido_por TEXT,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Otimização
CREATE INDEX IF NOT EXISTS idx_products_tipo_item ON public.products(tipo_item) WHERE excluido = FALSE;
CREATE INDEX IF NOT EXISTS idx_products_codigo ON public.products(codigo);

-- 3. DEPÓSITOS & ALMOXARIFADOS (MULTI-DEPÓSITO)
CREATE TABLE IF NOT EXISTS public.warehouses (
    id TEXT PRIMARY KEY DEFAULT ('wh-' || substr(gen_random_uuid()::text, 1, 8)),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE DEFAULT 'comp-1',
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'materia_prima', -- 'materia_prima' | 'produto_acabado' | 'expedicao' | 'refugo'
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed de Depósitos
INSERT INTO public.warehouses (id, company_id, nome, tipo, ativo) VALUES
    ('wh-1', 'comp-1', 'Almoxarifado Matriz SC (Insumos/Matéria-Prima)', 'materia_prima', true),
    ('wh-2', 'comp-1', 'Depósito Matriz SC (Produtos Acabados & Máquinas)', 'produto_acabado', true),
    ('wh-3', 'comp-1', 'Área de Expedição Matriz SC', 'expedicao', true),
    ('wh-4', 'comp-1', 'Depósito de Refugo & Sucata Matriz SC', 'refugo', true),
    ('wh-5', 'comp-2', 'Almoxarifado Filial PR (Insumos/Matéria-Prima)', 'materia_prima', true),
    ('wh-6', 'comp-2', 'Depósito Filial PR (Produtos Acabados)', 'produto_acabado', true)
ON CONFLICT (id) DO NOTHING;

-- 4. ENDEREÇAMENTO & LOCALIZAÇÕES DE ESTOQUE
CREATE TABLE IF NOT EXISTS public.locations (
    id TEXT PRIMARY KEY DEFAULT ('loc-' || substr(gen_random_uuid()::text, 1, 8)),
    warehouse_id TEXT NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    descricao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SALDOS DE ESTOQUE EM TEMPO REAL
CREATE TABLE IF NOT EXISTS public.stock_balances (
    id TEXT PRIMARY KEY DEFAULT ('bal-' || substr(gen_random_uuid()::text, 1, 8)),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id TEXT NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
    quantidade NUMERIC NOT NULL DEFAULT 0,
    custo_medio INTEGER DEFAULT 0, -- Centavos BRL
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unq_product_warehouse_location UNIQUE(product_id, warehouse_id, location_id)
);

-- 6. MOVIMENTAÇÕES DE ESTOQUE (KARDEX AUDITÁVEL)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY DEFAULT ('mov-' || substr(gen_random_uuid()::text, 1, 8)),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id TEXT NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL,          -- 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'consumo_op'
    quantidade NUMERIC NOT NULL,
    sinal INTEGER NOT NULL,      -- +1 para entrada, -1 para saída
    custo_unitario INTEGER DEFAULT 0,
    origem_tipo TEXT,            -- 'compra' | 'ordem_producao' | 'inventario' | 'avulso'
    origem_id TEXT,
    usuario_nome TEXT NOT NULL DEFAULT 'Sistema',
    observacao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ALERTAS DE ESTOQUE MÍNIMO
CREATE TABLE IF NOT EXISTS public.stock_alerts (
    id TEXT PRIMARY KEY DEFAULT ('alt-' || substr(gen_random_uuid()::text, 1, 8)),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    nivel TEXT NOT NULL,         -- 'critico' | 'atencao' | 'ok'
    disponivel_no_disparo NUMERIC NOT NULL,
    estoque_minimo_no_disparo NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberto', -- 'aberto' | 'resolvido' | 'silenciado'
    reconhecido_por TEXT,
    reconhecido_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. HABILITAÇÃO DO ROW LEVEL SECURITY
ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- 9. POLÍTICAS RLS PERMISSIVAS PARA OPERAÇÃO
DROP POLICY IF EXISTS "categories_all" ON public.material_categories;
CREATE POLICY "categories_all" ON public.material_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "products_all" ON public.products;
CREATE POLICY "products_all" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "warehouses_all" ON public.warehouses;
CREATE POLICY "warehouses_all" ON public.warehouses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "locations_all" ON public.locations;
CREATE POLICY "locations_all" ON public.locations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "stock_balances_all" ON public.stock_balances;
CREATE POLICY "stock_balances_all" ON public.stock_balances FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "stock_movements_all" ON public.stock_movements;
CREATE POLICY "stock_movements_all" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "stock_alerts_all" ON public.stock_alerts;
CREATE POLICY "stock_alerts_all" ON public.stock_alerts FOR ALL USING (true) WITH CHECK (true);
