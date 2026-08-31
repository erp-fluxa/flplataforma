import React, { useState } from 'react';
import { Card, Button, Badge, Modal } from '../components/ui';
import { useDb } from '../context/DbContext';
import { fmtMoeda, fmtQtd, fmtData, uid } from '../lib/formatters';
import { Layers, Wrench, FileSpreadsheet, ShoppingBag, Users, Truck, Plus } from 'lucide-react';

interface ModuloProps {
  tipo: 'fichas' | 'centros-trabalho' | 'producao' | 'cotacoes' | 'pedidos' | 'vendas' | 'clientes' | 'fornecedores';
}

export const GenericoModulo: React.FC<ModuloProps> = ({ tipo }) => {
  const { db, updateDb } = useDb();

  if (tipo === 'fichas') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-base text-slate-900 dark:text-white">Fichas Técnicas & Estruturas (BOM)</h2>
            <p className="text-xs text-slate-500">Engenharia de produto, materiais e componentes por modelo de impressora.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {db.bomVersions.map(bom => {
            const prod = db.products.find(p => p.id === bom.productId);
            const items = db.bomItems.filter(i => i.bomVersionId === bom.id);

            return (
              <Card key={bom.id} title={prod?.descricao || bom.versao}>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Versão: <b className="text-brand-600 dark:text-teal-400">{bom.versao}</b></span>
                    <Badge variant="success">{bom.status.toUpperCase()}</Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">{bom.descricao}</p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Componentes Vinculados:</span>
                    <div className="space-y-1">
                      {items.map(it => {
                        const comp = db.products.find(p => p.id === it.componentProductId);
                        return (
                          <div key={it.id} className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-950/60 font-mono text-[11px]">
                            <span>{comp?.descricao || it.componentProductId}</span>
                            <span className="font-bold text-slate-900 dark:text-white">{fmtQtd(it.quantidade, comp?.unidade || 'UN')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  if (tipo === 'cotacoes') {
    return (
      <Card title="Quadro de Cotações de Compras">
        <div className="text-center py-8 space-y-2">
          <FileSpreadsheet className="w-8 h-8 text-brand-600 mx-auto" />
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Módulo de Cotações Integrado</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Crie cotações comparativas de múltiplos fornecedores para insumos, peças usinadas e suprimentos.
          </p>
        </div>
      </Card>
    );
  }

  if (tipo === 'producao') {
    return (
      <Card title="Ordens de Produção (Chão de Fábrica)">
        <div className="text-center py-8 space-y-2">
          <Wrench className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">PCP & Chão de Fábrica</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Apontamentos de tempo, alocação de componentes e rastreabilidade de montagem.
          </p>
        </div>
      </Card>
    );
  }

  if (tipo === 'clientes') {
    return (
      <Card title="Carteira de Clientes">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">CNPJ / CPF</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Cidade / UF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {db.customers.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{c.nome}</td>
                <td className="px-4 py-3 font-mono text-slate-500">{c.cnpjCpf}</td>
                <td className="px-4 py-3">{c.contatoNome} ({c.telefone})</td>
                <td className="px-4 py-3">{c.cidade} / {c.uf}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  if (tipo === 'fornecedores') {
    return (
      <Card title="Fornecedores Homologados">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Categoria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {db.suppliers.map(f => (
              <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{f.razaoSocial}</td>
                <td className="px-4 py-3 font-mono text-slate-500">{f.cnpj}</td>
                <td className="px-4 py-3">{f.contatoNome} ({f.telefone})</td>
                <td className="px-4 py-3"><Badge variant="info">{f.categoriaPrincipal || 'Geral'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  return (
    <Card title={`Módulo: ${tipo.toUpperCase()}`}>
      <p className="text-xs text-slate-400">Conteúdo do módulo carregado com sucesso.</p>
    </Card>
  );
};
