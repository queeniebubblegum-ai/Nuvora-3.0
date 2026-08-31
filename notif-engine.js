import { UtilDate } from './util-date.js';
import { db, Database } from './db.js';

export const NotifEngine = {
    engine: () => {
        if (!db.configNotificacoes) return;
        
        // Dispara as verificações de acordo com as preferências do utilizador
        if (db.configNotificacoes.contasAtivo) NotifEngine.checkContas();
        if (db.configNotificacoes.orcamentoAtivo) NotifEngine.checkOrcamentos();
        if (db.configNotificacoes.metasAtivo) NotifEngine.checkMetas();
    },

    addNotification: (tipo, titulo, mensagem, icone, cor) => {
        const hojeStr = UtilDate.localISODate();
        
        // Evita criar a mesma notificação repetidamente no mesmo dia
        const jaExiste = db.notificacoes.find(n => 
            n.titulo === titulo && 
            n.data.split('T')[0] === hojeStr
        );

        if (!jaExiste) {
            Database.add('notificacoes', {
                id: Date.now() + Math.floor(Math.random() * 1000),
                tipo,
                titulo,
                mensagem,
                icone,
                cor,
                lida: false,
                data: new Date().toISOString()
            });
        }
    },

    checkContas: () => {
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        
        const diasAviso = db.configNotificacoes.contasDias || 3;
        const limiteAviso = new Date(hoje);
        limiteAviso.setDate(hoje.getDate() + diasAviso);

        db.agendamentos.forEach(conta => {
            if (conta.status !== 'pendente') return;

            const vencimento = new Date(conta.dataVencimento + 'T12:00:00');
            vencimento.setHours(0,0,0,0);

            if (vencimento < hoje) {
                NotifEngine.addNotification(
                    'conta_atrasada',
                    'Conta Vencida',
                    `A conta "${conta.desc}" venceu dia ${conta.dataVencimento.split('-').reverse().join('/')}. Regularize para evitar juros.`,
                    'fa-triangle-exclamation',
                    'text-danger'
                );
            } else if (vencimento >= hoje && vencimento <= limiteAviso) {
                const diffTime = Math.abs(vencimento - hoje);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let msg = diffDays === 0 ? 'vence HOJE' : `vence em ${diffDays} dia(s)`;
                
                NotifEngine.addNotification(
                    'conta_proxima',
                    'Vencimento Próximo',
                    `Atenção: A conta "${conta.desc}" ${msg}.`,
                    'fa-calendar-exclamation',
                    'text-warning'
                );
            }
        });
    },

    checkOrcamentos: () => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = hoje.getMonth();
        const limitePct = db.configNotificacoes.orcamentoPct || 80;

        const transacoesMes = Database.getTransacoesPorMes(ano, mes).filter(t => t.tipo === 'despesa' && !t.transferenciaInterna);
        const gastosPorCat = {};
        transacoesMes.forEach(t => {
            gastosPorCat[t.categoria] = (gastosPorCat[t.categoria] || 0) + t.valor;
        });

        db.orcamentos.forEach(orc => {
            const gasto = gastosPorCat[orc.categoria] || 0;
            const pct = (gasto / orc.limite) * 100;

            if (pct >= 100) {
                NotifEngine.addNotification(
                    'orcamento_estourado',
                    'Orçamento Estourado',
                    `Você ultrapassou o limite definido para a categoria ${orc.categoria}.`,
                    'fa-chart-pie',
                    'text-danger'
                );
            } else if (pct >= limitePct) {
                NotifEngine.addNotification(
                    'orcamento_alerta',
                    'Atenção ao Orçamento',
                    `Você já consumiu ${pct.toFixed(0)}% do orçamento de ${orc.categoria} deste mês.`,
                    'fa-chart-pie',
                    'text-warning'
                );
            }
        });
    },

    checkMetas: () => {
        const hoje = new Date();
        db.metas.forEach(meta => {
            if (meta.atual >= meta.alvo) {
                NotifEngine.addNotification(
                    'meta_atingida',
                    'Meta Alcançada! 🎉',
                    `Parabéns! Você atingiu o objetivo da meta "${meta.nome}".`,
                    'fa-bullseye',
                    'text-success'
                );
                return;
            }

            if (meta.data) {
                const dataAlvo = new Date(meta.data + 'T12:00:00');
                const diffTime = dataAlvo - hoje;
                const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diasRestantes > 0 && diasRestantes <= 15 && (meta.atual / meta.alvo) < 0.9) {
                    NotifEngine.addNotification(
                        'meta_prazo',
                        'Reta Final da Meta',
                        `Faltam apenas ${diasRestantes} dias para o prazo da meta "${meta.nome}" e você ainda não atingiu o valor.`,
                        'fa-flag-checkered',
                        'text-brand-medium'
                    );
                }
            }
        });
    }
};