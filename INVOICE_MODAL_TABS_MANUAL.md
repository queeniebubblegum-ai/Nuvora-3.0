# Fatura — teste manual do modal em abas

1. Abra **Contas e cartões**, escolha um cartão e abra uma fatura.
2. Confirme que o cabeçalho (cartão, contexto e fechar) e as abas **Resumo**, **Compras** e **Ajustes** permanecem visíveis enquanto o painel interno rola.
3. Em **Resumo**, avance/retroceda o mês e confirme período, vencimento, valor real, status e diferença. Informe um valor real e use **Salvar conferência**; reabra/troque o mês e confirme a persistência. A seção de ajustes não deve aparecer aqui; use o aviso **Gerenciar ajustes** para abrir a aba própria.
4. Em **Compras**, selecione uma ou várias compras, use **Classificar selecionados**, altere grupo/categoria e aplique. Teste também edição e exclusão individual.
5. Em **Ajustes**, adicione encargo e crédito, edite e exclua um item. Confirme que os itens postados exibem o status vinculado e que a revisão/lote cria os lançamentos sem duplicar. Alterne repetidamente entre **Resumo**, **Compras** e **Ajustes**: os controles/lista devem continuar disponíveis somente em **Ajustes**, sem duplicações.
6. Teste o fechamento pelo botão X e reabra: não deve haver conteúdo fantasma, foco em elemento oculto ou backdrop sem conteúdo.
7. Com teclado, use Tab/Shift+Tab até as abas, Enter para trocar e Tab para alcançar controles do painel ativo. Confirme que painel oculto não recebe foco.
8. Repita em viewport estreita (aprox. 360px) e larga. Deve existir apenas a rolagem do painel ativo; o cabeçalho não deve desaparecer nem surgir uma rolagem aninhada inutilizável.

Não inclui fluxo de pagamento (Fase 3). Nenhuma execução de npm/browser foi realizada neste ambiente.
