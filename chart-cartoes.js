import { Database } from './db.js';

export const ChartCartoes = {
    render: (state, instances) => {
        const ctxCart = document.getElementById('reportsCartoesChart');
        if (!ctxCart) return;

        const periodCart = state.reportPeriod || 6;
        const months = []; const data = [];
        const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
        const today = new Date();
        
        for (let i = 0; i < periodCart; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            months.push(`${monthNames[d.getMonth()]}/${d.getFullYear().toString().substr(-2)}`);
            
            const comprasCartao = Database.getComprasCartaoPorMes(d.getFullYear(), d.getMonth());
            const exp = comprasCartao.reduce((a,b) => a+b.valor, 0);
            
            data.push(exp);
        }
        
        if (instances.reportsCartoes) instances.reportsCartoes.destroy();
        
        instances.reportsCartoes = new Chart(ctxCart, {
            type: 'bar',
            data: { 
                labels: months, 
                datasets: [{ data: data, backgroundColor: '#D97706', barThickness: 40, borderRadius: 4 }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } }, 
                scales: { 
                    y: { border: { display: false }, grid: { color: '#E6E8EF', borderDash: [5,5] }, ticks: { callback: v => 'R$'+(v/1000)+'k' } }, 
                    x: { border: { display: false }, grid: { display: false } } 
                } 
            }
        });
    }
};