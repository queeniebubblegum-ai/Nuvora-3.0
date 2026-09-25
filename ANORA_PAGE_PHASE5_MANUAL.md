# Fase 5 — página Anora: checklist de validação

## Navegação e comportamento
- [ ] Abrir Anora pelo grupo Sistema e pelo menu da Anora no cabeçalho; confirmar `#anora` e que o menu do cabeçalho fecha.
- [ ] Confirmar o estado ativo no menu lateral e que o grupo Sistema fica expandido.
- [ ] Confirmar que os insights vêm de `MentorEngine` e refletem os dados cadastrados; sem dados, deve aparecer onboarding/estado vazio, nunca valores de exemplo.
- [ ] Enviar cada pergunta sugerida e confirmar que usa as respostas reais do `AnoraNLP`.
- [ ] Digitar texto contendo `<script>` e confirmar que aparece como texto, sem executar HTML.
- [ ] Alterar Suave/Equilibrado/Foco Extremo, sair e voltar; confirmar persistência no `anora-preferences` e no perfil da mentoria.
- [ ] Confirmar que a conversa não confunde os alvos do modal legado com os elementos da página.

## Visual, acessibilidade e responsividade
- [ ] Conferir tema claro e escuro, contraste, foco visível, rótulos e mensagens de carregamento.
- [ ] Conferir em 375px, 400px e desktop; no celular, conferir os insights/mode acima da conversa sem rolagem horizontal.
- [ ] Conferir `prefers-reduced-motion` e que o campo continua utilizável com teclado.

## Limites da implementação
- A conversa usa o mecanismo local existente (`AnoraNLP`); não é uma IA generativa online.
- Insights são calculados a partir dos dados do usuário; não há exemplos financeiros fixos nem horários falsos.
