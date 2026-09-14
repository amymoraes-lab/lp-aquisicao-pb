#!/usr/bin/env python3
"""
Gera index.html + assets/css/styles.css a partir de "Personal Banker.dc.html".

O arquivo .dc.html é o fonte do protótipo no Claude Design e usa a runtime do
canvas (<x-dc>, <helmet>, <sc-if>, <sc-for>, ref/onClick, style-hover…).
Este script traduz essas construções para HTML/CSS padrão:

  style-hover / style-focus / style-active  ->  regras [data-h|f|a="N"]:hover…
  ref="{{ x }}"                             ->  data-ref="x"
  onClick|onInput|onChange|onSubmit="{{ f }}" -> data-click|input|change|submit="f"
  <sc-if value="{{ x }}">                   ->  <div class="dc-if" data-if="x">
  <sc-for list="{{ l }}" as="opt">          ->  <template data-for="l">
  {{ expr }} (texto)                        ->  <span data-text="expr"></span>
  <image-slot>                              ->  <div class="fq-slot"><img …>
  <script type="text/x-dc">                 ->  assets/js/app.js (escrito à mão)

Rode depois de cada iteração do design (V2, V3…):  python3 tools/build.py
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "Personal Banker.dc.html"
OUT_HTML = ROOT / "v1-canvas.html"  # v1: gerada do .dc.html. A v2 (index.html) é autoral.
OUT_CSS = ROOT / "assets" / "css" / "styles.css"
SLOTS = json.loads((ROOT / "tools" / "slots.json").read_text())


def intrinsic_size(path):
    """Dimensões do arquivo, sem dependências (WebP e PNG)."""
    d = (ROOT / path).read_bytes()[:64]
    if d[:4] == b"RIFF" and d[8:12] == b"WEBP":
        fmt = d[12:16]
        if fmt == b"VP8X":
            return int.from_bytes(d[24:27], "little") + 1, int.from_bytes(d[27:30], "little") + 1
        if fmt == b"VP8L":
            bits = int.from_bytes(d[21:25], "little")
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
        if fmt == b"VP8 ":
            return (int.from_bytes(d[26:28], "little") & 0x3FFF,
                    int.from_bytes(d[28:30], "little") & 0x3FFF)
    if d[:8] == b"\x89PNG\r\n\x1a\n":
        return int.from_bytes(d[16:20], "big"), int.from_bytes(d[20:24], "big")
    raise ValueError("não sei ler as dimensões de " + path)

# Alt text real para os slots preenchidos (o atributo `placeholder` do design é
# instrução de arte, não texto alternativo).
SLOT_ALT = {
    "hero-banker": "Personal Banker da Franq atendendo no seu ambiente de trabalho",
    "dep-1": "Karen Lopes, Personal Banker em Gravataí",
    "dep-2": "",
    "dep-3": "",
}
EAGER = {"hero-banker"}

# Slots que não são exibidos no mobile. O <img> vai dentro de um <picture>
# com um source de 1px transparente para <=760px: assim o arquivo real nem
# chega a ser baixado (um display:none no container não impede o fetch).
DEPOIMENTOS_EXTRA = [
    {
        "quote": "Gosto muito da ideia de estimular as pessoas a empreender, encorajá-las a "
                 "trilhar seu próprio caminho, ajudar a transformar suas vidas para melhor, "
                 "de uma forma positiva. Afinal, \u2018é preciso estar atento e forte\u2019. "
                 "A Franq, aliada à tecnologia de uma nova era do mercado financeiro, faz "
                 "isso acontecer.",
        "autor": "Jeferson Cantanhede - Porto Alegre/RS",
        "tempo": "Personal Banker há 3 anos",
    },
    {
        "quote": "A Franq é totalmente diferente de um banco. Empreender com ela é ter "
                 "liberdade nas suas escolhas e buscar a melhor opção para atender os seus "
                 "clientes, respeitando o seu momento de vida. Você encontra uma plataforma "
                 "com diversas soluções para atender os seus clientes.",
        "autor": "Douglas Biscaia - Curitiba/PR",
        "tempo": "Personal Banker há 2 anos",
    },
]

NO_MOBILE = {"hero-banker", "dep-1"}
PIXEL_1X1 = ("data:image/gif;base64,"
             "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")

# ---------------------------------------------------------------- 1. recortes
src = SRC.read_text(encoding="utf-8")

m = re.search(r"<x-dc>(.*)</x-dc>", src, re.S)
if not m:
    sys.exit("não encontrei <x-dc> em " + SRC.name)
body = m.group(1)

helmet = re.search(r"<helmet>(.*?)</helmet>", body, re.S)
body = body.replace(helmet.group(0), "") if helmet else body
body = body.strip("\n")


def build_depoimentos(markup: str) -> str:
    """Monta a lista final de depoimentos do carrossel.

    Três coisas, na ordem, porque uma depende da outra:

    1. **Descarta os genéricos.** O design traz dois depoimentos cuja autoria é
       só "Personal Banker", sem nome nem cidade. Critério é o próprio conteúdo
       do <figcaption>, não a posição, para sobreviver a reordenação no design.
    2. **Acrescenta DEPOIMENTOS_EXTRA**, clonando o primeiro <figure> que sobrou.
       Clonar, em vez de escrever markup novo, é o que mantém esses depoimentos
       em pé se o design restilizar a seção: eles herdam o mesmo
       <figure>/<blockquote>/<figcaption> e passam pelas mesmas transformações
       (ref=, image-slot, style-hover) que os originais.
    3. **Renumera tudo** (depRefN, dotRefN, goToN, aria-label, id do slot) em
       sequência a partir de 0. Sem isso sobrariam buracos — depRef0, depRef3,
       depRef4 — e o app.js, que varre 0..DEP_COUNT-1, não acharia os refs.

    Roda antes de tudo, sobre o markup cru do canvas.
    """
    figs = re.findall(r'<figure class="fq-dep".*?</figure>', markup, re.S)
    dots = re.findall(r'<button type="button" ref="\{\{ dotRef\d+ \}\}".*?</button>',
                      markup, re.S)
    if not figs or not dots:
        sys.exit("não achei os depoimentos/dots no markup")

    def autoria(fig):
        cap = re.search(r"<figcaption[^>]*>(.*?)</figcaption>", fig, re.S)
        return re.sub(r"<[^>]+>", " ", cap.group(1) if cap else "").strip()

    kept = [f for f in figs if autoria(f).casefold() != "personal banker"]
    dropped = len(figs) - len(kept)
    if not kept:
        sys.exit("todos os depoimentos foram descartados — revise o critério")

    tpl = kept[0]
    span = re.search(r'<span style="display: block; font-family[^>]*>', tpl)
    if not span and DEPOIMENTOS_EXTRA:
        sys.exit("não achei o <span> da autoria no depoimento template")

    for d in DEPOIMENTOS_EXTRA:
        fig = tpl
        quote = d["quote"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        fig = re.sub(r"(<blockquote[^>]*>).*?(</blockquote>)",
                     lambda m: m.group(1) + quote + m.group(2), fig, flags=re.S)
        cap = d["autor"] + span.group(0) + d["tempo"] + "</span>"
        fig = re.sub(r"(<figcaption[^>]*>).*?(</figcaption>)",
                     lambda m: m.group(1) + cap + m.group(2), fig, flags=re.S)
        kept.append(fig)

    # renumeração sequencial
    out_figs, out_dots = [], []
    for i, fig in enumerate(kept):
        fig = re.sub(r'ref="\{\{ depRef\d+ \}\}"', 'ref="{{ depRef%d }}"' % i, fig)
        fig = re.sub(r'id="dep-\d+"', 'id="dep-%d"' % (i + 1), fig)
        # só o primeiro entra visível; applyDep() reafirma isso no boot
        fig = re.sub(r"(margin:0;display:)(grid|none)(;)",
                     lambda m: m.group(1) + ("grid" if i == 0 else "none") + m.group(3),
                     fig, count=1)
        out_figs.append(fig)

        dot = dots[0]
        dot = re.sub(r'ref="\{\{ dotRef\d+ \}\}"', 'ref="{{ dotRef%d }}"' % i, dot)
        dot = re.sub(r'onClick="\{\{ goTo\d+ \}\}"', 'onClick="{{ goTo%d }}"' % i, dot)
        dot = re.sub(r'aria-label="Depoimento \d+"',
                     'aria-label="Depoimento %d"' % (i + 1), dot)
        out_dots.append(dot)

    def swap(text, olds, news):
        a = text.index(olds[0])
        z = text.index(olds[-1]) + len(olds[-1])
        return text[:a] + "\n".join(news) + text[z:]

    markup = swap(markup, figs, out_figs)
    dots = re.findall(r'<button type="button" ref="\{\{ dotRef\d+ \}\}".*?</button>',
                      markup, re.S)
    markup = swap(markup, dots, out_dots)

    print(f"depoimentos: {len(figs)} no design "
          f"- {dropped} genérico(s) + {len(DEPOIMENTOS_EXTRA)} extra(s) "
          f"= {len(out_figs)}")
    return markup


body = build_depoimentos(body)

# ------------------------------------------------- 2. estados (hover/focus/…)
state_rules = []          # (seletor, css)
state_index = {}          # (tipo, css) -> n


def important(css: str) -> str:
    out = []
    for decl in css.split(";"):
        decl = decl.strip()
        if decl:
            out.append(decl + " !important")
    return ";".join(out)


def state_sub(kind: str, attr: str, pseudo: str):
    """style-hover="…" -> data-h="3", registrando a regra CSS."""
    def repl(mt):
        css = mt.group(1)
        key = (kind, css)
        if key not in state_index:
            state_index[key] = len(state_index) + 1
            n = state_index[key]
            state_rules.append((f'[data-{attr}="{n}"]{pseudo}', important(css)))
        return f' data-{attr}="{state_index[key]}"'
    return repl


body = re.sub(r'\s*style-hover="([^"]*)"', state_sub("hover", "h", ":hover"), body)
body = re.sub(r'\s*style-focus="([^"]*)"', state_sub("focus", "f", ":focus"), body)
body = re.sub(r'\s*style-active="([^"]*)"', state_sub("active", "a", ":active"), body)

# --------------------------------------------------------- 3. refs e handlers
body = re.sub(r'\sref="\{\{\s*([\w.]+)\s*\}\}"', r' data-ref="\1"', body)
for ev, at in (("onClick", "click"), ("onInput", "input"),
               ("onChange", "change"), ("onSubmit", "submit")):
    body = re.sub(rf'\s{ev}="\{{\{{\s*([\w.]+)\s*\}}\}}"', rf' data-{at}="\1"', body)

# ------------------------------------------------------ 4. controle de fluxo
body = re.sub(r'\shint-placeholder-(?:val|count)="[^"]*"', "", body)
body = re.sub(r'<sc-if\s+value="\{\{\s*([\w.]+)\s*\}\}"\s*>',
              r'<div class="dc-if" data-if="\1">', body)
body = body.replace("</sc-if>", "</div>")
body = re.sub(r'<sc-for\s+list="\{\{\s*([\w.]+)\s*\}\}"\s+as="\w+"\s*>',
              r'<template data-for="\1">', body)
body = body.replace("</sc-for>", "</template>")

# checkbox das opções: checked="{{ opt.selected }}" já virou data-... abaixo
body = body.replace('checked="{{ opt.selected }}"', 'data-bind-checked="selected"')
body = body.replace('data-change="opt.toggle"', 'data-change="toggle"')

# <details open="{{ faqOpenFirst }}"> — prop com default true
body = body.replace('open="{{ faqOpenFirst }}"', "open")

# --------------------------------------------------------------- 5. slots
def slot(mt):
    tag = mt.group(0)
    attrs = dict(re.findall(r'(\w[\w-]*)="([^"]*)"', tag))
    sid = attrs.get("id", "")
    style = attrs.get("style", "")
    if "overflow" not in style:
        style += ";overflow:hidden"
    if "position:" not in style:
        style += ";position:relative"
    data = SLOTS.get(sid)
    if not data:
        ph = attrs.get("placeholder", "Imagem")
        return (f'<div class="fq-slot fq-slot--empty" style="{style}" aria-hidden="true">'
                f'<span>{ph}</span></div>')
    x, y, s = data["x"], data["y"], data["s"]
    iw, ih = intrinsic_size(data["src"])

    # image-slot.js dimensiona a <img> no tamanho *cover* real (iw*base*s por
    # ih*base*s) e centra esse box em (50+x)%, (50+y)% da moldura. Ou seja: a
    # imagem transborda a moldura e o deslocamento revela mais imagem.
    # Reproduzir isso com width/height 100% + object-fit:cover NÃO funciona —
    # ali o box tem o tamanho da moldura, e deslocá-lo deixa faixa vazia de um
    # lado e corta do outro. Então damos a altura (× s) e deixamos a
    # `aspect-ratio` calcular a largura: o browser chega no mesmo cover.
    # min-width/min-height cobrem o caso inverso (moldura mais larga que a
    # imagem), em que o object-fit:cover volta a fazer o recorte.
    size = (f'height:{s * 100:.4f}%;width:auto;'
            f'min-width:{s * 100:.4f}%;min-height:{s * 100:.4f}%;'
            f'aspect-ratio:{iw}/{ih}')
    left = "50%" if abs(x) < 1e-6 else f"calc(50% + {x:.4f}%)"
    top = "50%" if abs(y) < 1e-6 else f"calc(50% + {y:.4f}%)"
    loading = 'loading="eager" fetchpriority="high"' if sid in EAGER else 'loading="lazy"'
    alt = SLOT_ALT.get(sid, "")
    img = (f'<img src="{data["src"]}" alt="{alt}" {loading} decoding="async" '
           f'width="{iw}" height="{ih}" '
           f'style="left:{left};top:{top};transform:translate(-50%,-50%);{size}">')
    if sid in NO_MOBILE:
        img = (f'<picture><source media="(max-width:760px)" '
               f'srcset="{PIXEL_1X1}">{img}</picture>')
    return f'<div class="fq-slot" style="{style}">{img}</div>'


body = re.sub(r'<image-slot\b[^>]*>\s*</image-slot>', slot, body)

# ------------------------------------------------- 6. interpolação de texto
body = re.sub(r'\{\{\s*([\w.]+)\s*\}\}', r'<span data-text="\1"></span>', body)

leftover = re.findall(r'\{\{[^}]*\}\}|<sc-\w+|<image-slot|style-(?:hover|focus|active)=', body)
if leftover:
    sys.exit("construções do canvas não convertidas: " + repr(sorted(set(leftover))))

# ------------------------------------------------------------------ 7. CSS
BASE_CSS = """/* ============================================================================
   Personal Banker — Franq  (PD-135)
   Gerado por tools/build.py a partir de "Personal Banker.dc.html".
   Não edite à mão: altere o design no Claude Design e rode o build de novo.
   ========================================================================== */

