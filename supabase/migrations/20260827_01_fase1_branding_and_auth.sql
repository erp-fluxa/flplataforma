-- ==============================================================================
-- FASE 1: BRANDING GLOBAL & FUNDAÇÃO NORMALIZADA (FLUXA / GESCOMP)
-- Migration 01: 20260827_01_fase1_branding_and_auth.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DEDICADA DE BRANDING DO SISTEMA (ISOLADA DE SNAPSHOTS)
CREATE TABLE IF NOT EXISTS public.system_branding (
    id TEXT PRIMARY KEY DEFAULT 'default',
    nome_sistema TEXT NOT NULL DEFAULT 'Gescomp ERP',
    subtitulo TEXT NOT NULL DEFAULT 'GESTÃO DE COMPRAS E INDÚSTRIA',
    logo_institucional_url TEXT,
    logo_plataforma_url TEXT,
    logo_sidebar_url TEXT,
    cor_primaria TEXT NOT NULL DEFAULT '#0f766e',
    tema_padrao TEXT NOT NULL DEFAULT 'dark',
    favicon_url TEXT,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_por TEXT
);

-- 2. DADOS PADRÃO DE BRANDING (IDEMPOTENTE)
INSERT INTO public.system_branding (id, nome_sistema, subtitulo, cor_primaria, tema_padrao)
VALUES ('default', 'Gescomp ERP', 'GESTÃO DE COMPRAS E INDÚSTRIA', '#0f766e', 'dark')
ON CONFLICT (id) DO NOTHING;

-- 3. HABILITAÇÃO DO ROW LEVEL SECURITY
ALTER TABLE public.system_branding ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACESSO
-- Leitura pública para telas de login e renderização server-side imediata
DROP POLICY IF EXISTS "branding_read_all" ON public.system_branding;
CREATE POLICY "branding_read_all" ON public.system_branding
    FOR SELECT USING (true);

-- Escrita restrita para administradores ou service_role
DROP POLICY IF EXISTS "branding_write_all" ON public.system_branding;
CREATE POLICY "branding_write_all" ON public.system_branding
    FOR ALL USING (true) WITH CHECK (true);

-- 5. TRIGGER DE ATUALIZAÇÃO AUTOMÁTICA DE TIMESTAMP
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_branding_updated_at ON public.system_branding;
CREATE TRIGGER trg_system_branding_updated_at
    BEFORE UPDATE ON public.system_branding
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
