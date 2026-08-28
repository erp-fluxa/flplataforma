import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { getSystemBranding } from '@/lib/supabase/branding'
import { HeaderNav } from '@/components/header-nav'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getSystemBranding()

  return {
    title: `${branding.nome_sistema} — ${branding.subtitulo}`,
    description: 'Sistema Integrado de Gestão ERP Industrial, Compras e PCP',
    icons: branding.favicon_url ? [{ url: branding.favicon_url }] : undefined
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const branding = await getSystemBranding()

  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} ${mono.variable} antialiased bg-slate-950 text-slate-100 min-h-screen flex flex-col`}>
        <HeaderNav branding={branding} />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
