# AdSense: ativação e otimização

Esta versão liga os anúncios do Calcula Dinheiro (`modo: "ativo"`). O passo a passo
de publicação no VPS continua o de [adsense-verificacao.md](adsense-verificacao.md):
o mesmo `deploy-verification.sh` agora aceita o modo `ativo`.

## O que mudou no site

- **Sem janela obrigatória.** O `adsbygoogle.js` carrega assim que a página abre no
  domínio final. A mensagem de consentimento do Google (configurada no painel, abaixo)
  aparece sozinha para visitantes do EEE, Reino Unido e Suíça.
- **Recusa no rodapé.** "Preferências de privacidade" permite recusar a publicidade
  (chave `cd-publicidade-v1`, 180 dias). A página recarrega sem o AdSense. Quando a
  mensagem do Google estiver ativa, o mesmo diálogo mostra "Escolhas de cookies do Google".
- **Três posições por calculadora:**
  1. `resultado`: logo depois da calculadora, onde o visitante já leu o resultado.
  2. `conteudo`: no guia, entre "Como usar" e os exemplos.
  3. `rodape`: depois do guia, antes de "Outra conta para fazer?".
- Bloco que o Google não preenche (`data-ad-status="unfilled"`) é escondido, sem
  deixar buraco.
- Prévias e hosts diferentes de `calculadinheiro.com.br` continuam sem anúncios.

Cada posição usa o seu slot em `config/publicacao.json` → `adsense.slots`. Enquanto
estiver vazio, a posição usa o `slotRodape` (8432472360). Funciona, mas o relatório
não separa o desempenho de cada posição.

## Painel do AdSense (fazer uma vez)

### 1. Blocos de anúncio
Anúncios → Por bloco de anúncio → Anúncios de display, tamanho **Responsivo**:
- `Calcula · resultado` → copie o ID para `slots.resultado`
- `Calcula · conteúdo` → copie o ID para `slots.conteudo`

### 2. Mensagem de consentimento (obrigatória para tráfego europeu)
Privacidade e mensagens → **Regulamentações europeias** → Criar mensagem → selecione
`calculadinheiro.com.br` (e `fichaclara.com.br`), idioma português, link para
`/privacidade` → Publicar. Sem ela, o Google só exibe anúncios limitados a esses visitantes.

### 3. Anúncios automáticos (receita extra sem mexer no código)
Anúncios → Por site → `calculadinheiro.com.br` → editar:
- **Anúncios âncora**: ligado (barra fixa no rodapé do celular; costuma ser o formato
  que mais rende em celular).
- **Vinhetas**: ligado (tela cheia entre uma página e outra; a navegação do site é por
  links nativos, então elas aparecem).
- **Trilhos laterais** (side rails): ligado, se disponível; usa a margem vazia do desktop.
- **Anúncios na página**: ligado com carga de anúncios **baixa**. Os três blocos manuais já
  cobrem o conteúdo; aumente a carga só se as métricas de engajamento não caírem.
- **Formatos baseados em intenção**: deixe desligado. Esses formatos inserem links no
  texto das explicações e podem ser confundidos com o conteúdo.

### 4. Bloqueios e otimização
- Controles de bloqueio → Categorias gerais/sensíveis: deixe tudo permitido no início
  (mais anunciantes disputando = CPM maior). Bloqueie só o que conflitar com a proposta do
  site (por exemplo, apostas ou "enriquecimento rápido").
- Otimização → Experimentos → **Otimização automática**: ligada.
- Saldo de anúncios: 100% nas primeiras semanas, para medir o potencial.

### 5. Conferir
- `https://calculadinheiro.com.br/ads.txt` com a linha `pub-4178012487609221`
  (o painel mostra "Autorizado" em até alguns dias).
- Depois de 2 a 4 semanas: Relatórios → por bloco de anúncio e por página. O RPM da
  página (receita por mil visualizações) é a métrica que importa, mais do que cliques.

## O que não fazer (risco de suspensão da conta)

- Pedir cliques ("clique no anúncio", setas apontando para o bloco, "apoie o site
  clicando").
- Disfarçar o anúncio como botão, resultado ou link do site. O rótulo "Publicidade"
  continua obrigatório.
- Clicar nos próprios anúncios ou pedir a amigos que cliquem.
- Comprar tráfego de baixa qualidade. O AdSense detecta e retém o pagamento.

O caminho que funciona é **mais páginas vistas por visita** (os links "Outra conta
para fazer?" e os guias ajudam) e **mais tráfego orgânico** (Search Console).

## Ficha Clara (fichaclara.com.br)

O código do Ficha Clara não está em nenhum repositório GitHub (pasta local
`work/portal-cnpj-integrado`), então ele precisa ser configurado lá. Bloco
responsivo já criado: **3555746326**. Confirme no painel (Sites) que o domínio está
"Pronto" antes de publicar.

1. `<head>` de todas as páginas:
   ```html
   <meta name="google-adsense-account" content="ca-pub-4178012487609221">
   <script async crossorigin="anonymous"
     src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4178012487609221"></script>
   ```
2. `/ads.txt`: `google.com, pub-4178012487609221, DIRECT, f08c47fec0942fa0`
3. Bloco (repetir onde indicado, com o rótulo "Publicidade" acima):
   ```html
   <ins class="adsbygoogle" style="display:block"
     data-ad-client="ca-pub-4178012487609221" data-ad-slot="3555746326"
     data-ad-format="auto" data-full-width-responsive="true"></ins>
   <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
   ```
4. Posições sugeridas:
   - **Ficha da empresa**: depois do bloco de identificação (CNPJ, situação, endereço)
     e outra entre seções longas (por exemplo, antes de sócios ou contratos).
   - **Busca**: depois dos 3 primeiros resultados.
   - **Guias**: depois do segundo parágrafo e antes da conclusão.
   - **Inicial**: no máximo um, abaixo da caixa de busca, nunca colado a ela.
5. Crie blocos separados por posição (`Ficha · ficha`, `Ficha · busca`, `Ficha · guia`)
   para ver no relatório qual rende mais.
6. Mesmo modelo de recusa do Calcula: link "Preferências de privacidade" no rodapé e
   o parágrafo de publicidade na política de privacidade.
7. Repita os passos 2 a 4 do painel para `fichaclara.com.br`. As fichas são páginas
   longas, então os anúncios na página com carga média tendem a render bem lá.
