# Calcula Dinheiro

Nove calculadoras gratuitas para o dinheiro do dia a dia, em português brasileiro, com gráficos explicados, comparação de cenários e temas claro/escuro.

## Ferramentas
- Juros compostos com aportes e comparação de cenários.
- Porcentagem, descontos, aumentos e variações.
- À vista ou parcelado.
- Financiamento: SAC ou Price, com amortização extra.
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
