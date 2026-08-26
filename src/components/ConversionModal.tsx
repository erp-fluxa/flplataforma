import React, { useState } from 'react';
import { Quotation, QuotationItem } from '../types';

interface ConversionModalProps {
  quotation: Quotation;
  suppliers: { id: string; nome: string; cnpj?: string }[];
  onConfirm: (payload: { supplierId: string; condicao: string; prazo: string; items: QuotationItem[] }[]) => void;
  onClose: () => void;
}

export const ConversionModal: React.FC<ConversionModalProps> = ({
  quotation,
  suppliers,
  onConfirm,
  onClose
}) => {
  // Agrupamento por fornecedor vencedor
  const initialGroups = React.useMemo(() => {
    const groups: { [supplierId: string]: QuotationItem[] } = {};
    quotation.itens.forEach(item => {
      const sId = item.vencedorSupplierId || quotation.fornecedorId || suppliers[0]?.id || 'sup-1';
      if (!groups[sId]) groups[sId] = [];
      groups[sId].push({ ...item });
    });
    return groups;
  }, [quotation, suppliers]);

  const [conditions, setConditions] = useState<{ [supplierId: string]: { cond: string; prazo: string } }>({
    ...Object.keys(initialGroups).reduce((acc, sId) => ({
      ...acc,
      [sId]: { cond: '28 dias', prazo: quotation.prazo }
    }), {})
  });

  const supplierIds = Object.keys(initialGroups);
  const isSplit = supplierIds.length > 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = supplierIds.map(sId => ({
      supplierId: sId,
      condicao: conditions[sId]?.cond || '28 dias',
      prazo: conditions[sId]?.prazo || quotation.prazo,
      items: initialGroups[sId]
    }));
    onConfirm(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Emissão de Pedidos de Compra — {quotation.numero}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isSplit
                ? `🔀 Split Award: ${supplierIds.length} fornecedores vencedores detectados. Será gerado 1 pedido timbrado para cada fornecedor.`
                : 'Revise os itens e condições antes de emitir o Pedido de Compra timbrado da JP3D.'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {supplierIds.map((sId, idx) => {
            const sup = suppliers.find(s => s.id === sId) || { nome: 'Fornecedor Vencedor' };
            const items = initialGroups[sId];
            const subtotal = items.reduce((acc, it) => acc + it.quantidade * (it.valorUnit || 0), 0);

            return (
              <div key={sId} className="rounded-xl border border-teal-500/40 bg-teal-50/20 dark:bg-teal-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-teal-600 text-white font-bold text-xs px-2 py-0.5">
                      Pedido #{idx + 1}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{sup.nome}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 text-sm">
                    Subtotal: {(subtotal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <table className="w-full text-xs">
                  <thead className="text-slate-500 bg-slate-100 dark:bg-slate-800/60">
                    <tr>
                      <th className="p-2 text-left">Item / Insumo</th>
                      <th className="p-2 text-center w-20">Un.</th>
                      <th className="p-2 text-right w-24">Qtd.</th>
                      <th className="p-2 text-right w-28">Preço Unit.</th>
                      <th className="p-2 text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {items.map((it, iIdx) => (
                      <tr key={iIdx}>
                        <td className="p-2 font-medium">{it.descricao}</td>
                        <td className="p-2 text-center font-mono">{it.unidade}</td>
                        <td className="p-2 text-right font-mono">{it.quantidade}</td>
                        <td className="p-2 text-right font-mono">
                          {((it.valorUnit || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="p-2 text-right font-mono font-bold">
                          {((it.quantidade * (it.valorUnit || 0)) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="grid gap-3 sm:grid-cols-2 pt-2 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Condição de Pagamento</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-teal-500"
                      value={conditions[sId]?.cond || '28 dias'}
                      onChange={e => setConditions({ ...conditions, [sId]: { ...conditions[sId], cond: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Prazo de Entrega</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-teal-500"
                      value={conditions[sId]?.prazo || quotation.prazo}
                      onChange={e => setConditions({ ...conditions, [sId]: { ...conditions[sId], prazo: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold shadow-lg transition-colors"
            >
              Confirmar & Emitir {supplierIds.length} Pedido(s) JP3D
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
