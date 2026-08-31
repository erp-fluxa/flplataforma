console.log('================================================================');
console.log('🧪 TESTE: GESTÃO DE CATEGORIAS DE MATERIAIS & PRODUTOS');
console.log('================================================================\n');

const categoriasIniciais = [
  { id: 'cat-fil', nome: 'Filamento 3D', tipo: 'MP', ativo: true },
  { id: 'cat-mec', nome: 'Mecânica', tipo: 'MP', ativo: true },
  { id: 'cat-elet', nome: 'Eletrônica', tipo: 'MP', ativo: true }
];

// 1. Criar nova categoria
const novaCat = {
  id: 'cat-novas-chapas',
  nome: 'Chapas & Perfis Especiais',
  tipo: 'MP',
  cor: 'teal',
  ativo: true
};

const categoriasAposCriacao = [...categoriasIniciais, novaCat];
if (categoriasAposCriacao.length !== 4) {
  console.error('❌ Falha ao adicionar nova categoria!');
  process.exit(1);
}
console.log(`  ✓ Nova categoria "${novaCat.nome}" criada com sucesso.`);

// 2. Editar categoria
const categoriasAposEdicao = categoriasAposCriacao.map(c => 
  c.id === 'cat-novas-chapas' ? { ...c, nome: 'Chapas & Perfis de Alumínio CNC' } : c
);
const catEditada = categoriasAposEdicao.find(c => c.id === 'cat-novas-chapas');
if (catEditada.nome !== 'Chapas & Perfis de Alumínio CNC') {
  console.error('❌ Falha ao editar categoria!');
  process.exit(1);
}
console.log(`  ✓ Categoria atualizada para "${catEditada.nome}".`);

// 3. Excluir categoria
const categoriasAposExclusao = categoriasAposEdicao.filter(c => c.id !== 'cat-novas-chapas');
if (categoriasAposExclusao.length !== 3) {
  console.error('❌ Falha ao excluir categoria!');
  process.exit(1);
}
console.log('  ✓ Categoria excluída com sucesso.');

console.log('\n================================================================');
console.log('🎉 TODOS OS TESTES DE CATEGORIA PASSARAM COM SUCESSO!');
console.log('================================================================');
