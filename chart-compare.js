import { Database } from './db.js';

export const ChartCompare = {
    render: (state, instances) => {
        const ctxComp = document.getElementById('reportsCompChart');
        if (!ctxComp) return;

        const periodComp = state.reportPeriod || 6;
        const months = []; const incomes = []; const expenses = [];
        const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
        const today = new Date();
        
        for (let i = periodComp - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(`${monthNames[d.getMonth()]}/${d.getFullYear().toString().substr(-2)}`);
            
            const tr = Database.getTransacoesPorMes(d.getFullYear(), d.getMonth());
            
            incomes.push(tr.filter(t => t.tipo === 'receita' && !t.transferenciaInterna).reduce((a, b) => a + b.valor, 0));
            expenses.push(tr.filter(t => t.tipo === 'despesa' && !t.transferenciaInterna).reduce((a, b) => a + b.valor, 0));
        }
        
        if (instances.reportsCompare) instances.reportsCompare.destroy();
        
        instances.reportsCompare = new Chart(ctxComp, {
            type: 'bar',
            data: { 
                labels: months, 
                datasets: [ 
                    { label: 'Receitas', data: incomes, backgroundColor: '#16A34A', borderRadius: 0 }, 
                    { label: 'Despesas', data: expenses, backgroundColor: '#DC2626', borderRadius: 0 } 
                ] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } 
                }, 
                scales: { 
                    y: { border: { display: false }, grid: { color: '#E6E8EF', borderDash: [5,5] } }, 
                    x: { border: { display: false }, grid: { display: false } } 
                } 
            }
        });
    }
};