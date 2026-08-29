const isDateInMonth = (date, year, month) => {
    if (!date) return false;
    const value = String(date).slice(0, 10);
    return value.startsWith(`${year}-${String(month + 1).padStart(2, '0')}-`);
};

const isInternalTransfer = (t) => t.tipo === 'transferencia' || t.tipoTransferencia === 'interna' || t.transferenciaInterna === true;
const isCardInvoicePayment = (t) => t.categoria === 'Pagamento de Fatura' && t.formaPagamento === 'Automático (Agendamento)';

export const FinancialAnalytics = {
    monthTransactions: (transactions, year, month) => (transactions || []).filter(t => isDateInMonth(t.data, year, month)),
    totals: (transactions, year, month) => {
        const items = FinancialAnalytics.monthTransactions(transactions, year, month).filter(t => !isInternalTransfer(t));
        return {
            receitas: items.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + (Number(t.valor) || 0), 0),
            despesas: items.filter(t => t.tipo === 'despesa' && !isCardInvoicePayment(t)).reduce((sum, t) => sum + (Number(t.valor) || 0), 0),
            pagamentosFatura: items.filter(isCardInvoicePayment).reduce((sum, t) => sum + (Number(t.valor) || 0), 0)
        };
    },
    categoryTotals: (transactions, year, month) => FinancialAnalytics.monthTransactions(transactions, year, month)
        .filter(t => t.tipo === 'despesa' && !isInternalTransfer(t) && !isCardInvoicePayment(t))
        .reduce((result, t) => {
            const category = t.categoria || 'Sem categoria';
            result[category] = (result[category] || 0) + (Number(t.valor) || 0);
            return result;
        }, {}),
    categoryComparison: (transactions, current, previous) => {
        const atual = FinancialAnalytics.categoryTotals(transactions, current.year, current.month);
        const anterior = FinancialAnalytics.categoryTotals(transactions, previous.year, previous.month);
        return Array.from(new Set([...Object.keys(atual), ...Object.keys(anterior)])).map(categoria => {
            const agora = atual[categoria] || 0;
            const antes = anterior[categoria] || 0;
            return { categoria, atual: agora, anterior: antes, diferenca: agora - antes, variacao: antes === 0 ? (agora === 0 ? 0 : null) : ((agora - antes) / antes) * 100 };
        }).sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));
    },
    compareMonths: (transactions, current, previous) => {
        const atual = FinancialAnalytics.totals(transactions, current.year, current.month);
        const anterior = FinancialAnalytics.totals(transactions, previous.year, previous.month);
        const variation = (now, before) => before === 0 ? (now === 0 ? 0 : null) : ((now - before) / before) * 100;
        return { atual, anterior, variacaoReceitas: variation(atual.receitas, anterior.receitas), variacaoDespesas: variation(atual.despesas, anterior.despesas) };
    },
    heatmap: (transactions, year, month) => {
        const days = new Date(year, month + 1, 0).getDate();
        const values = Array.from({ length: days }, (_, index) => ({ dia: index + 1, valor: 0 }));
        FinancialAnalytics.monthTransactions(transactions, year, month)
            .filter(t => t.tipo === 'despesa' && !isInternalTransfer(t) && !isCardInvoicePayment(t))
            .forEach(t => { const day = Number(String(t.data).slice(8, 10)); if (day >= 1 && day <= days) values[day - 1].valor += Number(t.valor) || 0; });
        return values;
    }
};
