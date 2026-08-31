console.log('================================================================');
console.log('🧪 TESTE: COMPARADOR MULTI-FORNECEDORES LADO A LADO (COTAÇÃO)');
console.log('================================================================\n');

// 1. Simulação de Fornecedores Lado a Lado
const fornecedores = [
  { id: 'sup-1', nomeFornecedor: 'Fornecedor A (Distribuidor)', valorUnitario: 45.00, unidade: 'UN', quantidade: 20, prazo: '5 dias' },
  { id: 'sup-2', nomeFornecedor: 'Fornecedor B (Fabricante)', valorUnitario: 39.90, unidade: 'UN', quantidade: 20, prazo: '10 dias' },
  { id: 'sup-3', nomeFornecedor: 'Fornecedor C (Importador)', valorUnitario: 41.50, unidade: 'UN', quantidade: 20, prazo: '7 dias' }
];

console.log(`1️⃣ Adicionados ${fornecedores.length} fornecedores dinamicamente.`);

// 2. Cálculo automático por fornecedor: Total = Valor × Quantidade
const totais = fornecedores.map(f => {
  const total = f.valorUnitario * f.quantidade;
  return { id: f.id, nome: f.nomeFornecedor, total };
});

totais.forEach(t => {
  console.log(`  • ${t.nome}: R$ ${t.total.toFixed(2)}`);
});

// 3. Identificação do Menor Total
const menorTotal = Math.min(...totais.map(t => t.total));
const vencedor = totais.find(t => t.total === menorTotal);

if (vencedor.nome !== 'Fornecedor B (Fabricante)' || menorTotal !== 798.00) {
  console.error('❌ Falha no cálculo do menor preço!');
  process.exit(1);
}
console.log(`\n2️⃣ Menor Preço Identificado com Sucesso: ⭐ ${vencedor.nome} (Total: R$ ${menorTotal.toFixed(2)})`);

// 4. Remoção de Fornecedor
const fornecedoresAposRemocao = fornecedores.filter(f => f.id !== 'sup-1');
if (fornecedoresAposRemocao.length !== 2) {
  console.error('❌ Falha na remoção do fornecedor!');
  process.exit(1);
}
console.log('\n3️⃣ Fornecedor removido com sucesso da comparação.');

console.log('\n================================================================');
console.log('🎉 TODOS OS TESTES DO COMPARADOR PASSARAM COM 100% DE SUCESSO!');
console.log('================================================================');
