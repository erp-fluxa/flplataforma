import React, { useState } from 'react';
import { ShoppingCart, FileSpreadsheet, CheckSquare, ListPlus, Zap, BarChart3 } from 'lucide-react';
import { DashboardCompras } from './DashboardCompras';
import { Cotacoes } from './Cotacoes';
import { PedidosCompra } from './PedidosCompra';
import { ListaCompras } from './ListaCompras';
import { Tarefas } from './Tarefas';
import { CompraRapida } from './CompraRapida';

interface ComprasProps {
  defaultTab?: 'dashboard' | 'compra_rapida' | 'cotacoes' | 'pedidos' | 'lista' | 'tarefas';
}

export const Compras: React.FC<ComprasProps> = ({ defaultTab = 'dashboard' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'compra_rapida' | 'cotacoes' | 'pedidos' | 'lista' | 'tarefas'>(defaultTab);

  return (
    <div className="space-y-4">
      {/* Navegação de Sub-abas de Compras */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'dashboard'
              ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-400/40'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-teal-300" />
          <span>📊 Dashboard de Ação</span>
        </button>

        <button
          onClick={() => setActiveSubTab('compra_rapida')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'compra_rapida'
              ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-400/40'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 text-teal-300" />
          <span>⚡ Compra Rápida</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cotacoes')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'cotacoes'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Cotações & RFQ</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pedidos')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'pedidos'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Pedidos de Compra</span>
        </button>

        <button
          onClick={() => setActiveSubTab('lista')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'lista'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <ListPlus className="w-4 h-4" />
          <span>Lista de Compras & Suprimentos</span>
        </button>

        <button
          onClick={() => setActiveSubTab('tarefas')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'tarefas'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Tarefas & Notas</span>
        </button>
      </div>

      {/* Conteúdo Dinâmico da Sub-Aba */}
      <div>
        {activeSubTab === 'dashboard' && (
          <DashboardCompras 
            onNavigateTab={(tab) => setActiveSubTab(tab)}
          />
        )}
        {activeSubTab === 'compra_rapida' && <CompraRapida onComplete={() => setActiveSubTab('cotacoes')} />}
        {activeSubTab === 'cotacoes' && <Cotacoes />}
        {activeSubTab === 'pedidos' && <PedidosCompra />}
        {activeSubTab === 'lista' && <ListaCompras />}
        {activeSubTab === 'tarefas' && <Tarefas />}
      </div>
    </div>
  );
};


