import { Database } from './db.js';

export const ChartCategorias = {
    renderReportChart: (instances) => {
        const ctxCat = document.getElementById('reportsCatChart');
        if (!ctxCat) return;

        const cats = {}; const hoje = new Date();
        const transacoesMes = Database.getTransacoesPorMes(hoje.getFullYear(), hoje.getMonth());
        
        transacoesMes.filter(t => t.tipo === 'despesa').forEach(t => {
            if(!cats[t.categoria]) cats[t.categoria] = 0;
            cats[t.categoria] += t.valor;
        });
        const labels = Object.keys(cats); const data = Object.values(cats);
        
        // Soft variations within purple-neutral spectrum
        const bgColors = ['#CDBCF2', '#D8C8F8', '#E5DAFB', '#E6E8EF', '#D9D9E3', '#B8A6D9', '#6C3BB6', '#1F0F42'];
        
        if (instances.reportsCategoria) instances.reportsCategoria.destroy();
        instances.reportsCategoria = new Chart(ctxCat, {
            type: 'doughnut',
            data: { labels: labels, datasets: [{ data: data, backgroundColor: bgColors, borderWidth: 2, borderColor: '#FFFFFF', hoverOffset: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
        });
    },

    renderPageChart: (db) => {
        const ctx = document.getElementById('categoriasPageChart');
        if (!ctx) return;
        
        if (window.categoriasPageChartInstance) {
            window.categoriasPageChartInstance.destroy();
        }

        const hoje = new Date();
        const trMes = db.transacoes.filter(t => {
            if (t.tipo !== 'despesa') return false;
            const d = new Date(t.data || t.id);
            return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
        });

        const gastosPorCat = {};
        trMes.forEach(t => {
            if (!gastosPorCat[t.categoria]) gastosPorCat[t.categoria] = 0;
            gastosPorCat[t.categoria] += t.valor;
        });

        const labels = [];
        const data = [];
        const colors = [];

        Object.entries(gastosPorCat)
            .sort((a, b) => b[1] - a[1])
            .forEach(([cat, val]) => {
                labels.push(cat);
                data.push(val);
                const catObj = db.categorias.find(c => c.nome === cat);
                colors.push(catObj && catObj.cor ? catObj.cor : '#6C3BB6');
            });

        if (data.length === 0) {
            labels.push('Sem despesas');
            data.push(1);
            colors.push('#334155');
        }

        const isDark = document.documentElement.classList.contains('dark');

        window.categoriasPageChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: isDark ? '#1E293B' : '#FFFFFF',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.label === 'Sem despesas') return ' R$ 0,00';
                                return ' R$ ' + Number(context.raw || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            }
                        }
                    }
                }
            }
        });
    }
};