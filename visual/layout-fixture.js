// Isolated browser fixtures: multiple entries on one day, long descriptions,
// future installments and an empty report period reproduce real layout stress.
export const seedLayoutFixture = page => page.evaluate(async () => {
    const { Database } = await import('/db.js');
    const { CATEGORIAS_PADRAO } = await import('/categorias-padrao.js');
    const tx = (id, desc, categoria, valor, data, extra = {}) => ({
        id, desc, categoria, valor, data, tipo: 'despesa', bancoId: 'layout-bank',
        isCartao: false, formaPagamento: 'Pix', ...extra
    });
    await Database.replaceAll({
        bancos: [{ id: 'layout-bank', nome: 'Conta principal de uso diário', instituicao: 'Nubank', saldo: 992, saldoInicial: 2200, dataCriacao: '2026-01-01' }],
        cartoes: [{ id: 'layout-card', nome: 'Nubank Cartão de Crédito', bancoId: 'layout-bank', limite: 900, fechamento: 5, vencimento: 10 }],
        categorias: CATEGORIAS_PADRAO,
        transacoes: [
            tx('layout-income', 'Venda', 'Renda', 12, '2026-09-22', { tipo: 'receita' }),
            tx('layout-rent', 'Aluguel', 'Moradia', 700, '2026-09-22'),
            tx('layout-market', 'Mercado', 'Supermercado', 520, '2026-09-22'),
            ...Array.from({ length: 6 }, (_, index) => tx(`layout-installment-${index}`, 'Teclado mecânico sem fio para o computador', 'Eletrônicos', index < 2 ? 58.34 : 58.33,
                new Date(Date.UTC(2026, 9 + index, 3)).toISOString().slice(0, 10),
                { isCartao: true, bancoId: 'layout-card', parcelaAtual: index + 1, totalParcelas: 6, grupoId: 'layout-purchase' }))
        ],
        agendamentos: Array.from({ length: 5 }, (_, index) => ({ id: `layout-due-${index}`, desc: 'Fatura Nubank Cartão de Crédito', categoria: 'Fatura Cartão', tipo: 'despesa', status: 'pendente', valor: index < 2 ? 58.34 : 58.33, dataVencimento: `2026-${String(8 + index).padStart(2, '0')}-10`, bancoId: 'layout-bank' })),
        orcamentos: [{ id: 'layout-budget', categoria: 'Supermercado', limite: 900, mes: 9, ano: 2026 }],
    }, { mode: 'exact' });
    App.viewState.filters = { desc: '', categoria: '', bancoId: '', mes: '', tipo: '', dataInicio: '', dataFim: '', ano: '', conferencia: '' };
    App.scheduleRender();
});
