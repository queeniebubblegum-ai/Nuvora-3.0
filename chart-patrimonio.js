const cssToken = (name, fallback) => {
    if (typeof document === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};
const formatMoney = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatAxisMoney = value => {
    const amount = Number(value || 0);
    return Math.abs(amount) >= 1000 ? `R$ ${(amount / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};

export const ChartPatrimonio = {
    render: (state, dbData, instances) => {
        const ctxPatr = document.getElementById('reportsPatrimonioChart');
        if (!ctxPatr) return;
        const periodPatr = state.reportPeriod || 6;
        const months = []; const sBancario = []; const sMetas = [];
        const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const today = new Date();
        const saldoAt = dbData.bancos.reduce((a, b) => a + b.saldo, 0);
        const metaAt = dbData.metas.reduce((a, b) => a + b.atual, 0);
        for (let i = periodPatr - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(`${monthNames[d.getMonth()]}/${d.getFullYear().toString().substr(-2)}`);
            // Keep the existing data model/logic for this report; only presentation is tokenized here.
            sBancario.push(Math.max(0, saldoAt - (i * (saldoAt * 0.15))));
            sMetas.push(Math.max(0, metaAt - (i * (metaAt * 0.05))));
        }
        if (instances.reportsPatrimonio) instances.reportsPatrimonio.destroy();
        const text = cssToken('--c-text-secondary', '#65716B');
        const border = cssToken('--c-border', '#DCE2DB');
        const brand = cssToken('--c-brand-medium', '#8170B5');
        const info = cssToken('--c-info', '#5F7F9B');
        instances.reportsPatrimonio = new Chart(ctxPatr, {
            type: 'line',
            data: { labels: months, datasets: [
                { label: 'Saldo Bancário', data: sBancario, borderColor: info, backgroundColor: `${info}22`, fill: true, tension: 0.3 },
                { label: 'Metas', data: sMetas, borderColor: brand, backgroundColor: 'transparent', fill: false, tension: 0.3 }
            ] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: text, usePointStyle: true, padding: 20, font: { family: 'Inter', size: 11 } } }, tooltip: { callbacks: { label: context => ` ${context.dataset.label}: ${formatMoney(context.parsed.y)}` } } },
                scales: {
                    y: { border: { display: false }, grid: { color: border, borderDash: [4, 4] }, ticks: { color: text, callback: formatAxisMoney } },
                    x: { border: { display: false }, grid: { display: false }, ticks: { color: text } }
                }
            }
        });
    }
};
