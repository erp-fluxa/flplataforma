import React, { useState } from 'react';
import { Settings, Image, User as UserIcon, Building2, Cloud, Upload, RefreshCw, CheckCircle, Trash2, Eye, Edit, Power, PowerOff, ShieldCheck, Mail, Lock } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge, Modal } from '../components/ui';
import { SITE_CONFIG } from '../config/site';
import { CustomLogos, User } from '../types';
import { uid } from '../lib/formatters';

export const Configuracoes: React.FC = () => {
  const { db, uploadLogo, resetLogos, updateDb, syncFromCloud } = useDb();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'visual' | 'usuarios' | 'empresa' | 'nuvem'>('visual');

  // Modal Novo / Editar Usuário
  const [modalUserOpen, setModalUserOpen] = useState(false);
  const [modalViewUserOpen, setModalViewUserOpen] = useState(false);
  const [selectedViewUser, setSelectedViewUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  const iconeSrc = db.customLogos?.logo_icone || db.company?.logo_icone_url || SITE_CONFIG.defaultLogoIcone;
  const textoSrc = db.customLogos?.logo_texto || db.customLogos?.fluxa || db.company?.logo_texto_url || SITE_CONFIG.defaultLogoTexto;
  const loginLogoSrc = db.customLogos?.fluxa || db.customLogos?.logo_texto || SITE_CONFIG.defaultLogoLogin;
  const instLogoSrc = db.customLogos?.jp3d || db.company?.logo_institucional_url || SITE_CONFIG.defaultLogoInstitucional;
  const version = db.customLogos?._v || SITE_CONFIG.buildTimestamp;

  const handleFileUpload = (type: keyof CustomLogos, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem válido (PNG, SVG, JPG, WebP).');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert('Tamanho máximo permitido: 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      await uploadLogo(type, dataUrl);
      alert('Logotipo atualizado e sincronizado na nuvem com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.username || !editingUser?.name) {
      alert('Nome e usuário são obrigatórios!');
      return;
    }

    const newUser: User = {
      id: editingUser.id || uid('usr'),
      name: editingUser.name,
      username: editingUser.username.toLowerCase().trim(),
      email: editingUser.email || '',
      password: editingUser.password || '123',
      roleId: editingUser.roleId || 'usuario',
      role: {
        id: editingUser.roleId || 'usuario',
        name: editingUser.roleId === 'super_admin' ? 'Super Admin' : (editingUser.roleId === 'admin' ? 'Administrador' : (editingUser.roleId === 'role-comprador-sr' ? 'Comprador Sênior' : (editingUser.roleId === 'role-producao' ? 'Engenheiro de Produção' : 'Operador')))
      },
      permissoes: editingUser.roleId === 'super_admin' ? ['*'] : [],
      active: editingUser.active !== false,
      preferences: { sidebarCollapsed: false, theme: 'dark' }
    };

    await updateDb(prev => {
      const existing = prev.users.find(u => u.id === newUser.id);
      const users = existing
        ? prev.users.map(u => u.id === newUser.id ? newUser : u)
        : [...prev.users, newUser];
      return { ...prev, users };
    }, 'USER_SAVED');

    setModalUserOpen(false);
    setEditingUser(null);
    alert('Usuário salvo com sucesso!');
  };

  const handleToggleUserStatus = async (u: User) => {
    if (u.id === 'usr-admin' || u.username === 'admin') {
      alert('O Super Admin principal não pode ser bloqueado.');
      return;
    }

    const nextStatus = !u.active;
    await updateDb(prev => ({
      ...prev,
      users: prev.users.map(item => item.id === u.id ? { ...item, active: nextStatus } : item)
    }), 'USER_STATUS_TOGGLED');

    alert(`Usuário ${u.name} ${nextStatus ? 'desbloqueado/ativado' : 'bloqueado/inativado'} com sucesso!`);
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === 'usr-admin') {
      alert('Não é permitido excluir o Super Admin padrão do sistema.');
      return;
    }
    if (confirm('Deseja realmente remover este usuário do sistema?')) {
      await updateDb(prev => ({
        ...prev,
        users: prev.users.filter(u => u.id !== userId)
      }), 'USER_DELETED');
      alert('Usuário removido com sucesso!');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Abas de Configuração */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('visual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'visual' ? 'bg-brand-700 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
        >
          <Image className="w-3.5 h-3.5" /> 1. Identidade Visual & Logos
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'usuarios' ? 'bg-brand-700 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
        >
          <UserIcon className="w-3.5 h-3.5" /> 2. Gestão de Usuários
        </button>
        <button
          onClick={() => setActiveTab('empresa')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'empresa' ? 'bg-brand-700 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
        >
          <Building2 className="w-3.5 h-3.5" /> 3. Dados da Empresa
        </button>
        <button
          onClick={() => setActiveTab('nuvem')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'nuvem' ? 'bg-brand-700 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
        >
          <Cloud className="w-3.5 h-3.5" /> 4. Supabase & Nuvem
        </button>
      </div>

      {/* ABA 1: IDENTIDADE VISUAL */}
      {activeTab === 'visual' && (
        <div className="space-y-6">
          {/* Header com Ação de Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Identidade Visual & Logotipos da Plataforma
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Personalize as marcas do menu lateral, da tela de login e o cabeçalho institucional.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              className="!text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 font-bold"
              onClick={() => {
                if (confirm('Deseja restaurar os logotipos originais padrão da Fluxa?')) {
                  resetLogos();
                }
              }}
            >
              Restaurar Padrão
            </Button>
          </div>

          {/* Live Preview da Sidebar */}
          <div className="p-5 rounded-2xl border border-brand-200 dark:border-brand-900/50 bg-brand-50/40 dark:bg-brand-950/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-brand-900 dark:text-brand-200 flex items-center gap-2">
                👁️ Preview ao Vivo do Logotipo Adaptativo da Sidebar
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Sincronizado
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preview Expandido */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 mb-2.5 block">
                  1. Menu Expandido (Aberto)
                </span>
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800 max-w-[280px]">
                  <div className="flex items-center justify-center w-12 h-12 shrink-0 rounded-xl bg-slate-800/90 border border-slate-700/80 p-1.5 shadow-md">
                    <img src={`${iconeSrc}?v=${version}`} alt="Ícone" className="w-full h-full object-contain filter drop-shadow" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <img src={`${textoSrc}?v=${version}`} alt="Texto" className="h-8 max-w-[155px] object-contain object-left filter drop-shadow" />
                    <span className="text-[10.5px] font-mono text-teal-400 font-bold block tracking-tight truncate mt-0.5">
                      {SITE_CONFIG.defaultCompanySubtitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preview Retraído */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 mb-2.5 block">
                  2. Menu Retraído (Ícones Apenas)
                </span>
                <div className="flex items-center justify-center p-2 rounded-xl bg-slate-950 border border-slate-800 w-20 mx-auto">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700/80 p-1.5 shadow-md">
                    <img src={`${iconeSrc}?v=${version}`} alt="Ícone" className="w-full h-full object-contain filter drop-shadow" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Cards de Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Ícone Sidebar */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">1. Ícone (Retraído)</span>
                <Badge variant={db.customLogos?.logo_icone ? 'success' : 'neutral'}>
                  {db.customLogos?.logo_icone ? 'Custom' : 'Padrão'}
                </Badge>
              </div>
              <div className="h-20 rounded-xl bg-slate-950 flex items-center justify-center p-3 border border-slate-800">
                <img src={`${iconeSrc}?v=${version}`} className="h-10 w-10 object-contain" alt="Preview Ícone" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Subir Ícone Isolado (PNG/SVG)</label>
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  onChange={e => handleFileUpload('logo_icone', e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-700 file:text-white hover:file:bg-brand-800 cursor-pointer"
                />
              </div>
            </div>

            {/* 2. Wordmark Sidebar */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">2. Wordmark (Expandido)</span>
                <Badge variant={db.customLogos?.logo_texto ? 'success' : 'neutral'}>
                  {db.customLogos?.logo_texto ? 'Custom' : 'Padrão'}
                </Badge>
              </div>
              <div className="h-20 rounded-xl bg-slate-950 flex items-center justify-center p-3 border border-slate-800">
                <img src={`${textoSrc}?v=${version}`} className="h-8 max-h-9 w-auto max-w-[150px] object-contain" alt="Preview Wordmark" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Subir Texto/Wordmark (PNG/SVG)</label>
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  onChange={e => handleFileUpload('logo_texto', e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-700 file:text-white hover:file:bg-brand-800 cursor-pointer"
                />
              </div>
            </div>

            {/* 3. Logo Tela de Login */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">3. Card de Login (Fluxa)</span>
                <Badge variant={db.customLogos?.fluxa ? 'success' : 'neutral'}>
                  {db.customLogos?.fluxa ? 'Custom' : 'Padrão'}
                </Badge>
              </div>
              <div className="h-20 rounded-xl bg-slate-950 flex items-center justify-center p-3 border border-slate-800">
                <img src={`${loginLogoSrc}?v=${version}`} className="h-8 max-h-9 w-auto max-w-[150px] object-contain" alt="Preview Login" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Subir Imagem Login (PNG/SVG)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleFileUpload('fluxa', e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-700 file:text-white hover:file:bg-brand-800 cursor-pointer"
                />
              </div>
            </div>

            {/* 4. Topo Login Institucional */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">4. Topo Institucional (JP3D)</span>
                <Badge variant={db.customLogos?.jp3d ? 'success' : 'neutral'}>
                  {db.customLogos?.jp3d ? 'Custom' : 'Padrão'}
                </Badge>
              </div>
              <div className="h-20 rounded-xl bg-slate-950 flex items-center justify-center p-3 border border-slate-800">
                <img src={`${instLogoSrc}?v=${version}`} className="h-8 w-auto object-contain" alt="Preview Topo" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Subir Topo Login (PNG/SVG)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleFileUpload('jp3d', e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-700 file:text-white hover:file:bg-brand-800 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: GESTÃO DE USUÁRIOS (RESPONSIVA PARA MOBILE & DESKTOP) */}
      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">Usuários do Sistema</h3>
              <p className="text-xs text-slate-500">Cadastre e configure acessos de operadores e administradores.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<UserIcon className="w-3.5 h-3.5" />}
              onClick={() => {
                setEditingUser({ name: '', username: '', email: '', password: '', roleId: 'usuario', active: true });
                setModalUserOpen(true);
              }}
            >
              Novo Usuário
            </Button>
          </div>

          {/* 1. VISUALIZAÇÃO MOBILE (CARDS INDIVIDUAIS COM TODOS OS BOTÕES ACESSÍVEIS NO CELULAR) */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {db.users.map(u => (
              <div
                key={u.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  !u.active
                    ? 'bg-slate-900/60 border-rose-900/40 opacity-70'
                    : 'bg-[#111A2D] border-slate-800 shadow-md'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center font-bold text-brand-400 text-sm shrink-0">
                      {u.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-100">{u.name}</h4>
                      <span className="font-mono text-xs text-teal-400">@{u.username}</span>
                    </div>
                  </div>
                  <Badge variant={u.roleId === 'super_admin' ? 'success' : (u.roleId === 'admin' ? 'info' : 'neutral')}>
                    {u.role?.name || u.roleId}
                  </Badge>
                </div>

                {/* Dados de E-mail e Status */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5 truncate max-w-[200px]">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {u.email || 'Sem e-mail'}
                  </span>
                  <div className="flex items-center gap-1 font-bold">
                    <span className={`inline-block w-2 h-2 rounded-full ${u.active ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-rose-500'}`} />
                    <span className={u.active ? 'text-emerald-400' : 'text-rose-400'}>{u.active ? 'Ativo' : 'Bloqueado'}</span>
                  </div>
                </div>

                {/* Barra de 4 Ações no Mobile (Touch-friendly) */}
                <div className="pt-2 border-t border-slate-800 grid grid-cols-4 gap-1.5">
                  {/* 1. Visualizar */}
                  <button
                    onClick={() => { setSelectedViewUser(u); setModalViewUserOpen(true); }}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-bold gap-1 transition-all"
                  >
                    <Eye className="w-4 h-4 text-teal-400" />
                    <span>Detalhes</span>
                  </button>

                  {/* 2. Editar */}
                  <button
                    onClick={() => { setEditingUser(u); setModalUserOpen(true); }}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-bold gap-1 transition-all"
                  >
                    <Edit className="w-4 h-4 text-amber-400" />
                    <span>Editar</span>
                  </button>

                  {/* 3. Bloquear / Ativar */}
                  <button
                    onClick={() => handleToggleUserStatus(u)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10.5px] font-bold gap-1 transition-all ${
                      u.active ? 'bg-slate-800 hover:bg-orange-950/40 text-orange-400' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {u.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    <span>{u.active ? 'Bloquear' : 'Ativar'}</span>
                  </button>

                  {/* 4. Excluir */}
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-[10.5px] font-bold gap-1 transition-all border border-rose-900/40"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 2. VISUALIZAÇÃO DESKTOP / TABLET (TABELA COM OVERFLOW HORIZONTAL) */}
          <div className="hidden sm:block">
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Nome / Usuário</th>
                      <th className="px-4 py-3">E-mail</th>
                      <th className="px-4 py-3">Nível de Acesso</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {db.users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">@{u.username}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.email || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={u.roleId === 'super_admin' ? 'success' : (u.roleId === 'admin' ? 'info' : 'neutral')}>
                            {u.role?.name || u.roleId}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block w-2 h-2 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-red-500'} mr-1.5`} />
                          <span className="text-[11px] font-bold">{u.active ? 'Ativo' : 'Bloqueado'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* 1. Visualizar */}
                            <button
                              onClick={() => { setSelectedViewUser(u); setModalViewUserOpen(true); }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-teal-400 hover:bg-slate-800"
                              title="Visualizar Usuário"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* 2. Editar */}
                            <button
                              onClick={() => { setEditingUser(u); setModalUserOpen(true); }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800"
                              title="Editar Usuário"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* 3. Bloquear / Ativar */}
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.active ? 'text-slate-500 hover:text-orange-400 hover:bg-slate-800' : 'text-emerald-400 hover:bg-emerald-950/40'
                              }`}
                              title={u.active ? 'Bloquear Usuário' : 'Ativar Usuário'}
                            >
                              {u.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                            </button>

                            {/* 4. Excluir */}
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ABA 3: DADOS DA EMPRESA */}
      {activeTab === 'empresa' && (
        <Card title="Dados Cadastrais da Empresa Matriz">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-bold text-slate-500 block mb-1">Razão Social</span>
              <p className="font-bold text-slate-900 dark:text-white">{db.company.razaoSocial || db.company.nome}</p>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">CNPJ</span>
              <p className="font-mono font-bold text-slate-900 dark:text-white">{db.company.cnpj}</p>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">Inscrição Estadual</span>
              <p className="font-mono font-bold text-slate-900 dark:text-white">{db.company.inscricaoEstadual || '—'}</p>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">Cidade / UF</span>
              <p className="font-bold text-slate-900 dark:text-white">{db.company.cidade} / {db.company.uf}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ABA 4: NUVEM & SUPABASE */}
      {activeTab === 'nuvem' && (
        <Card title="Sincronização em Tempo Real (Supabase Cloud)">
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200">
                    Sincronização Multi-Dispositivo Ativa
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Último snapshot sincronizado em: <b>{db.lastBackup || 'Agora'}</b>
                  </p>
                </div>
              </div>
              <Button variant="primary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={syncFromCloud}>
                Sincronizar Agora
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* MODAL VIEW USUÁRIO */}
      <Modal isOpen={modalViewUserOpen} onClose={() => setModalViewUserOpen(false)} title={`Ficha do Usuário — ${selectedViewUser?.name}`}>
        {selectedViewUser && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-teal-400">@{selectedViewUser.username}</span>
                <Badge variant={selectedViewUser.active ? 'success' : 'danger'}>
                  {selectedViewUser.active ? 'ATIVO' : 'BLOQUEADO'}
                </Badge>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedViewUser.name}</h3>
              <p className="text-slate-400">E-mail: <b>{selectedViewUser.email || 'Não informado'}</b></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Perfil / Nível</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedViewUser.role?.name || selectedViewUser.roleId}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Permissões Globais</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedViewUser.roleId === 'super_admin' ? 'Total (*)' : 'Módulos Designados'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewUserOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Novo / Editar Usuário */}
      <Modal
        isOpen={modalUserOpen}
        onClose={() => { setModalUserOpen(false); setEditingUser(null); }}
        title={editingUser?.id ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo *</label>
            <input
              type="text"
              value={editingUser?.name || ''}
              onChange={e => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Carlos Silva"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome de Usuário (Login) *</label>
              <input
                type="text"
                value={editingUser?.username || ''}
                onChange={e => setEditingUser(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Ex: carlossilva"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Senha de Acesso</label>
              <input
                type="password"
                value={editingUser?.password || ''}
                onChange={e => setEditingUser(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Deixe em branco para manter a atual"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail Corporativo</label>
              <input
                type="email"
                value={editingUser?.email || ''}
                onChange={e => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                placeholder="carlos@fluxa.com.br"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Perfil de Acesso</label>
              <select
                value={editingUser?.roleId || 'usuario'}
                onChange={e => setEditingUser(prev => ({ ...prev, roleId: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                <option value="super_admin">Super Administrador (Acesso Total)</option>
                <option value="admin">Administrador Geral</option>
                <option value="role-comprador-sr">Comprador Sênior (Compras/Estoque)</option>
                <option value="role-producao">Engenheiro de Produção (PCP/BOM)</option>
                <option value="usuario">Operador Padrão</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => { setModalUserOpen(false); setEditingUser(null); }}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Salvar Usuário
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
