export const MentorSemantics = {
    getClassification: () => 'Revisão dos registros',

    // A PERSONALIDADE: Tom de Voz adaptável baseado na escolha
    getTone: (score, style = 'equilibrado') => {
        if (style === 'suave') {
            // No modo suave, a Anora sempre apoia. O pior estado é "equilibrado".
            if (score >= 60) return "positivo_estrategico"; 
            return "equilibrado";           
        }
        
        if (style === 'rigoroso') {
            // Foco extremo: Zero elogios tranquilos. Sempre puxando a corda.
            if (score >= 70) return "alerta_direto";         
            return "brutalmente_honesta";                    
        }

        // Modo equilibrado (Padrão)
        if (score >= 80) return "positivo_estrategico"; 
        if (score >= 60) return "equilibrado";           
        if (score >= 40) return "alerta_direto";         
        return "brutalmente_honesta";                    
    },

    generateInsights: (_pillars, data) => {
        const insights = [];
        const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
        if (data.upcomingBillsTotal > 0 && data.currentBalance < data.upcomingBillsTotal) {
            insights.push(`Os compromissos registrados para os próximos 15 dias superam o saldo registrado em ${money(data.upcomingBillsTotal - data.currentBalance)}. Confira vencimentos e entradas previstas.`);
        }
        if (data.totalIncome > 0) {
            const ratio = ((Number(data.totalExpenses) || 0) / data.totalIncome * 100).toFixed(1);
            insights.push(`O consumo registrado representa ${ratio}% das receitas cadastradas neste período. Consulte as categorias para entender a composição.`);
        } else if (data.totalExpenses > 0) {
            insights.push('Há despesas cadastradas e nenhuma receita registrada neste período. Confira se os registros estão completos antes de comparar os valores.');
        }
        if (data.creditCardUsage > 0) insights.push(`Há ${money(data.creditCardUsage)} de compras registradas no cartão. Consulte faturas e pagamentos; limite de crédito não compõe o saldo das contas.`);
        if (data.futureCommitments > 0) insights.push(`Existem ${money(data.futureCommitments)} de compromissos futuros cadastrados. As datas e os pagamentos podem ser conferidos no Planejamento.`);
        return insights;
    },

    generateBehavioralInsights: data => {
        const entries = Object.entries(data.expensesByCategory || {}).filter(([, value]) => Number(value) > 0).sort((a,b) => Number(b[1]) - Number(a[1]));
        if (!entries.length) return [];
        const [category, amount] = entries[0];
        return [`Entre as categorias registradas neste período, ${category} tem o maior valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}. Consulte os lançamentos para conferir os detalhes.`];
    },

    generateMainRecommendation: (pillars, data) => {
        if (data.upcomingBillsTotal > 0 && data.currentBalance < data.upcomingBillsTotal) return 'Compare os próximos vencimentos com o saldo registrado e as entradas previstas. Os valores dependem dos dados que você cadastrou.';
        const lowest = Object.keys(pillars).reduce((a,b) => pillars[a] < pillars[b] ? a : b, 'fluxoCaixa');
        return {
            fluxoCaixa: 'Consulte receitas e despesas do período e confira os registros com seu extrato.',
            reservas: 'Revise suas metas e os valores destinados a elas. A reserva é virtual, permanece no saldo da conta e não gera rendimento por si só.',
            credito: 'Confira a fatura, os pagamentos registrados e o saldo devedor antes de planejar novas compras.',
            futuro: 'Consulte os compromissos dos próximos meses e confira quais ainda estão pendentes.'
        }[lowest] || 'Revise as movimentações recentes e as pendências de conferência para acompanhar seus recursos.';
    },

    getOnboardingText: (step) => {
        if (step === 1) {
            return {
                classification: "Passo 1 de 3",
                insights: [
                    "Bem-vindo(a) ao Avenera! Eu sou a Anora, sua mentora financeira.",
                    "Não importa se você nunca cuidou do seu dinheiro antes. Vamos dar um passo de cada vez.",
                    "Para começarmos, precisamos de uma base para organizar as suas coisas."
                ],
                recommendation: "Sua primeira missão: Crie a sua Conta Bancária principal clicando no botão abaixo."
            };
        }
        if (step === 2) {
            return {
                classification: "Passo 2 de 3",
                insights: [
                    "Excelente! Sua primeira conta foi criada com sucesso.",
                    "A parte mais difícil é dar o primeiro passo, e você já deu. Agora, vamos alimentar o sistema."
                ],
                recommendation: "Sua missão: Registre a sua primeira receita (como o seu salário) ou a sua primeira despesa."
            };
        }
        if (step === 3) {
            return {
                classification: "Passo 3 de 3",
                insights: [
                    "Ótimo começo! Você já tem uma conta e registrou seu primeiro lançamento.",
                    "Agora defina um limite para transformar seus gastos em um plano claro."
                ],
                recommendation: "Sua última missão inicial: defina um limite de orçamento para acompanhar seu mês."
            };
        }
    },

    getKnowledgeQuestions: (proximoPasso) => {
        if (proximoPasso === 'nome') return "Como você prefere ser chamado(a)?";
        if (proximoPasso === 'objetivoPrincipal') return "Para onde estamos remando? Defina um objetivo nas suas configurações para eu te ajudar a chegar lá.";
        if (proximoPasso === 'limiteCartaoGlobal') return "Para te proteger do endividamento, qual é o limite total dos seus cartões hoje? Você pode adicionar isso no perfil.";
        if (proximoPasso === 'rendaMensalMedia') return "Qual é a sua expectativa de renda mensal? Assim posso te avisar se os gastos saírem do limite.";
        return null;
    }
};