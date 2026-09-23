/**
 * Deterministic, opt-in demo data for component and visual tests.
 *
 * This module is deliberately a pure data boundary: it does not import the
 * database, read browser storage, register globals, or mutate application
 * state. Consumers receive a fresh clone from `buildDemoFixture`.
 */

export const DEMO_REFERENCE_DATE = '2026-09-15';

const categories = [
    { id: 'cat-moradia', nome: 'Moradia', grupo: 'Casa', subgrupo: 'Moradia', tipo: 'despesa', fixa: false, icone: 'fa-house', cor: '#8170B5' },
    { id: 'cat-alimentacao', nome: 'Alimentação', grupo: 'Vida', subgrupo: 'Alimentação', tipo: 'despesa', fixa: false, icone: 'fa-utensils', cor: '#D8834E' },
    { id: 'cat-renda', nome: 'Salário', grupo: 'Renda', subgrupo: 'Salário', tipo: 'receita', fixa: false, icone: 'fa-arrow-trend-up', cor: '#4E8065' }
];

const tx = (id, desc, valor, tipo, categoria, data, extra = {}) => ({
    id, desc, valor, tipo, categoria, data, bancoId: 'bank-main', isCartao: false,
    formaPagamento: 'Pix', transferenciaInterna: false, ...extra
});

const base = () => ({
    usuario: { nome: 'Demo Avenera' },
    transacoes: [], bancos: [], cartoes: [], comprasCartao: [],
    categorias: categories.map(item => ({ ...item })),
    orcamentos: [], agendamentos: [], metas: [], contatos: [],
    conciliacoesFaturas: [], receitasFuturas: [], assinaturas: [], investimentos: [],
    metadados: { ultimaAtualizacao: DEMO_REFERENCE_DATE },
    dashboard: { saldo: 0, receitas: 0, despesas: 0, contasPendentes: 0 },
    dashboardPrevious: { receitas: 0, despesas: 0 },
    priorityContext: {},
    state: { budgetYear: 2026, budgetMonth: 8, reportTab: 'fluxo', reportCashflowPeriod: 1, reportPeriod: 6, selectedTransactions: [] }
});

const normal = () => {
    const fixture = base();
    fixture.bancos = [{ id: 'bank-main', nome: 'Conta principal', instituicao: 'Banco Demo', saldo: 3450, cor: '#4E8065' }];
    fixture.cartoes = [{ id: 'card-main', bancoId: 'bank-main', nome: 'Cartão Demo', limite: 3000, vencimento: 12, ultimosDigitos: '4242' }];
    fixture.transacoes = [
        tx('tx-salary', 'Salário', 5200, 'receita', 'Salário', '2026-09-05'),
        tx('tx-rent', 'Aluguel', 1400, 'despesa', 'Moradia', '2026-09-06'),
        tx('tx-food', 'Supermercado', 280, 'despesa', 'Alimentação', '2026-09-10')
    ];
    fixture.orcamentos = [{ id: 'budget-food', categoria: 'Alimentação', limite: 900, ano: 2026, mes: 8 }];
    fixture.dashboard = { saldo: 3450, receitas: 5200, despesas: 1680, contasPendentes: 0 };
    fixture.dashboardPrevious = { receitas: 5000, despesas: 1700 };
    return fixture;
};

const empty = () => {
    const fixture = base();
    fixture.categorias = [];
    return fixture;
};

const overdueAccounts = () => {
    const fixture = normal();
    fixture.agendamentos = [{ id: 'due-rent', desc: 'Aluguel pendente', valor: 1400, tipo: 'despesa', categoria: 'Moradia', dataVencimento: '2026-09-04', status: 'pendente' }];
    fixture.dashboard.contasPendentes = 1400;
    fixture.priorityContext = { contasAtrasadas: fixture.agendamentos };
    return fixture;
};

const negativeBalance = () => {
    const fixture = base();
    fixture.bancos = [{ id: 'bank-main', nome: 'Conta principal', instituicao: 'Banco Demo', saldo: -480, cor: '#C45D5D' }];
    fixture.transacoes = [
        tx('tx-income-small', 'Receita parcial', 500, 'receita', 'Salário', '2026-09-03'),
        tx('tx-expense-large', 'Despesa essencial', 980, 'despesa', 'Moradia', '2026-09-04')
    ];
    fixture.dashboard = { saldo: -480, receitas: 500, despesas: 980, contasPendentes: 0 };
    fixture.priorityContext = { saldo: -480 };
    return fixture;
};

const overBudget = () => {
    const fixture = normal();
    fixture.orcamentos = [{ id: 'budget-food', categoria: 'Alimentação', limite: 300, gasto: 680, ano: 2026, mes: 8 }];
    fixture.transacoes.push(tx('tx-food-extra', 'Restaurante', 400, 'despesa', 'Alimentação', '2026-09-12'));
    fixture.dashboard.despesas += 400;
    fixture.priorityContext = { orcamento: { orcamentos: fixture.orcamentos, gastosPorCat: { Alimentação: 680 } } };
    return fixture;
};

const highCardUtilization = () => {
    const fixture = normal();
    fixture.cartoes[0].limite = 1000;
    fixture.transacoes.push(tx('tx-card', 'Compra no cartão', 850, 'despesa', 'Alimentação', '2026-09-11', { bancoId: 'card-main', isCartao: true, formaPagamento: 'Cartão de Crédito' }));
    fixture.comprasCartao = fixture.transacoes.filter(item => item.isCartao).map(item => ({ ...item, cartaoId: item.bancoId }));
    fixture.priorityContext = { cartoes: fixture.cartoes, comprasCartao: fixture.comprasCartao };
    return fixture;
};

const combinedPriority = () => {
    const fixture = highCardUtilization();
    fixture.agendamentos = [{ id: 'due-combined', desc: 'Conta vencida', valor: 700, tipo: 'despesa', categoria: 'Moradia', dataVencimento: '2026-09-02', status: 'pendente' }];
    fixture.orcamentos = [{ id: 'budget-combined', categoria: 'Alimentação', limite: 300, gasto: 900, ano: 2026, mes: 8 }];
    fixture.priorityContext = {
        saldo: fixture.dashboard.saldo,
        contasAtrasadas: fixture.agendamentos,
        orcamento: { orcamentos: fixture.orcamentos, gastosPorCat: { Alimentação: 900 } },
        cartoes: fixture.cartoes,
        comprasCartao: fixture.comprasCartao
    };
    return fixture;
};

const BUILDERS = Object.freeze({ empty, normal, overdueAccounts, negativeBalance, overBudget, highCardUtilization, combinedPriority });
export const DEMO_SCENARIOS = Object.freeze(Object.keys(BUILDERS));

/** Return a fresh, detached fixture. Mutating it cannot mutate this module. */
export const buildDemoFixture = scenario => {
    const builder = BUILDERS[scenario];
    if (!builder) throw new Error(`Unknown demo scenario: ${scenario}`);
    const fixture = cloneDemoFixture(builder());
    const { dashboard, dashboardPrevious, priorityContext, state, ...db } = fixture;
    return { ...fixture, db, dashboard, dashboardPrevious, priorityContext, state };
};

/** Clone helper for test/dev adapters; it has no storage or app side effects. */
export const cloneDemoFixture = fixture => JSON.parse(JSON.stringify(fixture));

/** Explicit adapter for consumers that need only the database-shaped payload. */
export const buildDemoDatabase = scenario => buildDemoFixture(scenario).db;

/** Alias that makes scenario use self-documenting in visual/dev tooling. */
export const getDemoScenario = buildDemoFixture;
