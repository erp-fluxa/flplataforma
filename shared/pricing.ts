// shared/pricing.ts — Motor Puro de Precificação e Equalização Comercial JP3D

export interface Installment {
  numero: number;
  valorCentavos: number;
  valorFormatado: string;
}

export interface InstallmentCalculation {
  totalCentavos: number;
  numeroParcelas: number;
  taxaJurosMensalPercentual: number;
  acrescimoCentavos: number;
  acrescimoPercentual: number;
  parcelas: Installment[];
  valorParcelaBaseCentavos: number;
  valorUltimaParcelaCentavos: number;
  somaExataCentavos: number;
}

export interface SupplierProposal {
  supplierId: string;
  supplierName: string;
  // Preço à vista em centavos (null / undefined se não cotou)
  precoAVistaCentavos?: number | null;
  // Preço total parcelado em centavos (null se não houver opção parcelada)
  precoParceladoTotalCentavos?: number | null;
  numeroParcelas?: number;
  prazoEntregaDias?: number;
  observacoes?: string;
}

export interface ComparisonItemResult {
  itemId: string;
  descricao: string;
  quantidade: number;
  propostas: {
    supplierId: string;
    supplierName: string;
    naoCotou: boolean;
    precoAVistaUnitCentavos: number | null;
    precoAVistaTotalCentavos: number | null;
    precoParceladoUnitCentavos: number | null;
    precoParceladoTotalCentavos: number | null;
    numeroParcelas: number;
    valorParcelaCentavos: number | null;
    acrescimoPercentual: number;
    parcelamento?: InstallmentCalculation | null;
  }[];
  vencedorAVistaSupplierId: string | null;
  vencedorParceladoSupplierId: string | null;
  divergenciaCenarios: boolean;
  diferencaCenariosCentavos: number;
  detalheDivergencia?: string;
}

/**
 * Formata valor em centavos para moeda brasileira (BRL)
 */
export function formatMoneyCents(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined || isNaN(centavos)) {
    return '—';
  }
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Converte string ou número em centavos inteiros (ex: "1.000,03" -> 100003)
 */
