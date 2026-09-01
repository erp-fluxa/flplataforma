import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckSquare, Plus, Trash2, Check, ExternalLink, Clock, Tag, Smartphone, Share2, Copy, Bookmark, Sparkles, CheckCheck } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { useDelete } from '../context/DeleteContext';
import { Button, Card, Badge, Modal } from '../components/ui';

import { uid } from '../lib/formatters';
import { FluxaTask, ShoppingItem } from '../types';
import { ListaCompras } from './ListaCompras';

export const Tarefas: React.FC = () => {
  const { db, updateDb } = useDb();
  const { user } = useAuth();
  const { requestDelete } = useDelete();

  const [activeTab, setActiveTab] = useState<'rapido' | 'detalhado'>('rapido');
  const [newTaskText, setNewTaskText] = useState('');
  const [modalShortcutOpen, setModalShortcutOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);


  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        alert('Aplicativo / Atalho instalado com sucesso!');
        setDeferredPrompt(null);
        setModalShortcutOpen(false);
      }
    }
  };

  const handleCopyDirectLink = () => {
    const directUrl = `${window.location.origin}/tarefas`;
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 1. Minhas Tarefas Operacionais

  const myTasks = (db.gescompTasks || []).filter(
    t => !t.userId || t.userId === user?.id || user?.permissoes?.includes('*') || user?.roleId === 'super_admin'
  );

  // 2. Lista de Compras & Suprimentos Rápidos
  const shoppingItems = db.gescompShoppingList || [];

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
      title: 'Excluir Tarefa Operacional',
      itemName: task.text,
      itemType: 'Tarefa',
      entityType: 'task',
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

  // Handlers para a Lista Rápida de Compras
  const handleAddShoppingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShoppingText.trim()) return;

    const now = new Date().toISOString();
    const newItem: ShoppingItem = {
      id: uid('shop'),
      userId: user?.id || 'usr-admin',
      item: newShoppingText.trim(),
      categoria: 'Geral',
      unidade: 'UN',
      quantidade: 1,
      prioridade: 'normal',
      status: 'aguardando_cotacao',
      completed: false,
      historicoStatus: [
        {
          id: uid('hist'),
          paraStatus: 'aguardando_cotacao',
          data: now,
          usuarioNome: user?.name || 'Usuário'
        }
      ],
      createdAt: now
    };

    await updateDb(d => ({
      ...d,
      gescompShoppingList: [newItem, ...(d.gescompShoppingList || [])]
    }), 'SHOPPING_ITEM_ADDED');

    setNewShoppingText('');
  };

  const handleToggleShoppingItem = async (itemId: string) => {
    await updateDb(d => ({
      ...d,
      gescompShoppingList: (d.gescompShoppingList || []).map(i => 
        i.id === itemId ? { ...i, completed: !i.completed } : i
      )
    }), 'SHOPPING_ITEM_TOGGLED');
  };

  const handleDeleteShoppingItem = (item: ShoppingItem) => {
    requestDelete({
      title: 'Excluir Item de Compra',
      itemName: item.item,
      itemType: 'Item de Compras',
      entityType: 'shoppingItem',
      moduleKey: 'compras',
      originalId: item.id,
      itemData: item,
      isSoftDelete: true,
      warningMessage: 'Ao confirmar, o item será movido para a lixeira.',
      onDelete: async () => {
        await updateDb(d => ({
          ...d,
          gescompShoppingList: (d.gescompShoppingList || []).filter(i => i.id !== item.id)
        }), 'SHOPPING_ITEM_DELETED');
      }
    });
  };

  const getStatusBadge = (item: ShoppingItem) => {
    if (item.status === 'em_cotacao') {
      return <Badge variant="info">Em Cotação</Badge>;
    }
    if (item.status === 'aprovado' || item.status === 'cotado') {
      return <Badge variant="success">Cotado / Aprovado</Badge>;
    }
    if (item.status === 'convertido_pedido') {
      return <Badge variant="neutral">Pedido Gerado</Badge>;
    }
    return <Badge variant="warning">Aguardando Cotação</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Abas Superiores & Botão de Atalho PWA */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('rapido')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'rapido'
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Tarefas & Lista de Compras Rápidas</span>
          </button>

          <button
            onClick={() => setActiveTab('detalhado')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'detalhado'
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Gerenciador Completo de Suprimentos</span>
          </button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<Smartphone className="w-3.5 h-3.5 text-teal-400" />}
          onClick={() => setModalShortcutOpen(true)}
          className="border-teal-500/40 text-teal-400 font-bold hover:bg-teal-500/10 shadow-sm"
        >
          📱 Criar Atalho na Tela Inicial
        </Button>
      </div>

      {/* Conteúdo Dinâmico */}
      {activeTab === 'detalhado' ? (
        <ListaCompras />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* CARD 1: MINHAS TAREFAS RÁPIDAS */}
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

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {myTasks.map(t => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all text-xs ${
                    t.completed 
                      ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/50 opacity-60 line-through' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => handleToggleTask(t.id)}>
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      t.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'
                    }`}>
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
                <p className="text-center py-8 text-slate-400 text-xs">Nenhuma tarefa pendente no momento.</p>
              )}
            </div>
          </Card>

          {/* CARD 2: LISTA DE COMPRAS & SUPRIMENTOS RÁPIDOS */}
          <Card 
            title="Lista de Compras & Suprimentos Rápidos"
            action={
              <span className="text-[11px] text-teal-400 font-bold">
                Sincronizado com Compras &amp; RFQ
              </span>
            }
          >
            {/* Banner de integração */}
            <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-[11px] text-amber-300 font-semibold">
              <ShoppingCart className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Itens adicionados aqui aparecem automaticamente em{' '}
                <button
                  type="button"
                  className="underline font-black text-amber-400 hover:text-amber-300 cursor-pointer"
                  onClick={() => {
                    window.history.pushState({}, '', '/compras');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                    window.scrollTo(0, 0);
                  }}
                >
                  Gestão de Compras &gt; Cotações &amp; RFQ
                </button>
                {' '}aguardando processamento.
              </span>
            </div>

            <form onSubmit={handleAddShoppingItem} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newShoppingText}
                onChange={e => setNewShoppingText(e.target.value)}
                placeholder="Ex: 5 caixas de parafuso M3, 1 rolo filamento..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
              <Button variant="primary" size="sm" type="submit" icon={<Plus className="w-3.5 h-3.5" />}>
                Adicionar
              </Button>
            </form>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {shoppingItems.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all text-xs ${
                    item.completed 
                      ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/50 opacity-60 line-through' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => handleToggleShoppingItem(item.id)}>
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      item.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'
                    }`}>
                      {item.completed && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white block">{item.item}</span>
                      {item.quantidade && (
                        <span className="text-[10px] text-slate-400">
                          Qtd: {item.quantidade} {item.unidade || 'UN'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(item)}
                    <button
                      onClick={() => handleDeleteShoppingItem(item)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                      title="Excluir Item da Lista"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {shoppingItems.length === 0 && (
                <p className="text-center py-8 text-slate-400 text-xs">Nenhum item na lista de compras no momento.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Atalho Direto na Tela Inicial (PWA) */}

      <Modal
        isOpen={modalShortcutOpen}
        onClose={() => setModalShortcutOpen(false)}
        title="📱 Atalho Direto para Tarefas & Compras Rápidas"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/40 via-brand-950/20 to-slate-900 border border-teal-500/30 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span className="font-extrabold text-sm text-teal-300">Acesso Instantâneo em 1 Clique</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Crie um ícone do <b>Fluxa ERP</b> direto na tela inicial do seu celular ou barra de favoritos do computador. Ao abrir o atalho, você cai <b>direto nesta tela de Tarefas & Compras Rápidas</b>, mantendo seu mesmo login e sincronização em nuvem.
            </p>
          </div>

          {/* Botão de Instalação Automática se suportado */}
          {deferredPrompt && (
            <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-2">
              <div>
                <span className="font-bold text-teal-300 block">Navegador Compatível com PWA</span>
                <span className="text-[11px] text-slate-400">Instale o atalho nativo diretamente com 1 toque:</span>
              </div>
              <Button variant="primary" size="sm" onClick={handleInstallPWA} icon={<Smartphone className="w-3.5 h-3.5" />}>
                Instalar Atalho
              </Button>
            </div>
          )}

          {/* Instruções por Sistema Operacional */}
          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🤖 Android (Google Chrome / Samsung Internet)</span>
              </span>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11.5px]">
                <li>Toque no menu de <b>três pontinhos (⋮)</b> no topo direito do navegador.</li>
                <li>Selecione <b>"Adicionar à tela inicial"</b> ou <b>"Instalar aplicativo"</b>.</li>
                <li>Um ícone do Fluxa será criado no seu celular abrindo diretamente aqui!</li>
              </ol>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🍏 iPhone / iPad (Apple Safari)</span>
              </span>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11.5px]">
                <li>Toque no botão de <b>Compartilhar (quadrado com seta para cima)</b> no rodapé do Safari.</li>
                <li>Role para baixo e toque em <b>"Adicionar à Tela de Início"</b>.</li>
                <li>Toque em <b>"Adicionar"</b> no canto superior direito.</li>
              </ol>
            </div>
          </div>

          {/* Copiar Link Direto */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="truncate text-slate-400 text-[11px] font-mono">
              {window.location.origin}/tarefas
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={copiedLink ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={handleCopyDirectLink}
              className="shrink-0 font-bold"
            >
              {copiedLink ? 'Link Copiado!' : 'Copiar Link Direto'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


