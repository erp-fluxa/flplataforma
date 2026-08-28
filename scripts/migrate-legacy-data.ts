/**
 * SCRIPT DE HIDRATAÇÃO & MIGRAÇÃO DE DADOS MESTRES (GESCOMP/FLUXA -> SUPABASE)
 * Executável via Node.js para garantir que o catálogo inicial de insumos da fábrica esteja 100% no Supabase.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qdakxhuonxsnukgkybym.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYWt4aHVvbnhzbnVrZ2t5YnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MjMyNjQsImV4cCI6MjEwMzA5OTI2NH0.qO_91gcFjsCd-BfZ2mvbThIqBxmbu2tKCwq3W4WWbjg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runHydration() {
  console.log('🚀 Iniciando hidratação de dados mestres no Supabase...')

  // 1. Depósitos
  const warehouses = [
    { nome: 'Almoxarifado Matriz SC', tipo: 'materia_prima', ativo: true },
    { nome: 'Depósito Matriz SC', tipo: 'produto_acabado', ativo: true },
    { nome: 'Expedição Matriz SC', tipo: 'expedicao', ativo: true },
    { nome: 'Almoxarifado Filial PR', tipo: 'materia_prima', ativo: true },
    { nome: 'Depósito Filial PR', tipo: 'produto_acabado', ativo: true }
  ]

  for (const wh of warehouses) {
    const { error } = await supabase
      .from('warehouses')
      .upsert(wh, { onConflict: 'nome' })
    if (error) console.warn('[Warehouse warn]', error.message)
  }
  console.log('✔ Depósitos sincronizados.')

  // 2. Catálogo Industrial (Matérias-Primas e Produtos Acabados)
  const produtosMestres = [
    {
      codigo: 'IMP-CV1200',
      descricao: 'Impressora 3D Industrial JP3D CV1200 (1200x800x1000mm)',
      unidade: 'UN',
      tipo_item: 'produto_acabado',
      preco_referencia: 4200000,
      custo_unitario: 1850000,
      estoque_minimo: 1,
      estoque_maximo: 5,
      produzivel: true,
      linha: 'CV'
    },
    {
      codigo: 'IMP-CX1500',
      descricao: 'Impressora 3D Cenográfica JP3D CX1500 Alta Velocidade',
      unidade: 'UN',
      tipo_item: 'produto_acabado',
      preco_referencia: 5800000,
      custo_unitario: 2450000,
      estoque_minimo: 1,
      estoque_maximo: 3,
      produzivel: true,
      linha: 'CX'
    },
    {
      codigo: 'MP-PERF-4040',
      descricao: 'Perfil de Alumínio Estrutural V-Slot 4040 Anodizado Preto (Barra 6m)',
      unidade: 'BR',
      tipo_item: 'materia_prima',
      preco_referencia: 38000,
      custo_unitario: 29000,
      estoque_minimo: 10,
      estoque_maximo: 50,
      produzivel: false
    },
    {
      codigo: 'MP-GUIA-MGN12',
      descricao: 'Guia Linear de Precisão MGN12H com Bloco Esferas 1000mm',
      unidade: 'UN',
      tipo_item: 'materia_prima',
      preco_referencia: 18500,
      custo_unitario: 12500,
      estoque_minimo: 15,
      estoque_maximo: 60,
      produzivel: false
    },
    {
      codigo: 'MP-MOT-NEMA23',
      descricao: 'Motor de Passo NEMA 23 High Torque 3.0Nm Eixo Duplo',
      unidade: 'UN',
      tipo_item: 'materia_prima',
      preco_referencia: 24000,
      custo_unitario: 16500,
      estoque_minimo: 8,
      estoque_maximo: 30,
      produzivel: false
    },
    {
      codigo: 'MP-PLACA-KLIPPER',
      descricao: 'Placa Controladora Industrial 32-bit Klipper + Drivers TMC2209',
      unidade: 'UN',
      tipo_item: 'materia_prima',
      preco_referencia: 65000,
      custo_unitario: 42000,
      estoque_minimo: 5,
      estoque_maximo: 20,
      produzivel: false
    },
    {
      codigo: 'MP-FIL-PETG-BLK',
      descricao: 'Filamento Industrial PETG 1.75mm Preto Alta Resistência 1kg',
      unidade: 'KG',
      tipo_item: 'materia_prima',
      preco_referencia: 11000,
      custo_unitario: 6800,
      estoque_minimo: 20,
      estoque_maximo: 100,
      produzivel: false
    }
  ]

  for (const prod of produtosMestres) {
    const { error } = await (supabase as any)
      .from('products')
      .upsert(prod, { onConflict: 'codigo' })
    if (error) console.warn('[Product warn]', prod.codigo, error.message)
  }
  console.log('✔ Catálogo mestre de produtos e matérias-primas sincronizado.')

  console.log('🎉 Hidratação concluída com sucesso!')
}

runHydration().catch(console.error)
