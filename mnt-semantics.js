export const MentorSemantics = {
    getClassification: (score) => {
        if (score >= 80) return "Estrategista";
        if (score >= 65) return "Equilibrado";
        if (score >= 50) return "Vulnerável";
        return "Crítico";
    },

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

    generateInsights: (pillars, data, level, style = 'equilibrado') => {
        const insights = [];
        const marginPct = data.totalIncome > 0 ? (((data.totalIncome - data.totalExpenses) / data.totalIncome) * 100).toFixed(1) : 0;
        const creditPct = data.totalIncome > 0 ? ((data.creditCardUsage / data.totalIncome) * 100).toFixed(1) : 0;
        const coverage = data.totalExpenses > 0 ? (data.currentBalance / data.totalExpenses).toFixed(1) : 0;

        const formatMoney = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

        if (data.upcomingBillsTotal > 0) {
            if (data.currentBalance < data.upcomingBillsTotal) {
                const deficit = data.upcomingBillsTotal - data.currentBalance;
                insights.unshift(`🚨 Alerta de Liquidez: Faltam ${formatMoney(deficit)} para cobrir as contas dos próximos 15 dias. Prioridade máxima em fazer caixa agora.`);
            }
        }

        if (pillars.fluxoCaixa < 60) {
            if (level === 1) insights.push(`Seus gastos estão muito próximos do que você ganha. Tente cortar pequenos luxos esta semana para sobrar um pouco no fim do mês.`);
            else if (level === 2) insights.push(`Sua margem de sobra está apertada (${marginPct}%). É vital fazer o fluxo de caixa fechar no azul para conseguirmos investir nas suas metas.`);
            else insights.push(`Sua margem de liquidez está comprimida em ${marginPct}%. Isso reduz seu poder de aporte e atrasa o efeito dos juros compostos no patrimônio.`);
        }

        if (pillars.reservas < 60) {
            if (level === 1) insights.push(`Você ainda não tem um dinheiro guardado para emergências. Se um imprevisto acontecer hoje, pode ser um grande problema.`);
            else if (level === 2) insights.push(`Seu saldo cobre apenas ${coverage} meses de despesas. Vamos focar em construir um Fundo de Reserva que renda a 100% do CDI.`);
            else insights.push(`Seu índice de reserva está abaixo da margem de segurança (${coverage} meses). Seu capital está exposto a altos riscos de liquidez imediata.`);
        }

        if (pillars.credito < 60) {
            if (level === 1) insights.push(`O cartão de crédito está consumindo muito do seu dinheiro. Tente usar mais o débito para não perder o controle das contas.`);
            else if (level === 2) insights.push(`As faturas estão engolindo ${creditPct}% da sua renda. Lembre-se: limite de cartão não é extensão do salário. Precisamos reduzir essa dependência.`);
            else insights.push(`Sua alavancagem em crédito está em ${creditPct}%. Essa alta dependência de capital de terceiros compromete severamente seu fluxo de caixa futuro.`);
        }

        if (pillars.futuro < 60) {
            if (level === 1) insights.push(`Você tem muitas contas parceladas para os próximos meses. Tente parar de parcelar por um tempo para aliviar o seu futuro.`);
            else if (level === 2) insights.push(`Suas dívidas futuras estão se acumulando. O seu 'eu' de amanhã já deve ${formatMoney(data.futureCommitments)}. Vamos quitar isso antes de novas compras.`);
            else insights.push(`O excesso de compromissos futuros está ancorando seu patrimônio. Você tem ${formatMoney(data.futureCommitments)} travados, reduzindo drasticamente sua flexibilidade financeira.`);
        }

        if (data.pastIncome > 0) {
            const pastMargin = (data.pastIncome - data.pastExpenses) / data.pastIncome;
            const currentMargin = data.totalIncome > 0 ? (data.totalIncome - data.totalExpenses) / data.totalIncome : 0;
            
            if (currentMargin > pastMargin && currentMargin > 0.05) {
                if (level === 1) insights.push(`Muito bem! Este mês você está conseguindo organizar o dinheiro melhor do que no mês passado.`);
                else if (level === 2) insights.push(`Excelente progresso! Você fez sobrar dinheiro. Vamos jogar esse valor numa Meta para ele começar a render juros a seu favor?`);
                else insights.push(`Sua alocação de recursos está mais eficiente. Aumento de margem de poupança detectado, otimizando seu poder de juros compostos.`);
            }
        }

        if (insights.length === 0) {
            if (style === 'rigoroso') {
                insights.push(`Métricas aceitáveis, mas a complacência destrói fortunas. Aumente seus aportes imediatamente. Seu dinheiro pode e deve trabalhar mais duro.`);
            } else {
                if (level === 1) insights.push(`Excelente! Suas contas estão em dia. Continue registrando tudo para não perder o foco.`);
                else if (level === 2) insights.push(`Tudo controlado por aqui. Aproveite o mês tranquilo para focar em aumentar os depósitos das suas Metas.`);
                else insights.push(`Índices de saúde financeira em níveis ótimos. Mantenha o foco em aportes regulares para acelerar a acumulação patrimonial.`);
            }
        }

        return insights;
    },

    generateBehavioralInsights: (data, level, style = 'equilibrado') => {
        const insights = [];
        const { expensesByCategory, totalIncome } = data;

        const gastosLazer = (expensesByCategory['Lazer'] || 0) + (expensesByCategory['Restaurante'] || 0) + (expensesByCategory['Alimentação'] || 0);
        if (totalIncome > 0 && (gastosLazer / totalIncome) > 0.25) {
            if (level === 1) insights.push(`Notei que você gastou bastante com lazer e comida fora. Fique de olho para não faltar dinheiro para o básico.`);
            else if (level === 2) insights.push(`Você está destinando mais de 25% da sua renda para estilo de vida. Cuidado para isso não roubar o dinheiro que iria para suas Metas.`);
            else insights.push(`Alerta de alocação: Despesas discricionárias (Lazer/Desejos) excederam 25% da receita líquida, reduzindo a eficiência do seu capital de giro.`);
        }

        return insights;
    },

    generateMainRecommendation: (pillars, data, level, style = 'equilibrado') => {
        if (data.upcomingBillsTotal > 0 && data.currentBalance < data.upcomingBillsTotal) {
            return "Ação imediata: Congele gastos não essenciais. Foco absoluto em gerar caixa para cobrir as contas iminentes e evitar juros de atraso.";
        }
        
        // INTERCEPTAÇÃO DA PERSONALIDADE RIGOROSA E SUAVE
        if (style === 'rigoroso' && pillars.fluxoCaixa < 90) {
            return "Ação tática extrema (Modo Rigoroso): Corte imediatamente todas as despesas variáveis não essenciais. Cada centavo fora do planejamento afasta você da sua liberdade financeira.";
        }
        
        if (style === 'suave' && (pillars.fluxoCaixa < 60 || pillars.credito < 60)) {
            return "Conselho da Anora (Modo Suave): Respire fundo. Organizar o dinheiro leva tempo. Vamos começar focando apenas em anotar tudo para entendermos o cenário atual com calma.";
        }

        const lowestPillar = Object.keys(pillars).reduce((a, b) => pillars[a] < pillars[b] ? a : b);

        switch (lowestPillar) {
            case "fluxoCaixa":
                return level === 1 ? "Ação sugerida: Anote todos os seus pequenos gastos desta semana para descobrirmos para onde o dinheiro está fugindo." :
                       level === 2 ? "Ação imediata: Estanque a sangria. Corte o supérfluo esta semana para aumentar sua margem real de investimento." :
                       "Ação estratégica: Audite seu DRE pessoal. Elimine despesas fixas ineficientes para restaurar o break-even point do mês.";
            case "reservas":
                return level === 1 ? "Ação sugerida: Tente separar qualquer R$ 10 ou R$ 20 que sobrar hoje e deixe guardado numa conta separada." :
                       level === 2 ? "Ação imediata: Blindagem de caixa. Todo o dinheiro extra deve ir para o seu Fundo de Reserva antes de qualquer outro luxo." :
                       "Ação estratégica: Aporte máximo em liquidez diária. Suspenda investimentos de risco até que a cobertura de emergência atinja o ideal.";
            case "credito":
                return level === 1 ? "Ação sugerida: Esconda o cartão de crédito da carteira. Pague suas próximas compras apenas no Pix ou débito." :
                       level === 2 ? "Ação imediata: Congele o limite. Pague tudo à vista até a sua dependência do cartão cair para níveis seguros." :
                       "Ação estratégica: Desalavancagem ativa. Liquidar faturas pendentes é o melhor investimento atual, garantindo retorno igual à taxa de juros poupada.";
            case "futuro":
                return level === 1 ? "Ação sugerida: Cuidado com os parcelamentos. Não divida mais nenhuma compra, mesmo que seja 'sem juros'." :
                       level === 2 ? "Ação imediata: Fim de novos parcelamentos. Seu futuro já está sobrecarregado. Pague o que deve antes de assumir novas dívidas." :
                       "Ação estratégica: Risco de passivo longo. Cesse compromissos parcelados e foque em amortizar os grupos de dívidas existentes para liberar caixa futuro.";
            default:
                return level === 1 ? "Você está indo muito bem! Continue cuidando do seu dinheiro." :
                       level === 2 ? "Cenário equilibrado. Acelere os depósitos nas suas Metas Financeiras para aproveitar o rendimento." :
                       "Cenário ótimo. Foque em maximizar os aportes e diversificar sua carteira de investimentos.";
        }
    },

    getOnboardingText: (step) => {
        if (step === 1) {
            return {
                classification: "Passo 1 de 3",
                insights: [
                    "Bem-vindo(a) ao Nuvora! Eu sou a Anora, sua mentora financeira.",
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
                classification: "Fase de Aprendizado",
                insights: [
                    "Ótimo começo! Já registrei as suas primeiras movimentações.",
                    "Para eu conseguir calcular a sua saúde financeira de forma precisa, preciso de mais alguns lançamentos."
                ],
                recommendation: "Continue registrando os seus gastos de hoje. Em breve destravaremos seu Nível Financeiro!"
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