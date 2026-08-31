import { describe, it, expect } from 'vitest';
import { Classification } from './classification.js';

describe('Classification', () => {
  const categories = [
    { nome: 'Empréstimos', subgrupo: 'Empréstimos', grupo: 'Finanças', tipo: 'despesa' },
    { nome: 'Financiamento de veículos', subgrupo: 'Financiamento de veículos', grupo: 'Finanças', tipo: 'despesa' },
    { nome: 'Juros cobrados', subgrupo: 'Juros cobrados', grupo: 'Finanças', tipo: 'despesa' },
    { nome: 'Salário', subgrupo: 'Salário', grupo: 'Renda', tipo: 'receita' }
  ];
  it('prioritizes specific loan terms and resolves the subgroup', () => {
    const result = Classification.suggest('Pagamento do empréstimo pessoal', categories);
    expect(result.tipo).toBe('despesa');
    expect(result.category.nome).toBe('Empréstimos');
    expect(result.confidence).toBe('alta');
  });
  it('distinguishes financing, interest and income', () => {
    expect(Classification.suggest('financing car', categories).category.nome).toBe('Financiamento de veículos');
    expect(Classification.suggest('interest fee', categories).category.nome).toBe('Juros cobrados');
    expect(Classification.suggest('salário mensal', categories).tipo).toBe('receita');
  });
});
