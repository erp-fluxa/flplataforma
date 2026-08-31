const INITIAL_DATABASE = {
  currentCompanyId: 'comp-1',
  warehouses: [
    { id: 'wh-1', codigo: 'DEP-SC', nome: 'Depósito Matriz SC', tipo: 'matriz' }
  ],
  products: [
    {
      id: 'prod-pa-cv1200',
      codigo: 'PA-CV1200',
      descricao: 'Impressora UV LED 1200 DPI Industrial',
      tipo_item: 'produto_acabado',
      tipo: 'PA',
      precoVendaCents: 4290000,
      estoqueMinimo: 0,
      unidade: 'UN',
      ativo: true
    },
    {
      id: 'prod-mp-mgn12h',
      codigo: 'MP-MEC-MGN12H',
      descricao: 'Guia Linear MGN12H com Patim de Precisão',
      tipo_item: 'materia_prima',
      tipo: 'MP',
      estoqueMinimo: 1000,
      unidade: 'UN',
      ativo: true
    },
    {
      id: 'prod-mp-nema23',
      codigo: 'MP-MOT-NEMA23',
      descricao: 'Motor de Passo NEMA 23 Alto Torque 2.8Nm',
      tipo_item: 'materia_prima',
      tipo: 'MP',
      estoqueMinimo: 1000,
      unidade: 'UN',
      ativo: true
    }
  ],
  bomVersions: [
    {
      id: 'bom-cv1200',
      productId: 'prod-pa-cv1200',
      codigo: 'BOM-PA-CV1200-V1',
      versao: '1.0',
      status: 'ativa'
    }
  ],
  bomItems: [
    {
      id: 'bi-1',
      bomVersionId: 'bom-cv1200',
      componentProductId: 'prod-mp-mgn12h',
      quantidade: 6000
    },
    {
      id: 'bi-2',
      bomVersionId: 'bom-cv1200',
      componentProductId: 'prod-mp-nema23',
      quantidade: 2000
    }
  ],
  stockBalances: [
    {
      id: 'bal-1',
      productId: 'prod-mp-mgn12h',
      warehouseId: 'wh-1',
      quantidade: 0
    },
    {
      id: 'bal-2',
      productId: 'prod-mp-nema23',
      warehouseId: 'wh-1',
      quantidade: 0
    },
    {
      id: 'bal-3',
      productId: 'prod-pa-cv1200',
      warehouseId: 'wh-1',
      quantidade: 0
    }
  ],
  stockMovements: [],
  stockReservations: [],
  salesOrders: [],
  productionOrders: []
}

