import { buildCashflowModel } from './report-data.js';

const cssToken = (name, fallback) => {
    if (typeof document === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
};

const formatMoney = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatAxisMoney = value => {
    const amount = Number(value || 0);
    const absolute = Math.abs(amount);
    if (absolute >= 1000000) return `R$ ${(amount / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
    if (absolute >= 1000) return `R$ ${(amount / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
    return `R$ ${amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};

export const ChartFluxo = {
    render: (state, dbData, instances) => {
        const canvas = document.getElementById('reportsFluxoChart');
        if (instances.reportsFluxo) {
            instances.reportsFluxo.destroy();
            instances.reportsFluxo = null;
        }
        if (!canvas) return;

        const model = buildCashflowModel(dbData, state?.reportCashflowPeriod || 1);
        if (!model.hasMovement) return;
        const labels = model.buckets.map(bucket => bucket.label);
        const values = model.buckets.map(bucket => bucket.acumulado);
        const text = cssToken('--c-text-secondary', '#65716B');
        const border = cssToken('--c-border', '#DCE2DB');
        const brand = cssToken('--c-brand-medium', '#8170B5');
        const surface = cssToken('--c-surface', '#FFFEFB');
        const labelStep = model.isDaily ? Math.max(1, Math.ceil(labels.length / 8)) : 1;

        instances.reportsFluxo = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Fluxo acumulado',
                    data: values,
                    borderColor: brand,
                    backgroundColor: `${brand}22`,
                    fill: true,
                    tension: 0.28,
                    pointRadius: model.isDaily ? 0 : 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: brand,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'bottom', labels: { color: text, usePointStyle: true, padding: 18, font: { family: 'Inter', size: 11 } } },
                    tooltip: {
                        backgroundColor: surface,
                        titleColor: text,
                        bodyColor: text,
                        borderColor: border,
                        borderWidth: 1,
                        callbacks: {
                            label: context => ` ${formatMoney(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        border: { display: false },
                        grid: { color: border, borderDash: [4, 4] },
                        ticks: { color: text, maxTicksLimit: 6, callback: value => formatAxisMoney(value) }
                    },
                    x: {
                        border: { display: false },
                        grid: { display: false },
                        ticks: { color: text, autoSkip: false, maxRotation: 0, callback: (_, index) => index % labelStep === 0 ? labels[index] : '' }
                    }
                }
            }
        });
    }
};
