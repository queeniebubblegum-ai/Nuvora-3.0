# Teste manual — lançamentos pendentes em lote

1. Abra **Cartões**, abra uma fatura e adicione dois ajustes explicativos (por exemplo, juros e reembolso), sem criar lançamentos individuais.
2. Confirme que aparece **Criar lançamentos pendentes (2)**. Clique nele.
3. Na revisão, confira tipo, descrição, valor e efeito de cada item. Cancele e confirme que nada foi criado.
4. Abra a revisão novamente e confirme. Verifique o toast, que cada ajuste passa a mostrar “Lançamento criado” e que os lançamentos aparecem no histórico.
5. Clique/abra a fatura novamente (ou recarregue a tela) e confirme que o botão em lote desapareceu e que repetir o fluxo não duplica transações.
6. Adicione um ajuste do tipo **Compra não reconhecida**. Confirme que ele fica fora do lote e que o aviso recomenda conferência individual. Não confirme esse item sem verificar o caso; se necessário, use apenas **Criar lançamento** do próprio item, com a confirmação explícita.
7. Confira que compras originais, total das compras e saldo não sofrem alterações indevidas; somente os lançamentos de ajustes confirmados entram no histórico.

Nesta revisão, não foram executados testes automatizados, de navegador nem `npm run build` neste ambiente.