function createTestDb() {
  let state = JSON.parse(JSON.stringify(INITIAL_DATABASE))

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  }

  function getSaldoDisponivel(productId) {
    const bal = (state.stockBalances || []).find(b => b.productId === productId)
    const saldoFisico = bal ? bal.quantidade : 0
    const reservasAtivas = (state.stockReservations || [])
      .filter(r => r.productId === productId && r.status === 'ativa')
      .reduce((sum, r) => sum + r.quantidade, 0)
    return {
      fisico: saldoFisico,
      reservado: reservasAtivas,
      disponivel: saldoFisico - reservasAtivas
    }
  }

  function processarVenda(vendaData, itens, actorName = 'Vendedor') {
    const now = new Date().toISOString()
    const seqPv = (state.salesOrders?.length || 0) + 1
    const codigoPv = `PV-${String(seqPv).padStart(4, '0')}`
    const pvId = uid('pv')
    const whId = state.warehouses[0]?.id || 'wh-1'

    const opsGeradas = []
    const baixasDiretas = []
    const reservasGeradas = []

    let stockBalances = [...(state.stockBalances || [])]
    let stockMovements = [...(state.stockMovements || [])]
    let stockReservations = [...(state.stockReservations || [])]
    let productionOrders = [...(state.productionOrders || [])]

    const pvItems = []
    let totalCents = 0

    for (const it of itens) {
      const product = state.products.find(p => p.id === it.productId)
      if (!product) continue

      const unitPrice = it.precoUnitarioCents ?? 4290000
      const itemTotal = unitPrice * (it.quantidade / 1000 || 1)
      totalCents += itemTotal

      const isProdutoAcabado = product.tipo_item === 'produto_acabado' || product.tipo === 'PA'

      const balIdx = stockBalances.findIndex(b => b.productId === it.productId)
      const saldoFisico = balIdx >= 0 ? stockBalances[balIdx].quantidade : 0
      const reservasAtivas = stockReservations
        .filter(r => r.productId === it.productId && r.status === 'ativa')
        .reduce((sum, r) => sum + r.quantidade, 0)
      const saldoDisponivel = Math.max(0, saldoFisico - reservasAtivas)

      if (!isProdutoAcabado) {
        const qtdBaixar = it.quantidade
        if (balIdx >= 0) {
          stockBalances[balIdx] = {
            ...stockBalances[balIdx],
            quantidade: Math.max(0, stockBalances[balIdx].quantidade - qtdBaixar)
          }
        }

        const mov = {
          id: uid('mov'),
          productId: it.productId,
          warehouseId: whId,
          tipo: 'saida',
          quantidade: qtdBaixar,
          sinal: -1,
          origemTipo: 'VENDA_DIRETA',
          origemId: pvId,
          observacao: `Baixa por Venda Direta ${codigoPv}`,
          criadoEm: now,
          criadoPor: actorName
        }
        stockMovements = [mov, ...stockMovements]
        baixasDiretas.push(mov)
      } else {
        const qtdEstoque = saldoDisponivel
        const qtdAProduzir = it.quantidade - saldoDisponivel

        if (qtdEstoque > 0) {
          if (balIdx >= 0) {
            stockBalances[balIdx] = {
              ...stockBalances[balIdx],
              quantidade: Math.max(0, stockBalances[balIdx].quantidade - qtdEstoque)
            }
          }
          const mov = {
            id: uid('mov'),
            productId: it.productId,
            warehouseId: whId,
            tipo: 'saida',
            quantidade: qtdEstoque,
            sinal: -1,
            origemTipo: 'VENDA_PRODUTO_ACABADO_PARCIAL',
            origemId: pvId,
            observacao: `Baixa parcial de Produto Acabado`,
            criadoEm: now,
            criadoPor: actorName
          }
          stockMovements = [mov, ...stockMovements]
          baixasDiretas.push(mov)
        }

        const bom = state.bomVersions?.find(v => v.productId === it.productId && v.status === 'ativa') ||
          state.bomVersions?.find(v => v.productId === it.productId) || { id: 'bom-cv1200' }

        const bomItems = state.bomItems?.filter(bi => bi.bomVersionId === bom.id) || []

        const opSeq = productionOrders.length + opsGeradas.length + 1
        const opCodigo = `OP-${String(opSeq).padStart(4, '0')}`
        const opId = uid('op')

        for (const bi of bomItems) {
          const fatorQtd = qtdAProduzir >= 1000 ? (qtdAProduzir / 1000) : qtdAProduzir
          const qtdConsumoTotal = bi.quantidade * fatorQtd

          const res = {
            id: uid('res'),
            productId: bi.componentProductId,
            warehouseId: whId,
            productionOrderId: opId,
            salesOrderId: pvId,
            quantidade: qtdConsumoTotal,
            status: 'ativa',
            criadoEm: now
          }
          stockReservations = [res, ...stockReservations]
          reservasGeradas.push(res)
        }

        const novaOp = {
          id: opId,
          codigo: opCodigo,
          productId: it.productId,
          bomVersionId: bom.id,
          salesOrderId: pvId,
          salesOrderCodigo: codigoPv,
          quantidadePlanejada: qtdAProduzir,
          quantidadeProduzida: 0,
          quantidadeRefugo: 0,
          status: 'material_reservado',
          dataInicioPrevista: now.split('T')[0],
          dataEntregaPrevista: vendaData.previsaoEntrega || '2026-09-30',
          companyId: state.currentCompanyId,
          criadoEm: now
        }

        productionOrders = [novaOp, ...productionOrders]
        opsGeradas.push(novaOp)
      }
    }

    const novoPv = {
      id: pvId,
      codigo: codigoPv,
      customerId: vendaData.customerId,
      status: opsGeradas.length > 0 ? 'em_producao' : 'pronto_expedicao',
      valorTotalCents: totalCents,
      items: pvItems,
      productionOrderIds: opsGeradas.map(o => o.id),
      productionOrderCodigos: opsGeradas.map(o => o.codigo),
      criadoEm: now
    }

    state = {
      ...state,
      salesOrders: [novoPv, ...(state.salesOrders || [])],
      productionOrders,
      stockBalances,
      stockMovements,
      stockReservations
    }

    return { success: true, pv: novoPv, opsGeradas, baixasDiretas, reservasGeradas }
  }

  function excluirOpComEstorno(opId, actorName = 'PCP') {
    const op = (state.productionOrders || []).find(o => o.id === opId)
    if (!op) return { success: false, error: 'OP não encontrada' }

    const now = new Date().toISOString()
    const whId = state.warehouses[0]?.id || 'wh-1'

    // Cancelar reservas
    const stockReservations = (state.stockReservations || []).filter(r => r.productionOrderId !== opId)

    // Estornar movimentações
    const movsDaOp = (state.stockMovements || []).filter(m => m.origemId === opId)
    let stockBalances = [...(state.stockBalances || [])]
    let newMovements = []

    for (const mov of movsDaOp) {
      if (mov.tipo === 'saida' || mov.sinal === -1) {
        const estornoMov = {
          id: uid('mov'),
          productId: mov.productId,
          warehouseId: mov.warehouseId || whId,
          tipo: 'entrada',
          quantidade: mov.quantidade,
          sinal: 1,
          origemTipo: 'ESTORNO_CONSUMO_OP',
          origemId: opId,
          observacao: `Estorno de consumo referente à exclusão da ${op.codigo}`,
          criadoEm: now,
          criadoPor: actorName
        }
        newMovements.push(estornoMov)

        const balIdx = stockBalances.findIndex(b => b.productId === mov.productId)
        if (balIdx >= 0) {
          stockBalances[balIdx] = {
            ...stockBalances[balIdx],
            quantidade: stockBalances[balIdx].quantidade + mov.quantidade
          }
        }
      }
    }

    const salesOrders = (state.salesOrders || []).map(pv => {
      if (pv.productionOrderIds?.includes(opId) || pv.id === op.salesOrderId) {
        return {
          ...pv,
          productionOrderIds: (pv.productionOrderIds || []).filter(id => id !== opId),
          productionOrderCodigos: (pv.productionOrderCodigos || []).filter(c => c !== op.codigo)
        }
      }
      return pv
    })

    const productionOrders = (state.productionOrders || []).filter(o => o.id !== opId)

    state = {
      ...state,
      productionOrders,
      stockReservations,
      stockBalances,
      stockMovements: [...newMovements, ...(state.stockMovements || [])],
      salesOrders
    }

    return { success: true }
  }

  function excluirVendaComEstorno(pvId, actorName = 'Vendedor') {
    const pv = (state.salesOrders || []).find(p => p.id === pvId)
    if (!pv) return { success: false, error: 'PV não encontrado' }

    const now = new Date().toISOString()
    const whId = state.warehouses[0]?.id || 'wh-1'

    const opsVinculadas = (state.productionOrders || []).filter(
      o => o.salesOrderId === pvId || pv.productionOrderIds?.includes(o.id)
    )
    const opIds = new Set(opsVinculadas.map(o => o.id))

    const stockReservations = (state.stockReservations || []).filter(
      r => r.salesOrderId !== pvId && (!r.productionOrderId || !opIds.has(r.productionOrderId))
    )

    const movsVendaEOps = (state.stockMovements || []).filter(
      m => m.origemId === pvId || (m.origemId && opIds.has(m.origemId))
    )

    let stockBalances = [...(state.stockBalances || [])]
    let newMovements = []

    for (const mov of movsVendaEOps) {
      if (mov.tipo === 'saida' || mov.sinal === -1) {
        const estornoMov = {
          id: uid('mov'),
          productId: mov.productId,
          warehouseId: mov.warehouseId || whId,
          tipo: 'entrada',
          quantidade: mov.quantidade,
          sinal: 1,
          origemTipo: 'ESTORNO_VENDA',
          origemId: pvId,
          observacao: `Estorno de saída referente à exclusão da Venda ${pv.codigo}`,
          criadoEm: now,
          criadoPor: actorName
        }
        newMovements.push(estornoMov)

        const balIdx = stockBalances.findIndex(b => b.productId === mov.productId)
        if (balIdx >= 0) {
          stockBalances[balIdx] = {
            ...stockBalances[balIdx],
            quantidade: stockBalances[balIdx].quantidade + mov.quantidade
          }
        }
      }
    }

    const productionOrders = (state.productionOrders || []).filter(
      o => o.salesOrderId !== pvId && !opIds.has(o.id)
    )

    const salesOrders = (state.salesOrders || []).filter(p => p.id !== pvId)

    state = {
      ...state,
      salesOrders,
      productionOrders,
      stockReservations,
      stockBalances,
      stockMovements: [...newMovements, ...(state.stockMovements || [])]
    }

    return { success: true }
  }

  return {
    getState: () => state,
    getSaldoDisponivel,
    processarVenda,
    excluirOpComEstorno,
    excluirVendaComEstorno
  }
}

