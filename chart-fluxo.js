import { Database } from './db.js';

export const ChartFluxo = {
    render: (dbData, instances) => {
        const ctxFluxo = document.getElementById('reportsFluxoChart');
        if (!ctxFluxo) return;

        const hoje = new Date();
        const diasMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
        const labels = []; const saldos = [];
        let acumulado = 0;
        
        const transacoesMes = Database.getTransacoesPorMes(hoje.getFullYear(), hoje.getMonth());

        for(let i = 1; i <= diasMes; i++) {
            labels.push(`${i < 10 ? '0'+i : i}/${hoje.getMonth() < 9 ? '0'+(hoje.getMonth()+1) : hoje.getMonth()+1}`);
            const trDia = transacoesMes.filter(t => {
                const dt = new Date(t.data || t.id);
                return dt.getDate() === i;
            });
            const rec = trDia.filter(t => t.tipo === 'receita' && !t.transferenciaInterna).reduce((a,b)=>a+b.valor,0);
            const des = trDia.filter(t => t.tipo === 'despesa' && !t.transferenciaInterna).reduce((a,b)=>a+b.valor,0);
            acumulado += (rec - des);
            saldos.push(acumulado);
        }
        
        if (instances.reportsFluxo) instances.reportsFluxo.destroy();
        
        instances.reportsFluxo = new Chart(ctxFluxo, {
            type: 'line',
            data: { 
                labels: labels, 
                datasets: [{ 
                    label: 'Saldo Acumulado', 
                    data: saldos, 
                    borderColor: '#2563EB', 
                    backgroundColor: 'rgba(37, 99, 235, 0.12)', 
                    fill: true, 
                    tension: 0.4 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { position: 'bottom', labels: { usePointStyle: true } } 
                }, 
                scales: { 
                    y: { grid: { borderDash: [5, 5], color: '#E6E8EF' } }, 
                    x: { grid: { display: false } } 
                } 
            }
        });
    }
};