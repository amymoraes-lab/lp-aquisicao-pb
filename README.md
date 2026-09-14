> **A v2 do redesenho (PD-135) está em [HANDOFF-v2.md](HANDOFF-v2.md).**
> Este README documenta a **v1**, gerada do `.dc.html` do Claude Design e
> preservada em `v1-canvas.html`. O `tools/build.py` continua funcionando e não
> sobrescreve mais o `index.html`, que agora é a v2 autoral.

# PD-135 — Landing page Personal Banker

Implementação em HTML/CSS/JS estático do protótipo desenhado no Claude Design
([projeto](https://claude.ai/design/p/08f0581f-54a6-4745-af13-2c9a00e905b3)),
para a LP de aquisição `franq.com.br/personal-banker`.

É o entregável “Código HTML/CSS gerado como referência de implementação” do
[PD-135](https://franq.atlassian.net/browse/PD-135). Sem build, sem framework,
sem dependências: abrir `index.html` em um servidor estático já roda.

```bash
python3 -m http.server 4173
```

## Estrutura

```
index.html                      página completa (gerada — não editar à mão)
assets/css/styles.css           base + estados extraídos do design (gerada)
assets/js/app.js                lógica da página (escrita à mão)
assets/img/                     fotos que estavam nos image-slots do protótipo
logos/  fonts/                  assets do projeto de design (compartilhados)
tools/build.py                  gera index.html + styles.css a partir do .dc.html
tools/slots.json                crop/zoom de cada image-slot, lido pelo build

Personal Banker.dc.html         FONTE: protótipo do Claude Design
Personal Banker v1 (bandas claras).dc.html   iteração anterior (V1)
image-slot.js  support.js  uploads/  .image-slots.state.json   runtime do canvas
```

## Regerar depois de uma iteração do design

O `.dc.html` continua sendo a fonte da verdade do layout. Depois de editar o
design no Claude Design, baixe o arquivo novo e rode:

```bash
python3 tools/build.py
```

`app.js` **não** é gerado: se a lógica mudar no protótipo, ela precisa ser
portada à mão. O build falha explicitamente se aparecer alguma construção do
canvas que ele ainda não sabe traduzir.

## O que o build traduz

O `.dc.html` roda sobre a runtime do canvas. Equivalências aplicadas:

| Canvas | HTML/CSS padrão |
| --- | --- |
| `<x-dc>` / `<helmet>` | `<head>` + `<body>` normais |
| `style-hover` / `style-focus` / `style-active` | regras `[data-h|f|a="N"]:hover` etc. em `styles.css` |
| `ref="{{ x }}"` | `data-ref="x"` |
| `onClick`/`onInput`/`onChange`/`onSubmit` | `data-click`/`data-input`/`data-change`/`data-submit` |
| `<sc-if value="{{ x }}">` | `<div class="dc-if" data-if="x">` (`display:contents`) |
| `<sc-for list="{{ l }}" as="opt">` | `<template data-for="l">` + clone no JS |
| `{{ expr }}` em texto | `<span data-text="expr"></span>` |
| `<image-slot>` | `<div class="fq-slot"><img>` com o mesmo crop (ver abaixo) |
| `props` do canvas (`faqOpenFirst`) | valor padrão aplicado direto no HTML |
| `<script type="text/x-dc">` (React) | `assets/js/app.js` em JS puro |

### Geometria dos slots de imagem

Vale registrar porque é fácil errar. As duas fotos são paisagem (830×553 e
446×297, ratio 1,50) dentro de molduras retrato/quadrada (4/5 e 1/1), e o
`image-slot.js` não usa `object-fit`: ele dimensiona a `<img>` no tamanho *cover*
real — `iw*base*s` × `ih*base*s`, com `base = max(fw/iw, fh/ih)` — e centra esse
box em `(50+x)%, (50+y)%` da moldura. A imagem transborda a moldura, e é por isso
que o deslocamento revela **mais imagem**.

Reproduzir com `width:100%;height:100%;object-fit:cover` + deslocamento **não
funciona**: ali o box tem o tamanho da moldura, então deslocá-lo deixa faixa
vazia de um lado e corta do outro. No hero (`x = 14,475%`) isso deixava 14,8% da
moldura vazia à esquerda e cortava 36px à direita.

O `build.py` lê as dimensões do arquivo (WebP/PNG, sem dependências) e emite:

```css
height: calc(100% * s); width: auto;      /* a aspect-ratio calcula a largura */
min-width: calc(100% * s);                /* caso inverso: moldura mais larga  */
min-height: calc(100% * s);               /*   que a imagem -> object-fit atua  */
aspect-ratio: <iw> / <ih>;
left: calc(50% + <x>%); top: calc(50% + <y>%);
transform: translate(-50%, -50%);
```

Confere com a conta do componente: hero renderiza 883×588 num frame de 470×588
(= `iw*base` × `ih*base`), pan de 14,474%, sem folga em nenhum lado.

## Comportamento implementado

Portado 1:1 do componente do protótipo e verificado no browser:

- **Contadores do hero** (+150 / +50 / 10.000) com `IntersectionObserver`,
  easing `easeInOutQuint`, formatação `pt-BR`, desligados em `prefers-reduced-motion`.
- **Carrossel de depoimentos**: dots, anterior/próximo com wrap-around.
- **Formulário em 3 passos** (Dados → Perfil → Endereço): barra de progresso,
  validação nativa por passo, mensagem de erro em `role="alert"`,
  Voltar/Continuar/Enviar aparecendo conforme o passo.
- **Selects múltiplos** (instituições, cargos, certificações): resumo dinâmico
  (“A, B” até 2, depois “N selecionados”).
- **Busca de CEP** via [ViaCEP](https://viacep.com.br) com máscara, preenchimento
  de rua/bairro/cidade/UF, fallback para edição manual quando a API falha, e
  foco automático no número. Testado com `01310-100` → Avenida Paulista / São Paulo / SP.
- **Estado de sucesso**: formulário sai, bloco “Cadastro enviado” entra com foco.
- **FAQ** em `<details>`/`<summary>`, primeiro item aberto, chevron por CSS.

### Ajustes feitos em relação ao protótipo

1. **Carrossel de depoimentos passou a funcionar.** No protótipo a classe define
   `componentDidUpdate` duas vezes; a segunda sobrescreve a primeira, então
   `applyDep()` nunca rodava depois da montagem e os dots/setas não trocavam o
   depoimento. Aqui o render aplica os dois.
2. **Código morto removido:** `ctaRef`/`onScroll` e a prop `showSticky` não têm
   elemento correspondente no markup (sobra da V1), assim como as regras
   `#befranq-app`, `.fq-app`, `.fq-prods` e `.fq-sticky` no CSS. O CTA fixo
   “Fale com a Fran” é sempre visível, como no protótipo.
3. **Selects múltiplos não recriam o DOM** a cada marcação (o React fazia patch;
   uma reconstrução ingênua tirava o foco do teclado e resetava o scroll do
   dropdown). As opções são criadas uma vez e só o `checked` é sincronizado.
4. **Fechar dropdown com `Esc` e com clique fora**, mais `aria-expanded` nos
   botões — o protótipo só fechava clicando no próprio botão.
5. **`alt` reais** nas fotos (no protótipo o `placeholder` do slot era instrução
   de arte, não texto alternativo).
6. **Alvos de toque e menu mobile** — ver a seção [Mobile](#mobile).

## Interações

**Reveal no scroll.** Inspirado no [Techy](https://techy-preview.vercel.app),
template que serviu de referência: lá o efeito vem do AOS, dentro de 249 KB de
JS (jQuery + jQuery-UI + Bootstrap + AOS + WOW + slick + isotope + tilt +
counterup + waypoints). Aqui é IntersectionObserver puro, **0 KB de dependência**
— a mesma abordagem dos contadores do hero.

27 elementos entram com `fade-up` de 16px em `.5s`, easing
`cubic-bezier(.2,.7,.2,1)` do design, com stagger de 80ms entre irmãos (cards,
benefícios) e 40ms no FAQ.

**O que fica fora, de propósito:**

| Fora | Por quê |
| --- | --- |
| Hero e barra de números | Acima da dobra; os números já têm a animação de contagem |
| `.fq-dep` (depoimentos) | `applyDep()` troca `display`; em `display:none` nada intersecta, e o elemento ficaria preso invisível quando o carrossel o exibisse |
| Miolo do formulário | Mesma coisa com `applyStep()` |
| Marquees | Decorativos e já animam sozinhos |

Nenhum alvo é ancestral dos elementos `position:fixed` (CTA fixo e bolha da Fran
vivem direto no `<body>`) — um `transform` num ancestral viraria containing block
e quebraria o posicionamento deles.

**Três redes de segurança**, porque conteúdo preso invisível é o pior resultado
possível:

1. O estado escondido mora em `.reveal [data-reveal]:not(.is-in)` e a classe
   `reveal` é adicionada pelo próprio JS. Sem JS, com JS quebrado antes do setup,
   sem `IntersectionObserver` ou com `prefers-reduced-motion`, a classe nunca
   entra e a página renderiza normal. Um `try/catch` remove a classe se o setup
   falhar no meio.
2. `setTimeout` de 8s que **remove a classe da raiz** — não só marca `is-in`.
   Marcar `is-in` não basta: em aba oculta as transições ficam pausadas e a
   opacidade travaria no valor inicial.
3. Um listener de `scroll`: se alguém está rolando e um alvo já passou da metade
   da viewport ainda escondido, o observer não está funcionando (existem
   contextos que reportam `visibilityState: "hidden"` com a página na tela, onde
   o observer não dispara **e** o `setTimeout` é estrangulado). Numa página
   saudável nunca dispara — verificado.

> Nota de implementação: o estado final usa `:not(.is-in)` em vez de
> `transform: none` no `.is-in`. Com `transform: none` a regra do reveal venceria
> por especificidade o `translateY(-2px)` do hover dos cards e mataria o efeito.
> Assim, ao revelar, a regra simplesmente para de casar. O hover dos cards também
> precisou de `> div[style]` (sobe de (0,2,1)) para não herdar a transição de
> `.5s` do reveal no lugar da própria, de `.18s`.

**O que da referência eu deliberadamente não trouxe:** o Techy roda **6 animações
infinitas simultâneas** — selo circular girando, formas geométricas flutuando,
ripples, barra diagonal, máscaras em blob. Briga com a linguagem editorial e
contida do design da Franq, e é custo de bateria no mobile, que é onde a LP
converte. Contadores, marquee, carrossel e hovers a página já tinha, em versões
sem jQuery.

**Hover nos cards de "O que preciso para começar a atuar?"** Não vinha do design;
foi acrescentado. Usa o vocabulário de hover que a página já tem — fundo
`rgba(255,255,255,.04)` → `.07` e borda `rgba(139,155,255,.16)` → `.38` (o mesmo
valor do hover dos radios do formulário) — mais uma elevação de 2px e sombra, em
`.18s` com a easing `cubic-bezier(.2,.7,.2,1)` do design.

Está dentro de `@media (hover: hover)`: em touch o `:hover` "gruda" depois do
toque e o card ficaria destacado sem motivo. Os cards não são clicáveis, então a
elevação foi mantida discreta de propósito, para não sugerir que sejam.

O seletor mira o grid da seção (`minmax(min(100%,240px),1fr)`, único no
documento) e pega exatamente os três cards.

**Hover nos ícones de "Você não está sozinho. Conte com a gente."** Também
acrescentado. No hover do item, o chip de 38px muda o fundo de
`rgba(139,155,255,.14)` para `.26`, a `color` de `#8B9BFF` para `#B9C4FF` e ganha
`translateY(-2px) scale(1.08)`, em `.2s`.

Dois detalhes: o SVG usa `stroke="currentColor"`, então mexer na `color` do chip
anima o traço do ícone junto, sem precisar tocar no `<svg>`; e o gatilho é o item
inteiro, não o chip — alvo bem maior que 38px, e o texto ao lado participa do
mesmo hover. Mesmo `@media (hover: hover)` dos cards.

## Depoimentos

São **3**: Karen Lopes (a única com foto), Jeferson Cantanhede e Douglas Biscaia.
`build_depoimentos()`, em `tools/build.py`, monta a lista em três passos:

1. **Descarta os genéricos.** O design traz dois depoimentos cuja autoria é só
   "Personal Banker", sem nome nem cidade. O critério é o conteúdo do
   `<figcaption>`, não a posição, para sobreviver a reordenação no design.
2. **Acrescenta `DEPOIMENTOS_EXTRA`** (Jeferson e Douglas) **clonando o primeiro
   `<figure class="fq-dep">`** que sobrou e trocando só citação, autoria e o `id`
   do slot — em vez de escrever markup novo. Assim eles herdam o estilo do design
   e passam pelas mesmas transformações (`ref=`, `image-slot`, `style-hover`) que
   os originais; se o design restilizar a seção, os novos acompanham.
3. **Renumera tudo** (`depRefN`, `dotRefN`, `goToN`, `aria-label`, `id` do slot)
   em sequência a partir de 0. Sem isso sobrariam buracos — `depRef0`, `depRef3`,
   `depRef4` — e o `app.js`, que varre `0..DEP_COUNT-1`, não acharia os refs.

`DEP_COUNT` em `app.js` vem do DOM (`[data-ref^="depRef"]`) e os handlers `goToN`
são gerados em laço, então adicionar ou remover depoimento não exige mexer no JS.
O build imprime o balanço a cada rodada (`3 no design - 2 genérico(s) + 2 extra(s)
= 3`).

> **Atenção:** essas mudanças **não estão no projeto do Claude Design.** Se o
> `.dc.html` for baixado de novo, o build refaz tudo (descarta os genéricos e
> reinjeta os dois novos), mas o protótipo compartilhado com stakeholders vai
> continuar mostrando os 3 originais, com os dois genéricos. O ideal é replicar
> no Claude Design também.

**Depoimento sem foto ocupa a largura toda.** No design, slot vazio rende um
placeholder tracejado ("Foto do Personal Banker") — que é aviso para o designer
preencher, não conteúdo de página. Com 3 depoimentos e só 1 foto, seriam 2 caixas
tracejadas no desktop. Agora a citação usa as duas colunas (1000px em vez de
692px) quando não há foto, via `:has(.fq-slot--empty)`; sem suporte a `:has()`, o
comportamento antigo é o fallback. Se as fotos do Jeferson e do Douglas chegarem,
basta pôr os arquivos em `assets/img/` e registrar em `tools/slots.json` — o
layout de duas colunas volta sozinho.


Texto menor e sem itálico, **nas duas larguras** — é regra base em
`assets/css/styles.css`, não media query.

| | Antes | Depois |
| --- | --- | --- |
| Desktop | 27px (depoimento 1: 22px itálico) | **21px**, sem itálico |
| Mobile | 20px (depoimento 1: 22px itálico) | **18px**, sem itálico |

O tamanho virou `clamp(18px, 1.5vw, 21px)` para os três. Isso também corrigiu uma
inconsistência do design: o primeiro depoimento traz um
`<i style="font-weight:300;font-size:22px">` embutido no `<blockquote>`, então ele
saía 22px itálico enquanto os outros dois ficavam em `clamp(20px,2.4vw,27px)`
normais. A regra neutraliza o `<i>` (`font-style`, `font-size` e `font-weight`
herdados) em vez de mexer no markup, para sobreviver ao próximo build.

A serif (`Nib Pro` / `Playfair Display`) e a `line-height` de leitura seguem —
só o corpo diminuiu, com `line-height` ajustada de 1,34 para 1,42, que casa
melhor com o texto menor.

**No mobile a foto do PB não aparece** — só a citação, a autoria e os dots. Vale
para o slot preenchido (`dep-1`) e para os placeholders de `dep-2`/`dep-3`, e
`dep-1` entrou no `NO_MOBILE`, então o WebP (15,9 KB) também não é baixado. No
desktop a foto segue como no design.

## Mobile

O protótipo é responsivo, mas alguns blocos não tinham tratamento mobile. Estes
ajustes são **só mobile** (`@media (max-width:760px)`): o desktop segue idêntico
ao design, verificado por comparação de pixels byte a byte.

| | Antes | Depois |
| --- | --- | --- |
| Barra do header | 254px (5 links empilhados) | **72px** (logo + menu) |
| Grid de benefícios | 2 colunas de 155px | 1 coluna de 342px |
| Parágrafo do cadastro | 26px (maior que o H2) | 15,5px |
| Dots do carrossel | alvo de 26×5px | alvo de 34×44px (visual segue 26×5) |
| Linha do FAQ | 28px clicáveis | 48px clicáveis |
| Opções dos selects | 41px | 45px |
| Setas do carrossel | 42px | 46px |
| Logo do header (link) | 30px | 46px |
| Logos dos parceiros | 68px | **78px** (natural do arquivo é 91px) |
| CTA "Fale com a Fran" | 299px sobre o rodapé | bolha de 57px |
| Legenda dos passos | "03 · Endereço" quebrava em 2 linhas | **não exibida** (só as barras) |
| Texto da resposta do FAQ | 310px | 342px |
| Coluna visual do hero | foto + selo "Loja própria" | **não exibida** (nem o WebP é baixado) |
| Foto do PB nos depoimentos | 160px sob a citação | **não exibida** (nem o WebP é baixado) |
| Barra de números | empilhada, alinhada à esquerda | empilhada e **centralizada** |
| CTA para o formulário | só no topo (fora da dobra ao rolar) | **botão fixo** no rodapé |

**Coluna visual do hero.** Sai inteira no mobile: foto, moldura, gradiente e o
selo *"Loja própria de serviços financeiros"*. Como o container deixa de ser item
do grid, o `gap` dele também não é renderizado.

Só esconder não bastava: `display:none` no container **não impede o download** da
imagem. Então o `<img>` vai dentro de um `<picture>` com um `<source
media="(max-width:760px)">` apontando para um GIF de 1px transparente — o browser
escolhe o pixel e os 27,6 KB do WebP nunca são pedidos (confirmado por
`img.currentSrc`). Quais slots seguem essa regra fica em `NO_MOBILE`, em
`tools/build.py`; a foto do depoimento continua aparecendo nas duas larguras.

**Logos dos parceiros.** 78px de altura do tile no mobile, contra 68px no
desktop — abaixo dos 91px naturais do arquivo, então sem upscaling. O respiro
vertical da faixa cai de 18px para 12px (fica em 104px, praticamente a mesma
altura do desktop) e o intervalo entre logos de 40px para 24px, o que faz passar
~2 logos por tela. Para calibrar o tamanho, mexa só na altura — o resto
acompanha.

Vale um alerta de asset: **a tinta dentro dos tiles não é normalizada.** Todos os
tiles são 164×91, mas a marca dentro ocupa de 23% a 68% da altura:

| logo | tinta | % da altura do tile | marca renderizada a 78px |
| --- | --- | --- | --- |
| itaú | 62×62 | 68% | 53px |
| abc brasil | 61×52 | 57% | 45px |
| bradesco | 120×28 | 31% | 24px |
| c6 | 118×24 | 26% | 21px |
| santander | 117×21 | 23% | 18px |

Como a altura é fixada no tile, as marcas horizontais saem até 3× menores que as
quadradas — em qualquer breakpoint, inclusive no desktop. Aumentar altura ajuda
pouco e de forma desigual. O ajuste de verdade é nos arquivos: recortar cada tile
na própria tinta e depois equilibrar por peso óptico. Fica como pendência.

**Barra de números.** Um abaixo do outro e centralizado. O empilhamento já vinha
do `auto-fit` do design (`minmax(200px,1fr)` em 334px dá 1 coluna) — o que faltava
era centrar. A régua acima de cada número também virou um fade simétrico: a
original esvanece só para a direita, o que fica torto sob texto centralizado.

**CTA fixo.** Um botão *"Quero me tornar PB"* fixo no rodapé, que leva a
`#cadastro`. Cor: **azul franqueza `#4A5BD0`** (o `--primary-deep` do design
system), chapado — difere de propósito do `#687BEA` dos CTAs do header/menu.
Isso revive o comportamento que o design já especificava e que ficou órfão de
markup na V2 — a prop `showSticky`, o `ctaRef`/`onScroll` e a regra
`.fq-sticky { bottom:104px }`:

- **Entra** depois de 75% da primeira tela — antes disso o CTA do próprio hero
  está à vista e o fixo seria redundante.
- **Sai** quando a seção do formulário aparece, para nunca cobrir justamente o
  destino para onde aponta (nem o botão de enviar). Volta a aparecer nas Dúvidas,
  que ficam depois do formulário.
- **Não volta** depois do cadastro enviado (`state.sent`).
- Fica **ao lado** da bolha da Fran, não acima — uma única faixa fixa em vez de
  duas (`right: 89px` = 16 de margem + 57 da bolha + 16 de respiro).
- **Sem véu atrás da faixa.** Havia um degradê (`::before`) para o conteúdo que
  passa por baixo não parecer cortado, mas ele lia como se o botão tivesse
  gradiente, e foi removido. O efeito colateral é que o texto atrás do botão
  agora fica visivelmente cortado — se incomodar, as saídas são um degradê mais
  fraco ou uma faixa chapada em `#0C1120`.
- Padding horizontal elástico (`clamp(13px, 4vw, 20px)`): com os 20px fixos o
  texto + seta estouravam a pílula por 1px em 320px.
- Contraste de **5,68:1** com o texto branco, passa AA — ao contrário do
  `#687BEA` do header/menu, que fica em 3,74:1 (ver Pendências).
- Fora do tab order e da árvore de acessibilidade enquanto está recolhido, e
  gatilhado por `matchMedia`, então no desktop nem entra no tab order.

**Legenda dos passos do formulário.** Não aparece no mobile — ficam só as três
barras de progresso. O texto (`01 · Dados`, `02 · Perfil`, `03 · Endereço`)
continua no DOM, escondido apenas visualmente (`clip-path: inset(50%)`, não
`display:none`), para quem usa leitor de tela não perder em que passo está. O
`applyStep()` segue pintando a cor dele normalmente. No desktop nada muda.

**Menu mobile.** No design os 5 links são irmãos diretos do `<nav>`, então no
mobile empilhavam em 228px. `app.js` agrupa os 5 num painel (`.fq-navmenu`):

- No desktop o painel é a mesma linha flex de antes — mesmo `gap`, mesma
  `margin-left` do CTA, layout idêntico.
- No mobile vira dropdown atrás de um botão de 46px, com `aria-expanded` /
  `aria-controls`, ícone alternando entre ☰ e ✕, e fechamento por clique no
  link, clique fora, `Esc` ou volta ao desktop.
- O CTA vai junto no painel, como botão primário de largura cheia. Não caberia
  na barra: logo (136px) + CTA (166px) + botão de menu (46px) passam de 334px
  úteis a 390px, e o nav voltava a quebrar em duas linhas.
- É progressive enhancement: `app.js` marca `<html class="js">` e o CSS mobile
  do nav depende dessa classe, então sem JS o nav continua como no design.

Testado de 320px a 1440px, sem scroll horizontal em nenhuma largura, e o fluxo
completo do formulário (3 passos + ViaCEP + sucesso) revalidado em 390px.

## Pendências e achados

**Contraste (WCAG AA, critério de aceite do ticket).** Três pares reprovam para
texto normal — são decisões de token, então ficaram como estão no design:

| Uso | Atual | Ratio | Sugestão |
| --- | --- | --- | --- |
| Branco no CTA primário `#687BEA` (header e menu) | 3,74:1 | ✗ | usar `#4A5BD0`, o azul franqueza já aplicado no CTA fixo → 5,68:1 |
| Texto do rodapé `#6E7796` sobre `#0C1120` | 4,25:1 | ✗ | `#727C9C` → 4,55:1 |
| Placeholder dos inputs `#6E7796` | 3,92:1 | ✗ | `#98A1C2` → 6,57:1 |

Aprovados: corpo `#C9D0E8` 12,24:1 · apoio `#98A1C2` 7,35:1 · destaque `#DCFF79`
16,68:1 · links `#8B9BFF` 7,37:1 · erro `#EF476F` 5,19:1 · texto legal 5,00:1.

**Outros pontos, todos herdados do protótipo:**

- **CTA do header não aparece na barra no mobile** — foi para dentro do menu
  (não cabia; ver [Mobile](#mobile)). A cobertura ficou com o CTA fixo do rodapé,
  descrito na mesma seção.
- **Sem máscara em Celular e CPF** — o protótipo não tem (só o CEP mascara).
  Os campos aceitam texto livre com `maxlength`.
- **2 dos 3 depoimentos sem foto:** só `dep-1` (Karen) tem imagem. Jeferson e
  Douglas renderizam a citação em largura cheia. Ver
  [Depoimentos](#depoimentos).
  Basta colocar os arquivos em `assets/img/`, registrar em `tools/slots.json`
  (`src`/`s`/`x`/`y`) e rodar o build.
- **Sem skip link.** Com 73 elementos focáveis e o nav repetido antes do
  conteúdo, vale adicionar um (WCAG 2.4.1, nível A, que a conformidade AA exige).
- **`Nib Pro`** é a primeira da pilha serif, mas não é distribuída aqui: o
  protótipo cai em `Playfair Display` (`fonts/PlayfairDisplay.var.woff2`). Na
  publicação em `franq.com.br` carregue a Nib Pro real.
- **O formulário não envia nada** — `onSubmit` só troca para o estado de sucesso.
  Falta plugar endpoint/CRM e os estados de loading e erro de rede.

## Handoff para Marketing/Web (WordPress/Elementor)

- **Replicável em Elementor:** hero, cards de requisitos, grid de benefícios,
  seção de soluções, FAQ (accordion nativo) e rodapé — são layout e conteúdo.
- **Exige código customizado:** contadores animados, os dois marquees infinitos
  (`@keyframes fq-tick` com faixa duplicada), o formulário de 3 passos com
  validação por etapa, os selects múltiplos com resumo, a busca de CEP na ViaCEP
  e o estado de sucesso. Tudo isso está isolado em `assets/js/app.js`.
- **Tokens usados:** fundo `#0C1120` / `#10152A`; superfícies
  `rgba(255,255,255,.03–.05)`; borda `rgba(139,155,255,.16)`; texto `#C9D0E8` /
  apoio `#98A1C2`; destaque `#DCFF79`; primária `#687BEA` (hover `#4A5BD0`);
  acento `#8B9BFF`; erro `#EF476F`; sucesso `#06D6A0`. Tipografia: Nib Pro /
  Playfair Display (títulos), DM Sans (texto), JetBrains Mono (eyebrows e passos).
- O plano de tagueamento GA4 é entregável separado do ticket e não está neste
  código — nenhum `dataLayer.push` foi adicionado.
