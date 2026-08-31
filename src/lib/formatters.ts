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

/**
 * Validação oficial de CNPJ brasileiro com cálculo dos dois dígitos verificadores (Receita Federal / Módulo 11)
 */
export function validarCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;
  const limpo = cnpj.replace(/\D/g, '');

  if (limpo.length !== 14) return false;

  // Rejeita sequências com todos os dígitos iguais (ex: 00.000.000/0000-00, 11.111.111/1111-11)
  if (/^(\d)\1{13}$/.test(limpo)) return false;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let soma1 = 0;
  for (let i = 0; i < 12; i++) {
    soma1 += parseInt(limpo.charAt(i), 10) * pesos1[i];
  }
  const resto1 = soma1 % 11;
  const dv1 = resto1 < 2 ? 0 : 11 - resto1;

  if (parseInt(limpo.charAt(12), 10) !== dv1) return false;

  let soma2 = 0;
  for (let i = 0; i < 13; i++) {
    soma2 += parseInt(limpo.charAt(i), 10) * pesos2[i];
  }
  const resto2 = soma2 % 11;
  const dv2 = resto2 < 2 ? 0 : 11 - resto2;

  return parseInt(limpo.charAt(13), 10) === dv2;
}

/**
 * Aplica máscara de CNPJ (00.000.000/0000-00)
 */
export function mascaraCNPJ(cnpj: string): string {
  const limpo = cnpj.replace(/\D/g, '').substring(0, 14);
  return limpo
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
