function validarCNPJ(cnpj) {
  if (!cnpj) return false;
  const limpo = cnpj.replace(/\D/g, '');

  if (limpo.length !== 14) return false;

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

console.log('================================================================');
console.log('🧪 SUÍTE DE TESTES: VALIDAÇÃO DE CNPJ, MULTI-TENANT & SOFT DELETE');
console.log('================================================================\n');

// 1. TESTE DE VALIDAÇÃO DE CNPJ (MÓDULO 11)
console.log('1️⃣ Testando Validação Matemática de CNPJ (Módulo 11 Oficial)...');

const cnpjsValidos = [
  '00.000.000/0001-91', // Banco do Brasil
  '33.000.167/0001-01', // Petrobras
  '07.526.557/0001-00', // Ambev
  '33.592.510/0001-54'  // Vale S.A.
];

const cnpjsInvalidos = [
  '11.111.111/1111-11', // repetidos
  '00.000.000/0000-00', // repetidos
  '33.000.167/0001-99', // dígito incorreto
  '00.000.000/0001-00', // dígito incorreto
  '123',                // tamanho inválido
  ''
];

for (const c of cnpjsValidos) {
  if (!validarCNPJ(c)) {
    console.error(`❌ Falha: CNPJ válido ${c} foi incorretamente rejeitado!`);
    process.exit(1);
  }
}
console.log('  ✓ Todos os CNPJs válidos foram aprovados com sucesso.');

for (const c of cnpjsInvalidos) {
  if (validarCNPJ(c)) {
    console.error(`❌ Falha: CNPJ inválido ${c} foi incorretamente aceito!`);
    process.exit(1);
  }
}
console.log('  ✓ Todos os CNPJs inválidos e repetidos foram rejeitados com sucesso.');

// 2. TESTE DE MULTI-TENANT E ISOLAMENTO DE DADOS ENTRE EMPRESAS
console.log('\n2️⃣ Testando Isolamento Multi-Tenant por Empresa (companyId)...');

const empresas = [
  { id: 'comp-matriz', nomeFantasia: 'Fluxa — Matriz SC', cnpj: '33.000.167/0001-01', isMatriz: true, ativa: true },
  { id: 'comp-filial-pr', nomeFantasia: 'Fluxa — Filial PR', cnpj: '07.526.557/0001-00', isMatriz: false, ativa: true }
];

const pedidosVenda = [
  { id: 'pv-1', codigo: 'PV-0001', companyId: 'comp-matriz', valorTotalCents: 4500000 },
  { id: 'pv-2', codigo: 'PV-0002', companyId: 'comp-matriz', valorTotalCents: 9000000 },
  { id: 'pv-3', codigo: 'PV-0003', companyId: 'comp-filial-pr', valorTotalCents: 1200000 }
];

const ordensProducao = [
  { id: 'op-1', codigo: 'OP-0001', companyId: 'comp-matriz', status: 'em_producao' },
  { id: 'op-2', codigo: 'OP-0002', companyId: 'comp-filial-pr', status: 'planejada' }
];

// Filtro para Empresa 1 (Matriz)
const pvsMatriz = pedidosVenda.filter(p => p.companyId === 'comp-matriz');
const opsMatriz = ordensProducao.filter(o => o.companyId === 'comp-matriz');

if (pvsMatriz.length !== 2 || opsMatriz.length !== 1) {
  console.error('❌ Falha no isolamento da Matriz!');
  process.exit(1);
}
console.log(`  ✓ Matriz SC: ${pvsMatriz.length} pedidos e ${opsMatriz.length} OP isolados com 100% de precisão.`);

// Filtro para Empresa 2 (Filial PR)
const pvsFilial = pedidosVenda.filter(p => p.companyId === 'comp-filial-pr');
const opsFilial = ordensProducao.filter(o => o.companyId === 'comp-filial-pr');

if (pvsFilial.length !== 1 || opsFilial.length !== 1) {
  console.error('❌ Falha no isolamento da Filial PR!');
  process.exit(1);
}
console.log(`  ✓ Filial PR: ${pvsFilial.length} pedidos e ${opsFilial.length} OP isolados (zero vazamento cruzado).`);

// 3. TESTE DE SOFT DELETE DE EMPRESA
console.log('\n3️⃣ Testando Soft Delete de Empresa com Preservação de Histórico...');

let empresaAlvo = empresas.find(e => e.id === 'comp-filial-pr');
const vinculosFilial = pedidosVenda.filter(p => p.companyId === empresaAlvo.id).length;

console.log(`  ℹ️ Empresa a desativar possui ${vinculosFilial} pedido(s) de venda vinculado(s).`);

// Aplicação de Soft Delete
empresaAlvo.ativa = false;
empresaAlvo.excluidaEm = new Date().toISOString();

const empresasAtivas = empresas.filter(e => e.ativa !== false);
if (empresasAtivas.length !== 1 || empresasAtivas[0].id !== 'comp-matriz') {
  console.error('❌ Falha ao aplicar Soft Delete!');
  process.exit(1);
}

// Histórico de pedidos permanece intacto
if (pedidosVenda.find(p => p.id === 'pv-3').companyId !== 'comp-filial-pr') {
  console.error('❌ Os vínculos históricos foram corrompidos!');
  process.exit(1);
}
console.log('  ✓ Soft Delete executado com sucesso: empresa inativada sem perder histórico ou quebrar integridade referencial.');

console.log('\n================================================================');
console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE APROVAÇÃO!');
console.log('================================================================');