async function runTests() {
  console.log('=================================================================')
  console.log('🧪 TESTE DOS 5 CRITÉRIOS DE ACEITE: FLUXO DE VENDA, OP E ESTORNO')
  console.log('=================================================================\n')

  const testDb = createTestDb()
  const prodPa = testDb.getState().products.find(p => p.tipo_item === 'produto_acabado' || p.tipo === 'PA')
  const matPrima = testDb.getState().products.find(p => p.tipo_item === 'materia_prima' || p.tipo === 'MP')

  console.log(`Produto Testado: [${prodPa.codigo}] ${prodPa.descricao}`)
  console.log(`Matéria-Prima Avaliada: [${matPrima.codigo}] ${matPrima.descricao}\n`)

  // Saldo inicial da matéria-prima
  const saldoInicialMP = testDb.getSaldoDisponivel(matPrima.id)
  console.log(`Saldo Inicial MP: Físico=${saldoInicialMP.fisico}, Reservado=${saldoInicialMP.reservado}, Disponível=${saldoInicialMP.disponivel}`)

  // ---------------------------------------------------------
  // CRITÉRIO 1: Criar uma venda de item zerado -> OP e reserva geradas
  // ---------------------------------------------------------
  console.log('\n--- [TESTE CRITÉRIO 1] Criando Venda Automática ---')
  const resVenda1 = testDb.processarVenda(
    { customerId: 'cli-1', previsaoEntrega: '2026-09-30' },
    [{ productId: prodPa.id, quantidade: 1000 }] // 1 unidade
  )
  console.log(`Venda Criada: ${resVenda1.pv.codigo} (ID: ${resVenda1.pv.id})`)
  console.log(`OP(s) Gerada(s): ${resVenda1.opsGeradas.map(o => o.codigo).join(', ')}`)
  console.log(`Reservas Geradas: ${resVenda1.reservasGeradas.length}`)

  const saldoAposVenda = testDb.getSaldoDisponivel(matPrima.id)
  console.log(`Saldo MP pós-venda: Físico=${saldoAposVenda.fisico}, Reservado=${saldoAposVenda.reservado}, Disponível=${saldoAposVenda.disponivel} (Déficit)`)
  const crit1Passed = saldoAposVenda.reservado === 6000 && saldoAposVenda.disponivel === -6000
  console.log(`Status Critério 1: ${crit1Passed ? '✅ APROVADO' : '❌ REPROVADO'}`)

  // ---------------------------------------------------------
  // CRITÉRIO 2: Excluir a Ordem de Produção -> reserva liberada
  // ---------------------------------------------------------
  console.log('\n--- [TESTE CRITÉRIO 2] Excluindo a Ordem de Produção ---')
  const opGerada = resVenda1.opsGeradas[0]
  testDb.excluirOpComEstorno(opGerada.id)
  const saldoAposExcluirOp = testDb.getSaldoDisponivel(matPrima.id)
  console.log(`Saldo MP pós-exclusão OP: Físico=${saldoAposExcluirOp.fisico}, Reservado=${saldoAposExcluirOp.reservado}, Disponível=${saldoAposExcluirOp.disponivel}`)
  const crit2Passed = saldoAposExcluirOp.reservado === saldoInicialMP.reservado && saldoAposExcluirOp.disponivel === saldoInicialMP.disponivel
  console.log(`Status Critério 2: ${crit2Passed ? '✅ APROVADO' : '❌ REPROVADO'}`)

  // Limpa a venda residual para o próximo teste
  testDb.excluirVendaComEstorno(resVenda1.pv.id)

  // ---------------------------------------------------------
  // CRITÉRIO 3: Excluir Venda inteira (incluindo OP ativa) -> estorno total
  // ---------------------------------------------------------
  console.log('\n--- [TESTE CRITÉRIO 3] Exclusão Direta da Venda Completa com OP ---')
  const resVenda2 = testDb.processarVenda(
    { customerId: 'cli-1', previsaoEntrega: '2026-09-30' },
    [{ productId: prodPa.id, quantidade: 1000 }]
  )
  console.log(`Venda Criada: ${resVenda2.pv.codigo}`)
  const saldoMeio = testDb.getSaldoDisponivel(matPrima.id)
  console.log(`Saldo MP durante a venda: Disponível=${saldoMeio.disponivel}, Reservado=${saldoMeio.reservado}`)

  testDb.excluirVendaComEstorno(resVenda2.pv.id)
  const saldoAposExcluirVenda = testDb.getSaldoDisponivel(matPrima.id)
  console.log(`Saldo MP pós-exclusão da Venda: Físico=${saldoAposExcluirVenda.fisico}, Reservado=${saldoAposExcluirVenda.reservado}, Disponível=${saldoAposExcluirVenda.disponivel}`)
  const crit3Passed = saldoAposExcluirVenda.disponivel === saldoInicialMP.disponivel && saldoAposExcluirVenda.reservado === saldoInicialMP.reservado
  console.log(`Status Critério 3: ${crit3Passed ? '✅ APROVADO' : '❌ REPROVADO'}`)

  // ---------------------------------------------------------
  // CRITÉRIO 4: Repetir o ciclo 3 vezes seguidas -> sem drift acumulado
  // ---------------------------------------------------------
  console.log('\n--- [TESTE CRITÉRIO 4] Repetir Ciclo 3 Vezes Seguidas ---')
  let crit4Passed = true
  for (let i = 1; i <= 3; i++) {
    const resVendaCiclo = testDb.processarVenda(
      { customerId: 'cli-1', previsaoEntrega: '2026-09-30' },
      [{ productId: prodPa.id, quantidade: 1000 }]
    )
    const op = resVendaCiclo.opsGeradas[0]
    testDb.excluirOpComEstorno(op.id)
    testDb.excluirVendaComEstorno(resVendaCiclo.pv.id)

    const saldoCiclo = testDb.getSaldoDisponivel(matPrima.id)
    const ok = saldoCiclo.disponivel === saldoInicialMP.disponivel && saldoCiclo.reservado === saldoInicialMP.reservado
    console.log(`Ciclo ${i}/3: Saldo Disponível=${saldoCiclo.disponivel} (Esperado=${saldoInicialMP.disponivel}) -> ${ok ? '✔ OK' : '✖ FALHA'}`)
    if (!ok) crit4Passed = false
  }
  console.log(`Status Critério 4: ${crit4Passed ? '✅ APROVADO (Zero drift)' : '❌ REPROVADO'}`)

  // ---------------------------------------------------------
  // CRITÉRIO 5: Conferir no ledger auditável que baixas e estornos estão rastreáveis
  // ---------------------------------------------------------
  console.log('\n--- [TESTE CRITÉRIO 5] Rastreabilidade no Ledger de Movimentações ---')
  const resVendaDireta = testDb.processarVenda(
    { customerId: 'cli-1', previsaoEntrega: '2026-09-30' },
    [{ productId: matPrima.id, quantidade: 500 }]
  )
  testDb.excluirVendaComEstorno(resVendaDireta.pv.id)

  const movs = testDb.getState().stockMovements
  const baixaMov = movs.find(m => m.origemId === resVendaDireta.pv.id && m.tipo === 'saida')
  const estornoMov = movs.find(m => m.origemId === resVendaDireta.pv.id && m.tipo === 'entrada' && m.origemTipo === 'ESTORNO_VENDA')

  console.log(`Movimentação de Saída registrada: ${baixaMov ? `✔ ID ${baixaMov.id} (-${baixaMov.quantidade} un)` : '✖ NÃO'}`)
  console.log(`Movimentação de Estorno registrada: ${estornoMov ? `✔ ID ${estornoMov.id} (+${estornoMov.quantidade} un, ${estornoMov.observacao})` : '✖ NÃO'}`)

  const crit5Passed = !!baixaMov && !!estornoMov
  console.log(`Status Critério 5: ${crit5Passed ? '✅ APROVADO (Ledger 100% auditável)' : '❌ REPROVADO'}`)

  console.log('\n=================================================================')
  const allPassed = crit1Passed && crit2Passed && crit3Passed && crit4Passed && crit5Passed
  console.log(`RESULTADO GERAL: ${allPassed ? '🎉 TODOS OS 5 CRITÉRIOS DE ACEITE FORAM APROVADOS COM SUCESSO!' : '❌ FALHA EM UM OU MAIS CRITÉRIOS'}`)
  console.log('=================================================================')
}

runTests().catch(console.error)