export function parseToCents(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Math.round(val);
  const clean = val.toString().replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(clean);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

/**
 * Calcula parcelamento com distribuição exata de centavos.
 * A sobra da divisão vai OBRIGATORIAMENTE na última parcela para que
 * a soma das parcelas seja rigorosamente igual ao total.
 * 
 * Exemplo de Teste de Qualidade:
 * R$ 1.000,03 (100003 centavos) em 3x:
 * - base: Math.floor(100003 / 3) = 33334 (R$ 333,34)
 * - parcela 1: 33334
 * - parcela 2: 33334
 * - parcela 3: 100003 - (33334 * 2) = 33335 (R$ 333,35)
 * - soma: 33334 + 33334 + 33335 = 100003 (R$ 1.000,03 exatos)
 */
export function calcularParcelamentoExato(
  totalCentavos: number,
  numeroParcelas: number,
  valorAVistaCentavos?: number | null
): InstallmentCalculation {
  if (numeroParcelas <= 0) numeroParcelas = 1;
  const total = Math.max(0, Math.round(totalCentavos));

  const baseParcela = Math.floor(total / numeroParcelas);
  const parcelas: Installment[] = [];
  let somaParcial = 0;

  for (let i = 1; i < numeroParcelas; i++) {
    parcelas.push({
      numero: i,
      valorCentavos: baseParcela,
      valorFormatado: formatMoneyCents(baseParcela)
    });
    somaParcial += baseParcela;
  }

  // A última parcela recebe a sobra do arredondamento
  const ultimaParcela = total - somaParcial;
  parcelas.push({
    numero: numeroParcelas,
    valorCentavos: ultimaParcela,
    valorFormatado: formatMoneyCents(ultimaParcela)
  });

  const somaExata = somaParcial + ultimaParcela;

  // Cálculo de acréscimo em relação ao valor à vista (sempre derivado)
  let acrescimoCentavos = 0;
  let acrescimoPercentual = 0;

  if (valorAVistaCentavos && valorAVistaCentavos > 0) {
    acrescimoCentavos = Math.max(0, total - valorAVistaCentavos);
    acrescimoPercentual = ((total - valorAVistaCentavos) / valorAVistaCentavos) * 100;
  }

  return {
    totalCentavos: total,
    numeroParcelas,
    taxaJurosMensalPercentual: 0,
    acrescimoCentavos,
    acrescimoPercentual: Number(acrescimoPercentual.toFixed(2)),
    parcelas,
    valorParcelaBaseCentavos: baseParcela,
    valorUltimaParcelaCentavos: ultimaParcela,
    somaExataCentavos: somaExata
  };
}

/**
 * Calcula o acréscimo percentual puro derivado
 */
export function calcularAcrescimoPercentual(
  valorAVistaCentavos: number | null | undefined,
  valorParceladoCentavos: number | null | undefined
): number {
  if (!valorAVistaCentavos || valorAVistaCentavos <= 0 || !valorParceladoCentavos || valorParceladoCentavos <= valorAVistaCentavos) {
    return 0;
  }
  return Number((((valorParceladoCentavos - valorAVistaCentavos) / valorAVistaCentavos) * 100).toFixed(2));
}

/**
 * Validador de consistência matemática de parcelas
 */
export function validarBalancoCentavos(totalCentavos: number, parcelas: { valorCentavos: number }[]): boolean {
  const soma = parcelas.reduce((acc, p) => acc + p.valorCentavos, 0);
  return soma === totalCentavos;
}

/**
 * Motor de Equalização de Nota Rápida / Cotações
 * - Trata vazio / null / undefined como "Não cotou" (nunca vence e não é R$ 0,00).
 * - Identifica vencedor à vista e vencedor parcelado.
 * - Detecta divergência de cenários (ex: Fornecedor A ganha à vista, Fornecedor B ganha a prazo)
 *   e gera explicação com custo da diferença em R$.
 */
export function equalizarItemPropostas(
  itemId: string,
  descricao: string,
  quantidade: number,
  propostasBrutas: SupplierProposal[]
): ComparisonItemResult {
  const propostasProcessadas = propostasBrutas.map(p => {
    const naoCotou = p.precoAVistaCentavos === null || p.precoAVistaCentavos === undefined || p.precoAVistaCentavos <= 0;
    const precoAVistaUnit = naoCotou ? null : p.precoAVistaCentavos!;
    const precoAVistaTotal = naoCotou ? null : precoAVistaUnit! * quantidade;

    const numParcelas = (p.numeroParcelas && p.numeroParcelas > 0) ? p.numeroParcelas : 1;
    
    // Se não informou parcelado explícito, assume o à vista em 1x
    let precoParceladoTotal: number | null = null;
    let precoParceladoUnit: number | null = null;
    let parcelamento: InstallmentCalculation | null = null;

    if (!naoCotou) {
      if (p.precoParceladoTotalCentavos && p.precoParceladoTotalCentavos > 0) {
        precoParceladoUnit = p.precoParceladoTotalCentavos;
        precoParceladoTotal = precoParceladoUnit * quantidade;
      } else {
        precoParceladoUnit = precoAVistaUnit;
        precoParceladoTotal = precoAVistaTotal;
      }

      parcelamento = calcularParcelamentoExato(precoParceladoTotal!, numParcelas, precoAVistaTotal);
    }

    const acrescimoPercentual = calcularAcrescimoPercentual(precoAVistaTotal, precoParceladoTotal);

    return {
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      naoCotou,
      precoAVistaUnitCentavos: precoAVistaUnit,
      precoAVistaTotalCentavos: precoAVistaTotal,
      precoParceladoUnitCentavos: precoParceladoUnit,
      precoParceladoTotalCentavos: precoParceladoTotal,
      numeroParcelas: numParcelas,
      valorParcelaCentavos: parcelamento ? parcelamento.valorParcelaBaseCentavos : null,
      acrescimoPercentual,
      parcelamento
    };
  });

  // Vencedor À Vista: Menor precoAVistaTotalCentavos (apenas propostas válidas)
  const cotacoesValidasAVista = propostasProcessadas.filter(p => !p.naoCotou && p.precoAVistaTotalCentavos !== null);
  cotacoesValidasAVista.sort((a, b) => (a.precoAVistaTotalCentavos || Infinity) - (b.precoAVistaTotalCentavos || Infinity));
  const vencedorAVista = cotacoesValidasAVista.length > 0 ? cotacoesValidasAVista[0] : null;

  // Vencedor Parcelado: Menor precoParceladoTotalCentavos (apenas propostas válidas)
  const cotacoesValidasParcelado = propostasProcessadas.filter(p => !p.naoCotou && p.precoParceladoTotalCentavos !== null);
  cotacoesValidasParcelado.sort((a, b) => (a.precoParceladoTotalCentavos || Infinity) - (b.precoParceladoTotalCentavos || Infinity));
  const vencedorParcelado = cotacoesValidasParcelado.length > 0 ? cotacoesValidasParcelado[0] : null;

  let divergenciaCenarios = false;
  let diferencaCenariosCentavos = 0;
  let detalheDivergencia = '';

  if (vencedorAVista && vencedorParcelado && vencedorAVista.supplierId !== vencedorParcelado.supplierId) {
    divergenciaCenarios = true;
    // Custo de oportunidade entre escolher A ou B
    const aVistaNoVencedorParcelado = vencedorParcelado.precoAVistaTotalCentavos || 0;
    const aVistaNoVencedorAVista = vencedorAVista.precoAVistaTotalCentavos || 0;
    const diffAVista = aVistaNoVencedorParcelado - aVistaNoVencedorAVista;

    const parceladoNoVencedorAVista = vencedorAVista.precoParceladoTotalCentavos || 0;
    const parceladoNoVencedorParcelado = vencedorParcelado.precoParceladoTotalCentavos || 0;
    const diffParcelado = parceladoNoVencedorAVista - parceladoNoVencedorParcelado;

    diferencaCenariosCentavos = Math.max(diffAVista, diffParcelado);

    detalheDivergencia = `Cenários divergentes: ${vencedorAVista.supplierName} é mais barato à vista (economia de ${formatMoneyCents(diffAVista)}), mas ${vencedorParcelado.supplierName} oferece condição a prazo superior (economia a prazo de ${formatMoneyCents(diffParcelado)} em ${vencedorParcelado.numeroParcelas}x).`;
  }

  return {
    itemId,
    descricao,
    quantidade,
    propostas: propostasProcessadas,
    vencedorAVistaSupplierId: vencedorAVista ? vencedorAVista.supplierId : null,
    vencedorParceladoSupplierId: vencedorParcelado ? vencedorParcelado.supplierId : null,
    divergenciaCenarios,
    diferencaCenariosCentavos,
    detalheDivergencia
  };
}
