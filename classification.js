const norm = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Ordered from the most specific to the broad fallbacks: suggestions are always reviewable.
const rules = [
    { words: ['emprestimo', 'emprestimos', 'loan'], tipo: 'despesa', grupo: 'Finanças', subgrupo: 'Empréstimos', confidence: 'alta' },
    { words: ['financiamento', 'financing'], tipo: 'despesa', grupo: 'Finanças', subgrupo: 'Financiamento de veículos', confidence: 'alta' },
    { words: ['juros', 'interest'], tipo: 'despesa', grupo: 'Finanças', subgrupo: 'Juros cobrados', confidence: 'alta' },
    { words: ['salario', 'freelance', 'renda', 'reembolso', 'venda'], tipo: 'receita', grupo: 'Renda' },
    { words: ['transferencia entre', 'minha conta', 'entre contas', 'mesma titularidade'], tipo: 'transferencia', grupo: 'Movimentações', confidence: 'alta' },
    { words: ['supermercado', 'mercado', 'atacadao'], tipo: 'despesa', grupo: 'Alimentação', subgrupo: 'Supermercado' },
    { words: ['restaurante', 'lanchonete', 'ifood', 'delivery'], tipo: 'despesa', grupo: 'Alimentação' },
    { words: ['seguro', 'seguros', 'apolice'], tipo: 'despesa', grupo: 'Seguros', subgrupo: 'Seguros' },
    { words: ['aluguel', 'condominio', 'energia', 'agua', 'internet'], tipo: 'despesa', grupo: 'Moradia' },
    { words: ['farmacia', 'dentista', 'academia', 'consulta'], tipo: 'despesa', grupo: 'Saúde e bem-estar' },
    { words: ['uber', 'taxi', 'gasolina', 'combustivel', 'onibus'], tipo: 'despesa', grupo: 'Transporte' },
    { words: ['pix para', 'compra', 'pagamento'], tipo: 'despesa' }
];

export const Classification = {
    suggest: (description, categories = []) => {
        const text = norm(description);
        if (text.length < 3) return null;
        const rule = rules.find(r => r.words.some(word => text.includes(norm(word))));
        if (!rule) return null;
        const candidates = categories.filter(c => typeof c !== 'string' && (!rule.tipo || c.tipo === rule.tipo) && (!rule.grupo || c.grupo === rule.grupo));
        const category = rule.subgrupo ? candidates.find(c => norm(c.subgrupo || c.nome) === norm(rule.subgrupo)) : candidates[0];
        return { ...rule, category: category || null, confidence: rule.confidence || (rule.subgrupo ? 'alta' : 'média') };
    }
};
