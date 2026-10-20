import { Controllers } from './controllers.js';
import { SubmitGuard } from './submit-guard.js';

export const SubmitEvents = {
    setup: () => {
        document.body.addEventListener('submit', (e) => {
            const form = e.target;
            const action = form.getAttribute('data-submit');
            if (!action) return;

            const submitMap = {
                'transacao': (evt) => Controllers.submitTransacao(evt),
                'transferencia': (evt) => Controllers.submitTransferencia(evt),
                'agendamento': (evt) => Controllers.submitAgendamento(evt),
                'despesaCartao': (evt) => Controllers.submitDespesaCartao(evt),
                'editarTransacao': (evt) => Controllers.submitEditTransaction(evt),
                'banco': (evt) => Controllers.submitBanco(evt),
                'cartao': (evt) => Controllers.submitCartao(evt),
                'meta': (evt) => Controllers.submitMeta(evt),
                'depositoMeta': (evt) => Controllers.submitDepositoMeta(evt),
                'orcamento': (evt) => Controllers.submitOrcamento(evt),
                'orcamentoInteligente': (evt) => Controllers.submitOrcamentoInteligente(evt),
                'categoria': (evt) => Controllers.submitCategoria(evt),
                'contato': (evt) => Controllers.submitContato(evt),
                'usuario': (evt) => Controllers.submitUsuario(evt),
                'simulador': (evt) => { evt.preventDefault(); Controllers.simularCompraRapida(); },
                'chatAnora': (evt) => Controllers.submitChatAnora(evt),
                'receitaFutura': (evt) => Controllers.submitReceitaFutura(evt),
                'assinatura': (evt) => Controllers.submitAssinatura(evt),
                'investimento': (evt) => Controllers.submitInvestimento(evt)
            };

            if (submitMap[action]) {
                // Lock once at the delegated submit boundary. Controllers that
                // schedule callback-based work call SubmitGuard.hold() after
                // validation and release when that work completes.
                if (!SubmitGuard.run(form, () => submitMap[action](e))) {
                    e.preventDefault();
                }
            }
        });
    }
};