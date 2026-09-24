import { Database } from './db.js';

const cssToken = (name, fallback) => {
    if (typeof document === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};
const formatMoney = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatAxisMoney = value => {
    const amount = Number(value || 0);
    return Math.abs(amount) >= 1000 ? `R$ ${(amount / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};

export const ChartCartoes = {
    render: (state, instances) => {
        const ctxCart = document.getElementById('reportsCartoesChart');
        if (!ctxCart) return;
        const periodCart = state.reportPeriod || 6;
        const months = []; const data = [];
        const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const today = new Date();
        for (let i = 0; i < periodCart; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            months.push(`${monthNames[d.getMonth()]}/${d.getFullYear().toString().substr(-2)}`);
            data.push(Database.getComprasCartaoPorMes(d.getFullYear(), d.getMonth()).reduce((a, b) => a + b.valor, 0));
        }
        if (instances.reportsCartoes) instances.reportsCartoes.destroy();
        const text = cssToken('--c-text-secondary', '#65716B');
        const border = cssToken('--c-border', '#DCE2DB');
        instances.reportsCartoes = new Chart(ctxCart, {
            type: 'bar',
            data: { labels: months, datasets: [{ label: 'Faturas', data, backgroundColor: cssToken('--c-warning', '#B97835'), barThickness: 40, borderRadius: 4 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => ` ${formatMoney(context.parsed.y)}` } } },
                scales: {
                    y: { border: { display: false }, grid: { color: border, borderDash: [4, 4] }, ticks: { color: text, callback: formatAxisMoney } },
                    x: { border: { display: false }, grid: { display: false }, ticks: { color: text } }
                }
            }
        });
    }
};
