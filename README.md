# Calcula Dinheiro

Seis calculadoras gratuitas para o dinheiro do dia a dia, em português brasileiro, com gráficos explicados, comparação de cenários e temas claro/escuro.

## Ferramentas
- Juros compostos com aportes e comparação de cenários.
- Porcentagem, descontos, aumentos e variações.
- À vista ou parcelado.
- Quanto guardar por mês.
- Correção pelo IPCA.
- Conversor de real, dólar e euro.

Inclui Sobre, Metodologia, Privacidade e Termos; SEO por página, sitemap e robots conforme o domínio. Contato e anúncios continuam desativados até preencher os dados reais.

## Executar
Requer Node.js >=22.13 e npm.

```sh
npm ci
npm run dev
```

Produção: `npm run build` e `npm start`. O servidor aceita HOST e PORT. Use HOST=127.0.0.1 nas prévias locais.

Validação: `npm test`, `npx tsc --noEmit` e `npm run build`.

## Organização
- app/: páginas e API pública de dados.
- components/: interface, ferramentas e gráficos.
- lib/: cálculos e regras de publicação.
- config/publicacao.json: domínio, responsável, contato e anúncios.
- tests/: fórmulas e publicação.
- compose.yaml: serviço isolado no VPS.
- docs/: implantação e situação do lançamento.

React e Vinext com saída Node standalone. Links nativos evitam um problema de navegação RSC identificado no standalone. Os auxiliares do starter Sites foram preservados como origem técnica, mas não são usados pelo servidor standalone. Não depende do banco ou dos serviços privados do TickerLab.

Consulte [Implantação](docs/implantacao.md). Não versione senhas, tokens, arquivos .env, node_modules ou builds. Repositório privado; nenhuma licença de distribuição pública atribuída ao projeto.
