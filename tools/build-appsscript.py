#!/usr/bin/env python3
"""Gera o projeto pronto para colar no Google Apps Script.

Por que existe um build: o Apps Script **não serve arquivo estático**. Não há
como publicar `assets/css/lp.css`, `logos/itau.webp` ou uma fonte .woff2 com
URL própria. Só existem arquivos .gs e .html dentro do projeto, e o HtmlService
devolve HTML. Então tudo o que a página carrega tem de:

  - ir embutido no HTML (CSS, JS e imagens em data URI), ou
  - vir de um domínio externo (as fontes, que já vinham do Google Fonts).

Saída em build/appsscript/, um arquivo por aba do editor do Apps Script, mais
um PREVIEW.html achatado para conferir localmente antes de subir.
"""
import base64
import mimetypes
import pathlib
import re
import shutil
import subprocess

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "build" / "appsscript"
TMP = SAIDA / "_otimizadas"

# a Playfair local vira Google Fonts: é a mesma família, e poupa 38 KB de
# base64 além de ganhar cache de CDN
FONTES_GOOGLE = (
    '<link href="https://fonts.googleapis.com/css2?'
    'family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400'
    '&family=JetBrains+Mono:wght@400;700'
    '&family=Playfair+Display:ital,wght@0,400..900;1,400..900'
    '&display=swap" rel="stylesheet">'
)


def otimizar_capas():
    """As capas dos depoimentos são o maior peso. Aparecem no máximo a 348px de
    largura; 420px dá 1,2× e corta ~25% dos bytes sem perda visível."""
    TMP.mkdir(parents=True, exist_ok=True)
    mapa = {}
    for orig in sorted((RAIZ / "assets/img/depoimentos").glob("*.jpg")):
        dest = TMP / orig.name
        subprocess.run(
            ["sips", "--resampleWidth", "420", "-s", "format", "jpeg",
             "-s", "formatOptions", "78", str(orig), "--out", str(dest)],
            check=True, capture_output=True)
        mapa[f"assets/img/depoimentos/{orig.name}"] = dest
    return mapa


def data_uri(caminho: pathlib.Path) -> str:
    tipo = mimetypes.guess_type(caminho.name)[0] or "application/octet-stream"
    if caminho.suffix == ".svg":
        tipo = "image/svg+xml"
    b64 = base64.b64encode(caminho.read_bytes()).decode("ascii")
    return f"data:{tipo};base64,{b64}"


