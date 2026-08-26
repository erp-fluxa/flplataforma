// shared/units.ts — Módulo Puro de Conversão e Formatação de Unidades e Valores
// Regras invioláveis: Quantidades em milésimos inteiros (integer), Dinheiro em centavos inteiros (integer).
// Sem aritmética de ponto flutuante em regras de negócio.

/**
 * Converte valor numérico ou string em centavos inteiros (ex: "1.250,50" ou 1250.5 -> 125050)
 */
export function brlToCents(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.round(val * 100);
  const clean = val.toString().replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converte centavos inteiros para float em reais (apenas para exibição se necessário)
 */
export function centsToFloat(cents: number | null | undefined): number {
  if (!cents || isNaN(cents)) return 0;
  return cents / 100;
}

/**
 * Formata centavos inteiros em moeda BRL (ex: 125050 -> "R$ 1.250,50")
 */
export function centsToBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || isNaN(cents)) return 'R$ 0,00';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Converte quantidade decimal para milésimos inteiros (ex: 1.250 kg -> 1250; 2 un -> 2000)
 */
export function qtyToMilli(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.round(val * 1000);
  const clean = val.toString().replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return Math.round(num * 1000);
}

/**
 * Converte milésimos inteiros para número decimal (ex: 1250 -> 1.25)
 */
export function milliToQty(milli: number | null | undefined): number {
  if (!milli || isNaN(milli)) return 0;
  return milli / 1000;
}

/**
 * Formata milésimos inteiros em string pt-BR com precisão inteligente (ex: 1250 -> "1,25", 2000 -> "2", 1005 -> "1,005")
 */
export function formatMilliQty(milli: number | null | undefined, unit: string = ''): string {
  if (milli === null || milli === undefined || isNaN(milli)) return unit ? `0 ${unit}` : '0';
  const val = milli / 1000;
  let formatted: string;
  if (Number.isInteger(val)) {
    formatted = val.toLocaleString('pt-BR');
  } else {
    formatted = val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Parsing seguro de campos de entrada de quantidade
 */
export function parseMilliInput(val: string | number | null | undefined): number {
  return qtyToMilli(val);
}

/**
 * Parsing seguro de campos de entrada de dinheiro
 */
export function parseCentsInput(val: string | number | null | undefined): number {
  return brlToCents(val);
}
