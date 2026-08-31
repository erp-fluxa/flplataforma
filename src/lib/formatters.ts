export function fmtMoeda(cents: number = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

export function fmtQtd(milli: number = 0, unit: string = 'UN'): string {
  const val = milli / 1000;
  const numStr = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(val);
  return unit ? `${numStr} ${unit}` : numStr;
}

export function fmtData(isoDate?: string): string {
  if (!isoDate) return '—';
  try {
    const parts = isoDate.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(isoDate).toLocaleDateString('pt-BR');
  } catch {
    return isoDate;
  }
}

export function fmtDataHora(isoDate?: string): string {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate).toLocaleString('pt-BR');
  } catch {
    return isoDate;
  }
}

export function uid(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
}
