import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Info, X, ShieldAlert } from 'lucide-react';
import { Button } from './index';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  itemName: string;
  itemType?: string;
  isSoftDelete?: boolean;
  warningMessage?: string;
  dependencies?: string[];
  isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar Exclusão',
  itemName,
  itemType = 'Registro',
  isSoftDelete = true,
  warningMessage,
  dependencies = [],
  isLoading = false
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Foco padrão no botão Cancelar para evitar exclusão acidental por tecla Enter
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-rose-500/5">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="confirm-delete-title" className="font-black text-sm text-slate-900 dark:text-white">
                {title}
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">Ação de exclusão no sistema</span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed">
              Você está prestes a excluir o {itemType.toLowerCase()}:
            </p>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-sm break-words">
              {itemName}
            </div>
          </div>

          {/* Aviso sobre Tipo de Exclusão */}
          {isSoftDelete ? (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-start gap-2.5 text-[11.5px]">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <b className="text-blue-200">Exclusão Segura (Soft Delete):</b>
                <p className="text-blue-300/90 mt-0.5">
                  Este item será movido para a <b>Lixeira / Itens Excluídos Recentemente</b>. Você poderá restaurá-lo a qualquer momento durante o período de retenção ou pelo botão <b>Desfazer</b>.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5 text-[11.5px]">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <b className="text-rose-200">Atenção: Exclusão Permanente:</b>
                <p className="text-rose-300/90 mt-0.5">
                  Esta ação não pode ser desfeita automaticamente. Os dados e vínculos serão removidos permanentemente.
                </p>
              </div>
            </div>
          )}

          {/* Alertas de Vínculos / Dependências */}
          {dependencies && dependencies.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5 text-[11.5px]">
              <div className="flex items-center gap-1.5 font-bold text-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Vínculos e Dependências Detectadas:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-300/90 pl-1">
                {dependencies.map((dep, idx) => (
                  <li key={idx}>{dep}</li>
                ))}
              </ul>
            </div>
          )}

          {warningMessage && (
            <p className="text-[11px] text-slate-400 italic">
              Nota: {warningMessage}
            </p>
          )}
        </div>

        {/* Rodapé / Botões */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <Button
            ref={cancelBtnRef}
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="border-slate-300 dark:border-slate-700 font-bold"
          >
            Cancelar
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            loading={isLoading}
            className="bg-rose-600 hover:bg-rose-500 font-bold shadow-xs"
          >
            Confirmar Exclusão
          </Button>
        </div>
      </div>
    </div>
  );
};
