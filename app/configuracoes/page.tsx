import { getSystemBranding } from '@/lib/supabase/branding'
import { BrandingForm } from './branding-form'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ConfiguracoesPage() {
  const branding = await getSystemBranding()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      <header className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Configurações & Branding Corporativo</h1>
          <p className="text-xs text-slate-400 mt-1">
            Altere os logotipos oficiais. Os dados são salvos diretamente no Supabase e refletem instantaneamente em todos os celulares e computadores.
          </p>
        </div>
        <Link
          href="/"
          className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all"
        >
          ← Voltar ao Início
        </Link>
      </header>

      <BrandingForm initialBranding={branding} />
    </div>
  )
}
