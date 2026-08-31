import React, { useEffect, useState } from 'react';
import { RotateCcw, X, Trash2, CheckCircle2 } from 'lucide-react';
import { DeletedItemRecord } from '../../types';

export interface UndoToastProps {
  deletedItem: DeletedItemRecord | null;
  durationMs?: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  deletedItem,
  durationMs = 10000,
  onUndo,
  onDismiss
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!deletedItem) return;

    setProgress(100);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remainingPct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [deletedItem, durationMs, onDismiss]);

  if (!deletedItem) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 p-3.5 overflow-hidden relative">
        {/* Barra de Progresso do Tempo Restante */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-teal-400 to-brand-500 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-100 truncate">
                {deletedItem.entityName}
              </p>
              <p className="text-[10.5px] text-slate-400">
                Item excluído com sucesso
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onUndo}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Desfazer</span>
            </button>

            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Dispensar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
