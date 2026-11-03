# AdSense: anúncios prontos para ligar

## Estado desta alteração

O código dos anúncios está pronto, mas **desligado**: `config/publicacao.json` grava
`adsense.modo = "verificacao"`, e há teste que confere isso. Em 03/11/2026, nem o
Calcula Dinheiro nem o Ficha Clara estavam "Pronto" no AdSense. Enquanto isso, o site
continua só com a meta `google-adsense-account` e o `/ads.txt`, que é o necessário
para a análise.

## Como funciona quando ligado

- **Sem janela obrigatória.** O `adsbygoogle.js` carrega assim que a página abre no
  domínio final. A mensagem europeia de consentimento, publicada no AdSense em 26/10,
  vem com o próprio script e aparece só para visitantes do EEE, Reino Unido e Suíça.
  Não há URL de CMP para configurar.
- **Recusa no rodapé.** "Preferências de privacidade" oferece "Recusar publicidade"
  (chave `cd-publicidade-v1`, 180 dias). A página recarrega sem o AdSense. Quando a
  mensagem do Google estiver carregada, o diálogo mostra também "Escolhas de cookies do Google".
- **Três posições por calculadora:**
  1. `resultado`: logo depois da calculadora.
  2. `conteudo`: no guia, entre "Como usar" e os exemplos.
  3. `rodape`: no fim, depois do link patrocinado (quando houver).
- Bloco que o Google não preenche (`data-ad-status="unfilled"`) fica escondido.
- Prévias e qualquer host diferente de `calculadinheiro.com.br` nunca carregam anúncios.

Código: `lib/publicacao.mjs` (`anunciosProntos`, `slotDe`, `publicidadeRecusada`),
`components/publicidade.jsx`, `app/[ferramenta]/page.tsx`, `components/guia.tsx`,
`styles/calcula.css` (`.publicidade`), `tests/publicacao.test.mjs`.

## Como ligar (depois do "Pronto")

1. Em `config/publicacao.json`, trocar `"modo": "verificacao"` por `"modo": "ativo"`.
2. Se já existirem, pôr os IDs dos blocos novos em `adsense.slots.resultado` e
   `adsense.slots.conteudo`. Vazios, as três posições usam o `slotRodape` (8432472360):
   funciona, mas o relatório não separa o desempenho de cada posição.
3. Em `app/privacidade/page.tsx`, atualizar a data "Atualizado em", porque o texto de
   publicidade muda.
4. Trocar o teste "a configuração do repositório mantém os anúncios desligados" pelo
   inverso, abrir PR e publicar com `deploy-verification.sh`. O script e o validador
   aceitam os dois modos e conferem o texto de privacidade de cada um.
5. Ligar também os links de afiliado, se for o caso (`docs/links-de-afiliado.md`).

## Painel do AdSense

### Agora, enquanto o site está em análise
- Deixe o site no ar e acessível ao robô do Google: não bloqueie Googlebot nem
  Mediapartners-Google no Cloudflare. Mantenha o `/ads.txt` respondendo.
- Os motivos mais comuns de recusa são "conteúdo de pouco valor" e "site em construção".
  As calculadoras novas (com guia, exemplos e perguntas) ajudam. Evite páginas vazias ou
  "em breve".
- A análise costuma levar de alguns dias a 2–4 semanas. Não peça uma nova análise
  enquanto o status for "Preparando".

### Depois do "Pronto"
1. **Blocos:** Anúncios → Por bloco de anúncio → Display, **Responsivo**:
   `Calcula · resultado` e `Calcula · conteúdo`.
2. **Anúncios automáticos** (Anúncios → Por site → `calculadinheiro.com.br`):
   - Anúncios âncora: ligado (no celular, costuma ser o formato que mais rende).
   - Vinhetas: ligado (a navegação é por links nativos, então elas aparecem).
   - Trilhos laterais: ligado, se disponível.
   - Anúncios na página: carga **baixa**, porque os três blocos manuais já cobrem o conteúdo.
   - Formatos baseados em intenção: desligado (inserem links no texto das explicações).
3. **Bloqueios:** comece com tudo permitido (mais anunciantes = CPM maior). Bloqueie
   só o que conflitar com o site, como apostas ou "enriquecimento rápido".
4. **Otimização → Experimentos → Otimização automática:** ligada.
5. **Depois de 2–4 semanas:** relatório por bloco e por página. A métrica que importa é
   o RPM da página, mais do que o número de cliques.

## O que não fazer (risco de suspensão da conta)

- Pedir cliques ("clique no anúncio", setas, "apoie o site clicando").
- Disfarçar anúncio de botão, resultado ou link do site. O rótulo "Publicidade" fica.
- Clicar nos próprios anúncios ou pedir que outros cliquem.
- Comprar tráfego barato. O AdSense detecta e retém o pagamento.

## Ficha Clara (fichaclara.com.br)

O código não está no GitHub (pasta local `work/portal-cnpj-integrado`), então ele é
configurado lá, no mesmo modelo: desligado até o "Pronto". Bloco responsivo já criado:
**3555746326**.

1. Já agora: meta `google-adsense-account` = `ca-pub-4178012487609221` no `<head>` e
   `/ads.txt` com `google.com, pub-4178012487609221, DIRECT, f08c47fec0942fa0`.
2. Depois do "Pronto": carregar
   `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4178012487609221`
   (só no domínio final e sem recusa guardada) e inserir os blocos, sempre com o rótulo
   "Publicidade":
   ```html
   <ins class="adsbygoogle" style="display:block"
     data-ad-client="ca-pub-4178012487609221" data-ad-slot="3555746326"
     data-ad-format="auto" data-full-width-responsive="true"></ins>
   <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
   ```
3. Posições: na ficha, depois da identificação (CNPJ, situação, endereço) e entre
   seções longas; na busca, depois dos 3 primeiros resultados; nos guias, depois do
   segundo parágrafo; na inicial, no máximo um, abaixo da busca e sem encostar nela.
4. Mesmo modelo de recusa ("Preferências de privacidade" no rodapé) e o parágrafo de
   publicidade na política de privacidade.
