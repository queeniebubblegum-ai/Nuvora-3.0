import { MentorMath } from './mnt-math.js';
import { MentorSemantics } from './mnt-semantics.js';

export const MentorEngine = {
    calculateMentorScore: (data) => {
        const {
            hasBancos,
            hasTransacoes,
            totalTransacoes,
            totalIncome,
            totalExpenses,
            creditCardUsage,
            futureCommitments,
            currentBalance,
            usuario,
            ghostSubscriptions // Recebido do extrator preditivo
        } = data;

        const knowledgeInfo = MentorEngine.calculateKnowledgeScore(usuario);
        const style = usuario?.mentorStyle || 'equilibrado';

        if (!hasBancos) {
            const texts = MentorSemantics.getOnboardingText(1);
            return {
                score: "-", classification: texts.classification, tone: "positivo_estrategico",
                pillars: { fluxoCaixa: 0, reservas: 0, credito: 0, futuro: 0 },
                insights: texts.insights, knowledgeInfo, recommendation: texts.recommendation,
                onboardingAction: { label: "Criar Conta Bancária", action: "openModal", modal: "modal-banco" },
                isOnboarding: true, userLevel: 1
            };
        }

        if (!hasTransacoes) {
            const texts = MentorSemantics.getOnboardingText(2);
            return {
                score: "-", classification: texts.classification, tone: "positivo_estrategico",
                pillars: { fluxoCaixa: 0, reservas: 0, credito: 0, futuro: 0 },
                insights: texts.insights, knowledgeInfo, recommendation: texts.recommendation,
                onboardingAction: { label: "Fazer Primeiro Lançamento", action: "openModal", modal: "modal-transacao", type: "despesa" },
                isOnboarding: true, userLevel: 1
            };
        }

        if (totalTransacoes < 4) {
            const texts = MentorSemantics.getOnboardingText(3);
            return {
                score: "-", classification: texts.classification, tone: "positivo_estrategico",
                pillars: { fluxoCaixa: 0, reservas: 0, credito: 0, futuro: 0 },
                insights: texts.insights, knowledgeInfo, recommendation: texts.recommendation,
                onboardingAction: { label: "Continuar Lançando", action: "openModal", modal: "modal-transacao", type: "despesa" },
                isOnboarding: true, userLevel: 1
            };
        }

        const margin = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
        const coverageMonths = totalExpenses > 0 ? currentBalance / totalExpenses : 0;
        
        let userLevel = 1; 
        if (coverageMonths >= 1) {
            userLevel = 3; 
        } else if (margin > 0 || currentBalance > 0 || data.hasMetas) {
            userLevel = 2; 
        }

        const pillars = {
            fluxoCaixa: MentorMath.calculateCashflowHealth(totalIncome, totalExpenses),
            reservas: MentorMath.calculateReservesHealth(currentBalance, totalExpenses),
            credito: MentorMath.calculateCreditHealth(creditCardUsage, totalIncome),
            futuro: MentorMath.calculateFutureSecurity(totalIncome, futureCommitments)
        };

        const finalScore = Math.round((pillars.fluxoCaixa + pillars.reservas + pillars.credito + pillars.futuro) / 4);
        const classification = MentorSemantics.getClassification(finalScore);
        const tone = MentorSemantics.getTone(finalScore, style);
        
        const technicalInsights = MentorSemantics.generateInsights(pillars, data, userLevel, style);
        const behavioralInsights = MentorSemantics.generateBehavioralInsights(data, userLevel, style);
        
        let suggestedAction = null;

        // INJEÇÃO DA IA PREDITIVA (Assinaturas Fantasmas)
        if (ghostSubscriptions && ghostSubscriptions.length > 0) {
            const g = ghostSubscriptions[0];
            const formatMoney = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
            
            // Adiciona o insight preditivo no topo
            technicalInsights.unshift(`👻 Assinatura Fantasma: Notei que você pagou ${formatMoney(g.valor)} para '${g.desc}' nos últimos meses. Como não está agendado, seu Saldo Livre parece maior do que realmente é. Vamos oficializar isso?`);
            
            // Sobrescreve a ação do botão principal
            suggestedAction = {
                label: `Agendar ${g.firstWord.charAt(0).toUpperCase() + g.firstWord.slice(1)}`,
                action: "openModal",
                modal: "modal-agendamento"
            };
        }

        const insights = [...technicalInsights, ...behavioralInsights].slice(0, 4);
        const recommendation = MentorSemantics.generateMainRecommendation(pillars, data, userLevel, style);

        return {
            score: finalScore,
            classification,
            tone,
            pillars,
            insights,
            knowledgeInfo,
            recommendation,
            onboardingAction: suggestedAction,
            isOnboarding: false,
            userLevel
        };
    },

    calculateKnowledgeScore: (usuario) => {
        const camposChave = ['nome', 'objetivoPrincipal', 'rendaMensalMedia', 'limiteCartaoGlobal'];
        let preenchidos = 0; let proximoPasso = null;
        if (!usuario) usuario = {};

        camposChave.forEach(campo => {
            if (usuario[campo] && usuario[campo] !== '') preenchidos++;
            else if (!proximoPasso) proximoPasso = campo;
        });

        const score = Math.round((preenchidos / camposChave.length) * 100);
        return { score, perguntaOnboarding: MentorSemantics.getKnowledgeQuestions(proximoPasso), isCompleto: score === 100 };
    },

    // NOVO MOTOR: Escaner de Padrões Repetitivos
    detectGhostSubscriptions: (db) => {
        if (!db || !db.transacoes) return [];

        const hoje = new Date();
        const dataLimite = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);

        const despesasRecentes = db.transacoes.filter(t =>
            t.tipo === 'despesa' &&
            !t.recorrente && 
            new Date(t.data || t.id) >= dataLimite
        );

        const map = {};
        despesasRecentes.forEach(t => {
            if (!t.desc) return;
            const normDesc = t.desc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const firstWord = normDesc.split(' ')[0];

            // Filtro anti-ruído para palavras muito comuns
            if (firstWord.length < 3 || ['pagamento', 'compra', 'pix', 'transferencia', 'ted', 'doc', 'iof', 'tarifa'].includes(firstWord)) return;

            const key = `${firstWord}_${t.valor}`;
            if(!map[key]) map[key] = { desc: t.desc, valor: t.valor, datas: [], categoria: t.categoria, firstWord };
            map[key].datas.push(new Date(t.data || t.id));
        });

        const ghosts = [];
        for (const key in map) {
            const item = map[key];
            const meses = new Set(item.datas.map(d => d.getMonth()));
            // Se ocorreu em pelo menos 2 meses distintos
            if (meses.size >= 2) {
                // Checa se o usuário já não programou isso no futuro
                const isAgendado = (db.agendamentos || []).some(a =>
                    a.status === 'pendente' &&
                    a.desc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(item.firstWord) &&
                    Math.abs(a.valor - item.valor) < 5
                );

                if (!isAgendado) ghosts.push(item);
            }
        }
        return ghosts.sort((a,b) => b.valor - a.valor);
    },
    
    extrairDadosParaAnora: (db, databaseManager) => {
        const agora = new Date();
        const mesAtual = agora.getMonth();
        const anoAtual = agora.getFullYear();

        let mesPassado = mesAtual - 1; let anoPassado = anoAtual;
        if (mesPassado < 0) { mesPassado = 11; anoPassado--; }

        let totalIncome = 0; let totalExpenses = 0; let creditCardUsage = 0; let futureCommitments = 0;
        let pastIncome = 0; let pastExpenses = 0; let expensesByCategory = {};

        db.transacoes.forEach(t => {
            const dataTransacao = new Date((t.data || t.id) + 'T12:00:00');
            const mesTrans = dataTransacao.getMonth(); const anoTrans = dataTransacao.getFullYear();

            if (mesTrans === mesAtual && anoTrans === anoAtual) {
                if (t.tipo === 'receita') totalIncome += t.valor;
                else if (t.tipo === 'despesa') {
                    totalExpenses += t.valor;
                    if (t.isCartao) creditCardUsage += t.valor;
                    const cat = t.categoria || 'Outros';
                    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.valor;
                }
            }
            if (mesTrans === mesPassado && anoTrans === anoPassado) {
                 if (t.tipo === 'receita') pastIncome += t.valor;
                 else if (t.tipo === 'despesa') pastExpenses += t.valor;
            }
            if (anoTrans > anoAtual || (anoTrans === anoAtual && mesTrans > mesAtual)) {
                if (t.tipo === 'despesa') futureCommitments += t.valor;
            }
        });

        const currentBalance = databaseManager.getTotals().saldo;
        const hojeObj = new Date(); hojeObj.setHours(0, 0, 0, 0);
        const limitePrevisao = new Date(hojeObj); limitePrevisao.setDate(hojeObj.getDate() + 15);
        let upcomingBillsTotal = 0;

        if (db.agendamentos) {
            db.agendamentos.forEach(a => {
                if (a.status === 'pendente' && (!a.tipo || a.tipo === 'despesa')) {
                    const dataVenc = new Date(a.dataVencimento + 'T12:00:00');
                    if (dataVenc >= hojeObj && dataVenc <= limitePrevisao) upcomingBillsTotal += a.valor;
                }
            });
        }

        // INJEÇÃO: Executa a detecção preditiva e acopla ao pacote de dados da Anora
        const ghostSubscriptions = MentorEngine.detectGhostSubscriptions(db);

        return {
            hasBancos: db.bancos.length > 0,
            hasTransacoes: db.transacoes.length > 0,
            hasMetas: db.metas && db.metas.length > 0,
            totalTransacoes: db.transacoes.length,
            totalIncome, totalExpenses, creditCardUsage, futureCommitments,
            currentBalance, pastIncome, pastExpenses, upcomingBillsTotal,
            expensesByCategory, usuario: db.usuario || {},
            ghostSubscriptions
        };
    }
};