def main():
    # o .clasp.json guarda o ID do projeto no Apps Script. Apagar a pasta sem
    # preservá-lo faria o `clasp create` seguinte abrir um projeto NOVO, e a
    # implantação antiga ficaria órfã com a URL que já foi divulgada.
    guardado = None
    clasp = SAIDA / ".clasp.json"
    if clasp.exists():
        guardado = clasp.read_text()
    if SAIDA.exists():
        shutil.rmtree(SAIDA)
    SAIDA.mkdir(parents=True)
    if guardado:
        clasp.write_text(guardado)
        print("(.clasp.json preservado — o projeto continua o mesmo)\n")

    html = (RAIZ / "index.html").read_text()
    css = (RAIZ / "assets/css/lp.css").read_text()
    js = (RAIZ / "assets/js/lp.js").read_text()
    capas = otimizar_capas()

    # ---------------- CSS ----------------
    # o @font-face local sai: a família passa a vir do Google Fonts
    css = re.sub(
        r'@font-face \{[^}]*PlayfairDisplay\.var\.woff2[^}]*\}\n?',
        '/* a Playfair Display vem do Google Fonts nesta versão: o Apps Script\n'
        '   não serve arquivo .woff2 com URL própria */\n',
        css, flags=re.S)
    assert "url(" not in css, "sobrou referência a arquivo local no CSS"

    # ---------------- imagens em data URI ----------------
    # Varre HTML **e JS**: as capas dos depoimentos são apontadas pelo campo
    # `capa` em DEPS, dentro do lp.js. Varrer só o HTML deixava as três de fora
    # e elas quebrariam em produção, porque o Apps Script não serve o caminho.
    ALVO = r'(?:logos|assets/img)/[A-Za-z0-9_\-./]+\.(?:png|jpg|jpeg|webp|svg)'
    trocas = 0
    for fonte_nome in ("html", "js"):
        texto = html if fonte_nome == "html" else js
        for m in sorted(set(re.findall(ALVO, texto))):
            arq = capas.get(m) or (RAIZ / m)
            if not arq.exists():
                raise SystemExit(f"asset citado mas ausente: {m}")
            texto = texto.replace(m, data_uri(arq))
            trocas += 1
        if fonte_nome == "html":
            html = texto
        else:
            js = texto

    # ---------------- head e includes ----------------
    html = html.replace(
        '<link rel="preload" href="fonts/PlayfairDisplay.var.woff2" as="font" type="font/woff2" crossorigin>\n', '')
    html = re.sub(r'<link href="https://fonts\.googleapis\.com[^>]*>', FONTES_GOOGLE, html, count=1)
    html = html.replace('<link rel="stylesheet" href="assets/css/lp.css">',
                        "<?!= incluir('estilo') ?>")
    html = html.replace('<script src="assets/js/lp.js" defer></script>',
                        "<?!= incluir('script') ?>")
    # o base target evita que links abram dentro do iframe do sandbox.
    # A meta leva a query da URL para dentro do iframe — ver o bloco do link de
    # campanha abaixo. `<?= ?>` escapa para HTML: o valor vem da URL, é do
    # visitante, e dentro do atributo as aspas viram &quot;.
    html = html.replace(
        '</head>',
        '<meta name="fq-params" content="<?= parametros ?>">\n'
        '<base target="_top">\n</head>', 1)
    assert "incluir('estilo')" in html and "incluir('script')" in html

    # ---------------- JS: envio pela planilha ----------------
    alvo = '''    if (!ENDPOINT) {
      // sem endpoint: simula a latência para o estado de loading ser real
      setTimeout(function () { concluir(false); }, 900);
      return;
    }
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ produtos: estado.sel })
    }).then(function (r) { concluir(!r.ok); }).catch(function () { concluir(true); });'''
    novo = '''    /* No Apps Script o envio não passa por fetch: `google.script.run` chama
       a função do servidor no mesmo projeto, sem CORS e sem endpoint público.
       O payload leva o formulário inteiro — o fetch antigo mandava só os
       produtos selecionados, o que não servia para nada na planilha. */
    if (typeof google === "undefined" || !google.script || !google.script.run) {
      /* fora do Apps Script — o PREVIEW.html local, por exemplo — não existe
         google.script: sem esta guarda o envio lançaria ReferenceError */
      setTimeout(function () { concluir(false); }, 900);
      return;
    }
    google.script.run
      .withSuccessHandler(function () { concluir(false); })
      .withFailureHandler(function () { concluir(true); })
      .salvarCadastro(coletarCadastro());'''
    assert alvo in js, "bloco de envio não encontrado — o lp.js mudou?"
    js = js.replace(alvo, novo, 1)

    # ---------------- link de campanha: hash -> query ----------------
    # A página roda num iframe do sandbox. O `#sim=` fica na URL do PAI e nunca
    # chega ao iframe: o link de campanha morria em silêncio. O Apps Script
    # entrega a query ao servidor em `e.parameter`, o doGet injeta na meta
    # fq-params e o JS lê de lá, mantendo o hash como alternativa.
    alvo_hash = '''    var m = /[#&]sim=([^&]+)/.exec(location.hash);
    if (!m) return;
    decodeURIComponent(m[1]).split("_").forEach(function (p) {'''
    novo_hash = '''    var bruto = "";
    var meta = document.querySelector('meta[name="fq-params"]');
    if (meta && meta.content) {
      try { bruto = (JSON.parse(meta.content) || {}).sim || ""; } catch (e) {}
    }
    if (!bruto) {
      var m = /[#&]sim=([^&]+)/.exec(location.hash);
      if (m) bruto = m[1];
    }
    if (!bruto) return;
    decodeURIComponent(bruto).split("_").forEach(function (p) {'''
    assert alvo_hash in js, "daHash não encontrado — o lp.js mudou?"
    js = js.replace(alvo_hash, novo_hash, 1)


    coletor = '''
  /* ======================================================================
     COLETA DO CADASTRO (só na versão Apps Script)
     Lê o formulário inteiro para a planilha. Campos de endereço vêm do ViaCEP
     ou digitados; os produtos vêm dos chips.
     ================================================================== */
  function coletarCadastro() {
    var v = function (id) { var e = $("#" + id); return e ? e.value.trim() : ""; };
    var marcado = function (nome) {
      var e = $('input[name="' + nome + '"]:checked');
      return e ? e.value : "";
    };
    return {
      nome: v("f-nome"),
      email: v("f-email"),
      celular: v("f-tel"),
      cpf: v("f-cpf"),
      experiencia5anos: marcado("experiencia5"),
      instituicoes: v("f-inst"),
      linkedin: v("f-linkedin"),
      cep: v("f-cep"),
      logradouro: v("f-rua"),
      numero: v("f-num"),
      complemento: v("f-comp"),
      bairro: v("f-bairro"),
      cidade: v("f-cidade"),
      uf: v("f-uf"),
      produtosQueVende: $$('#form-chips [aria-pressed="true"]')
        .map(function (b) { return b.textContent.trim(); }).join(", "),
      /* o checkbox de consentimento não tem id, só `name` — buscar por
         "#f-consent" devolvia null e gravava `false` sempre, num campo que é
         o registro de consentimento LGPD */
      consentimento: (function () {
        var c = $('input[name="consentimento"]');
        return !!(c && c.checked);
      })(),
      simulacaoNaPagina: (function () {
        var el = $(".fq-res__n");
        return el ? el.textContent.trim() : "";
      })(),
      /* dentro do iframe do sandbox `document.referrer` é o wrapper do Google,
         não a origem real — a coluna viria lixo. Grava os parâmetros da
         campanha (utm_*), que são o que interessa para atribuição. */
      origem: (function () {
        var el = document.querySelector('meta[name="fq-params"]');
        if (!el || !el.content) return document.referrer || "";
        try {
          var q = JSON.parse(el.content) || {};
          delete q.sim;
          var partes = [];
          for (var k in q) {
            if (Object.prototype.hasOwnProperty.call(q, k)) partes.push(k + "=" + q[k]);
          }
          return partes.join("&") || (document.referrer || "");
        } catch (e) { return ""; }
      })(),
      userAgent: navigator.userAgent
    };
  }
'''
    # entra logo antes do fechamento da IIFE
    corte = js.rstrip().rfind("})();")
    assert corte > 0
    js = js[:corte] + coletor + "\n" + js[corte:]

    # ---------------- arquivos ----------------
    (SAIDA / "pagina.html").write_text(html)
    (SAIDA / "estilo.html").write_text("<style>\n" + css + "\n</style>\n")
    (SAIDA / "script.html").write_text("<script>\n" + js + "\n</script>\n")
    (SAIDA / "Codigo.gs").write_text(CODIGO_GS)
    (SAIDA / "appsscript.json").write_text(MANIFESTO)
    # o guia é gerado aqui de propósito: o build limpa a pasta a cada
    # execução, e um arquivo escrito à mão desapareceria no rebuild
    (SAIDA / "LEIA-ME.md").write_text(GUIA)

    # preview achatado: o mesmo HTML com os includes resolvidos, para abrir local
    # No preview o template não é avaliado: `<?= parametros ?>` ficaria literal
    # dentro da meta e o JSON.parse quebraria. Substituído por um objeto vazio.
    preview = (html
               .replace("<?!= incluir('estilo') ?>", "<style>\n" + css + "\n</style>")
               .replace("<?!= incluir('script') ?>", "<script>\n" + js + "\n</script>")
               .replace('content="<?= parametros ?>"', 'content="{}"')
               .replace('<base target="_top">\n', ''))
    (SAIDA / "PREVIEW.html").write_text(preview)

    # rede de segurança: nenhum caminho local pode sobreviver no bundle
    for nome in ("pagina.html", "estilo.html", "script.html"):
        conteudo = (SAIDA / nome).read_text()
        sobrou = re.findall(r'["\'(](?:logos|assets|fonts)/[^"\')]+', conteudo)
        if sobrou:
            raise SystemExit(f"{nome}: caminho local não resolvido -> {sorted(set(sobrou))}")

    shutil.rmtree(TMP)
    kb = lambda p: (SAIDA / p).stat().st_size / 1024
    print(f"{trocas} imagens embutidas em data URI\n")
    for f in ("pagina.html", "estilo.html", "script.html", "Codigo.gs",
              "appsscript.json", "LEIA-ME.md", "PREVIEW.html"):
        print(f"  {f:<20} {kb(f):8.1f} KB")
    print(f"\n  página servida ao visitante: {kb('pagina.html') + kb('estilo.html') + kb('script.html'):.1f} KB")


