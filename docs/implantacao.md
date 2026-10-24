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
Zona calculadinheiro.com.br na Cloudflare. Nameservers atribuídos: bonnie.ns.cloudflare.com e terin.ns.cloudflare.com. Alterar no Registro.br após a transição. Preservar os registros de proteção de e-mail.

Adicionar apenas calculadinheiro.com.br e www.calculadinheiro.com.br ao túnel existente, ambos para http://127.0.0.1:8082. Preservar todas as rotas do TickerLab. O aplicativo redireciona www para o domínio principal com 308.

## Reversão
Restaurar o Compose anterior e executar up -d somente no projeto Calcula Dinheiro. Preservar a release anterior e a publicação provisória no Sites até validar o domínio definitivo.

## Estado em 24/10/2026
Capacidade medida: cerca de 7 GiB de RAM disponíveis e 63 GB livres em disco. Release 20261024-002 instalada e validada: 14 testes, TypeScript, build Linux, 11 páginas e navegação no navegador. TickerLab, API e PostgreSQL saudáveis após a atualização. Rotas do túnel ainda não salvas. DNS ainda em transição no Registro.br. HTTPS definitivo, Search Console, e-mail público e aprovação AdSense pendentes. Publicar no GitHub não conclui esses itens.

