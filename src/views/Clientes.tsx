import React, { useState } from 'react';
import { Users, Plus, Phone, Mail, MapPin, Eye, Edit, Trash2, Power, PowerOff, Building } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { uid } from '../lib/formatters';
import { Customer } from '../types';

export const Clientes: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();

  const [modalNovoClienteOpen, setModalNovoClienteOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Customer | null>(null);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [contatoNome, setContatoNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('SC');

  const handleOpenNew = () => {
    setEditingClienteId(null);
    setNome('');
    setCnpjCpf('');
    setContatoNome('');
    setEmail('');
    setTelefone('');
    setCidade('');
    setUf('SC');
    setModalNovoClienteOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingClienteId(c.id);
    setNome(c.nome);
    setCnpjCpf(c.cnpjCpf);
    setContatoNome(c.contatoNome || '');
    setEmail(c.email || '');
    setTelefone(c.telefone || '');
    setCidade(c.cidade || '');
    setUf(c.uf || 'SC');
    setModalNovoClienteOpen(true);
  };

  const handleOpenView = (c: Customer) => {
    setSelectedCliente(c);
    setModalViewOpen(true);
  };

  const handleToggleAtivo = async (c: Customer) => {
    const nextStatus = !c.ativo;

    await updateDb(prev => ({
      ...prev,
      customers: prev.customers.map(item => item.id === c.id ? { ...item, ativo: nextStatus } : item)
    }), 'CUSTOMER_STATUS_TOGGLED');

    alert(`Cliente ${c.nome} ${nextStatus ? 'ativado' : 'inativado'}!`);
  };

  const handleDelete = async (c: Customer) => {
    if (confirm(`Tem certeza que deseja excluir o cliente ${c.nome}?`)) {
      await updateDb(prev => ({
        ...prev,
        customers: prev.customers.filter(item => item.id !== c.id)
      }), 'CUSTOMER_DELETED');
      alert(`Cliente ${c.nome} excluído!`);
    }
  };

  const handleCriarOuEditarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cnpjCpf.trim()) return;

    if (editingClienteId) {
      await updateDb(prev => ({
        ...prev,
        customers: prev.customers.map(c => c.id === editingClienteId ? {
          ...c,
          nome: nome.trim(),
          cnpjCpf: cnpjCpf.trim(),
          contatoNome: contatoNome.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
          cidade: cidade.trim(),
          uf: uf.trim()
        } : c)
      }), 'CUSTOMER_UPDATED');

      setModalNovoClienteOpen(false);
      alert('Cliente atualizado com sucesso!');
      return;
    }

    const novoCliente: Customer = {
      id: uid('cli'),
      nome: nome.trim(),
      cnpjCpf: cnpjCpf.trim(),
      contatoNome: contatoNome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      cidade: cidade.trim(),
      uf: uf.trim(),
      ativo: true
    };

    await updateDb(prev => ({
      ...prev,
      customers: [...(prev.customers || []), novoCliente]
    }), 'CUSTOMER_CREATED');

    setModalNovoClienteOpen(false);
    alert('Cliente cadastrado com sucesso!');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600 dark:text-teal-400" />
            Carteira & Cadastro de Clientes
          </h2>
          <p className="text-xs text-slate-500">
            Gerenciamento de empresas compradoras, contatos comerciais e endereços de entrega.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenNew}
        >
          Novo Cliente
        </Button>
      </div>

      {/* 1. VISUALIZAÇÃO MOBILE (CARDS RESPONSIVOS TOUCH-FRIENDLY COM 4 BOTÕES) */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {(db.customers || []).map(c => (
          <div
            key={c.id}
            className={`p-4 rounded-2xl border transition-all space-y-3 ${
              !c.ativo
                ? 'bg-slate-900/60 border-rose-900/40 opacity-70'
                : 'bg-[#111A2D] border-slate-800 shadow-md'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-sm text-slate-100">{c.nome}</h4>
                <span className="font-mono text-[11px] text-slate-400">CNPJ: {c.cnpjCpf}</span>
              </div>
              <Badge variant={c.ativo !== false ? 'success' : 'neutral'}>
                {c.ativo !== false ? 'ATIVO' : 'INATIVO'}
              </Badge>
            </div>

            <div className="space-y-1 text-xs pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Contato:</span>
                <b>{c.contatoNome || '—'} ({c.telefone || '—'})</b>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Cidade / UF:</span>
                <b>{c.cidade} / {c.uf}</b>
              </div>
            </div>

            {/* Barra de 4 Ações no Mobile */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-4 gap-1.5">
              <button
                onClick={() => handleOpenView(c)}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-bold gap-1 transition-all"
              >
                <Eye className="w-4 h-4 text-teal-400" />
                <span>Detalhes</span>
              </button>

              <button
                onClick={() => handleOpenEdit(c)}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-bold gap-1 transition-all"
              >
                <Edit className="w-4 h-4 text-amber-400" />
                <span>Editar</span>
              </button>

              <button
                onClick={() => handleToggleAtivo(c)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10.5px] font-bold gap-1 transition-all ${
                  c.ativo !== false ? 'bg-slate-800 hover:bg-orange-950/40 text-orange-400' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800'
                }`}
              >
                {c.ativo !== false ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                <span>{c.ativo !== false ? 'Inativar' : 'Ativar'}</span>
              </button>

              <button
                onClick={() => handleDelete(c)}
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
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Cliente / Empresa</th>
                  <th className="px-4 py-3">CNPJ / CPF</th>
                  <th className="px-4 py-3">Contato & Telefone</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Localização</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {(db.customers || []).map(c => (
                  <tr key={c.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${!c.ativo ? 'opacity-60 bg-slate-100/50 dark:bg-slate-950/40' : ''}`}>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {c.nome}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {c.cnpjCpf}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{c.contatoNome || '—'}</span>
                      <span className="text-[10px] text-slate-400">{c.telefone}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {c.email || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {c.cidade} / {c.uf}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={c.ativo !== false ? 'success' : 'neutral'}>
                        {c.ativo !== false ? 'ATIVO' : 'INATIVO'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* 1. VISUALIZAR */}
                        <button
                          onClick={() => handleOpenView(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Visualizar Cliente"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* 2. EDITAR */}
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Editar Cliente"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* 3. INATIVAR / ATIVAR */}
                        <button
                          onClick={() => handleToggleAtivo(c)}
                          className={`p-1.5 rounded-lg transition-colors ${c.ativo !== false ? 'text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-emerald-500 hover:bg-emerald-950/40'}`}
                          title={c.ativo !== false ? 'Inativar Cliente' : 'Ativar Cliente'}
                        >
                          {c.ativo !== false ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </button>

                        {/* 4. EXCLUIR */}
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Excluir Cliente"
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

      {/* MODAL VIEW CLIENTE */}
      <Modal isOpen={modalViewOpen} onClose={() => setModalViewOpen(false)} title={`Ficha Cadastral — ${selectedCliente?.nome}`}>
        {selectedCliente && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-400">{selectedCliente.cnpjCpf}</span>
                <Badge variant={selectedCliente.ativo !== false ? 'success' : 'neutral'}>{selectedCliente.ativo !== false ? 'ATIVO' : 'INATIVO'}</Badge>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedCliente.nome}</h3>
              <p className="text-slate-400">Contato: <b>{selectedCliente.contatoNome || '—'}</b> ({selectedCliente.telefone || '—'})</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">E-mail Comercial</span>
                <span className="font-mono text-slate-900 dark:text-white">{selectedCliente.email || '—'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Cidade / Estado</span>
                <span className="font-mono text-slate-900 dark:text-white">{selectedCliente.cidade} / {selectedCliente.uf}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL NOVO / EDITAR CLIENTE */}
      <Modal isOpen={modalNovoClienteOpen} onClose={() => setModalNovoClienteOpen(false)} title={editingClienteId ? 'Editar Cliente' : 'Novo Cliente'}>
        <form onSubmit={handleCriarOuEditarCliente} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Razão Social / Nome *</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: SignTech Painéis e Fachadas Ltda"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CNPJ ou CPF *</label>
              <input
                type="text"
                value={cnpjCpf}
                onChange={e => setCnpjCpf(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Contato</label>
              <input
                type="text"
                value={contatoNome}
                onChange={e => setContatoNome(e.target.value)}
                placeholder="Ex: Arq. Gustavo Ramos"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="(47) 99999-8888"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail Comercial</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="compras@cliente.com.br"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cidade / UF</label>
              <input
                type="text"
                value={cidade}
                onChange={e => setCidade(e.target.value)}
                placeholder="Joinville - SC"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovoClienteOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">{editingClienteId ? 'Salvar Alterações' : 'Salvar Cliente'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
