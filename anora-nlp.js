import { db, Database } from './db.js';
import { Utils } from './utils.js';

export const AnoraNLP = {
    processarMensagem: (mensagem) => {
        // 1. Limpar e normalizar a mensagem (minúsculas, sem acentos)
        const msgLimpa = mensagem.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        const dataHojeStr = hoje.toISOString().split('T')[0];
        
        const transacoesMes = Database.getTransacoesPorMes(anoAtual, mesAtual);

        // =======================================================================
        // INTENÇÃO ALPHA: Lançamento Fast-Track (NLP de Inserção Direta)
        // Ex: "gastei 45.90 no ifood no cartao", "recebi 2000 de salario no pix"
        // =======================================================================
        const matchFastTrack = msgLimpa.match(/^(gastei|paguei|comprei|recebi|ganhei|entrou)\s+(?:r\$)?\s*(\d+(?:[.,]\d{1,2})?)(?:\s+(?:com|no|na|do|da|de|em)\s+(.+))?/);
        
        if (matchFastTrack) {
            if (db.bancos.length === 0) return "⚠️ Para fazer lançamentos rápidos, você precisa ter pelo menos uma Conta Bancária criada no sistema.";

            const acao = matchFastTrack[1];
            const valor = Math.abs(parseFloat(matchFastTrack[2].replace(',', '.')));
            let contextoRaw = matchFastTrack[3] ? matchFastTrack[3].trim() : '';

            const isReceita = ['recebi', 'ganhei', 'entrou'].includes(acao);
            const tipo = isReceita ? 'receita' : 'despesa';

            let formaPagamento = 'Dinheiro';
            let isCartao = false;

            // Extração do Método de Pagamento
            if (contextoRaw.match(/(cartao|credito)/)) {
                formaPagamento = 'Cartão de Crédito';
                isCartao = true;
                contextoRaw = contextoRaw.replace(/(no|com|via)?\s*(meu)?\s*(cartao|credito)/g, '').trim();
            } else if (contextoRaw.match(/(pix)/)) {
                formaPagamento = 'Pix';
                contextoRaw = contextoRaw.replace(/(no|com|via)?\s*(meu)?\s*pix/g, '').trim();
            } else if (contextoRaw.match(/(debito)/)) {
                formaPagamento = 'Cartão de Débito';
                contextoRaw = contextoRaw.replace(/(no|com|via)?\s*(meu)?\s*debito/g, '').trim();
            }

            const desc = contextoRaw || (isReceita ? 'Receita Rápida' : 'Despesa Rápida');

            // Categorização Inteligente e Acesso ao Cérebro (Brain) da Anora
            let categoria = 'Outros';
            if (isReceita && desc.includes('salario')) categoria = 'Salário';
            
            const baseRules = {
                'mercado': 'Alimentação', 'ifood': 'Alimentação', 'restaurante': 'Alimentação', 'padaria': 'Alimentação', 'lanche': 'Alimentação',
                'uber': 'Transporte', '99': 'Transporte', 'gasolina': 'Transporte', 'onibus': 'Transporte', 'combustivel': 'Transporte',
                'aluguel': 'Moradia', 'luz': 'Moradia', 'internet': 'Moradia', 'agua': 'Moradia',
                'netflix': 'Lazer', 'cinema': 'Lazer', 'spotify': 'Lazer',
                'farmacia': 'Saúde', 'remedio': 'Saúde', 'academia': 'Saúde',
                'faculdade': 'Educação', 'curso': 'Educação',
                'roupa': 'Compras', 'shopee': 'Compras', 'shein': 'Compras'
            };
            const customRules = JSON.parse(localStorage.getItem('nuvora_anora_brain') || '{}');
            const allRules = { ...baseRules, ...customRules };

            const descNorm = desc.replace(/\s+/g, "");
            for (const [key, cat] of Object.entries(allRules)) {
                const keyNorm = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
                if (descNorm.includes(keyNorm)) {
                    categoria = cat;
                    break;
                }
            }

            // Inserção no Banco de Dados
            if (isCartao) {
                if (db.cartoes.length === 0) return "⚠️ Você não possui um Cartão de Crédito cadastrado para registrar esta despesa.";
                const cartaoPadrao = db.cartoes[0]; 
                Database.addCardExpense({
                    desc: desc.charAt(0).toUpperCase() + desc.slice(1), 
                    total: valor, parcelas: 1, cartaoId: cartaoPadrao.id, categoria, data: dataHojeStr, contatoId: null
                });
                return `🚀 **Fast-Track:** Lançamento de **${Utils.formatMoney(valor)}** ("${desc}") salvo no cartão **${cartaoPadrao.nome}** com sucesso. Categoria deduzida: ${categoria}.`;
            } else {
                const bancoPadrao = db.bancos[0];
                Database.add('transacoes', {
                    id: Date.now(),
                    desc: desc.charAt(0).toUpperCase() + desc.slice(1), 
                    valor, tipo, categoria, bancoId: bancoPadrao.id,
                    isCartao: false,
                    formaPagamento,
                    data: dataHojeStr,
                    parcelaAtual: 1, totalParcelas: 1,
                    recorrente: false,
                    contatoId: null
                });
                return `🚀 **Fast-Track:** ${isReceita ? 'Receita' : 'Despesa'} de **${Utils.formatMoney(valor)}** ("${desc}") salva na conta **${bancoPadrao.nome}** com sucesso. Via: ${formaPagamento}.`;
            }
        }

        // 2. Intenção: Consultar Saldo
        if (msgLimpa.match(/(saldo|quanto eu tenho|na conta|dinheiro disponivel|dinheiro)/)) {
            const saldo = Database.getTotals().saldo;
            return `Neste momento, o seu saldo global em todas as contas é de **${Utils.formatMoney(saldo)}**.`;
        }

        // 3. Intenção: Consultar Gasto Específico (ex: "quanto gastei com uber", "gasto no ifood")
        const matchGastoEspecifico = msgLimpa.match(/(gastei|gasto|gastos|despesa|despesas).*(com|no|na|em)\s+([a-z0-9\s]+)/);
        if (matchGastoEspecifico) {
            // Limpar palavras de tempo do final da frase para focar no termo de busca
            let termo = matchGastoEspecifico[3].replace(/(este mes|nesse mes|hoje|agora)/g, '').trim();
            
            if (termo.length >= 2) {
                const gastosTermo = transacoesMes.filter(t => {
                    if (t.tipo !== 'despesa') return false;
                    const descLimpa = t.desc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const catLimpa = t.categoria.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return descLimpa.includes(termo) || catLimpa.includes(termo);
                });
                
                const totalTermo = gastosTermo.reduce((acc, t) => acc + t.valor, 0);
                
                if (totalTermo > 0) {
                    return `Você gastou **${Utils.formatMoney(totalTermo)}** com "${termo}" este mês, distribuídos em ${gastosTermo.length} lançamento(s).`;
                } else {
                    return `Analisei as suas contas, mas não encontrei nenhuma despesa relacionada a "${termo}" neste mês.`;
                }
            }
        }

        // 4. Intenção: Gastos Totais do Mês
        if (msgLimpa.match(/(gastei|gastos|despesa|despesas|saiu)/)) {
            const despesas = transacoesMes.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + t.valor, 0);
            return `Até agora, as suas despesas neste mês somam **${Utils.formatMoney(despesas)}**.`;
        }

        // 5. Intenção: Receitas do Mês
        if (msgLimpa.match(/(ganhei|recebi|receita|receitas|renda|entrou|salario)/)) {
            const receitas = transacoesMes.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + t.valor, 0);
            return `A sua receita acumulada deste mês é de **${Utils.formatMoney(receitas)}**.`;
        }

        // 6. Intenção: Progresso das Metas
        if (msgLimpa.match(/(meta|metas|reserva|reservas|guardei|guardado)/)) {
            if (db.metas.length === 0) return `Você ainda não tem nenhuma meta registrada. Que tal criar uma agora na aba de Metas?`;
            
            const totalGuardado = db.metas.reduce((acc, m) => acc + m.atual, 0);
            const totalAlvo = db.metas.reduce((acc, m) => acc + m.alvo, 0);
            const pct = totalAlvo > 0 ? ((totalGuardado / totalAlvo) * 100).toFixed(1) : 0;
            
            return `Você tem **${db.metas.length}** meta(s) ativa(s). No total, já guardou **${Utils.formatMoney(totalGuardado)}**, o que representa **${pct}%** do seu objetivo global.`;
        }
        
        // 7. Intenção: Saudação / Conversa Básica
        if (msgLimpa.match(/^(oi|ola|bom dia|boa tarde|boa noite|tudo bem|eae)/)) {
            return `Olá! Sou a Anora. Estou conectada à sua base de dados local. Você pode me perguntar métricas ou lançar transações rapidamente digitando algo como: *"Gastei 50 no mercado no cartão"*.`;
        }

        // 8. Fallback (Não Entendido)
        return `Ainda estou aprendendo a interpretar mensagens mais complexas. Tente usar comandos diretos como: *"Gastei 45 no uber"*, *"Qual meu saldo?"* ou *"Quanto gastei com ifood este mês?"*.`;
    }
};