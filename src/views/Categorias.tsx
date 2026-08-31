import React, { useState } from 'react';
import { Tag, Plus, Edit, Trash2, Search, Filter, Layers, Box } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge, Modal } from '../components/ui';
import { MaterialCategory } from '../types';

export const Categorias: React.FC = () => {
  const { db, salvarCategoria, excluirCategoria } = useDb();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Partial<MaterialCategory> | null>(null);

  const categoriesList = db.materialCategories || [];

  const filteredCategories = categoriesList.filter(cat => {
    if (filterTipo !== 'todos' && cat.tipo !== filterTipo) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return cat.nome.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenNew = () => {
    setEditingCategoria({
      id: '',
      nome: '',
      tipo: 'MP',
      cor: 'teal',
      ativo: true
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: MaterialCategory) => {
    setEditingCategoria({ ...cat });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoria?.nome || !editingCategoria.nome.trim()) {
      alert('O nome da categoria é obrigatório!');
      return;
    }

    const res = await salvarCategoria(editingCategoria as MaterialCategory, user?.name || 'Admin');
    if (res.success) {
      setModalOpen(false);
      setEditingCategoria(null);
      alert('Categoria salva com sucesso!');
    } else {
      alert(res.error || 'Erro ao salvar categoria.');
    }
  };

  const handleDelete = async (cat: MaterialCategory) => {
    const vinculados = db.products.filter(p => p.categoria === cat.nome).length;
    let aviso = '';
    if (vinculados > 0) {
      aviso = `\n\n⚠️ Existem ${vinculados} produto(s) ou insumo(s) vinculados a esta categoria.`;
    }
    if (confirm(`Deseja realmente excluir a categoria "${cat.nome}"?${aviso}`)) {
      const res = await excluirCategoria(cat.id, user?.name || 'Admin');
      if (res.success) {
        alert('Categoria excluída com sucesso!');
      } else {
        alert(res.error || 'Erro ao excluir categoria.');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand-600 dark:text-teal-400" />
              Categorias de Materiais & Produtos
            </h3>
            <Badge variant="info">{categoriesList.length} Cadastrada(s)</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Classifique Matérias-Primas (MP), Itens de Uso e Consumo (MUC) e Produtos Acabados (PA).
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenNew}
        >
          + Nova Categoria
        </Button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome da categoria..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-bold"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="MP">Matéria-Prima (MP)</option>
            <option value="MUC">Uso e Consumo (MUC)</option>
            <option value="PA">Produto Acabado (PA)</option>
            <option value="GERAL">Geral / Todos</option>
          </select>
        </div>
      </div>

      {/* Grid de Cards de Categorias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredCategories.map(cat => {
          const vinculados = db.products.filter(p => p.categoria === cat.nome).length;

          return (
            <div
              key={cat.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-brand-600 dark:text-teal-400" />
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{cat.nome}</h4>
                  </div>
                  <Badge variant={cat.tipo === 'MP' ? 'info' : (cat.tipo === 'PA' ? 'success' : (cat.tipo === 'MUC' ? 'warning' : 'neutral'))}>
                    {cat.tipo === 'MP' ? 'Matéria-Prima' : (cat.tipo === 'PA' ? 'Produto Acabado' : (cat.tipo === 'MUC' ? 'Uso e Consumo' : 'Geral'))}
                  </Badge>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Editar Categoria"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Excluir Categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Itens vinculados no catálogo:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{vinculados} item(ns)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Criar / Editar Categoria */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCategoria(null); }}
        title={editingCategoria?.id ? 'Editar Categoria' : 'Nova Categoria de Material / Produto'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Categoria *</label>
            <input
              type="text"
              value={editingCategoria?.nome || ''}
              onChange={e => setEditingCategoria(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Ex: Sensores Ópticos, Perfis de Alumínio, etc."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Aplicação</label>
              <select
                value={editingCategoria?.tipo || 'MP'}
                onChange={e => setEditingCategoria(prev => ({ ...prev, tipo: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-bold"
              >
                <option value="MP">Matéria-Prima (MP)</option>
                <option value="MUC">Uso e Consumo (MUC)</option>
                <option value="PA">Produto Acabado (PA)</option>
                <option value="GERAL">Geral / Todos</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cor da Tag</label>
              <select
                value={editingCategoria?.cor || 'teal'}
                onChange={e => setEditingCategoria(prev => ({ ...prev, cor: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                <option value="teal">Verde / Ciano (Teal)</option>
                <option value="blue">Azul (Blue)</option>
                <option value="amber">Amarelo / Âmbar (Amber)</option>
                <option value="purple">Roxo / Púrpura (Purple)</option>
                <option value="rose">Rosa / Vermelho (Rose)</option>
                <option value="slate">Cinza Neutro (Slate)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => { setModalOpen(false); setEditingCategoria(null); }}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Salvar Categoria
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
