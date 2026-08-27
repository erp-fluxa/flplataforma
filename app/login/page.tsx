import { getSystemBranding } from '@/lib/supabase/branding'
import { LoginForm } from './login-form'
import Image from 'next/image'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LoginPage() {
  const branding = await getSystemBranding()

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden selection:bg-teal-500 selection:text-white font-sans">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Topo Institucional */}
      <header className="pt-8 pb-4 flex justify-center z-10">
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md px-6 py-2.5 rounded-full shadow-lg">
          {branding.logo_institucional_url ? (
            <img
              src={branding.logo_institucional_url}
              alt="Logo Institucional"
              className="h-7 w-auto object-contain"
            />
          ) : (
            <span className="text-xs font-semibold text-slate-300">JP3D Industrial</span>
          )}
          <span className="h-4 w-px bg-slate-700/60" />
          <span className="text-[11px] tracking-wider uppercase text-slate-400 font-medium">
            Ambiente Corporativo Seguro
          </span>
        </div>
      </header>

      {/* Card Central */}
      <div className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl space-y-6">
          {/* Logo da Plataforma Gescomp */}
          <div className="text-center space-y-2">
            {branding.logo_plataforma_url ? (
              <img
                src={branding.logo_plataforma_url}
                alt={branding.nome_sistema}
                className="h-12 w-auto mx-auto object-contain"
              />
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <span className="text-slate-950 font-black text-xl">G</span>
                  </div>
                  <h1 className="text-2xl font-black text-white tracking-tight">
                    {branding.nome_sistema}
                  </h1>
                </div>
                <p className="text-[10.5px] font-bold tracking-widest text-slate-400 uppercase mt-1">
                  {branding.subtitulo}
                </p>
              </div>
            )}
          </div>

          <LoginForm />
        </div>
      </div>

      {/* Rodapé */}
      <footer className="py-6 text-center text-xs text-slate-400 z-10">
        <p>© 2026 {branding.nome_sistema} · Todos os direitos reservados.</p>
      </footer>
    </main>
  )
}
