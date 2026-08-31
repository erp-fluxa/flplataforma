import React, { useState, useMemo } from 'react';
import { 
  Zap, Search, Package, Plus, Building2, Check, AlertCircle, 
  Calendar, Layers, CheckCircle2, Clock, ArrowRight, ShieldCheck
} from 'lucide-react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge, Modal } from '../components/ui';
import { fmtMoeda, fmtQtd, uid } from '../lib/formatters';
import { Product, Supplier, Quotation, QuotationItem, QuotationSupplierPrice } from '../types';

export const CompraRapida: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const { db, updateDb, salvarProduto } = useDb();
  const { user } = useAuth();

  // Estados do Formulário de Compra Rápida
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [prazoNecessario, setPrazoNecessario] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [observacao, setObservacao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modais Explícitos de Cadastro Deliberado (Nunca Automático)
  const [modalNovoProdutoOpen, setModalNovoProdutoOpen] = useState(false);
  const [modalNovoFornecedorOpen, setModalNovoFornecedorOpen] = useState(false);

  // Form Novo Produto Deliberado
  const [novoProdCodigo, setNovoProdCodigo] = useState('');
  const [novoProdDesc, setNovoProdDesc] = useState('');
  const [novoProdUnidade, setNovoProdUnidade] = useState('UN');
  const [novoProdCategoria, setNovoProdCategoria] = useState('Geral');
  const [novoProdTipo, setNovoProdTipo] = useState<'materia_prima' | 'muc'>('materia_prima');

  // Form Novo Fornecedor Deliberado
  const [novoFornRazao, setNovoFornRazao] = useState('');
  const [novoFornFantasia, setNovoFornFantasia] = useState('');
  const [novoFornCnpj, setNovoFornCnpj] = useState('');
  const [novoFornContato, setNovoFornContato] = useState('');
  const [novoFornEmail, setNovoFornEmail] = useState('');
  const [novoFornTelefone, setNovoFornTelefone] = useState('');

  // Produtos ativos filtrados para matéria-prima ou uso/consumo
  const activeProducts = useMemo(() => {
    return (db.products || []).filter(p => p.ativo !== false && (p.tipo_item === 'materia_prima' || p.tipo_item === 'muc' || p.tipo === 'MP' || p.tipo === 'MUC'));
  }, [db.products]);

  // Resultados da busca por autocomplete estrito
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return activeProducts.filter(p => 
      p.descricao.toLowerCase().includes(q) || 
      p.codigo.toLowerCase().includes(q) ||
      (p.categoria && p.categoria.toLowerCase().includes(q))
    );
  }, [activeProducts, searchTerm]);

  // Fornecedores ativos
  const activeSuppliers = useMemo(() => {
    return (db.suppliers || []).filter(s => s.ativo !== false);
  }, [db.suppliers]);

  // Selecionar Produto do Autocomplete
  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setSearchTerm('');
  };

  // Alternar Seleção de Fornecedor
  const handleToggleSupplier = (supplierId: string) => {
    setSelectedSupplierIds(prev => 
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  // Salvar Novo Produto Deliberado (Ação Explícita do Usuário)
  const handleSalvarNovoProdutoExplicit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProdCodigo.trim() || !novoProdDesc.trim()) {
      alert('Código e Descrição são obrigatórios.');
      return;
    }

    const prodId = uid('prod');
    const newProduct: Product = {
      id: prodId,
      codigo: novoProdCodigo.toUpperCase().trim(),
      descricao: novoProdDesc.trim(),
      unidade: novoProdUnidade,
      categoria: novoProdCategoria,
      tipo: novoProdTipo === 'materia_prima' ? 'MP' : 'MUC',
      tipo_item: novoProdTipo,
      estoqueMinimo: 1000,
      pontoReposicao: 2000,
      custoMedioCents: 0,
      precoReferencia: 0,
      ativo: true
    };

    const res = await salvarProduto(newProduct, user?.name || 'Comprador');
    if (res.success) {
      setSelectedProduct(newProduct);
      setModalNovoProdutoOpen(false);
      setNovoProdCodigo('');
      setNovoProdDesc('');
      alert(`Produto [${newProduct.codigo}] cadastrado com sucesso e selecionado!`);
    } else {
      alert(res.error || 'Erro ao cadastrar produto.');
    }
  };

  // Salvar Novo Fornecedor Deliberado (Ação Explícita do Usuário)
  const handleSalvarNovoFornecedorExplicit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFornRazao.trim()) {
      alert('Razão Social do fornecedor é obrigatória.');
      return;
    }

    const supplierId = uid('for');
    const newSupplier: Supplier = {
      id: supplierId,
      razaoSocial: novoFornRazao.trim(),
      nomeFantasia: novoFornFantasia.trim() || novoFornRazao.trim(),
      cnpj: novoFornCnpj.trim() || '00.000.000/0000-00',
      contatoNome: novoFornContato.trim(),
      email: novoFornEmail.trim(),
      telefone: novoFornTelefone.trim(),
      categoriaPrincipal: 'Geral',
      avaliacao: 5,
      ativo: true
    };

    await updateDb(prev => ({
      ...prev,
      suppliers: [newSupplier, ...(prev.suppliers || [])]
    }), 'SUPPLIER_CREATED');

    setSelectedSupplierIds(prev => [...prev, supplierId]);
    setModalNovoFornecedorOpen(false);
    setNovoFornRazao('');
    setNovoFornFantasia('');
    setNovoFornCnpj('');
    setNovoFornContato('');
    setNovoFornEmail('');
    setNovoFornTelefone('');
    alert(`Fornecedor "${newSupplier.nomeFantasia}" cadastrado e incluído na cotação!`);
  };

  // Enviar Solicitação de Compra Rápida
  const handleSubmitCompraRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert('Selecione um produto cadastrado no catálogo.');
      return;
    }
    if (quantidade <= 0) {
      alert('A quantidade deve ser maior que zero.');
      return;
    }
    if (selectedSupplierIds.length === 0) {
      alert('Selecione pelo menos 1 fornecedor onde você irá cotar.');
      return;
    }

    try {
      setIsSubmitting(true);
      const seq = (db.quotations?.length || 0) + 1;
      const codigoRfq = `RFQ-RAPIDA-${String(seq).padStart(4, '0')}`;
      const rfqId = uid('cot');
      const now = new Date().toISOString();

      const novaCotacao: Quotation = {
        id: rfqId,
        codigo: codigoRfq,
        descricao: `Compra Rápida: ${selectedProduct.descricao} (${quantidade} ${selectedProduct.unidade})`,
        dataAbertura: now.split('T')[0],
        prazoResposta: prazoNecessario,
        status: 'nova_solicitacao',
        observacoes: observacao || `Solicitação de compra rápida gerada por ${user?.name || 'Comprador'}.`,
        fornecedorVencedorId: undefined,
        valorTotalFechadoCents: 0,
        criadoEm: now
      };

      const quotationItemId = uid('qit');
      const novoItemCotacao: QuotationItem = {
        id: quotationItemId,
        quotationId: rfqId,
        productId: selectedProduct.id,
        quantidade: quantidade * 1000,
        observacao: observacao || `Compra rápida: ${selectedProduct.descricao}`
      };

      // Inicializa preços para cada fornecedor selecionado
      const novosPrecos: QuotationSupplierPrice[] = selectedSupplierIds.map(suppId => ({
        id: uid('qpr'),
        quotationId: rfqId,
        quotationItemId: quotationItemId,
        supplierId: suppId,
        precoUnitarioCents: 0,
        prazoEntregaDias: 5,
        selecionado: false,
        observacao: 'Aguardando proposta do fornecedor'
      }));

      // Adiciona também na lista de compras / cotações operacionais
      const shoppingItemId = uid('shop');
      const novoShoppingItem = {
        id: shoppingItemId,
        userId: user?.id || 'usr-admin',
        item: selectedProduct.descricao,
        categoria: selectedProduct.categoria || 'Geral',
        unidade: selectedProduct.unidade || 'UN',
        quantidade: quantidade,
        prioridade: 'normal' as const,
        dataNecessariaAte: prazoNecessario,
        status: 'em_cotacao' as const,
        projetoCentroCusto: 'Almoxarifado Central',
        observacoes: `Vinculado à cotação ${codigoRfq}`,
        cotacoes: selectedSupplierIds.map(suppId => {
          const supp = db.suppliers.find(s => s.id === suppId);
          return {
            id: uid('quote'),
            supplierId: suppId,
            supplierName: supp?.nomeFantasia || supp?.razaoSocial || 'Fornecedor',
            precoUnitarioCents: 0,
            prazoEntregaDias: 5,
            condicaoPagamento: '28 DDL',
            vencedor: false
          };
        }),
        historicoStatus: [
          {
            id: uid('hist'),
            paraStatus: 'em_cotacao',
            data: now,
            usuarioNome: user?.name || 'Comprador'
          }
        ],
        createdAt: now
      };

      const auditLog = {
        id: uid('log'),
        timestamp: now,
        action: 'QUICK_PURCHASE_REQUESTED',
        actor: { id: user?.id || 'admin', name: user?.name || 'Comprador' },
        target: { tipo: 'RFQ', codigo: codigoRfq },
        details: `Compra Rápida de ${quantidade} ${selectedProduct.unidade} de "${selectedProduct.descricao}" disparada para ${selectedSupplierIds.length} fornecedor(es).`
      };

      await updateDb(prev => ({
        ...prev,
        quotations: [novaCotacao, ...(prev.quotations || [])],
        quotationItems: [novoItemCotacao, ...(prev.quotationItems || [])],
        quotationPrices: [...novosPrecos, ...(prev.quotationPrices || [])],
        gescompShoppingList: [novoShoppingItem, ...(prev.gescompShoppingList || [])],
        auditLogs: [auditLog, ...(prev.auditLogs || [])]
      }), 'QUICK_PURCHASE_CREATED');

      alert(`⚡ Solicitação ${codigoRfq} criada com sucesso para ${selectedSupplierIds.length} fornecedor(es)!`);

      // Limpa formulário
      setSelectedProduct(null);
      setQuantidade(1);
      setSelectedSupplierIds([]);
      setObservacao('');

      if (onComplete) onComplete();
    } catch (err: any) {
      alert(`Erro ao criar solicitação: ${err?.message || 'Erro inesperado'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* 1. Header do Módulo de Compra Rápida */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-900/40 via-slate-900/60 to-brand-900/40 border border-teal-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              Compra Rápida & Cotação Direta
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40">
                PCP & Suprimentos
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Selecione o produto do catálogo e escolha múltiplos fornecedores para registrar a cotação no setor de Compras.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Formulário Principal */}
      <form onSubmit={handleSubmitCompraRapida} className="space-y-4">
        {/* BLOCO 1: SELEÇÃO DE PRODUTO DO CATÁLOGO (ESTRITO, SEM CRIAÇÃO IMPLÍCITA) */}
        <Card title="1. Produto a Comprar ou Cotar">
          <div className="space-y-3 text-xs">
            {!selectedProduct ? (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Buscar Item no Catálogo de Matérias-Primas / Insumos *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Digite o código SKU, nome do produto ou categoria..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-brand-500"
                  />
                </div>

                {/* Lista de Resultados Encontrados */}
                {searchTerm.trim() && searchResults.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 shadow-lg">
                    {searchResults.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="p-3 flex items-center justify-between hover:bg-teal-500/10 cursor-pointer transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            [{p.codigo}] {p.descricao}
                          </span>
                          <span className="text-[10.5px] text-slate-400">
                            Categoria: <b>{p.categoria || 'Geral'}</b> · Unidade: <b>{p.unidade}</b>
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" type="button" className="text-teal-400 font-bold">
                          Selecionar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Aviso quando não encontra (Sem criação automática) */}
                {searchTerm.trim() && searchResults.length === 0 && (
                  <div className="mt-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-300">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <b className="text-amber-200">Item não encontrado no catálogo.</b>
                        <p className="text-[11px] text-amber-300/80">O sistema não cria itens automaticamente ao digitar.</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setNovoProdDesc(searchTerm);
                        setNovoProdCodigo(`MP-${Date.now().toString().slice(-4)}`);
                        setModalNovoProdutoOpen(true);
                      }}
                      className="border-amber-500/40 text-amber-300 hover:bg-amber-500/20 font-bold text-xs"
                    >
                      Cadastrar Novo Produto
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Produto Selecionado com Destaque */
              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center font-bold">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-mono text-[11px] text-teal-400 font-bold">[{selectedProduct.codigo}]</span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{selectedProduct.descricao}</h4>
                    <span className="text-[11px] text-slate-400">
                      Categoria: <b>{selectedProduct.categoria}</b> · Unidade: <b>{selectedProduct.unidade}</b>
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Trocar Produto
                </Button>
              </div>
            )}

            {/* Quantidade e Data */}
            {selectedProduct && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantidade Desejada ({selectedProduct.unidade}) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={quantidade}
                    onChange={e => setQuantidade(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-brand-500 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data Limite Necessária *
                  </label>
                  <input
                    type="date"
                    value={prazoNecessario}
                    onChange={e => setPrazoNecessario(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-brand-500 font-mono"
                    required
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* BLOCO 2: SELEÇÃO MÚLTIPLA DE FORNECEDORES CONCORRENTES */}
        <Card 
          title="2. Fornecedores Onde Vou Cotar (Seleção Múltipla)"
          action={
            <Button
              variant="outline"
              size="sm"
              type="button"
              icon={<Plus className="w-3 h-3" />}
              onClick={() => setModalNovoFornecedorOpen(true)}
              className="text-xs"
            >
              + Novo Fornecedor
            </Button>
          }
        >
          <div className="space-y-3 text-xs">
            <p className="text-slate-500 text-[11px]">
              Selecione 1 ou mais fornecedores cadastrados para comparar preços e prazos:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeSuppliers.map(s => {
                const isSelected = selectedSupplierIds.includes(s.id);

                return (
                  <div
                    key={s.id}
                    onClick={() => handleToggleSupplier(s.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500/60 ring-1 ring-teal-500/40 shadow-xs'
                        : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-600 bg-slate-800'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {s.nomeFantasia || s.razaoSocial}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {s.categoriaPrincipal} · {s.telefone || s.email || 'Sem contato'}
                        </span>
                      </div>
                    </div>

                    <Badge variant={isSelected ? 'success' : 'neutral'}>
                      {isSelected ? 'SELECIONADO' : 'INCLUIR'}
                    </Badge>
                  </div>
                );
              })}

              {activeSuppliers.length === 0 && (
                <div className="col-span-2 p-4 text-center text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
                  Nenhum fornecedor cadastrado. Clique no botão acima para cadastrar o primeiro.
                </div>
              )}
            </div>

            {selectedSupplierIds.length > 0 && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                <span>Total de Fornecedores Selecionados:</span>
                <span className="font-bold text-teal-400 font-mono">
                  {selectedSupplierIds.length} fornecedor(es) para cotação simultânea
                </span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Observações / Justificativa da Compra (Opcional)
              </label>
              <textarea
                rows={2}
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Ex: Demanda urgente para reposição da linha de montagem CoreXY..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </Card>

        {/* Botão de Envio */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            type="submit"
            icon={<Zap className="w-4 h-4" />}
            loading={isSubmitting}
            disabled={!selectedProduct || selectedSupplierIds.length === 0}
            className="w-full sm:w-auto font-black text-sm px-6 bg-teal-600 hover:bg-teal-500 shadow-md"
          >
            Disparar Solicitação de Compra Rápida
          </Button>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* MODAL EXPLÍCITO: CADASTRAR NOVO PRODUTO NO CATÁLOGO                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalNovoProdutoOpen}
        onClose={() => setModalNovoProdutoOpen(false)}
        title="Cadastrar Novo Produto / Insumo no Catálogo"
        maxWidth="md"
      >
        <form onSubmit={handleSalvarNovoProdutoExplicit} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px]">
            ℹ️ <b>Cadastro Deliberado:</b> O item será incluído oficialmente no catálogo de produtos do sistema e ficará disponível para todo o ERP.
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Código SKU *</label>
            <input
              type="text"
              value={novoProdCodigo}
              onChange={e => setNovoProdCodigo(e.target.value.toUpperCase())}
              placeholder="Ex: MP-ACO-01"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono font-bold"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição do Item *</label>
            <input
              type="text"
              value={novoProdDesc}
              onChange={e => setNovoProdDesc(e.target.value)}
              placeholder="Ex: Perfil Guia U 90mm Steel Frame"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
              <select
                value={novoProdTipo}
                onChange={e => setNovoProdTipo(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              >
                <option value="materia_prima">Matéria-Prima (MP)</option>
                <option value="muc">Uso & Consumo (MUC)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unidade</label>
              <select
                value={novoProdUnidade}
                onChange={e => setNovoProdUnidade(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
              >
                <option value="UN">UN</option>
                <option value="M">M</option>
                <option value="M²">M²</option>
                <option value="KG">KG</option>
                <option value="L">L</option>
                <option value="CX">CX</option>
                <option value="ROLO">ROLO</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovoProdutoOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Salvar e Selecionar
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL EXPLÍCITO: CADASTRAR NOVO FORNECEDOR                                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalNovoFornecedorOpen}
        onClose={() => setModalNovoFornecedorOpen(false)}
        title="Cadastrar Novo Fornecedor"
        maxWidth="md"
      >
        <form onSubmit={handleSalvarNovoFornecedorExplicit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Razão Social / Nome Oficial *</label>
            <input
              type="text"
              value={novoFornRazao}
              onChange={e => setNovoFornRazao(e.target.value)}
              placeholder="Ex: Aço Brasil Distribuidora Ltda"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={novoFornFantasia}
                onChange={e => setNovoFornFantasia(e.target.value)}
                placeholder="Ex: Aço Brasil"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CNPJ</label>
              <input
                type="text"
                value={novoFornCnpj}
                onChange={e => setNovoFornCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={novoFornTelefone}
                onChange={e => setNovoFornTelefone(e.target.value)}
                placeholder="(47) 99999-8888"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail Comercial</label>
              <input
                type="email"
                value={novoFornEmail}
                onChange={e => setNovoFornEmail(e.target.value)}
                placeholder="vendas@fornecedor.com.br"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNovoFornecedorOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Cadastrar e Selecionar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
