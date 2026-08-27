import { getProducts, getCategories } from '@/lib/supabase/products'
import { ProdutosTable } from './produtos-table'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProdutosPage() {
  const [produtos, categorias] = await Promise.all([
    getProducts(),
    getCategories()
  ])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Topo */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-teal-400 hover:underline">
              ← Painel Geral
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-slate-400">Catálogo Mestre</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Produtos & Matérias-Primas</h1>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="p-8 max-w-7xl mx-auto w-full flex-1">
        <ProdutosTable initialProducts={produtos} categories={categorias} />
      </main>
    </div>
  )
}
