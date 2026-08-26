import React from 'react';
import { PermissionKey } from '../types';

interface PermissionMatrixProps {
  selectedPermissions: PermissionKey[];
  onChange: (permissions: PermissionKey[]) => void;
  disabled?: boolean;
}

export const MODULES_CATALOG = [
  {
    module: 'Compras & Suprimentos',
    permissions: [
      { key: 'compras.requisicoes.ver', label: 'Visualizar Requisições' },
      { key: 'compras.requisicoes.criar', label: 'Criar Requisições' },
      { key: 'compras.requisicoes.aprovar', label: 'Aprovar / Reprovar Requisições' },
      { key: 'compras.cotacoes.ver', label: 'Visualizar Cotações & Kanban' },
      { key: 'compras.cotacoes.criar', label: 'Criar Cotações' },
      { key: 'compras.cotacoes.editar', label: 'Editar & Mover no Kanban' },
      { key: 'compras.cotacoes.aprovar', label: 'Aprovar / Reprovar Cotações' },
      { key: 'compras.cotacoes.converter_pedido', label: 'Converter em Pedido de Compra' },
      { key: 'compras.cotacoes.bloquear', label: 'Bloquear / Desbloquear Cotações' },
      { key: 'compras.pedidos.ver', label: 'Visualizar Pedidos' },
      { key: 'compras.pedidos.criar', label: 'Emitir Pedidos de Compra' },
      { key: 'compras.pedidos.receber', label: 'Registrar Recebimento de Mercadorias' },
      { key: 'compras.fornecedores.ver', label: 'Visualizar Fornecedores' },
      { key: 'compras.fornecedores.gerenciar', label: 'Cadastrar / Editar Fornecedores' },
      { key: 'compras.produtos.ver', label: 'Visualizar Catálogo de Produtos' },
      { key: 'compras.produtos.gerenciar', label: 'Cadastrar / Editar Produtos' }
    ]
  },
  {
    module: 'Estoque & Produção 3D',
    permissions: [
      { key: 'estoque.materiaprima.ver', label: 'Visualizar Matéria-Prima (Filamentos/Resinas)' },
      { key: 'estoque.materiaprima.gerenciar', label: 'Cadastrar / Editar Matéria-Prima' },
      { key: 'estoque.materiaprima.importar', label: 'Importar Planilhas CSV/Excel' },
      { key: 'estoque.modelos.ver', label: 'Visualizar Modelos em Estoque' },
      { key: 'estoque.modelos.gerenciar', label: 'Cadastrar / Ajustar Peças Prontas' },
      { key: 'producao.fichas.ver', label: 'Visualizar Fichas Técnicas' },
      { key: 'producao.fichas.gerenciar', label: 'Cadastrar / Editar Fichas Técnicas' },
      { key: 'producao.op.ver', label: 'Visualizar Ordens de Produção' },
      { key: 'producao.op.gerenciar', label: 'Criar / Concluir OPs (Baixa Automática)' },
      { key: 'vendas.faturamento.ver', label: 'Visualizar Vendas' },
      { key: 'vendas.faturamento.criar', label: 'Registrar Venda (Baixa de Estoque)' }
    ]
  },
  {
    module: 'Configurações & Governança',
    permissions: [
      { key: 'config.usuarios.ver', label: 'Visualizar Usuários' },
      { key: 'config.usuarios.gerenciar', label: 'Gerenciar Usuários & Overrides' },
      { key: 'config.funcoes.ver', label: 'Visualizar Funções & Matriz' },
      { key: 'config.funcoes.gerenciar', label: 'Editar Matriz & Limites de R$' },
      { key: 'config.empresa.ver', label: 'Visualizar Dados JP3D' },
      { key: 'config.empresa.editar', label: 'Editar Dados, Logo e Prefixos' },
      { key: 'config.auditoria.ver', label: 'Visualizar Log de Auditoria' }
    ]
  }
];

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  selectedPermissions,
  onChange,
  disabled = false
}) => {
  const handleToggle = (key: PermissionKey) => {
    if (disabled) return;
    const exists = selectedPermissions.includes(key);
    let next: PermissionKey[];

    if (exists) {
      next = selectedPermissions.filter(k => k !== key);
    } else {
      next = [...selectedPermissions, key];
      // Dependência automática: ativar 'ver' quando selecionar ações
      if (key.includes('criar') || key.includes('editar') || key.includes('aprovar') || key.includes('gerenciar')) {
        const base = key.split('.').slice(0, 2).join('.');
        const verKey = `${base}.ver` as PermissionKey;
        if (!next.includes(verKey)) {
          next.push(verKey);
        }
      }
    }
    onChange(next);
  };

  const handleModuleToggle = (moduleName: string, state: boolean) => {
    if (disabled) return;
    const mod = MODULES_CATALOG.find(m => m.module === moduleName);
    if (!mod) return;

    const modKeys = mod.permissions.map(p => p.key as PermissionKey);
    let next = selectedPermissions.filter(k => !modKeys.includes(k));
    if (state) {
      next = [...next, ...modKeys];
    }
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {MODULES_CATALOG.map(mod => {
        const modKeys = mod.permissions.map(p => p.key as PermissionKey);
        const allChecked = modKeys.every(k => selectedPermissions.includes(k));

        return (
          <div key={mod.module} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
              <span className="font-bold text-xs text-teal-600 dark:text-teal-400">{mod.module}</span>
              {!disabled && (
                <div className="flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleModuleToggle(mod.module, true)}
                    className="text-teal-600 hover:underline"
                  >
                    Marcar Todos
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => handleModuleToggle(mod.module, false)}
                    className="text-slate-400 hover:underline"
                  >
                    Desmarcar
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
              {mod.permissions.map(p => {
                const checked = selectedPermissions.includes(p.key as PermissionKey);
                return (
                  <label
                    key={p.key}
                    className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                      disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => handleToggle(p.key as PermissionKey)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="truncate text-slate-700 dark:text-slate-200">{p.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
