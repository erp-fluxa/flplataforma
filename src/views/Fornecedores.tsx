import React, { useState } from 'react';
import { Truck, Plus, Eye, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { useDelete } from '../context/DeleteContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import { uid } from '../lib/formatters';
import { Supplier } from '../types';

export const Fornecedores: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();
  const { requestDelete } = useDelete();

  const [modalNovoFornecedorOpen, setModalNovoFornecedorOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Supplier | null>(null);
  const [editingFornecedorId, setEditingFornecedorId] = useState<string | null>(null);

  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [contatoNome, setContatoNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [categoriaPrincipal, setCategoriaPrincipal] = useState('Matéria-Prima');
  const [condicoesPagamentoPadrao, setCondicoesPagamentoPadrao] = useState('28 DDL');

  const handleOpenNew = () => {
    setEditingFornecedorId(null);
    setRazaoSocial('');
    setNomeFantasia('');
    setCnpj('');
    setContatoNome('');
    setEmail('');
    setTelefone('');
    setCategoriaPrincipal('Matéria-Prima');
    setCondicoesPagamentoPadrao('28 DDL');
    setModalNovoFornecedorOpen(true);
  };

  const handleOpenEdit = (f: Supplier) => {
    setEditingFornecedorId(f.id);
    setRazaoSocial(f.razaoSocial);
    setNomeFantasia(f.nomeFantasia || '');
    setCnpj(f.cnpj);
    setContatoNome(f.contatoNome || '');
    setEmail(f.email || '');
    setTelefone(f.telefone || '');
    setCategoriaPrincipal(f.categoriaPrincipal || 'Matéria-Prima');
    setCondicoesPagamentoPadrao(f.condicoesPagamentoPadrao || '28 DDL');
    setModalNovoFornecedorOpen(true);
  };

  const handleOpenView = (f: Supplier) => {
    setSelectedFornecedor(f);
    setModalViewOpen(true);
  };

  const handleToggleAtivo = async (f: Supplier) => {
    const nextStatus = !f.ativo;

    await updateDb(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(item => item.id === f.id ? { ...item, ativo: nextStatus } : item)
    }), 'SUPPLIER_STATUS_TOGGLED');

    alert(`Fornecedor ${f.razaoSocial} ${nextStatus ? 'ativado' : 'inativado'}!`);
  };

  const handleDelete = (f: Supplier) => {
    const pcCount = db.orders?.filter(o => o.supplierId === f.id).length || 0;
    const deps: string[] = [];
    if (pcCount > 0) deps.push(`Possui ${pcCount} pedido(s) de compra associado(s).`);

    requestDelete({
      title: 'Excluir Fornecedor',
      itemName: f.nomeFantasia || f.razaoSocial,
      itemType: 'Fornecedor',
      entityType: 'supplier',
      moduleKey: 'cadastros',
      originalId: f.id,
      itemData: f,
      isSoftDelete: true,
      dependencies: deps,
      warningMessage: 'Ao confirmar, o fornecedor será movido para a lixeira.',
      onDelete: async () => {
        await updateDb(prev => ({
          ...prev,
          suppliers: prev.suppliers.filter(item => item.id !== f.id)
        }), 'SUPPLIER_DELETED');
      }
    });
  };

  const handleCriarOuEditarFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial.trim() || !cnpj.trim()) return;

    if (editingFornecedorId) {
      await updateDb(prev => ({
        ...prev,
        suppliers: prev.suppliers.map(f => f.id === editingFornecedorId ? {
          ...f,
          razaoSocial: razaoSocial.trim(),
          nomeFantasia: nomeFantasia.trim() || razaoSocial.trim(),
          cnpj: cnpj.trim(),
          contatoNome: contatoNome.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
          categoriaPrincipal: categoriaPrincipal.trim(),
          condicoesPagamentoPadrao: condicoesPagamentoPadrao.trim()
        } : f)
      }), 'SUPPLIER_UPDATED');

      setModalNovoFornecedorOpen(false);
      alert('Fornecedor atualizado com sucesso!');
      return;
    }

    const novoFornecedor: Supplier = {
      id: uid('sup'),
      razaoSocial: razaoSocial.trim(),
      nomeFantasia: nomeFantasia.trim() || razaoSocial.trim(),
      cnpj: cnpj.trim(),
      contatoNome: contatoNome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      categoriaPrincipal: categoriaPrincipal.trim(),
      condicoesPagamentoPadrao: condicoesPagamentoPadrao.trim(),
      ativo: true
    };

    await updateDb(prev => ({
      ...prev,
      suppliers: [...(prev.suppliers || []), novoFornecedor]
    }), 'SUPPLIER_CREATED');

    setModalNovoFornecedorOpen(false);
    alert('Fornecedor homologado com sucesso!');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-brand-600 dark:text-teal-400" />
            Fornecedores Homologados
          </h2>
          <p className="text-xs text-slate-500">
            Cadastro de distribuidores de matéria-prima, componentes mecânicos, eletrônica e serviços de usinagem.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenNew}
        >
          Novo Fornecedor
        </Button>
      </div>

      {/* 1. VISUALIZAÇÃO MOBILE (CARDS RESPONSIVOS COM 4 BOTÕES TOUCH-FRIENDLY) */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {(db.suppliers || []).map(f => (
          <div
            key={f.id}
            className={`p-4 rounded-2xl border transition-all space-y-3 ${
              !f.ativo
                ? 'bg-slate-900/60 border-rose-900/40 opacity-70'
                : 'bg-[#111A2D] border-slate-800 shadow-md'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-sm text-slate-100">{f.razaoSocial}</h4>
                {f.nomeFantasia && f.nomeFantasia !== f.razaoSocial && (
                  <span className="text-xs text-slate-400 block">{f.nomeFantasia}</span>
                )}
                <span className="font-mono text-[11px] text-slate-400">CNPJ: {f.cnpj}</span>
              </div>
              <Badge variant={f.ativo !== false ? 'success' : 'neutral'}>
                {f.ativo !== false ? 'ATIVO' : 'INATIVO'}
              </Badge>
            </div>

            <div className="space-y-1 text-xs pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Categoria:</span>
                <Badge variant="info">{f.categoriaPrincipal || 'Geral'}</Badge>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Contato:</span>
                <b>{f.contatoNome || '—'} ({f.telefone || '—'})</b>
              </div>
            </div>

            {/* Barra de 4 Ações no Mobile */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-4 gap-1.5">
              <button
                onClick={() => handleOpenView(f)}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-bold gap-1 transition-all"
              >
                <Eye className="w-4 h-4 text-teal-400" />
                <span>Detalhes</span>
              </button>

              <button
                onClick={() => handleOpenEdit(f)}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-bold gap-1 transition-all"
              >
                <Edit className="w-4 h-4 text-amber-400" />
                <span>Editar</span>
              </button>

              <button
                onClick={() => handleToggleAtivo(f)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10.5px] font-bold gap-1 transition-all ${
                  f.ativo !== false ? 'bg-slate-800 hover:bg-orange-950/40 text-orange-400' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800'
                }`}
              >
                {f.ativo !== false ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                <span>{f.ativo !== false ? 'Inativar' : 'Ativar'}</span>
              </button>

              <button
                onClick={() => handleDelete(f)}
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
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Fornecedor / Razão Social</th>
                  <th className="px-4 py-3">CNPJ</th>
                  <th className="px-4 py-3">Categoria Principal</th>
                  <th className="px-4 py-3">Contato & Telefone</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {(db.suppliers || []).map(f => (
                  <tr key={f.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${!f.ativo ? 'opacity-60 bg-slate-100/50 dark:bg-slate-950/40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{f.razaoSocial}</div>
                      {f.nomeFantasia && f.nomeFantasia !== f.razaoSocial && (
                        <div className="text-[11px] text-slate-400">{f.nomeFantasia}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {f.cnpj}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{f.categoriaPrincipal || 'Geral'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{f.contatoNome || '—'}</span>
                      <span className="text-[10px] text-slate-400">{f.telefone}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {f.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={f.ativo !== false ? 'success' : 'neutral'}>
                        {f.ativo !== false ? 'ATIVO' : 'INATIVO'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* 1. VISUALIZAR */}
                        <button
                          onClick={() => handleOpenView(f)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Visualizar Fornecedor"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* 2. EDITAR */}
                        <button
                          onClick={() => handleOpenEdit(f)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Editar Fornecedor"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* 3. INATIVAR / ATIVAR */}
                        <button
                          onClick={() => handleToggleAtivo(f)}
                          className={`p-1.5 rounded-lg transition-colors ${f.ativo !== false ? 'text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-emerald-500 hover:bg-emerald-950/40'}`}
                          title={f.ativo !== false ? 'Inativar Fornecedor' : 'Ativar Fornecedor'}
                        >
                          {f.ativo !== false ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </button>

                        {/* 4. EXCLUIR */}
                        <button
                          onClick={() => handleDelete(f)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Excluir Fornecedor"
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

      {/* MODAL VIEW FORNECEDOR */}
      <Modal isOpen={modalViewOpen} onClose={() => setModalViewOpen(false)} title={`Ficha do Fornecedor — ${selectedFornecedor?.razaoSocial}`}>
        {selectedFornecedor && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-400">{selectedFornecedor.cnpj}</span>
                <Badge variant={selectedFornecedor.ativo !== false ? 'success' : 'neutral'}>{selectedFornecedor.ativo !== false ? 'ATIVO' : 'INATIVO'}</Badge>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedFornecedor.razaoSocial}</h3>
              {selectedFornecedor.nomeFantasia && <p className="text-slate-400 font-bold">{selectedFornecedor.nomeFantasia}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Categoria</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedFornecedor.categoriaPrincipal || 'Geral'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Condições Padrão</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedFornecedor.condicoesPagamentoPadrao || '28 DDL'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">Contato & Telefone</span>
                <span className="text-slate-900 dark:text-white font-bold">{selectedFornecedor.contatoNome || '—'} ({selectedFornecedor.telefone || '—'})</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block font-bold">E-mail Comercial</span>
                <span className="font-mono text-slate-900 dark:text-white">{selectedFornecedor.email || '—'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setModalViewOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL NOVO / EDITAR FORNECEDOR */}
      <Modal isOpen={modalNovoFornecedorOpen} onClose={() => setModalNovoFornecedorOpen(false)} title={editingFornecedorId ? 'Editar Fornecedor' : 'Novo Fornecedor'}>
        <form onSubmit={handleCriarOuEditarFornecedor} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Razão Social *</label>
              <input
                type="text"
                value={razaoSocial}
                onChange={e => setRazaoSocial(e.target.value)}
                placeholder="Ex: Alumínio Catarinense Ltda"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={nomeFantasia}
                onChange={e => setNomeFantasia(e.target.value)}
                placeholder="Ex: AluCat"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CNPJ *</label>
              <input
                type="text"
                value={cnpj}
                onChange={e => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria Principal</label>
              <select
                value={categoriaPrincipal}
                onChange={e => setCategoriaPrincipal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                <option value="Matéria-Prima">Matéria-Prima (Alumínio/Aço)</option>
                <option value="Componentes Mecânicos">Componentes Mecânicos (Guias/Fuso)</option>
                <option value="Eletrônica & Automação">Eletrônica & Automação (Drivers/Motores)</option>
                <option value="Fixadores & Insumos">Fixadores & Insumos (Parafusos/Cabos)</option>
                <option value="Serviços & Usinagem">Serviços & Usinagem Externa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Vendedor / Contato</label>
              <input
                type="text"
                value={contatoNome}
                onChange={e => setContatoNome(e.target.value)}
                placeholder="Ex: Marcos Vendas"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="(47) 99999-0000"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail Comercial</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vendas@fornecedor.com.br"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Condição Padrão</label>
              <input
                type="text"
                value={condicoesPagamentoPadrao}
                onChange={e => setCondicoesPagamentoPadrao(e.target.value)}
                placeholder="Ex: 28 DDL / À Vista"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovoFornecedorOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">{editingFornecedorId ? 'Salvar Alterações' : 'Salvar Fornecedor'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
