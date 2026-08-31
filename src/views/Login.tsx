import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../context/DbContext';
import { SITE_CONFIG } from '../config/site';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { db } = useDb();

  // Usuário pode ser lembrado se o checkbox foi marcado, mas a SENHA NUNCA é salva
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem('fluxa_remembered_username') || '';
    } catch (_) {
      return '';
    }
  });
  const [password, setPassword] = useState(''); // Senha sempre vazia por padrão
  const [remember, setRemember] = useState(() => {
    try {
      return !!localStorage.getItem('fluxa_remembered_username');
    } catch (_) {
      return false;
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (remember && username.trim()) {
      try {
        localStorage.setItem('fluxa_remembered_username', username.trim());
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem('fluxa_remembered_username');
      } catch (_) {}
    }

    setTimeout(() => {
      const res = login(username, password, remember);
      if (!res.success) {
        setError(res.message || 'E-mail, usuário ou senha incorretos.');
        setLoading(false);
      }
    }, 150);
  };

  const loginLogo = db.customLogos?.fluxa || db.customLogos?.logo_texto || db.company?.logo_plataforma_url || SITE_CONFIG.defaultLogoLogin;
  const institutionalLogo = db.customLogos?.jp3d || db.company?.logo_institucional_url || SITE_CONFIG.defaultLogoInstitucional;
  const version = db.customLogos?._v || SITE_CONFIG.buildTimestamp;

  const versionedLoginLogo = loginLogo.startsWith('data:') ? loginLogo : `${loginLogo}?v=${version}`;
  const versionedInstLogo = institutionalLogo.startsWith('data:') ? institutionalLogo : `${institutionalLogo}?v=${version}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070D1F] p-4 text-slate-100 font-sans selection:bg-brand-500 selection:text-white">
      <div className="w-full max-w-[410px] rounded-2xl border border-[#1E293B] bg-[#111A2D] p-6 text-center shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* 1. Marca Institucional (Topo) */}
        <div className="pt-1 flex justify-center items-center w-full">
          <img
            src={versionedInstLogo}
            onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
            className="h-7 w-auto object-contain filter drop-shadow-md opacity-90 mx-auto block"
            alt="Marca Institucional"
          />
        </div>

        {/* 2. Área Destacada da Logo Fluxa (Fundo #05091A) */}
        <div className="flex items-center justify-center p-2 rounded-xl border border-[#1E293B] bg-[#05091A] shadow-inner my-2.5 w-full text-center h-28 overflow-hidden">
          <img
            src={versionedLoginLogo}
            onError={e => { (e.target as HTMLImageElement).src = 'assets/fluxa_logo_texto.png'; }}
            className="w-full h-full max-h-24 max-w-[360px] object-contain mx-auto block filter drop-shadow-xs"
            alt="Fluxa ERP"
          />
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="rounded-xl bg-red-950/80 border border-red-700/80 p-2.5 text-xs text-red-200 font-medium text-left flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-left" autoComplete="off">
          <div>
            <label className="block text-[12px] font-medium tracking-wide text-[#9AA9BE] mb-1.5">
              E-mail ou usuário
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full rounded-xl border border-[#1E293B] bg-[#070D1F] px-3.5 py-2.5 text-sm text-[#F4F7FB] placeholder-[#9AA9BE]/50 outline-none focus:border-[#36A9E1] focus:ring-1 focus:ring-[#36A9E1] transition-all"
                placeholder="Digite seu e-mail ou usuário"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[12px] font-medium tracking-wide text-[#9AA9BE]">Senha</label>
              <button
                type="button"
                onClick={() => alert('Para redefinir sua senha, solicite ao Super Administrador no painel de Configurações.')}
                className="text-[12px] font-medium text-[#36A9E1] hover:underline transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-[#1E293B] bg-[#070D1F] pl-3.5 pr-10 py-2.5 text-sm text-[#F4F7FB] placeholder-[#9AA9BE]/50 outline-none focus:border-[#36A9E1] focus:ring-1 focus:ring-[#36A9E1] transition-all font-mono"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA9BE] hover:text-[#F4F7FB] transition-colors p-1"
                title="Visualizar ou ocultar senha"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 text-[12px] text-[#9AA9BE] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="rounded border-[#1E293B] bg-[#070D1F] text-[#36A9E1] focus:ring-[#36A9E1] h-4 w-4"
              />
              <span>Lembrar meu usuário</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#2E9B78] hover:bg-[#258365] active:bg-[#1E6E54] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-150 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
              </span>
            ) : (
              'Entrar no Fluxa'
            )}
          </button>
        </form>

        {/* Rodapé */}
        <div className="text-center text-[11px] text-[#9AA9BE] pt-3 border-t border-[#1E293B]/80 leading-snug">
          © 2026 {SITE_CONFIG.brand} · Desenvolvido por {SITE_CONFIG.developer}
        </div>
      </div>
    </div>
  );
};
