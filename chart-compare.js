import { Database } from './db.js';
import { calculatePeriodTotals } from './financial-ledger.js';

const cssToken = (name, fallback) => {
    if (typeof document === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};
const formatMoney = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatAxisMoney = value => {
    const amount = Number(value || 0);
    return Math.abs(amount) >= 1000 ? `R$ ${(amount / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};

export const ChartCompare = {
    render: (state, instances) => {
        const ctxComp = document.getElementById('reportsCompChart');
        if (!ctxComp) return;

        const periodComp = state.reportPeriod || 6;
        const months = []; const incomes = []; const expenses = [];
        const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const today = new Date();
        for (let i = periodComp - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(`${monthNames[d.getMonth()]}/${d.getFullYear().toString().substr(-2)}`);
            const tr = Database.getTransacoesPorMes(d.getFullYear(), d.getMonth());
            const totals = calculatePeriodTotals(tr);
            incomes.push(totals.income);
            expenses.push(totals.expense);
        }
        if (instances.reportsCompare) instances.reportsCompare.destroy();
        const text = cssToken('--c-text-secondary', '#65716B');
        const border = cssToken('--c-border', '#DCE2DB');
        instances.reportsCompare = new Chart(ctxComp, {
            type: 'bar',
            data: { labels: months, datasets: [
                { label: 'Receitas', data: incomes, backgroundColor: cssToken('--c-success', '#4E8065'), borderRadius: 4 },
                { label: 'Despesas', data: expenses, backgroundColor: cssToken('--c-danger', '#C45D5D'), borderRadius: 4 }
            ] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: text, usePointStyle: true, padding: 20, font: { family: 'Inter', size: 11 } } },
                    tooltip: { callbacks: { label: context => ` ${context.dataset.label}: ${formatMoney(context.parsed.y)}` } }
                },
                scales: {
                    y: { border: { display: false }, grid: { color: border, borderDash: [4, 4] }, ticks: { color: text, callback: formatAxisMoney } },
                    x: { border: { display: false }, grid: { display: false }, ticks: { color: text } }
                }
            }
        });
    }
};
