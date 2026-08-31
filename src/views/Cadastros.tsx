import React, { useState } from 'react';
import { Users, Truck, Boxes, Layers, Cpu, Warehouse } from 'lucide-react';
import { Clientes } from './Clientes';
import { Fornecedores } from './Fornecedores';
import { Estoque } from './Estoque';
import { FichasTecnicas } from './FichasTecnicas';
import { CentrosTrabalho } from './CentrosTrabalho';
import { Depositos } from './Depositos';

type CadTab = 'clientes' | 'fornecedores' | 'produtos' | 'fichas' | 'centros' | 'depositos';

interface CadastrosProps {
  defaultTab?: CadTab;
}

export const Cadastros: React.FC<CadastrosProps> = ({ defaultTab = 'clientes' }) => {
  const [activeSubTab, setActiveSubTab] = useState<CadTab>(defaultTab);

  const subTabs = [
    { id: 'clientes', label: 'Clientes', icon: <Users className="w-4 h-4" /> },
    { id: 'fornecedores', label: 'Fornecedores', icon: <Truck className="w-4 h-4" /> },
    { id: 'produtos', label: 'Produtos', icon: <Boxes className="w-4 h-4" /> },
    { id: 'fichas', label: 'Fichas Técnicas (BOM)', icon: <Layers className="w-4 h-4" /> },
    { id: 'centros', label: 'Centros de Trabalho', icon: <Cpu className="w-4 h-4" /> },
    { id: 'depositos', label: 'Depósitos', icon: <Warehouse className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-4">
      {/* Navegação de Sub-abas de Cadastros */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        {subTabs.map(t => {
          const isActive = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id as CadTab)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-brand-700 text-white shadow-sm font-bold'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo da Sub-Aba Ativa */}
      <div>
        {activeSubTab === 'clientes' && <Clientes />}
        {activeSubTab === 'fornecedores' && <Fornecedores />}
        {activeSubTab === 'produtos' && <Estoque />}
        {activeSubTab === 'fichas' && <FichasTecnicas />}
        {activeSubTab === 'centros' && <CentrosTrabalho />}
        {activeSubTab === 'depositos' && <Depositos />}
      </div>
    </div>
  );
};
