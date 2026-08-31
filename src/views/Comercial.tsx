import React, { useState } from 'react';
import { Target, ShoppingBag } from 'lucide-react';
import { CRM } from './CRM';
import { Vendas } from './Vendas';

type ComercialTab = 'crm' | 'vendas';

interface ComercialProps {
  defaultTab?: ComercialTab;
}

export const Comercial: React.FC<ComercialProps> = ({ defaultTab = 'crm' }) => {
  const [activeSubTab, setActiveSubTab] = useState<ComercialTab>(defaultTab);

  return (
    <div className="space-y-4">
      {/* Navegação de Sub-abas Comercial */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('crm')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'crm'
              ? 'bg-brand-700 text-white shadow-sm font-bold'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>CRM & Prospecção</span>
        </button>

        <button
          onClick={() => setActiveSubTab('vendas')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'vendas'
              ? 'bg-brand-700 text-white shadow-sm font-bold'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Vendas & Pedidos</span>
        </button>
      </div>

      {/* Conteúdo Dinâmico */}
      <div>
        {activeSubTab === 'crm' && <CRM />}
        {activeSubTab === 'vendas' && <Vendas />}
      </div>
    </div>
  );
};
