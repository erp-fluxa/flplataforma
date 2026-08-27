'use client'

import { useState } from 'react'
import { ProductWithStock, MaterialCategory } from '@/lib/supabase/products'
import { ProdutoModal } from './produto-modal'
import { deleteProduct } from '@/app/actions/products'

export function ProdutosTable({
  initialProducts,
  categories
}: {
  initialProducts: ProductWithStock[]
  categories: MaterialCategory[]
}) {
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState<ProductWithStock | null>(null)

  const produtosFiltrados = initialProducts.filter((p) => {
    const matchBusca =
      p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      (p.categoria && p.categoria.toLowerCase().includes(busca.toLowerCase()))

    const matchTipo = filtroTipo === 'todos' || p.tipo_item === filtroTipo

    return matchBusca && matchTipo
  })

  async function handleDelete(id: string, codigo: string) {
    if (confirm(`Tem certeza que deseja excluir ${codigo}?`)) {
      await deleteProduct(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de Ações */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar por código, descrição ou categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 w-full md:w-80 outline-none focus:border-teal-500"
          />

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-teal-500"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="materia_prima">Matéria-Prima (MP)</option>
            <option value="uso_consumo">Uso e Consumo (MUC)</option>
            <option value="produto_acabado">Produtos Acabados (PA)</option>
          </select>
        </div>

        <button
          onClick={() => {
            setProdutoEditando(null)
            setModalAberto(true)
          }}
          className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-teal-900/30 flex items-center gap-2 shrink-0"
        >
          <span>+</span>
          <span>Novo Item no Supabase</span>
        </button>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4">Código SKU</th>
              <th className="py-3.5 px-4">Descrição Oficial</th>
              <th className="py-3.5 px-4">Tipo</th>
              <th className="py-3.5 px-4">Categoria</th>
              <th className="py-3.5 px-4 text-center">Un.</th>
              <th className="py-3.5 px-4 text-right">Estoque Atual</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {produtosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  Nenhum produto ou matéria-prima encontrada no banco.
                </td>
              </tr>
            ) : (
              produtosFiltrados.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{p.codigo}</td>
                  <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                    {p.descricao}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.tipo_item === 'materia_prima'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                          : p.tipo_item === 'produto_acabado'
                          ? 'bg-teal-950 text-teal-300 border border-teal-800/60'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {p.tipo_item === 'materia_prima'
                        ? 'Matéria-Prima'
                        : p.tipo_item === 'produto_acabado'
                        ? 'Produto Acabado'
                        : 'Uso e Consumo'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{p.categoria || '—'}</td>
                  <td className="py-3.5 px-4 text-center font-mono text-slate-300">{p.unidade}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                    {p.estoque_total}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status_estoque === 'critico'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : p.status_estoque === 'atencao'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {p.status_estoque === 'critico'
                        ? 'Crítico'
                        : p.status_estoque === 'atencao'
                        ? 'Atenção'
                        : 'Normal'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setProdutoEditando(p)
                        setModalAberto(true)
                      }}
                      className="text-xs text-teal-400 hover:text-teal-300 font-bold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.codigo)}
                      className="text-xs text-red-400 hover:text-red-300 font-bold"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <ProdutoModal
          categories={categories}
          produtoParaEditar={produtoEditando}
          onClose={() => setModalAberto(false)}
        />
      )}
    </div>
  )
}