@font-face {
  font-family: "Playfair Display";
  src: url("../../fonts/PlayfairDisplay.var.woff2") format("woff2-variations");
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
}

html { scroll-behavior: smooth; background: #0C1120; }

body {
  margin: 0;
  background: #0C1120;
  color: #C9D0E8;
  font-family: "DM Sans", -apple-system, "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.62;
  -webkit-font-smoothing: antialiased;
  font-variant-numeric: tabular-nums lining-nums;
  overflow-x: hidden;
}

a { color: #8B9BFF; }
a:hover { color: #fff; }
:focus-visible { outline: 3px solid rgba(139,155,255,.55); outline-offset: 2px; border-radius: 6px; }
input::placeholder { color: #6E7796; }
summary::-webkit-details-marker { display: none; }

details[open] .fq-chev { transform: rotate(180deg); }

@keyframes fq-tick  { to { transform: translateX(-50%) } }
@keyframes fq-float { from { transform: translateY(-8px) } to { transform: translateY(14px) } }

/* --- blocos condicionais (eram <sc-if> no canvas) ------------------------ */
.dc-if { display: contents; }
.dc-if[hidden] { display: none !important; }

/* --- slots de imagem (eram <image-slot> no canvas) ----------------------- */
/* width/height/aspect-ratio vêm inline por slot (ver slot() no build) */
.fq-slot img {
  position: absolute;
  max-width: none;
  object-fit: cover;
  display: block;
}
.fq-slot--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  border: 1px dashed rgba(139,155,255,.28);
  background: rgba(139,155,255,.05);
  color: #6E7796;
  font-size: 12.5px;
  line-height: 1.45;
}

/* --- alvos de toque (todas as larguras) ---------------------------------
   O <details> do FAQ carrega o padding no próprio elemento, então só os 28px
   do texto do <summary> eram clicáveis. Passamos o padding de cima para o
   summary: mesmo espaçamento visual, linha inteira tocável (48px). */
details[style] { padding-top: 0 !important; }
details[style] > summary { padding-top: 20px; }

a, button, summary, label { -webkit-tap-highlight-color: rgba(139,155,255,.18); }

/* --- reveal no scroll ---------------------------------------------------
   O estado escondido mora em `:not(.is-in)` e só existe sob
   <html class="reveal">, classe que o próprio app.js adiciona. Duas
   consequências de propósito:

   - Sem JS, com JS quebrado ou com prefers-reduced-motion, a classe nunca
     entra e a página renderiza normal. Nada fica invisível por acidente.
   - Quando o elemento é revelado, a regra para de casar e o `transform` do
     reveal simplesmente deixa de existir — em vez de virar `transform:none`,
     que brigaria com o `translateY(-2px)` do hover dos cards.

   A transição fica na regra base para animar na entrada. */
.reveal [data-reveal] {
  transition: opacity .5s cubic-bezier(.2,.7,.2,1),
              transform .5s cubic-bezier(.2,.7,.2,1);
}
.reveal [data-reveal]:not(.is-in) {
  opacity: 0;
  transform: translateY(16px);
}

/* --- cards de "O que preciso para começar a atuar?" ---------------------
   Hover nos três cards numerados. Usa o vocabulário que o design já tem:
   fundo .04 -> .07 e borda .16 -> .38 (o mesmo valor do hover dos radios do
   formulário), mais uma elevação discreta de 2px.

   @media (hover:hover): em touch, :hover "gruda" depois do toque e o card fica
   destacado sem motivo. O !important é para vencer o style inline.
   O grid dessa seção é o único do documento com esse minmax. */
@media (hover: hover) {
  [style*="minmax(min(100%,240px),1fr)"] > div[style] {
    transition: background .18s cubic-bezier(.2,.7,.2,1),
                border-color .18s cubic-bezier(.2,.7,.2,1),
                transform .18s cubic-bezier(.2,.7,.2,1),
                box-shadow .18s cubic-bezier(.2,.7,.2,1);
  }
  [style*="minmax(min(100%,240px),1fr)"] > div[style]:hover {
    background: rgba(255,255,255,.07) !important;
    border-color: rgba(139,155,255,.38) !important;
    transform: translateY(-2px);
    box-shadow: 0 18px 34px -18px rgba(4,6,18,.8);
  }
}

/* --- ícones de "Você não está sozinho. Conte com a gente." --------------
   O gatilho é o item inteiro, não o chip de 38px: alvo maior e o texto ao lado
   participa do mesmo hover. O SVG usa stroke="currentColor", então mexer na
   `color` do chip anima o traço do ícone junto.
   Mesmo @media (hover:hover) dos cards, pelo mesmo motivo (:hover grudado em
   touch). O grid dessa seção é o único do documento com esse repeat(2,...). */
@media (hover: hover) {
  [style*="repeat(2,minmax(0,1fr))"] > div > div[aria-hidden="true"] {
    transition: background .2s cubic-bezier(.2,.7,.2,1),
                color .2s cubic-bezier(.2,.7,.2,1),
                transform .2s cubic-bezier(.2,.7,.2,1);
  }
  [style*="repeat(2,minmax(0,1fr))"] > div:hover > div[aria-hidden="true"] {
    background: rgba(139,155,255,.26) !important;
    color: #B9C4FF !important;
    transform: translateY(-2px) scale(1.08);
  }
}

/* --- depoimentos (todas as larguras) -----------------------------------
   Texto menor e sem itálico. Vale para desktop e mobile: é regra base, não
   media query. Também uniformiza os três — no design o primeiro depoimento
   traz um <i style="font-weight:300;font-size:22px"> embutido, então ele
   saía 22px itálico enquanto os outros dois ficavam em
   clamp(20px,2.4vw,27px) normais. O !important é para vencer o style inline
   do blockquote e do <i>. */
.fq-dep blockquote {
  font-size: clamp(18px, 1.5vw, 21px) !important;
  font-style: normal !important;
  line-height: 1.42 !important;
}
/* Depoimento sem foto: a citação ocupa a largura toda, em vez de reservar uma
   coluna com o placeholder tracejado do canvas ("Foto do Personal Banker") —
   que é aviso para o designer preencher, não conteúdo de página. Se a foto for
   adicionada (assets/img + tools/slots.json), o layout de duas colunas volta
   sozinho. Sem suporte a :has() o comportamento antigo é o fallback. */
.fq-dep:has(.fq-slot--empty) { grid-template-columns: minmax(0,1fr) !important; }
.fq-dep .fq-slot--empty { display: none !important; }

.fq-dep blockquote i,
.fq-dep blockquote em {
  font-style: normal !important;
  font-size: inherit !important;
  font-weight: inherit !important;
}

/* --- montados por app.js (sem JS, nada disso existe) -------------------- */
.fq-sticky { display: none; }
.fq-navtoggle { display: none; }
.fq-navmenu { display: flex; align-items: center; gap: 8px; }

/* ========================================================================
   MOBILE
   ===================================================================== */
@media (max-width: 760px) {

  /* nav ocupava 228px empilhando 5 links; vira menu + CTA em uma linha */
  .js .fq-navtoggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    flex: none;
    padding: 0;
    border-radius: 999px;
    border: 1px solid rgba(139,155,255,.28);
    background: rgba(255,255,255,.05);
    color: #EAEDF6;
    cursor: pointer;
    transition: background .15s, border-color .15s;
  }
  .js .fq-navtoggle[aria-expanded="true"] {
    background: rgba(139,155,255,.16);
    border-color: rgba(139,155,255,.5);
  }
  .js .fq-navmenu {
    position: absolute;
    top: calc(100% + 12px);
    left: clamp(28px,7vw,120px);
    right: clamp(28px,7vw,120px);
    z-index: 40;
    display: none;
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    padding: 8px;
    background: #131A33;
    border: 1px solid rgba(139,155,255,.28);
    border-radius: 16px;
    box-shadow: 0 22px 48px -18px rgba(4,6,18,.85);
  }
  .js .fq-navmenu[data-open] { display: flex; }
  .js .fq-navmenu > a {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    min-height: 48px;
    padding: 13px 16px !important;
    border-radius: 10px;
    font-size: 15.5px !important;
  }
  /* logo do header: link de 30px -> 46px de alvo */
  header a[href="#hero"] { padding: 8px 0; }

  /* o CTA vem junto no painel e ganha destaque de botão primário */
  .js .fq-navmenu > a[href="#cadastro"] {
    justify-content: center;
    box-sizing: border-box;
    margin-left: 0 !important;
    margin-top: 6px;
    font-size: 16px !important;
    padding: 15px 20px !important;
  }

  /* parágrafo do cadastro vinha em 26px (duas media queries conflitantes no
     design), maior que o próprio H2 */
  .fq-oneline { white-space: normal !important; font-size: 15.5px !important; }

  /* depoimentos: só a citação. A foto do PB não aparece no mobile — vale para
     o slot preenchido e para os placeholders de dep-2/dep-3. Com um único item
     no grid, o gap do <figure> também não é renderizado. */
  .fq-dep { grid-template-columns: minmax(0,1fr) !important; }
  .fq-dep .fq-slot { display: none !important; }

  /* dots do carrossel: a barra segue 26x5, mas o alvo de toque vai a 34x44
     por pseudo-elemento (o JS escreve o shorthand `background` inline, que
     resetaria um background-clip vindo daqui). O -4px lateral preenche o gap
     de 8px entre os dots sem sobrepor o vizinho. */
  [data-ref^="dotRef"] { position: relative; }
  [data-ref^="dotRef"]::after {
    content: "";
    position: absolute;
    left: -4px;
    right: -4px;
    top: 50%;
    height: 44px;
    transform: translateY(-50%);
  }
  [data-click="depPrev"], [data-click="depNext"] {
    width: 46px !important;
    height: 46px !important;
  }

  /* grid de benefícios ficava em 2 colunas de 155px */
  [style*="repeat(2,minmax(0,1fr))"] { grid-template-columns: minmax(0,1fr) !important; }
  [style*="repeat(2,minmax(0,1fr))"] p[style*="width:80%"] { width: 100% !important; }

  /* logos dos parceiros: 78px de altura do tile (o desktop usa 68px; o natural
     do arquivo é 91px, então segue sem upscaling). O respiro vertical da faixa
     cai de 18px para 12px, e o intervalo de 40px para 24px, para passarem ~2
     logos por tela em vez de ~1,7.
     Para calibrar, é só esta altura — o resto acompanha.
     Obs.: a tinta dentro dos tiles não é normalizada (23% da altura no
     santander, 68% no itaú), então marcas horizontais seguem menores que as
     quadradas — isso é do asset, não do CSS. Ver README. */
  header div[aria-hidden="true"] img { height: 78px !important; }
  [style*="overflow:hidden;padding:18px 0"] { padding: 12px 0 !important; }
  [style*="gap:40px;padding-right:40px"] {
    gap: 24px !important;
    padding-right: 24px !important;
  }

  /* legenda dos passos ("01 · Dados"…) não aparece no mobile — sobram só as
     três barras de progresso. O texto continua no DOM, escondido apenas
     visualmente, para o leitor de tela não perder em que passo o usuário
     está. O applyStep() do app.js segue pintando a cor dele sem problema. */
  [data-ref^="stepBar"] > span:last-child {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* CTA da Fran: 299px cobrindo o rodapé -> bolha compacta */
  a[aria-label^="Fale com a Fran"] {
    right: 16px !important;
    bottom: 16px !important;
    max-width: none !important;
    padding: 5px !important;
    gap: 0 !important;
  }
  a[aria-label^="Fale com a Fran"] > span { display: none !important; }

  /* a coluna visual do hero inteira sai no mobile: foto, moldura, gradiente
     e o selo "Loja própria de serviços financeiros". Como o container deixa
     de ser item do grid, o gap dele também não é renderizado. O <picture>
     cuida de o WebP nem ser baixado. */
  [style*="max-width:480px"] { display: none !important; }

  /* barra de números: um abaixo do outro e centralizado. O empilhamento já
     vem do auto-fit (minmax 200px em 334px = 1 coluna); aqui centramos o
     texto e trocamos a régua de cima por um fade simétrico — o original
     esvanece só para a direita, que fica torto sob texto centralizado. */
  [style*="minmax(200px,1fr)"] > div {
    text-align: center;
    border-image: linear-gradient(90deg,
      rgba(139,155,255,0), rgba(139,155,255,.42), rgba(139,155,255,0)) 1 !important;
  }

  /* opções dos selects múltiplos: 41px -> 45px de alvo */
  [data-option] { padding: 11px 12px !important; }

  /* resposta do FAQ reservava 32px à direita para o chevron, que só existe na
     linha do summary — devolve a largura ao texto */
  details > p { padding-right: 0 !important; }

  /* CTA fixo, ao lado da bolha da Fran (não empilha duas faixas fixas).
     right = 16 (margem) + 57 (bolha) + 16 (respiro). Cor: azul franqueza
     #4A5BD0 — o --primary-deep do design system. Difere do #687BEA dos CTAs do
     header/menu de propósito; branco em cima dá 5,68:1 e passa AA (o #687BEA
     dá 3,74:1 e reprova). Chapado, sem gradiente. */
  .js .fq-sticky {
    position: fixed;
    left: 16px;
    right: 89px;
    bottom: 16px;
    z-index: 29;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-sizing: border-box;
    min-height: 52px;
    /* padding elástico: "Quero me tornar PB" + seta fica no limite da
       pílula em 320px com os 20px fixos */
    padding: 14px clamp(13px, 4vw, 20px);
    border-radius: 999px;
    background: #4A5BD0;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -.01em;
    text-decoration: none;
    white-space: nowrap;
    box-shadow: 0 14px 34px -12px rgba(4,6,18,.7);
    transform: translateY(150%);
    opacity: 0;
    pointer-events: none;
    transition: transform .28s cubic-bezier(.2,.7,.2,1), opacity .2s;
  }
  .js .fq-sticky.is-on {
    transform: none;
    opacity: 1;
    pointer-events: auto;
  }
  .js .fq-sticky:hover, .js .fq-sticky:focus-visible { background: #3D4CB8; color: #fff; }

  /* espaço para a bolha não sentar sobre o texto legal */
  footer { padding-bottom: 92px !important; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
}

/* --- estados extraídos de style-hover / style-focus / style-active ------- */
"""

css = BASE_CSS + "\n".join(f"{sel} {{ {decl}; }}" for sel, decl in state_rules) + "\n"

# ----------------------------------------------------------------- 8. HTML
HEAD = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seja um Personal Banker — Franq</title>
<meta name="description" content="Use sua experiência bancária para atender seus clientes com autonomia. Mais de 150 produtos financeiros de mais de 50 instituições parceiras, com o suporte e a tecnologia da Franq.">
<meta name="theme-color" content="#0C1120">
<meta name="color-scheme" content="dark">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<link rel="preload" href="fonts/PlayfairDisplay.var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/styles.css">
</head>
<body>
"""

FOOT = """
<script src="assets/js/app.js" defer></script>
</body>
</html>
"""

OUT_CSS.parent.mkdir(parents=True, exist_ok=True)
OUT_CSS.write_text(css, encoding="utf-8")
OUT_HTML.write_text(HEAD + body + FOOT, encoding="utf-8")

print(f"v1-canvas.html        {OUT_HTML.stat().st_size:>7,} B")
print(f"assets/css/styles.css {OUT_CSS.stat().st_size:>7,} B  ({len(state_rules)} regras de estado)")
