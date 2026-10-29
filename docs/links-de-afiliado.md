# Links de afiliado ("link patrocinado")

## O que é

Um lugar só por calculadora, no fim do guia e antes do espaço de publicidade, para um link de programa de afiliados
(Lomadee, Awin ou outro), sempre com o aviso "Link patrocinado", o nome do programa e a explicação de que a comissão
não muda o preço nem a conta. O link leva `rel="sponsored nofollow noopener"` (o que o Google exige em link pago) e
abre em nova aba.

Código: `lib/publicacao.mjs` (`linkPatrocinado`, a regra), `components/parceiros.jsx` (o bloco),
`app/[ferramenta]/page.tsx` (onde entra), `styles/calcula.css` (`.parceiro`), `tests/publicacao.test.mjs`.

## Estado desta alteração

`config/publicacao.json` grava `parceiros.modo = "desligado"` e nenhuma calculadora configurada: nenhuma página mostra
link nem aviso. Há teste que confere isso. Decisão do Tiago em 29/10/2026: o cadastro nos programas é dele (dados dele);
o link entra nas páginas **só depois de o AdSense dizer "Pronto"** para `calculadinheiro.com.br`.

## Como ligar (depois do "Pronto")

1. Pôr em `config/publicacao.json`:

   ```json
   "parceiros": {
     "modo": "ativo",
     "porCalculadora": {
       "quanto-rende": {"texto": "Onde abrir um CDB", "programa": "Lomadee", "url": "https://..."}
     }
   }
   ```

   Regras que a função aplica (fora delas, o bloco não aparece): `modo` exatamente `ativo`; `texto` e `programa` com 3 a
   80 caracteres, sem quebra de linha nem `<` `>`; `url` começando com `https://`.
2. Acrescentar em `/termos` (seção "Fontes e serviços externos") uma frase dizendo que algumas páginas trazem um link
   patrocinado identificado como tal (texto público: aprovação do Tiago).
3. PR com o texto do link para a aprovação do Tiago, testes verdes e release pelo `docs/implantacao.md`.
4. Conferir em produção que o bloco aparece só na calculadora configurada e que o AdSense continua "Pronto" (a ajuda do
   AdSense permite link de afiliado ao lado dos anúncios desde que o conteúdo seja maior que a publicidade).
