# Calcula Dinheiro — migração para o VPS

Autorização de Tiago em 24/10/2026: conferir a capacidade e, havendo folga, migrar mantendo visual e seis ferramentas, sem prejudicar o TickerLab.

## Objetivo e limites
Instalar o site em serviço separado no VPS existente e conectar calculadinheiro.com.br por Cloudflare Tunnel, sem abrir portas públicas. Preservar a versão atual do Sites como alternativa durante a virada. Não alterar banco, aplicação, coletas ou deploy do TickerLab. Não contratar serviços pagos, ativar anúncios ou inventar contato público.

## Capacidade medida
24/10 às 00h00, Brasília: 7.019 MiB de memória disponíveis em 7.940 MiB; swap zero; 63 GB livres em disco; carga 0,05 / 0,10 / 0,07. CPU ociosa entre 93% e 99% na amostra. App, API e PostgreSQL saudáveis. Amostra curta não representa picos futuros.

## Etapas
- [x] Conferir capacidade e estado dos serviços existentes.
- [ ] Exportar a fonte aprovada cd3ff533bc056eedabbdeb6a3c1f3ccc3067a80c para uma cópia separada.
- [ ] Adaptar o empacotamento para Node independente da hospedagem Sites, preservando componentes e fórmulas.
- [ ] Testar rotas, seis calculadoras, gráficos, comparação, índices, canonical, robots, sitemap e redirecionamento www.
- [ ] Instalar serviço separado, com limite de 512 MiB e 0,5 CPU, porta somente local; construir com recursos limitados e sem reiniciar serviços do TickerLab.
- [ ] Adicionar domínio e rotas na Cloudflare, preservando rotas existentes. Alterar os servidores DNS no Registro.br apenas para os valores fornecidos pela Cloudflare.
- [ ] Validar HTTPS e acesso público no domínio final; conferir novamente a saúde e recursos do TickerLab.
- [ ] Registrar versão, atualização, reversão e pendências.

## Arquivos e implantação
Fonte de trabalho: work/calcula-dinheiro-vps. Alterações previstas: configuração Vite/Next, comando de inicialização, redirecionamento www, Docker Compose e documentação da instalação. Componentes visuais e fórmulas devem permanecer idênticos à versão aprovada. Fonte e artefato da versão ficarão no diretório exclusivo do Calcula Dinheiro no VPS, sem inclusão de credenciais.

## Riscos e conferências
- Consumo competir com o TickerLab: limitar construção e execução, medir antes/depois e interromper o novo serviço se houver pressão.
- Adaptação quebrar navegação ou gráficos: testes de fórmulas, HTTP e navegador antes de mudar o DNS.
- DNS/HTTPS ainda pendentes: conservar a versão do Sites e confirmar os dois nomes publicamente.
- Alterar uma rota do TickerLab por engano: conferir rotas existentes, acrescentar somente os dois nomes do Calcula Dinheiro e testar TickerLab antes/depois.

## Reversão
Parar somente o novo serviço e remover somente suas rotas do túnel. A versão pública do Sites permanece disponível no endereço provisório. Para usar o domínio próprio novamente no Sites, aplicar seus registros documentados e revalidar o certificado; a reversão DNS depende de propagação. Não apagar a instalação ou a publicação anterior durante a migração.

As etapas VPS, publicação, túnel e DNS estão abrangidas pelo pedido explícito desta conversa. Acesso às contas pode depender de login de Tiago; senha e códigos não devem ser enviados no chat.
