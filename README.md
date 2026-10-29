# Calcula Dinheiro

Doze calculadoras gratuitas para o dinheiro do dia a dia, em português brasileiro, com gráficos explicados, comparação de cenários e temas claro/escuro.

## Ferramentas
- Juros compostos com aportes e comparação de cenários.
- Porcentagem, descontos, aumentos e variações.
- À vista ou parcelado.
- Financiamento: SAC ou Price, com amortização extra.
- Empréstimo: parcela pela Price, juros no total e CET com IOF e tarifa (alíquotas do IOF com data de conferência), e o mesmo empréstimo em outros prazos.
- 13º salário: integral ou proporcional pela regra dos 15 dias (mês a mês), 1ª parcela sem desconto e 2ª parcela com o INSS e o imposto de renda de 2026 sobre o 13º inteiro.
- Rescisão: saldo de salário, aviso prévio (Lei 12.506/2011, com projeção), 13º e férias proporcionais com o terço, férias vencidas, INSS e imposto de renda só onde incidem, e a multa de 40% ou 20% do FGTS, por tipo de desligamento (sem justa causa, pedido de demissão, acordo do art. 484-A, justa causa).
- Quanto rende: poupança, CDB, LCI ou LCA e Tesouro Selic, líquidos de IOF, imposto e custódia.
- Salário líquido: INSS por faixa e imposto de renda com dependentes, desconto simplificado e a redução da Lei 15.270/2025 (tabelas de 2026, com data de validade).
- Quanto guardar por mês.
- Correção pelo IPCA.
- Conversor de real, dólar e euro.

Inclui Sobre, Metodologia, Privacidade e Termos; SEO por página, sitemap com a data de revisão de cada calculadora (`revisadoEm` em `lib/conteudo.ts`), dados estruturados (WebSite e Organization em toda página; FAQPage só quando a página mostra perguntas) e robots conforme o domínio. Contato e anúncios continuam desativados até preencher os dados reais.

## Executar
Requer Node.js >=22.13 e npm.

```sh
npm ci
npm run dev
```

Produção: `npm run build` e `npm start`. O servidor aceita HOST e PORT. Use HOST=127.0.0.1 nas prévias locais.

Validação: `npm test`, `npx tsc --noEmit`, `npm run build` e, com o build pronto, `npm run test:site` (metadados dentro do `<head>`).

## Organização
- app/: páginas e API pública de dados.
- components/: interface, ferramentas e gráficos.
- lib/: cálculos e regras de publicação (calculadora nova: conta em `lib/calculos/<slug>.ts`, tela em `components/calculadoras/<slug>.jsx`).
- config/publicacao.json: domínio, responsável, contato e anúncios.
- tests/: fórmulas e publicação.
- compose.yaml: serviço isolado no VPS.
- docs/: implantação e situação do lançamento.

React e Vinext com saída Node standalone. Links nativos evitam um problema de navegação RSC identificado no standalone. Os auxiliares do starter Sites foram preservados como origem técnica, mas não são usados pelo servidor standalone. Não depende do banco ou dos serviços privados do TickerLab.

Consulte [Implantação](docs/implantacao.md). Não versione senhas, tokens, arquivos .env, node_modules ou builds. Repositório privado; nenhuma licença de distribuição pública atribuída ao projeto.
