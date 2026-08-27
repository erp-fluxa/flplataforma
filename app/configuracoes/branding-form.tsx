'use client'

import { useState } from 'react'
import { updateSystemBranding, type UpdateBrandingPayload } from '@/app/actions/branding'
import { SystemBranding } from '@/lib/supabase/branding'

export function BrandingForm({ initialBranding }: { initialBranding: SystemBranding }) {
  const [branding, setBranding] = useState(initialBranding)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  function handleFileChange(tipo: 'institucional' | 'plataforma' | 'sidebar', file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      const payload: UpdateBrandingPayload = {}
      if (tipo === 'institucional') payload.logo_institucional_url = base64
      if (tipo === 'plataforma') payload.logo_plataforma_url = base64
      if (tipo === 'sidebar') payload.logo_sidebar_url = base64

      setLoading(true)
      const res = await updateSystemBranding(payload)
      setLoading(false)

      if (res.success && res.branding) {
        setBranding(res.branding as SystemBranding)
        setMsg({ tipo: 'sucesso', texto: 'Logotipo atualizado e sincronizado no Supabase com sucesso!' })
      } else {
        setMsg({ tipo: 'erro', texto: res.error || 'Erro ao salvar' })
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            msg.tipo === 'sucesso'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-red-950/60 border-red-800 text-red-300'
          }`}
        >
          <span>{msg.tipo === 'sucesso' ? '✅' : '⚠️'}</span>
          <span>{msg.texto}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Logo Institucional */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">
              Opção 1
            </span>
            <h3 className="text-sm font-bold text-white">Logo Institucional (Topo Login)</h3>
            <p className="text-xs text-slate-400 mt-1">Exibido no cabeçalho do login e documentos.</p>
          </div>

          <div className="h-20 bg-slate-950 rounded-xl flex items-center justify-center p-2 border border-slate-800/80">
            {branding.logo_institucional_url ? (
              <img
                src={branding.logo_institucional_url}
                alt="Logo Institucional"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-slate-500 italic">Padrão do Sistema</span>
            )}
          </div>

          <label className="cursor-pointer block text-center bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all">
            <span>{loading ? 'Salvando...' : 'Alterar Imagem'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange('institucional', e.target.files?.[0] || null)}
            />
          </label>
        </div>

        {/* 2. Logo da Plataforma */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">
              Opção 2
            </span>
            <h3 className="text-sm font-bold text-white">Logo da Plataforma (Gescomp)</h3>
            <p className="text-xs text-slate-400 mt-1">Logo principal do centro da tela de login.</p>
          </div>

          <div className="h-20 bg-slate-950 rounded-xl flex items-center justify-center p-2 border border-slate-800/80">
            {branding.logo_plataforma_url ? (
              <img
                src={branding.logo_plataforma_url}
                alt="Logo da Plataforma"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-slate-500 italic">Vetor Padrão Gescomp</span>
            )}
          </div>

          <label className="cursor-pointer block text-center bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all">
            <span>{loading ? 'Salvando...' : 'Alterar Imagem'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange('plataforma', e.target.files?.[0] || null)}
            />
          </label>
        </div>

        {/* 3. Logo do Menu Lateral */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">
              Opção 3
            </span>
            <h3 className="text-sm font-bold text-white">Logo do Menu Lateral (Sidebar)</h3>
            <p className="text-xs text-slate-400 mt-1">Exibido no topo da barra de navegação.</p>
          </div>

          <div className="h-20 bg-slate-950 rounded-xl flex items-center justify-center p-2 border border-slate-800/80">
            {branding.logo_sidebar_url ? (
              <img
                src={branding.logo_sidebar_url}
                alt="Logo Sidebar"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-slate-500 italic">Padrão Institucional</span>
            )}
          </div>

          <label className="cursor-pointer block text-center bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all">
            <span>{loading ? 'Salvando...' : 'Alterar Imagem'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange('sidebar', e.target.files?.[0] || null)}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
