# Implantação no VPS

Cloudflare Tunnel → http://127.0.0.1:8082 → contêiner Node na porta 3000. Serviço separado em /opt/stacks/calcula-dinheiro, limitado a 512 MiB e 0,5 CPU. Não abrir portas públicas. O volume da release é somente leitura.

## Atualizar
1. Exportar o commit com git archive para uma nova pasta releases/IDENTIFICADOR no VPS.
2. Construir em Linux com a imagem Node do Compose, limitando o construtor a 1.536 MiB e 0,5 CPU. Executar npm ci --no-audit --no-fund, npm test, npx tsc --noEmit e npm run build.
3. Conferir dist/standalone/server.js e testar antes de publicar.
4. Guardar o Compose ativo e atualizar somente o caminho da release no volume.
5. Executar docker compose -f /opt/stacks/calcula-dinheiro/compose.yaml up -d.
6. Conferir healthcheck, seis ferramentas, gráficos, comparação, dados, SEO e saúde do TickerLab.

O Compose da raiz registra a release escolhida e exige a estrutura releases/ correspondente. Não há deploy automático configurado.

## Domínio
Zona calculadinheiro.com.br na Cloudflare, plano Free. Nameservers bonnie.ns.cloudflare.com e terin.ns.cloudflare.com salvos no Registro.br em 24/10/2026 às 13h48 BRT. O Registro.br iniciou uma nova transição de cerca de duas horas após confirmar a gravação. Não repetir a alteração durante essa espera. Registros de proteção de e-mail preservados.

As duas rotas calculadinheiro.com.br e www.calculadinheiro.com.br foram adicionadas ao túnel tickerlab-vps, ambas para http://127.0.0.1:8082. Sete rotas anteriores do TickerLab foram preservadas. A zona contém dois CNAMEs com proxy para o túnel, além do MX nulo, SPF e DMARC preexistentes. O aplicativo redireciona www para o domínio principal com 308, preservando caminho e parâmetros.

Always Use HTTPS ativado, modo Full mantido e Universal SSL habilitado. O certificado público ainda aguarda a ativação da zona; não anunciar HTTPS funcionando sem conferir externamente. A conexão entre a Cloudflare e o VPS usa o túnel, e o HTTP da aplicação permanece restrito ao loopback. Nenhuma porta pública foi aberta.

## Reversão
Restaurar o Compose anterior e executar up -d somente no projeto Calcula Dinheiro. Preservar a release anterior e a publicação provisória no Sites até validar o domínio definitivo.

## Estado em 24/10/2026
Release 20261024-002 instalada, com 14 testes, TypeScript, build Linux e navegação já conferidos na implantação anterior. Nova conferência em 24/10 às 13h53 BRT: seis ferramentas e cinco páginas institucionais/inicial HTTP 200, sitemap com 11 URLs, robots permitindo o domínio final e redirecionamento www 308 validado na origem. API de índices HTTP 200, IPCA até 2026-09 e câmbio de 2026-10-23. Não foi necessário alterar código ou recriar contêineres nesta etapa.

TickerLab, API, PostgreSQL, Calcula Dinheiro e Ficha Clara saudáveis, com os mesmos processos de antes da configuração. Carga nacional avançou de 41.815.334 para 44.055.334 estabelecimentos entre os checkpoints consultados, sem novos erros ou mudança de guarda/limites. Pausa de folga observada ao fim é comportamento esperado.

DNS público ainda devolve os antigos NS do Registro.br, sem A/AAAA; HTTPS de ambos os nomes ainda indisponível por resolução. Delegação salva, mas ativação externa pendente, com estimativa do painel de concluir a transição por volta de 15h48 BRT; propagação e emissão podem demorar mais. Conferir NS, A/AAAA, certificado, HTTP→HTTPS, www→raiz e seis ferramentas após a virada. Search Console, e-mail público e aprovação AdSense permanecem pendentes e independentes. Não há anúncio ativo nem garantia de indexação.

