import { TransacoesController } from './ctrl-transacoes.js';
import { ContasController } from './ctrl-contas.js';
import { PlaneamentoController } from './ctrl-planeamento.js';
import { SistemaController } from './ctrl-sistema.js';

export const Controllers = {
    ...TransacoesController,
    ...ContasController,
    ...PlaneamentoController,
    ...SistemaController
};