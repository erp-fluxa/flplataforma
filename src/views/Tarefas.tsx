import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, ShoppingCart, Check } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge } from '../components/ui';
import { uid } from '../lib/formatters';
import { FluxaTask, ShoppingItem } from '../types';

export const Tarefas: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();

  const [newTaskText, setNewTaskText] = useState('');
  const [newShopItem, setNewShopItem] = useState('');

  // Super admin ou dono da tarefa vê os itens
  const myTasks = (db.gescompTasks || []).filter(t => !t.userId || t.userId === user?.id || user?.permissoes?.includes('*') || user?.roleId === 'super_admin');
  const myShopping = (db.gescompShoppingList || []).filter(i => !i.userId || i.userId === user?.id || user?.permissoes?.includes('*') || user?.roleId === 'super_admin');

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

  const handleDeleteTask = async (taskId: string) => {
    await updateDb(d => ({
      ...d,
      gescompTasks: (d.gescompTasks || []).filter(t => t.id !== taskId)
    }), 'TASK_DELETED');
  };

  const handleAddShoppingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopItem.trim()) return;

    const item: ShoppingItem = {
      id: uid('shop'),
      userId: user?.id || 'usr-admin',
      item: newShopItem.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };

    await updateDb(d => ({
      ...d,
      gescompShoppingList: [item, ...(d.gescompShoppingList || [])]
    }), 'SHOPPING_ADDED');

    setNewShopItem('');
  };

  const handleToggleShopping = async (itemId: string) => {
    await updateDb(d => ({
      ...d,
      gescompShoppingList: (d.gescompShoppingList || []).map(i => i.id === itemId ? { ...i, completed: !i.completed } : i)
    }), 'SHOPPING_TOGGLED');
  };

  const handleDeleteShopping = async (itemId: string) => {
    await updateDb(d => ({
      ...d,
      gescompShoppingList: (d.gescompShoppingList || []).filter(i => i.id !== itemId)
    }), 'SHOPPING_DELETED');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Lista de Tarefas Pessoais */}
      <Card title="Minhas Tarefas Rápidas">
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
                onClick={() => handleDeleteTask(t.id)}
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

      {/* Lista de Compras Rápidas */}
      <Card title="Lista de Compras & Suprimentos Rápidos">
        <form onSubmit={handleAddShoppingItem} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newShopItem}
            onChange={e => setNewShopItem(e.target.value)}
            placeholder="Ex: 5 caixas de parafuso M3, 1 rolo filamento..."
            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
          />
          <Button variant="primary" size="sm" type="submit" icon={<Plus className="w-3.5 h-3.5" />}>
            Adicionar
          </Button>
        </form>

        <div className="space-y-2">
          {myShopping.map(item => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all text-xs ${item.completed ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/50 opacity-60 line-through' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
            >
              <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => handleToggleShopping(item.id)}>
                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${item.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                  {item.completed && <Check className="w-3.5 h-3.5" />}
                </div>
                <span className="font-medium text-slate-900 dark:text-white">{item.item}</span>
              </div>
              <button
                onClick={() => handleDeleteShopping(item.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                title="Excluir Item de Compra"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {myShopping.length === 0 && (
            <p className="text-center py-6 text-slate-400 text-xs">Nenhum item na lista de compras no momento.</p>
          )}
        </div>
      </Card>
    </div>
  );
};
