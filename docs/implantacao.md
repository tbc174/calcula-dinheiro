# Implantação no VPS

Cloudflare Tunnel → http://127.0.0.1:8082 → contêiner Node na porta 3000. Serviço separado em /opt/stacks/calcula-dinheiro, limitado a 512 MiB e 0,5 CPU. Não abrir portas públicas. O volume da release é somente leitura.

## Atualizar
1. Exportar o commit com git archive para uma nova pasta releases/IDENTIFICADOR no VPS.
2. Construir em Linux com a imagem Node do Compose, limitando o construtor a 1.536 MiB e 0,5 CPU. Executar npm ci --no-audit --no-fund, npm test, npx tsc --noEmit e npm run build.
3. Depois do build, executar npm run test:site: sobe o servidor construído e confere que título, description e canonical saem dentro do <head> para o Googlebot e para navegadores (sem isso o Search Console mostra canonical "Nenhum").
3. Conferir dist/standalone/server.js e testar antes de publicar.
4. Guardar o Compose ativo e atualizar somente o caminho da release no volume.
5. Executar docker compose -f /opt/stacks/calcula-dinheiro/compose.yaml up -d.
6. Conferir healthcheck, seis ferramentas, gráficos, comparação, dados, SEO e saúde do TickerLab.

O Compose da raiz registra a release escolhida e exige a estrutura releases/ correspondente. Não há deploy automático configurado.

## Domínio
Zona calculadinheiro.com.br na Cloudflare, plano Free. Nameservers bonnie.ns.cloudflare.com e terin.ns.cloudflare.com salvos no Registro.br em 24/10/2026 às 13h48 BRT. O Registro.br iniciou uma nova transição de cerca de duas horas após confirmar a gravação. Não repetir a alteração durante essa espera. Registros de proteção de e-mail preservados.

As duas rotas calculadinheiro.com.br e www.calculadinheiro.com.br foram adicionadas ao túnel tickerlab-vps, ambas para http://127.0.0.1:8082. Sete rotas anteriores do TickerLab foram preservadas. A zona contém dois CNAMEs com proxy para o túnel, além do MX nulo, SPF e DMARC preexistentes. O aplicativo redireciona www para o domínio principal com 308, preservando caminho e parâmetros.

Always Use HTTPS ativado, modo Full mantido e Universal SSL habilitado. Certificado público validado em 24/10/2026 às 16h29 BRT, sem exceção de TLS, no domínio raiz e no www. A conexão entre a Cloudflare e o VPS usa o túnel, e o HTTP da aplicação permanece restrito ao loopback. Nenhuma porta pública foi aberta.

## Reversão
Restaurar o Compose anterior e executar up -d somente no projeto Calcula Dinheiro. Preservar a release anterior e a publicação provisória no Sites até validar o domínio definitivo.

## Estado em 24/10/2026
Release 20261024-002 instalada, com 14 testes, TypeScript, build Linux e navegação já conferidos na implantação anterior. Nova conferência em 24/10 às 13h53 BRT: seis ferramentas e cinco páginas institucionais/inicial HTTP 200, sitemap com 11 URLs, robots permitindo o domínio final e redirecionamento www 308 validado na origem. API de índices HTTP 200, IPCA até 2026-09 e câmbio de 2026-10-23. Não foi necessário alterar código ou recriar contêineres nesta etapa.

TickerLab, API, PostgreSQL, Calcula Dinheiro e Ficha Clara saudáveis, com os mesmos processos de antes da configuração. Carga nacional avançou de 41.815.334 para 44.055.334 estabelecimentos entre os checkpoints consultados, sem novos erros ou mudança de guarda/limites. Pausa de folga observada ao fim é comportamento esperado.

Às 15h58 BRT, DNS público já retorna bonnie.ns.cloudflare.com/terin.ns.cloudflare.com, endereços IPv4 104.21.92.201 e 172.67.197.177 e IPv6 públicos da Cloudflare. O painel confirma a zona ativa. HTTP público redireciona com 301 para HTTPS preservando caminho e parâmetros. Não repetir a troca de DNS.

Às 15h58 BRT, o Universal SSL ainda estava em Pending Validation (TXT). A emissão automática concluiu sem intervenção: às 16h29, raiz e www passaram na verificação padrão de certificado e hostname, negociando TLS 1.3. Certificado Let's Encrypt YE2 para calculadinheiro.com.br e *.calculadinheiro.com.br, válido de 24/10/2026 até 22/01/2027. Nenhum aviso foi contornado ou proteção desativada.

