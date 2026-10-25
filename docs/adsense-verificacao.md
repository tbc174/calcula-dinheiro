# AdSense: publicar a configuração de verificação

## Estado desta alteração

A configuração registra o editor `pub-4178012487609221`, o bloco responsivo
`8432472360` e o contato `contato@tickerlab.com.br`. O modo é `verificacao`.
A CMP permanece sem configuração validada e a exibição de anúncios permanece
desligada. Este procedimento publica os dados necessários à verificação do site;
não comprova aprovação do Google nem habilita publicidade.

Na nova versão, o site deve fornecer a meta `google-adsense-account`, a linha do
editor em `/ads.txt`, a página `/contato` e um sitemap com 12 URLs. As calculadoras
e o visual não foram alterados. A fonte dos índices continua sendo a API pública
que a aplicação já utiliza.

## Executar

O repositório não tem publicação automática. No computador com acesso ao GitHub
privado e ao VPS, exporte um commit específico que contenha esta configuração e os
dois scripts abaixo. Gere o pacote preservando as quebras de linha Linux, inclusive
quando o Git do computador estiver configurado com `core.autocrlf=true`:

```sh
git -c core.autocrlf=false -c core.eol=lf archive --format=tar.gz --output=ARQUIVO COMMIT
```

As opções `-c` valem somente para este comando. A regra `.gitattributes` também
mantém os scripts `.sh` e `.py` em LF. Transfira o arquivo por SCP; evite transmitir
tar binário por pipeline do Windows PowerShell.

Transfira também `scripts/deploy-verification.sh`, extraído desse mesmo archive,
e execute no VPS:

```sh
bash deploy-verification.sh /caminho/source.tar.gz SHA256_DO_ARQUIVO COMMIT_DE_40_CARACTERES
```

O script confere o SHA256 e o commit registrado pelo próprio `git archive`.
O pacote precisa incluir `scripts/check-verification.py`. A chamada é limitada
ao serviço `web` da stack `/opt/stacks/calcula-dinheiro`.

Se o Bash parar na linha `set -Eeuo pipefail` com `invalid option name`, o script
pode ter sido convertido para CRLF durante a exportação. Essa linha precede
qualquer alteração da instalação. Gere um pacote novo com o comando acima e
extraia novamente o script desse pacote; não reutilize o script convertido.

## Comportamento da publicação

- Confere instalação, permissões, saúde do Calcula Dinheiro e recursos disponíveis
  antes de construir.
- Registra como aviso os estados `unhealthy` ou `starting` preexistentes de outros
  contêineres. Esses estados, sozinhos, não impedem uma atualização isolada do site.
- Exige pelo menos 2,5 GiB de memória disponível e 6 GiB livres em disco.
- Cria uma release nova; preserva a release anterior e uma cópia do Compose ativo.
- Usa a mesma imagem imutável do serviço atual. O construtor fica limitado a
  1.536 MiB de memória, sem swap adicional, e 0,5 CPU.
- Executa `npm ci`, testes existentes, TypeScript e build Vinext dentro do Linux.
- Inicia uma prévia em porta efêmera de loopback, montando somente o standalone.
- Verifica meta, ads.txt, contato, privacidade, sitemap, robots, redirecionamento,
  favicon, CSS, JavaScript e estrutura da API pública.
- Aceita o canonical da página inicial com ou sem a barra final, pois o Vinext
  serializa a raiz sem essa barra. Nas demais páginas, exige a URL exata.
- Troca apenas o caminho do volume no Compose, depois de conferir concorrência.
- Recria somente `web`, mantendo porta, limites e demais opções existentes.
- Confere novamente a saúde e as respostas HTTP depois da troca.

O resultado inclui os caminhos da release e do backup do Compose. O diagnóstico
e o log de construção são preservados na pasta da execução; uma implantação
concluída também grava `implantacao.json` na nova release.

## Falha e reversão

Se houver falha antes da troca, a versão anterior continua atendendo. Se ocorrer
falha depois da troca, o script tenta restaurar o Compose e o serviço anteriores.
Ele interrompe essa reversão caso detecte mudança concorrente ou imagem
divergente, preservando o backup e apresentando o motivo. Não remova releases
anteriores para liberar espaço durante este procedimento.

Os serviços TickerLab e Ficha Clara não são alterados. Mudanças observadas em
outros contêineres são apenas registradas para conferência.

O estado de saúde Docker de outro contêiner não comprova a disponibilidade da
dependência HTTP do Calcula Dinheiro. A rota `/api/dados` da prévia, criada com
cache vazio, precisa obter e validar os índices de
`https://tickerlab.com.br/dados/ferramentas.json` antes da troca de versão. Se essa
verificação falhar, a publicação é interrompida antes da troca.

## Próxima etapa

Depois de confirmar a publicação no domínio público, conclua a conexão do site
no AdSense com a meta ou o ads.txt. A mensagem real de consentimento, sua
integração com o carregamento do bloco e a aprovação do site ainda precisam ser
conferidas antes de mudar para `modo: "ativo"`. Não marque `cmpValidada` como
verdadeiro nem construa uma URL de CMP somente a partir do ID de editor.
