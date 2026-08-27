'use client'

import { useState } from 'react'
import { saveProduct, type SaveProductPayload } from '@/app/actions/products'
import { MaterialCategory, ProductWithStock } from '@/lib/supabase/products'

export function ProdutoModal({
  categories,
  produtoParaEditar,
  onClose
}: {
  categories: MaterialCategory[]
  produtoParaEditar?: ProductWithStock | null
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [form, setForm] = useState<SaveProductPayload>({
    id: produtoParaEditar?.id,
    codigo: produtoParaEditar?.codigo || '',
    descricao: produtoParaEditar?.descricao || '',
    unidade: produtoParaEditar?.unidade || 'UN',
    categoria: produtoParaEditar?.categoria || categories[0]?.nome || '',
    tipo_item: produtoParaEditar?.tipo_item || 'materia_prima',
    preco_referencia: produtoParaEditar?.preco_referencia || 0,
    custo_unitario: produtoParaEditar?.custo_unitario || 0,
    estoque_minimo: produtoParaEditar?.estoque_minimo || 0,
    ponto_reposicao: produtoParaEditar?.ponto_reposicao || 0,
    lead_time_dias: produtoParaEditar?.lead_time_dias || 5,
    linha: produtoParaEditar?.linha || 'CV',
    volume_xy: produtoParaEditar?.volume_xy || '',
    eixo_z: produtoParaEditar?.eixo_z || ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    const res = await saveProduct(form)
    setLoading(false)

    if (res.success) {
      onClose()
    } else {
      setErro(res.error || 'Erro ao salvar produto')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">
            {produtoParaEditar ? 'Editar Item' : 'Novo Item no Catálogo'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {erro && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Código SKU *</label>
              <input
                type="text"
                required
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                placeholder="Ex: MP-FIL-PETG"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-400 font-bold uppercase mb-1">Descrição Oficial *</label>
              <input
                type="text"
                required
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Filamento PETG 1.75mm Preto Industrial"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Tipo de Item *</label>
              <select
                value={form.tipo_item}
                onChange={(e: any) => setForm({ ...form, tipo_item: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              >
                <option value="materia_prima">Matéria-Prima (MP)</option>
                <option value="uso_consumo">Uso e Consumo (MUC)</option>
                <option value="produto_acabado">Produto Acabado / Máquina (PA)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Unidade *</label>
              <input
                type="text"
                required
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value.toUpperCase() })}
                placeholder="UN, KG, M, PC"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Categoria</label>
              <select
                value={form.categoria || ''}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              >
                <option value="">Selecione...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.nome}>
                    {c.nome} ({c.tipo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Estoque Mínimo</label>
              <input
                type="number"
                min="0"
                value={form.estoque_minimo}
                onChange={(e) => setForm({ ...form, estoque_minimo: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Ponto de Reposição</label>
              <input
                type="number"
                min="0"
                value={form.ponto_reposicao}
                onChange={(e) => setForm({ ...form, ponto_reposicao: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Lead Time (Dias)</label>
              <input
                type="number"
                min="1"
                value={form.lead_time_dias}
                onChange={(e) => setForm({ ...form, lead_time_dias: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg shadow-teal-900/30 disabled:opacity-50"
            >
              {loading ? 'Salvando no Banco...' : 'Gravar no Supabase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
