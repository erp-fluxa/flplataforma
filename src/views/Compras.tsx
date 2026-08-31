import React, { useState } from 'react';
import { ShoppingCart, FileSpreadsheet, CheckSquare, Plus } from 'lucide-react';
import { Cotacoes } from './Cotacoes';
import { PedidosCompra } from './PedidosCompra';
import { Tarefas } from './Tarefas';

interface ComprasProps {
  defaultTab?: 'cotacoes' | 'pedidos' | 'tarefas';
}

export const Compras: React.FC<ComprasProps> = ({ defaultTab = 'cotacoes' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'cotacoes' | 'pedidos' | 'tarefas'>(defaultTab);

  return (
    <div className="space-y-4">
      {/* Navegação de Sub-abas de Compras */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
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
        {activeSubTab === 'cotacoes' && <Cotacoes />}
        {activeSubTab === 'pedidos' && <PedidosCompra />}
        {activeSubTab === 'tarefas' && <Tarefas />}
      </div>
    </div>
  );
};
