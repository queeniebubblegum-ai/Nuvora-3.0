import { Controllers } from './controllers.js';

export const SubmitEvents = {
    setup: () => {
        document.body.addEventListener('submit', (e) => {
            const action = e.target.getAttribute('data-submit');
            if (!action) return;

            const submitMap = {
                'transacao': (evt) => Controllers.submitTransacao(evt),
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
                'chatAnora': (evt) => Controllers.submitChatAnora(evt)
            };

            if (submitMap[action]) {
                submitMap[action](e);
            }
        });
    }
};