CODIGO_GS = '''/**
 * Landing de captação de Personal Banker — servidor.
 *
 * O Apps Script não serve arquivo estático, então a página é montada por
 * template: `pagina.html` chama `incluir('estilo')` e `incluir('script')`.
 */

/** Nome da aba da planilha que recebe os cadastros. */
var ABA = 'Cadastros';

/** Colunas, nesta ordem. Mudar aqui muda o cabeçalho e a ordem de gravação. */
var COLUNAS = [
  'dataHora', 'nome', 'email', 'celular', 'cpf', 'experiencia5anos',
  'instituicoes', 'linkedin', 'cep', 'logradouro', 'numero', 'complemento',
  'bairro', 'cidade', 'uf', 'produtosQueVende', 'consentimento',
  'simulacaoNaPagina', 'origem', 'userAgent'
];

function doGet(e) {
  var t = HtmlService.createTemplateFromFile('pagina');

  /**
   * A página é servida dentro de um iframe de sandbox. O que está depois do #
   * fica na URL do PAI e nunca chega ao iframe — por isso o link de campanha
   * usa `?sim=`, e não `#sim=`. Aqui a query inteira vai para dentro da
   * página numa meta, de onde o JS lê a simulação e as utm_*.
   */
  t.parametros = JSON.stringify((e && e.parameter) || {});

  return t.evaluate()
    .setTitle('Seja um Personal Banker — Franq')
    // Esta meta vale para a página PAI, que é quem o celular enxerga; a meta
    // dentro do nosso HTML só vale para o iframe. Sem esta linha o mobile
    // renderiza em largura de desktop.
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Usado pelos `<?!= incluir('...') ?>` do template. */
function incluir(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

/**
 * Grava um cadastro na planilha. Chamada pelo cliente via google.script.run.
 * Lança em caso de erro para o withFailureHandler acender o estado de erro
 * do formulário — falhar em silêncio faria o visitante achar que enviou.
 */
function salvarCadastro(dados) {
  if (!dados || !dados.email) throw new Error('cadastro sem e-mail');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);                   // dois envios simultâneos não podem
  try {                                    // disputar a mesma linha
    var aba = planilha();
    var linha = COLUNAS.map(function (c) {
      if (c === 'dataHora') return new Date();
      var v = dados[c];
      return v === undefined || v === null ? '' : v;
    });
    aba.appendRow(linha);
  } finally {
    lock.releaseLock();
  }
  return true;
}

function planilha() {
  var id = PropertiesService.getScriptProperties().getProperty('PLANILHA_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('defina a propriedade de script PLANILHA_ID');
  var aba = ss.getSheetByName(ABA);
  if (!aba) {
    aba = ss.insertSheet(ABA);
    aba.appendRow(COLUNAS);
    aba.setFrozenRows(1);
  }
  return aba;
}
'''

MANIFESTO = '''{
  "timeZone": "America/Sao_Paulo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets"
  ]
}
'''

GUIA = open(pathlib.Path(__file__).parent / "appsscript-LEIA-ME.md").read()


if __name__ == "__main__":
    main()
