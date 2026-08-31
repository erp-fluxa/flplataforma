import React, { useState } from 'react';
import { Settings, Image, User as UserIcon, Building2, Cloud, Upload, RefreshCw, CheckCircle, Trash2, Eye, Edit, Power, PowerOff, ShieldCheck, Mail, Lock } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge, Modal } from '../components/ui';
import { SITE_CONFIG } from '../config/site';
import { CustomLogos, User, Company } from '../types';
import { uid } from '../lib/formatters';

export const Configuracoes: React.FC = () => {
  const { db, uploadLogo, resetLogos, updateDb, syncFromCloud, salvarEmpresa, excluirEmpresa, selecionarEmpresaAtiva } = useDb();
  const { user } = useAuth();

  const isSuperAdmin = user?.roleId === 'super_admin' || user?.roleId === 'admin' || user?.role?.name?.toLowerCase().includes('admin') || user?.username === 'admin';

  const [activeTab, setActiveTab] = useState<'visual' | 'usuarios' | 'empresa' | 'nuvem'>('visual');

  // Modal Novo / Editar Usuário
  const [modalUserOpen, setModalUserOpen] = useState(false);
  const [modalViewUserOpen, setModalViewUserOpen] = useState(false);
  const [selectedViewUser, setSelectedViewUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  // Modal Novo / Editar Empresa (Multi-CNPJ)
  const [modalEmpresaOpen, setModalEmpresaOpen] = useState(false);
  const [modalViewEmpresaOpen, setModalViewEmpresaOpen] = useState(false);
  const [selectedViewEmpresa, setSelectedViewEmpresa] = useState<Company | null>(null);
  const [editingEmpresa, setEditingEmpresa] = useState<Partial<Company> | null>(null);

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
      allowedCompanyIds: editingUser.roleId === 'super_admin' ? [] : (editingUser.allowedCompanyIds || []),
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

  // Handlers de Gestão de Empresas (Multi-CNPJ)
  const handleOpenNewEmpresa = () => {
    if (!isSuperAdmin) {
      alert('Apenas o Super Admin tem permissão para cadastrar novas empresas do grupo.');
      return;
    }
    setEditingEmpresa({
      id: '',
      nome: '',
      razaoSocial: '',
      nomeFantasia: '',
      fantasia: '',
      cnpj: '',
      inscricaoEstadual: '',
      inscricaoMunicipal: '',
      cep: '',
      endereco: '',
      numero: '',
      bairro: '',
      cidade: '',
      uf: 'SC',
      telefone: '',
      email: '',
      regimeTributario: 'Simples Nacional',
      isMatriz: (db.companies || []).length === 0,
      ativa: true
    });
    setModalEmpresaOpen(true);
  };

  const handleOpenEditEmpresa = (comp: Company) => {
    if (!isSuperAdmin) {
      alert('Apenas o Super Admin tem permissão para editar empresas do grupo.');
      return;
    }
    setEditingEmpresa({ ...comp });
    setModalEmpresaOpen(true);
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmpresa?.cnpj || (!editingEmpresa?.razaoSocial && !editingEmpresa?.nome)) {
      alert('Razão Social e CNPJ são obrigatórios!');
      return;
    }

    const res = await salvarEmpresa(editingEmpresa as Company, user?.name || 'Super Admin');
    if (res.success) {
      setModalEmpresaOpen(false);
      setEditingEmpresa(null);
      alert('Empresa / CNPJ salvo com sucesso!');
    } else {
      alert(res.error || 'Erro ao salvar empresa.');
    }
  };

  const handleDeleteEmpresa = async (comp: Company) => {
    if (!isSuperAdmin) {
      alert('Apenas o Super Admin tem permissão para desativar empresas do grupo.');
      return;
    }

    const pedidosCount = (db.salesOrders || []).filter(p => p.companyId === comp.id).length;
    const opsCount = (db.productionOrders || []).filter(o => o.companyId === comp.id).length;
    const balancesCount = (db.stockBalances || []).filter(b => b.companyId === comp.id && b.quantidade > 0).length;

    let avisoVinculos = '';
    if (pedidosCount > 0 || opsCount > 0 || balancesCount > 0) {
      avisoVinculos = `\n\n⚠️ ATENÇÃO: Esta empresa possui registros vinculados:\n• ${pedidosCount} Pedido(s) de Venda\n• ${opsCount} Ordem(ns) de Produção\n• ${balancesCount} Item(ns) com Saldo em Estoque\n\nA desativação (Soft Delete) preservará o histórico de vínculos sem quebrar os dados.`;
    }

    if (confirm(`Tem certeza que deseja desativar a empresa [${comp.cnpj}] ${comp.nomeFantasia || comp.razaoSocial || comp.nome}?${avisoVinculos}\n\nDeseja prosseguir?`)) {
      const res = await excluirEmpresa(comp.id, user?.name || 'Super Admin');
      if (res.success) {
        alert('Empresa desativada (soft delete) com sucesso!');
      } else {
        alert(res.error || 'Erro ao desativar empresa.');
      }
    }
  };

  const handleSelectEmpresa = async (comp: Company) => {
    await selecionarEmpresaAtiva(comp.id);
    alert(`Unidade ativa alterada para: ${comp.nomeFantasia || comp.razaoSocial || comp.nome}`);
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

      {/* ABA 3: GESTÃO DE EMPRESAS & MULTI-CNPJ */}
      {activeTab === 'empresa' && (
        <div className="space-y-5">
          {/* Topo da Aba */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Empresas & Unidades do Grupo (Multi-CNPJ)
                </h3>
                <Badge variant="info">{(db.companies || []).length || 1} Cadastrada(s)</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gerencie todos os CNPJs próprios da sua organização (Matriz e Filiais). O Super Admin pode cadastrar, editar e excluir empresas.
              </p>
            </div>

            {isSuperAdmin && (
              <Button
                variant="primary"
                size="sm"
                icon={<Building2 className="w-4 h-4" />}
                onClick={handleOpenNewEmpresa}
              >
                + Nova Empresa / CNPJ
              </Button>
            )}
          </div>

          {/* Listagem de Empresas (Desktop & Mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(db.companies && db.companies.length > 0 ? db.companies : [db.company]).map(comp => {
              const isActiveUnidade = (db.currentCompanyId === comp.id) || (db.company?.id === comp.id);

              return (
                <div
                  key={comp.id}
                  className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    isActiveUnidade
                      ? 'bg-brand-950/20 dark:bg-brand-950/30 border-brand-500/50 shadow-md ring-1 ring-brand-500/30'
                      : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {comp.nomeFantasia || comp.fantasia || comp.nome}
                        </span>
                        {comp.isMatriz ? (
                          <Badge variant="success">MATRIZ</Badge>
                        ) : (
                          <Badge variant="neutral">FILIAL</Badge>
                        )}
                        {isActiveUnidade && (
                          <Badge variant="info">UNIDADE ATIVA</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {comp.razaoSocial || comp.nome}
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <Building2 className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Grid com Dados do CNPJ */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">CNPJ</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{comp.cnpj || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Inscrição Estadual</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{comp.inscricaoEstadual || 'Isento / Não inf.'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Localização</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{comp.cidade ? `${comp.cidade} / ${comp.uf}` : 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Regime Tributário</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{comp.regimeTributario || 'Simples Nacional'}</span>
                    </div>
                  </div>

                  {/* Barra de Ações da Empresa */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => handleSelectEmpresa(comp)}
                      disabled={isActiveUnidade}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActiveUnidade
                          ? 'bg-brand-500/20 text-brand-400 cursor-default'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-600 hover:text-white'
                      }`}
                    >
                      {isActiveUnidade ? '✔ Unidade Selecionada' : 'Selecionar Unidade'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setSelectedViewEmpresa(comp); setModalViewEmpresaOpen(true); }}
                        className="p-2 rounded-xl text-slate-500 hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Visualizar Ficha Cadastral"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isSuperAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEditEmpresa(comp)}
                            className="p-2 rounded-xl text-slate-500 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Editar Empresa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteEmpresa(comp)}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Excluir Empresa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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

          {/* Vínculo de Empresas Permitidas (se não for Super Admin) */}
          {editingUser?.roleId !== 'super_admin' && (db.companies || []).length > 1 && (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Empresas & Unidades Autorizadas para este Usuário
              </label>
              <p className="text-[11px] text-slate-500">Selecione as empresas que este usuário poderá visualizar e operar:</p>
              <div className="space-y-1.5 pt-1">
                {(db.companies || []).filter(c => c.ativa !== false).map(c => {
                  const isChecked = (editingUser?.allowedCompanyIds || []).includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          const current = editingUser?.allowedCompanyIds || [];
                          const updated = e.target.checked ? [...current, c.id] : current.filter(id => id !== c.id);
                          setEditingUser(prev => ({ ...prev, allowedCompanyIds: updated }));
                        }}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {c.nomeFantasia || c.razaoSocial} ({c.cnpj})
                      </span>
                      {c.isMatriz && <Badge variant="success">Matriz</Badge>}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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

      {/* MODAL VIEW EMPRESA */}
      <Modal
        isOpen={modalViewEmpresaOpen}
        onClose={() => setModalViewEmpresaOpen(false)}
        title={`Ficha Cadastral — ${selectedViewEmpresa?.nomeFantasia || selectedViewEmpresa?.razaoSocial || selectedViewEmpresa?.nome}`}
      >
        {selectedViewEmpresa && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-teal-400">{selectedViewEmpresa.cnpj}</span>
                <div className="flex gap-1.5">
                  {selectedViewEmpresa.isMatriz && <Badge variant="success">MATRIZ</Badge>}
                  <Badge variant={selectedViewEmpresa.ativa !== false ? 'info' : 'danger'}>
                    {selectedViewEmpresa.ativa !== false ? 'ATIVA' : 'INATIVA'}
                  </Badge>
                </div>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {selectedViewEmpresa.nomeFantasia || selectedViewEmpresa.fantasia || selectedViewEmpresa.nome}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Razão Social: <b>{selectedViewEmpresa.razaoSocial || selectedViewEmpresa.nome}</b>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Inscrição Estadual</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedViewEmpresa.inscricaoEstadual || 'Isento / Não inf.'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Inscrição Municipal</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedViewEmpresa.inscricaoMunicipal || '—'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Regime Tributário</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedViewEmpresa.regimeTributario || 'Simples Nacional'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
              <span className="text-[10px] text-slate-400 block font-bold">Endereço Completo</span>
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {selectedViewEmpresa.endereco ? `${selectedViewEmpresa.endereco}${selectedViewEmpresa.numero ? `, nº ${selectedViewEmpresa.numero}` : ''}${selectedViewEmpresa.bairro ? ` - ${selectedViewEmpresa.bairro}` : ''}` : 'Endereço não informado'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                {selectedViewEmpresa.cidade ? `${selectedViewEmpresa.cidade} - ${selectedViewEmpresa.uf}` : ''} {selectedViewEmpresa.cep ? `· CEP: ${selectedViewEmpresa.cep}` : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Telefone</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedViewEmpresa.telefone || '—'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">E-mail</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">{selectedViewEmpresa.email || '—'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewEmpresaOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL NOVO / EDITAR EMPRESA (MULTI-CNPJ) */}
      <Modal
        isOpen={modalEmpresaOpen}
        onClose={() => { setModalEmpresaOpen(false); setEditingEmpresa(null); }}
        title={editingEmpresa?.id ? 'Editar Empresa / Filial' : 'Nova Empresa / Filial do Grupo'}
      >
        <form onSubmit={handleSaveEmpresa} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Razão Social *</label>
              <input
                type="text"
                value={editingEmpresa?.razaoSocial || editingEmpresa?.nome || ''}
                onChange={e => setEditingEmpresa(prev => ({ ...prev, razaoSocial: e.target.value, nome: e.target.value }))}
                placeholder="Ex: FLUXA INDUSTRIA LTDA"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Fantasia / Unidade *</label>
              <input
                type="text"
                value={editingEmpresa?.nomeFantasia || editingEmpresa?.fantasia || ''}
                onChange={e => setEditingEmpresa(prev => ({ ...prev, nomeFantasia: e.target.value, fantasia: e.target.value }))}
                placeholder="Ex: Fluxa — Matriz SC"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CNPJ *</label>
              <input
                type="text"
                value={editingEmpresa?.cnpj || ''}
                onChange={e => setEditingEmpresa(prev => ({ ...prev, cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Inscrição Estadual</label>
              <input
                type="text"
                value={editingEmpresa?.inscricaoEstadual || ''}
                onChange={e => setEditingEmpresa(prev => ({ ...prev, inscricaoEstadual: e.target.value }))}
                placeholder="000.000.000.000"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Regime Tributário</label>
              <select
                value={editingEmpresa?.regimeTributario || 'Simples Nacional'}
                onChange={e => setEditingEmpresa(prev => ({ ...prev, regimeTributario: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                <option value="Simples Nacional">Simples Nacional</option>
                <option value="Lucro Presumido">Lucro Presumido</option>
                <option value="Lucro Real">Lucro Real</option>
                <option value="MEI">MEI</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço (Rua / Av)</label>
              <input
                type="text"
                value={editingEmpresa?.endereco || ''}
                onChange={e => setEditingEmpresa(prev => ({ ...prev, endereco: e.target.value }))}
                placeholder="Rua das Indústrias, 1200"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bairro</label>
              <input
                type="text"
                value={editingEmpresa?.bairro || ''}
                onChange={e => setEditingEmpresa(prev => ({ ...prev, bairro: e.target.value }))}
                placeholder="Distrito Industrial"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cidade</label>
              <input
                type="text"
                value={editingEmpresa?.cidade || ''}
                onChange={e => setEditingEmpresa(prev => ({ ...prev, cidade: e.target.value }))}
                placeholder="Joinville"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">UF</label>
              <select
                value={editingEmpresa?.uf || 'SC'}
                onChange={e => setEditingEmpresa(prev => ({ ...prev, uf: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-bold"
              >
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone de Contato</label>
              <input
                type="text"
                value={editingEmpresa?.telefone || ''}
                onChange={e => setEditingEmpresa(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="(47) 3456-7890"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingEmpresa?.isMatriz || false}
                onChange={e => setEditingEmpresa(prev => ({ ...prev, isMatriz: e.target.checked }))}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <span className="font-bold text-slate-800 dark:text-slate-200">Definir como Empresa Matriz Principal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingEmpresa?.ativa !== false}
                onChange={e => setEditingEmpresa(prev => ({ ...prev, ativa: e.target.checked }))}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <span className="font-bold text-slate-800 dark:text-slate-200">Empresa Ativa</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => { setModalEmpresaOpen(false); setEditingEmpresa(null); }}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Salvar Empresa
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
