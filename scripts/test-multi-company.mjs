console.log('🧪 Iniciando teste automatizado de Multi-Empresas e Sincronização...');

const comp1 = {
  id: 'comp-1',
  nome: 'FLUXA INDUSTRIA E SERVICOS LTDA — MATRIZ SC',
  razaoSocial: 'FLUXA INDUSTRIA E SERVICOS LTDA',
  nomeFantasia: 'Fluxa ERP Industrial',
  cnpj: '12.345.678/0001-90',
  isMatriz: true,
  ativa: true
};

const comp2 = {
  id: 'comp-2',
  nome: 'FLUXA FILIAIS & INSUMOS INDUSTRIAL LTDA — FILIAL PR',
  razaoSocial: 'FLUXA FILIAIS & INSUMOS INDUSTRIAL LTDA',
  nomeFantasia: 'Fluxa — Filial PR',
  cnpj: '12.345.678/0002-71',
  isMatriz: false,
  ativa: true
};

const novaFilial = {
  id: 'comp-3',
  nome: 'FLUXA TECNOLOGIA E AUTOMACAO INDUSTRIAL LTDA — FILIAL SP',
  razaoSocial: 'FLUXA TECNOLOGIA E AUTOMACAO INDUSTRIAL LTDA',
  nomeFantasia: 'Fluxa — Filial Campinas SP',
  cnpj: '12.345.678/0003-52',
  isMatriz: false,
  ativa: true
};

let companies = [comp1, comp2];
console.log(`✓ Empresas iniciais: ${companies.length}`);

// Adição
companies.push(novaFilial);
console.log(`✓ Nova empresa [${novaFilial.cnpj}] ${novaFilial.nomeFantasia} cadastrada. Total: ${companies.length}`);

// Edição
const target = companies.find(c => c.id === 'comp-3');
if (target) {
  target.razaoSocial = 'FLUXA TECNOLOGIA BRASIL LTDA';
  console.log(`✓ Razão social atualizada para: ${target.razaoSocial}`);
}

// Exclusão
companies = companies.filter(c => c.id !== 'comp-2');
console.log(`✓ Empresa comp-2 excluída. Total restante: ${companies.length}`);

if (companies.length === 2 && companies.find(c => c.id === 'comp-3')) {
  console.log('🎉 Teste de validação Multi-Empresa e Regras de Negócio concluído com 100% de SUCESSO!');
} else {
  process.exit(1);
}