## Lançamento público validado — 24/10/2026, 16h31 BRT

https://calculadinheiro.com.br está respondendo pelo VPS. HTTP retorna 301 para HTTPS; www retorna 308 para a raiz, preservando caminho e parâmetros. Página inicial e seis ferramentas públicas retornaram 200, canonical próprio e robots index/follow. robots.txt permite o site e anuncia sitemap.xml, que contém 11 URLs do domínio final. API pública respondeu 200: 387 meses de IPCA até setembro/2026; PTAX USD 5,0377 e EUR 5,6422, ambas de 23/10/2026. Arquivo atualizado em 24/10 às 13h40 BRT; fontes e datas aparecem nas ferramentas.

Operações feitas no navegador público, com resultados comparados às fórmulas e referências dos testes do projeto:

| Ferramenta | Caso verificado | Resultado observado |
| --- | --- | --- |
| Juros compostos | R$ 1.000 iniciais, R$ 100/mês, 1%/mês, 12 meses | R$ 2.395,08; aplicado R$ 2.200,00 e juros R$ 195,08 |
| Comparação de juros | Mais R$ 100/mês no mesmo prazo | R$ 3.663,33; diferença R$ 1.268,25; gráfico no mês 2 mostrou R$ 1.221,10 e R$ 1.422,10 |
| Porcentagem | Desconto de 20% sobre 200 | 160,00; economia 40,00 e passos da conta corretos |
| À vista ou parcelado | R$ 900 à vista; entrada R$ 200 + 4 × R$ 200 | Parcelado R$ 1.000,00; diferença R$ 100,00/11,11% sobre à vista |
| Financiamento | R$ 300.000, 1% ao mês, 360 meses | Price R$ 3.085,84 fixa; SAC de R$ 3.833,33 a R$ 841,67; diferença de juros R$ 269.401,60 |
| Quanto rende | R$ 10.000, 2 anos, CDI 14,65%, CDB 100%, LCI 90%, poupança pela regra | LCI R$ 12.790,17; CDB R$ 12.672,93; Tesouro Selic R$ 12.666,64 (custódia R$ 6,29); poupança R$ 11.271,60; empate em 103,82% do CDI; com 15 dias, IOF de R$ 28,17 e poupança sem rendimento |
| Quanto guardar | Meta R$ 1.200, inicial zero, sem juros, 12 meses | R$ 100,00/mês; alternativa de 18 meses R$ 66,67/mês |
| IPCA | R$ 1.000, setembro/2026 nas duas pontas, 0,82% | R$ 1.008,20; gráfico e explicação de mês único coerentes |
| Conversor | US$ 200 × PTAX 5,0377 de 23/10 | R$ 1.007,54; equivalências e metodologia conferidas |

Navegação, campos, gráfico interativo, comparação, explicações e tabela de câmbio conferidos. Sem mensagens de erro ou alerta no console do tab de validação. O preenchimento automatizado de campos nativos month/range precisou de teclado nativo para emitir a alteração; resultado confirmado após essa interação, sem mudança no código. Visual aprovado preservado.

Às 16h26, TickerLab, API, PostgreSQL, Ficha Clara e Calcula saudáveis, sem OOM. Calcula mantém 512 MiB sem swap e 0,5 CPU; processo iniciado às 00h24 BRT, sem recriação nesta validação. TickerLab/API tiveram reinício anterior em outro fluxo às 15h28; estavam saudáveis antes dos testes desta rodada. Nenhuma carga, limite ou serviço foi alterado. Monitor nacional do Ficha Clara e rotinas de atualização são independentes e permanecem ativos.

Evidências no workspace deste chat: work/calcula-validacao-publica-final.json, work/calcula-lancamento-saude-vps.json, outputs/calcula-dinheiro-no-ar.png e outputs/calcula-dinheiro-grafico-publico.png. Acompanhamento do lançamento encerrado às 16h32 após a validação; registro concluído no Obsidian e aviso de conclusão preparado para Tiago. Apenas esse monitor foi excluído, preservando o monitor nacional do Ficha Clara e as rotinas dos servidores. Search Console, e-mail público e aprovação AdSense permanecem pendentes e independentes. Não há anúncio ativo nem garantia de indexação.

