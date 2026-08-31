import React, { useState } from 'react';
import { ShoppingCart, CheckSquare, Plus, Trash2, Check } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { useDelete } from '../context/DeleteContext';
import { Button, Card, Badge } from '../components/ui';
import { uid } from '../lib/formatters';
import { FluxaTask } from '../types';
import { ListaCompras } from './ListaCompras';

export const Tarefas: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();
  const { requestDelete } = useDelete();

  const [activeTab, setActiveTab] = useState<'compras' | 'tarefas'>('compras');
  const [newTaskText, setNewTaskText] = useState('');

  // Super admin ou dono da tarefa vê os itens
  const myTasks = (db.gescompTasks || []).filter(t => !t.userId || t.userId === user?.id || user?.permissoes?.includes('*') || user?.roleId === 'super_admin');

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const task: FluxaTask = {
      id: uid('tsk'),
      userId: user?.id || 'usr-admin',
      text: newTaskText.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };

    await updateDb(d => ({
      ...d,
      gescompTasks: [task, ...(d.gescompTasks || [])]
    }), 'TASK_ADDED');

    setNewTaskText('');
  };

  const handleToggleTask = async (taskId: string) => {
    await updateDb(d => ({
      ...d,
      gescompTasks: (d.gescompTasks || []).map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    }), 'TASK_TOGGLED');
  };

  const handleDeleteTask = (task: FluxaTask) => {
    requestDelete({
      title: 'Excluir Tarefa',
      itemName: task.text,
      itemType: 'Tarefa',
      entityType: 'shoppingItem',
      moduleKey: 'tarefas',
      originalId: task.id,
      itemData: task,
      isSoftDelete: true,
      warningMessage: 'Ao confirmar, a tarefa será movida para a lixeira.',
      onDelete: async () => {
        await updateDb(d => ({
          ...d,
          gescompTasks: (d.gescompTasks || []).filter(t => t.id !== task.id)
        }), 'TASK_DELETED');
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Abas Superiores */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('compras')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'compras'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Lista de Compras & Cotações Rápidas</span>
        </button>

        <button
          onClick={() => setActiveTab('tarefas')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'tarefas'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Minhas Tarefas & Atividades</span>
          {myTasks.filter(t => !t.completed).length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-500 text-white font-mono">
              {myTasks.filter(t => !t.completed).length}
            </span>
          )}
        </button>
      </div>

      {/* Conteúdo */}
      {activeTab === 'compras' ? (
        <ListaCompras />
      ) : (
        <div className="max-w-3xl">
          <Card title="Minhas Tarefas & Lembretes Operacionais">
            <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                placeholder="O que você precisa fazer hoje?"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
              <Button variant="primary" size="sm" type="submit" icon={<Plus className="w-3.5 h-3.5" />}>
                Adicionar
              </Button>
            </form>

            <div className="space-y-2">
              {myTasks.map(t => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all text-xs ${t.completed ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/50 opacity-60 line-through' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                >
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => handleToggleTask(t.id)}>
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${t.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                      {t.completed && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white">{t.text}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteTask(t)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                    title="Excluir Tarefa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {myTasks.length === 0 && (
                <p className="text-center py-6 text-slate-400 text-xs">Nenhuma tarefa pendente no momento.</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
