export const ChartPatrimonio = {
    render: (state, dbData, instances) => {
        const ctxPatr = document.getElementById('reportsPatrimonioChart');
        if (!ctxPatr) return;

        const periodPatr = state.reportPeriod || 6;
        const months = []; const sBancario = []; const sMetas = [];
        const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
        const today = new Date();
        const saldoAt = dbData.bancos.reduce((a,b)=>a+b.saldo, 0);
        const metaAt = dbData.metas.reduce((a,b)=>a+b.atual, 0);
        
        for (let i = periodPatr - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(`${monthNames[d.getMonth()]}/${d.getFullYear().toString().substr(-2)}`);
            sBancario.push(Math.max(0, saldoAt - (i * (saldoAt * 0.15)))); 
            sMetas.push(Math.max(0, metaAt - (i * (metaAt * 0.05))));
        }
        
        if (instances.reportsPatrimonio) instances.reportsPatrimonio.destroy();
        
        instances.reportsPatrimonio = new Chart(ctxPatr, {
            type: 'line',
            data: { 
                labels: months, 
                datasets: [
                    { label: 'Saldo Bancário', data: sBancario, borderColor: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.12)', fill: true, tension: 0.4 },
                    { label: 'Metas', data: sMetas, borderColor: '#7C3AED', backgroundColor: 'transparent', fill: false, tension: 0.4 }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } }, 
                scales: { 
                    y: { border: { display: false }, grid: { color: '#E6E8EF', borderDash: [5,5] }, ticks: { callback: v => 'R$'+(v/1000)+'k' } }, 
                    x: { border: { display: false }, grid: { display: false } } 
                } 
            }
        });
    }
};