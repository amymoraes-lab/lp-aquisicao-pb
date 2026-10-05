/* ============================================================================
   Franq · Landing de captação de Personal Banker — PD-135 v2
   JS puro, sem dependências.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduzir = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var temIO = "IntersectionObserver" in window;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ======================================================================
     CATÁLOGO E TAXAS

     Uma taxonomia só: as 8 categorias do design, usadas pelo simulador, pela
     vitrine (4.8) e pelo formulário (4.10).

     Os percentuais vêm do simulador oficial do beFranq
     Fonte: **Mapa de Comissionamento, V1 — 01/10/2026** (PDF oficial de
     marketing). Substituiu os valores que vinham do simulador interno do
     beFranq, que estavam defasados em três categorias.

     Cada categoria recebe o **menor** percentual entre os produtos que caem
     nela — `fonte` registra qual. Por ser o menor, o "a partir de" exibido é
     piso demonstrável, nunca otimista:

       Consórcio      2,20%  (Rodobens, 2,20% a 4,00%; Bradesco/Porto/Servopa
                              2,50%; Itaú/Santander 3,00%)
       Crédito PF     1,50%  (Auto Equity; Consignado PF 2,00%; Home Equity
                              3,00% a 4,00%)
       Crédito PJ     0,35%  (Daycoval, contrato de 12 a 24 meses; Omni e BS2
                              0,50%; parcelado e FGI/PEAC 1,00%; Senff com
                              garantia 2,00%; crédito para condomínio 2,50%)
       Financiamentos 1,00%  (Imobiliário — Aquisição, e Construção; Veículos
                              1,50%; CashMe construção 3,00%)
       Seguros       10,00%  (Residencial PF, Patrimonial PJ e demais seguros;
                              Vida individual e em grupo vai ATÉ 80%)
       Previdência   25,00%  (Plano Mensal, sobre a primeira PMT; aporte único
                              0,40% e portabilidade 0,50% têm outra base e por
                              isso não entram neste piso)

     `base` importa: crédito e financiamento incidem sobre o valor da venda,
     seguros e previdência sobre prêmio recorrente. A lista de chips é plana, e
     a base é declarada no rótulo do slider de cada categoria — que é onde o
     valor é informado, e portanto onde a distinção pesa.

     Fora da conta: "Previdência — Aporte Único" (0,50%) tem base avulsa, e
     Investimentos e Câmbio não têm produto no simulador oficial.
     ================================================================== */
  var CATS = {
    consorcio:      { nome: "Consórcio",      pct: 0.022, base: "carta de crédito contratada no mês", escala: "media",  fonte: "Consórcio — Rodobens" },
    "credito-pf":   { nome: "Crédito PF",     pct: 0.015, base: "valor líquido liberado no mês",      escala: "media",  fonte: "Auto Equity" },
    "credito-pj":   { nome: "Crédito PJ",     pct: 0.0035, base: "valor líquido liberado no mês",     escala: "grande", fonte: "Empréstimo Parcelado — Daycoval, 12 a 24 meses" },
    financiamentos: { nome: "Financiamentos", pct: 0.010, base: "valor total financiado no mês",      escala: "grande", fonte: "Financiamento Imobiliário — Aquisição" },
    seguros:        { nome: "Seguros",        pct: 0.100, base: "prêmio líquido mensal",              escala: "premio", fonte: "Seguro Residencial PF / Patrimonial PJ" },
    previdencia:    { nome: "Previdência",    pct: 0.250, base: "primeira PMT do plano",              escala: "premio", fonte: "Previdência Privada — Plano Mensal" },
    investimentos:  { nome: "Investimentos",  pct: null },
    cambio:         { nome: "Câmbio",         pct: null }
  };
  var CAT_IDS = Object.keys(CATS);
  var COM_TAXA = CAT_IDS.filter(function (id) { return CATS[id].pct != null; });

  var ESCALAS = {
    grande: [200000, 500000, 1000000, 2500000, 5000000, 10000000],
    media:  [50000, 150000, 400000, 800000, 1500000, 3000000],
    premio: [2000, 5000, 12000, 25000, 50000, 100000]
  };

  /* Contagem de produtos por categoria da vitrine — dado a confirmar. */
  /* ---------------------------------------------------------- formatação --- */
  var brl = function (v) {
    return "R$ " + Math.round(v).toLocaleString("pt-BR");
  };
  var pctTx = function (v) {
    return (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + "%";
  };
  var curto = function (v) {
    if (v >= 1000000) return "R$ " + (v / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi";
    if (v >= 1000) return "R$ " + Math.round(v / 1000) + " mil";
    return brl(v);
  };

  /* ======================================================================
     ESTADO COMPARTILHADO
     Uma lista de categorias, usada pelo simulador, pela vitrine e pelo
     formulário. Como a taxonomia é a mesma nos três, não há mapeamento.
     ================================================================== */
  var estado = { sel: [], vol: {} };
  var ouvintes = [];
  function aoMudar(fn) { ouvintes.push(fn); }
  function emitir() { ouvintes.forEach(function (f) { f(); }); }

  function alternar(id) {
    var i = estado.sel.indexOf(id);
    if (i === -1) {
      estado.sel.push(id);
      if (estado.vol[id] == null) estado.vol[id] = 2;
    } else {
      estado.sel.splice(i, 1);
    }
    emitir();
  }

  /* ------------------------------------------------------------- chips --- */
  /* simulador: só as categorias que têm percentual, agrupadas pela base */
  function montarChipsSim(cx) {
    if (!cx) return;
    cx.innerHTML = "";
    var lista = document.createElement("div");
    lista.className = "fq-chips";
    COM_TAXA.forEach(function (id) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fq-chip";
      b.setAttribute("data-cat", id);
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = '<span class="fq-chip__mk" aria-hidden="true"></span><span>' +
        CATS[id].nome + "</span>";
      b.addEventListener("click", function () { alternar(id); });
      lista.appendChild(b);
    });
    cx.appendChild(lista);
  }

  /* vitrine e formulário: as 8 categorias */
  function montarChipsCategoria(cx) {
    if (!cx) return;
    cx.innerHTML = "";
    CAT_IDS.forEach(function (id) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fq-chip";
      b.setAttribute("data-cat", id);
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = '<span class="fq-chip__mk" aria-hidden="true"></span><span>' +
        CATS[id].nome + "</span>";
      b.addEventListener("click", function () { alternar(id); });
      cx.appendChild(b);
    });
  }

  function sincronizarChips() {
    $$("[data-cat]").forEach(function (b) {
      b.setAttribute("aria-pressed", estado.sel.indexOf(b.getAttribute("data-cat")) !== -1 ? "true" : "false");
    });
  }

  /* ======================================================================
     4.4 SIMULADOR
     ================================================================== */
  var volsCx = $("#sim-vols");
  var saida = $("#sim-saida");
  var vazio = $("#sim-vazio");
  var exemplo = $("#sim-exemplo");
  var bkLista = $("#sim-bk-lista");
  var det = $("#sim-det");

  var escalaDe = function (id) { return ESCALAS[CATS[id].escala]; };
  /* só entram na conta as categorias com percentual */
  var selComTaxa = function () {
    return COM_TAXA.filter(function (id) { return estado.sel.indexOf(id) !== -1; });
  };

  function montarVolumes() {
    if (!volsCx) return;
    var ativos = selComTaxa();
    var presentes = {};
    $$(".fq-vol", volsCx).forEach(function (el) {
      var id = el.getAttribute("data-vol");
      if (ativos.indexOf(id) === -1) el.remove();
      else presentes[id] = el;
    });

    ativos.forEach(function (id) {
      if (presentes[id]) { volsCx.appendChild(presentes[id]); return; }
      var c = CATS[id], esc = escalaDe(id);
      var el = document.createElement("div");
      el.className = "fq-vol";
      el.setAttribute("data-vol", id);
      el.innerHTML =
        '<div class="fq-vol__top">' +
          '<span class="fq-vol__nm">' + c.nome +
            '<span class="fq-vol__un">' + c.base + "</span></span>" +
          '<span class="fq-vol__v" data-vv></span>' +
        "</div>" +
        '<input class="fq-range" type="range" min="0" max="' + (esc.length - 1) +
          '" step="1" value="' + estado.vol[id] + '" aria-label="' + c.base + " de " + c.nome + '">' +
        '<div class="fq-vol__esc"><span>' + curto(esc[0]) + "</span><span>" +
          curto(esc[esc.length - 1]) + "+</span></div>";
      var r = $("input", el);
      r.addEventListener("input", function () {
        estado.vol[id] = +r.value;
        emitir();
      });
      volsCx.appendChild(el);
    });

    $$(".fq-vol", volsCx).forEach(function (el) {
      var id = el.getAttribute("data-vol");
      var r = $("input", el);
      if (r && +r.value !== estado.vol[id]) r.value = estado.vol[id];
      /* posição em % para a trilha pintar de lima o trecho percorrido */
      if (r) {
        var passos = escalaDe(id).length - 1;
        r.style.setProperty("--p", passos ? (100 * estado.vol[id] / passos).toFixed(2) : "0");
      }
      $("[data-vv]", el).textContent = curto(escalaDe(id)[estado.vol[id]]);
    });
  }

  /* mesma conta da ferramenta oficial: base mensal × percentual mínimo */
  function calcular() {
    var total = 0, itens = [];
    selComTaxa().forEach(function (id) {
      var c = CATS[id];
      var v = escalaDe(id)[estado.vol[id]];
      var val = v * c.pct;
      total += val;
      itens.push({ nome: c.nome, volume: v, pct: c.pct, valor: val });
    });
    return { total: total, itens: itens };
  }

  function renderSim() {
    if (!saida) return;
    montarVolumes();
    var ativos = selComTaxa();

    if (!ativos.length) {
      if (vazio) vazio.hidden = false;
      if (exemplo) exemplo.hidden = false;
      var v0 = $(".fq-res__val", saida);
      if (v0) v0.remove();
      if (bkLista) bkLista.innerHTML = "";
      if (det) det.hidden = true;
      return;
    }

    if (vazio) vazio.hidden = true;
    if (exemplo) exemplo.hidden = true;

    var r = calcular();
    var val = $(".fq-res__val", saida);
    if (!val) {
      val = document.createElement("p");
      val.className = "fq-res__val";
      saida.appendChild(val);
    }
    /* "A partir de", não faixa: os percentuais da ferramenta oficial são os
       MÍNIMOS e podem ser maiores. Um teto seria número inventado. */
    if (!$(".fq-res__n", val)) {
      val.innerHTML = '<span class="fq-res__pre">a partir de</span>' +
        '<span class="fq-res__n">' + brl(r.total) + "</span><small>por mês</small>";
      val._v = r.total;
    } else {
      var alvo = $(".fq-res__n", val);
      animarNumero(alvo, val._v || 0, r.total, 520, brl);
      val._v = r.total;
    }
    val.setAttribute("aria-label",
      "Comissão potencial estimada a partir de " + brl(r.total) + " por mês");

    if (det) det.hidden = false;
    if (bkLista) {
      bkLista.innerHTML = r.itens.map(function (i) {
        return '<div class="fq-bk__i"><span>' + i.nome +
          '<em>' + curto(i.volume) + " × " + pctTx(i.pct) + "</em></span><b>" +
          brl(i.valor) + "</b></div>";
      }).join("");
    }
  }

  /* --------------------------------------------------- link de campanha --- */
  /* Sem botão de compartilhar, mas o hash continua sendo lido: Marketing pode
     montar link já com a simulação preenchida (#sim=consorcio.2_seguros.3). */
  function daHash() {
    var m = /[#&]sim=([^&]+)/.exec(location.hash);
    if (!m) return;
    decodeURIComponent(m[1]).split("_").forEach(function (p) {
      var q = p.split(".");
      if (!CATS[q[0]]) return;
      var idx = Math.max(0, Math.min(5, parseInt(q[1], 10) || 0));
      if (estado.sel.indexOf(q[0]) === -1) estado.sel.push(q[0]);
      estado.vol[q[0]] = idx;
    });
  }

  /* ======================================================================
     4.9 DEPOIMENTOS
     Três Shorts do canal da Franq. O cartão agora traz contexto — cargo
     anterior, banco, cidade, tempo de casa e uma frase em texto — porque num
     público que desconfia, "Anderson Paulino" sozinho não prova nada: prova é
     saber de que agência ele saiu e há quanto tempo.

     NADA DISSO EXISTE EM LUGAR QUE EU POSSA CONSULTAR. Os campos vazios ficam
     como ⟨placeholder⟩ e aparecem marcados na página de propósito: assim não
     se publica por engano, e quem tiver o dado sabe exatamente onde encaixar.

     A capa é o quadro vertical do Short (oardefault, 1080×1920), baixado e
     recomprimido: servido daqui, o YouTube não recebe nenhuma requisição —
     nem cookie — antes de a pessoa clicar em assistir.
     ================================================================== */
  var DEPS = [
    { nome: "Anderson Paulino", video: "1DAnZxVDj9c", capa: "assets/img/depoimentos/anderson-paulino.webp",
      cargo: null, banco: null, local: null, tempo: null, frase: null },
    { nome: "Greice Thomaz",    video: "5J1AOUqBgPk", capa: "assets/img/depoimentos/greice-thomaz.webp",
      cargo: null, banco: null, local: null, tempo: null, frase: null },
    { nome: "Rosana Agostini",  video: "Rempc2NsPT4", capa: "assets/img/depoimentos/rosana-agostini.webp",
      cargo: null, banco: null, local: null, tempo: null, frase: null }
  ];

  /* Campo que falta não some: vira marca visível, para alguém preencher.
     O texto é escapado porque esses valores vão virar HTML por concatenação
     e um dia chegarão de uma planilha, não daqui. */
  function escaparHtml(v) {
    return String(v).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function dado(v, rotulo) {
    return v ? escaparHtml(v) : '<i class="fq-falta">⟨' + rotulo + '⟩</i>';
  }

  function renderDeps() {
    var cx = $("#deps");
    if (!cx) return;
    cx.innerHTML = DEPS.map(function (d) {
      var midia = d.capa
        /* dimensões declaradas: sem elas a imagem entra depois do layout e
           empurra o nome do cartão para baixo */
        ? '<img src="' + d.capa + '" width="640" height="1138" loading="lazy" ' +
          'decoding="async" alt="' + d.nome + ', Personal Banker da Franq, em vídeo">' +
          (d.video
            ? '<button class="fq-dep__play" type="button" data-video="' + d.video + '" ' +
              'aria-label="Assistir ao depoimento de ' + d.nome + '">' +
              '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">' +
              '<path d="M8 5.5v13l11-6.5z"/></svg>assistir</button>'
            : "")
        : '<div class="fq-dep__slot">' +
          '<svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="14" height="16" rx="2"/><path d="M16 10l6-3v10l-6-3z"/></svg>' +
          "⟨vídeo vertical de " + d.nome.split(" ")[0] + "⟩</div>";

      return '<article class="fq-dep" data-reveal>' +
        '<div class="fq-dep__v">' + midia + "</div>" +
        '<div class="fq-dep__b">' +
          '<span class="fq-dep__nm">' + d.nome + "</span>" +
          '<span class="fq-dep__meta">' + dado(d.cargo, "cargo anterior") +
            " · " + dado(d.banco, "banco") + "</span>" +
          '<span class="fq-dep__meta">' + dado(d.local, "cidade/UF") +
            " · PB há " + dado(d.tempo, "tempo") + "</span>" +
          '<p class="fq-dep__q">' + dado(d.frase, "frase do depoimento") + "</p>" +
        "</div>" +
        "</article>";
    }).join("");
  }

  /* ======================================================================
     VÍDEO DOS DEPOIMENTOS — fachada
     A página mostra a capa e um botão; o iframe do YouTube só entra no
     clique. Três iframes carregados de saída custariam alguns MB de script
     de terceiro e plantariam cookies antes de qualquer interesse da pessoa —
     numa página de fintech regulada isso é questão de consentimento, não só
     de peso. O domínio é o `-nocookie`.
     ================================================================== */
  function videoDepoimentos() {
    var cx = $("#deps");
    if (!cx) return;
    cx.addEventListener("click", function (e) {
      var b = e.target.closest(".fq-dep__play");
      if (!b) return;
      var id = b.getAttribute("data-video");
      var slot = b.closest(".fq-dep__v");
      if (!id || !slot) return;

      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + id +
              "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
      f.title = b.getAttribute("aria-label") || "Depoimento em vídeo";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture";
      f.setAttribute("allowfullscreen", "");
      f.setAttribute("loading", "eager");
      slot.innerHTML = "";
      slot.appendChild(f);
      f.focus();
    });
  }



  /* ======================================================================
     4.10 FORMULÁRIO
     ================================================================== */
  var ENDPOINT = null; // ⟨sem endpoint definido⟩ — com null, o envio é simulado

  var form = $("#form");
  var passo = 0;
  var ULTIMO = 1;   // 0 dados, 1 perfil — CPF e endereço saíram da triagem

  var alerta = $("#form-alert");
  var btnAvancar = $("#btn-avancar");
  var btnVoltar = $("#btn-voltar");
  var btnEnviar = $("#btn-enviar");

  function paneEl(i) { return $('[data-pane="' + i + '"]'); }

  function aplicarPasso() {
    for (var i = 0; i <= ULTIMO; i++) {
      var p = paneEl(i);
      if (p) p.hidden = i !== passo;
    }
    $$("#steps .fq-step").forEach(function (s, i) {
      if (i <= passo) s.setAttribute("data-on", ""); else s.removeAttribute("data-on");
    });
    // Voltar só existe se houver passo anterior
    if (btnVoltar) btnVoltar.hidden = passo === 0;
    if (btnAvancar) btnAvancar.hidden = passo === ULTIMO;
    if (btnEnviar) btnEnviar.hidden = passo !== ULTIMO;
    atualizarEnviar();
  }

  function erroCampo(campo, msg) {
    var w = campo.closest(".fq-f");
    if (!w) return;
    if (msg) {
      w.setAttribute("data-err", "");
      var s = $(".fq-f__err span", w);
      if (s) s.textContent = msg;
      campo.setAttribute("aria-invalid", "true");
    } else {
      w.removeAttribute("data-err");
      campo.removeAttribute("aria-invalid");
    }
  }
  function limparErros(p) { $$(".fq-f[data-err]", p).forEach(function (w) {
    w.removeAttribute("data-err");
    $$("[aria-invalid]", w).forEach(function (i) { i.removeAttribute("aria-invalid"); });
  }); }
  function avisar(msg) {
    if (!alerta) return;
    alerta.textContent = msg || "";
    if (msg) alerta.setAttribute("data-on", ""); else alerta.removeAttribute("data-on");
  }

  /* máscaras */
  function mascara(el, fn) {
    if (!el) return;
    el.addEventListener("input", function () {
      var pos = el.selectionStart === el.value.length;
      el.value = fn(el.value);
      if (pos) el.selectionStart = el.selectionEnd = el.value.length;
      if (el.getAttribute("aria-invalid")) erroCampo(el, "");
    });
  }
  mascara($("#f-tel"), function (v) {
    var d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  });

  /* uma checagem só, usada para exibir erro e para saber se o form está
     completo — assim as duas coisas nunca divergem */
  function problema(c) {
    if (c.type === "radio" || c.type === "checkbox") return "";
    if (!c.required) return "";
    var v = c.value.trim();
    if (!v) return "Preencha este campo para continuar.";
    if (c.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Confira o e-mail — parece faltar algo.";
    if (c.id === "f-tel" && v.replace(/\D/g, "").length < 10) return "Informe o DDD e o número completo.";
    return "";
  }

  function paneOk(i) {
    var p = paneEl(i);
    if (!p) return true;
    var ok = $$("input", p).every(function (c) { return !problema(c); });
    if (i === 1 && !$('input[name="experiencia5"]:checked', p)) ok = false;
    if (i === ULTIMO) {
      var cs = $('input[name="consentimento"]', p);
      if (cs && !cs.checked) ok = false;
    }
    return ok;
  }

  function formCompleto() {
    for (var i = 0; i <= ULTIMO; i++) if (!paneOk(i)) return false;
    return true;
  }

  function validarPasso() {
    var p = paneEl(passo);
    if (!p) return true;
    limparErros(p);
    avisar("");
    var ok = true, primeiro = null;

    $$("input", p).forEach(function (c) {
      var msg = problema(c);
      if (msg) { erroCampo(c, msg); ok = false; if (!primeiro) primeiro = c; }
    });

    if (passo === 1 && !$('input[name="experiencia5"]:checked', p)) {
      var r0 = $('input[name="experiencia5"]', p);
      erroCampo(r0, "Selecione sim ou não.");
      ok = false; if (!primeiro) primeiro = r0;
    }
    if (passo === ULTIMO) {
      var cs = $('input[name="consentimento"]', p);
      if (cs && !cs.checked) {
        erroCampo(cs, "É preciso autorizar o contato para enviar o cadastro.");
        ok = false; if (!primeiro) primeiro = cs;
      }
    }
    if (!ok && primeiro) primeiro.focus();
    return ok;
  }

  /* "Enviar cadastro" só fica ativo com todos os passos completos.
     Usa aria-disabled em vez de disabled: o botão continua focável e
     clicável, e o clique revela o que falta em vez de não fazer nada —
     botão desabilitado que ignora o clique não ensina nada a ninguém. */
  function atualizarEnviar() {
    if (!btnEnviar) return;
    var pronto = formCompleto();
    btnEnviar.setAttribute("aria-disabled", pronto ? "false" : "true");
  }

  /* Responder "Não" revela o caminho alternativo em vez de barrar: a pessoa
     chegou até aqui e continua valendo como lead, só que de outra fila. */
  var ramoNao = $("#ramo-nao");
  $$('input[name="experiencia5"]').forEach(function (r) {
    r.addEventListener("change", function () {
      if (ramoNao) ramoNao.hidden = r.value !== "nao" || !r.checked;
    });
  });

  if (btnAvancar) btnAvancar.addEventListener("click", function () {
    if (!validarPasso()) return;
    if (form) form.setAttribute("data-dir", "frente");
    passo = Math.min(ULTIMO, passo + 1);
    aplicarPasso();
    var p = paneEl(passo);
    var f = p && $("input:not([type=hidden]), button[data-prod]", p);
    if (f) f.focus();
  });
  if (btnVoltar) btnVoltar.addEventListener("click", function () {
    avisar("");
    if (form) form.setAttribute("data-dir", "tras");
    passo = Math.max(0, passo - 1);
    aplicarPasso();
  });


  /* envio: loading → sucesso */
  /* reavalia a cada digitação/marcação */
  if (form) {
    form.addEventListener("input", atualizarEnviar);
    form.addEventListener("change", atualizarEnviar);
  }

  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!formCompleto()) {
      // não trava calado: aponta o que falta no passo atual
      validarPasso();
      atualizarEnviar();
      return;
    }
    if (!validarPasso()) return;

    var rotulo = btnEnviar.innerHTML;
    btnEnviar.setAttribute("data-load", "");
    btnEnviar.setAttribute("aria-busy", "true");
    btnEnviar.innerHTML = '<span class="fq-spin" aria-hidden="true"></span> Enviando…';

    var concluir = function (erro) {
      btnEnviar.removeAttribute("data-load");
      btnEnviar.removeAttribute("aria-busy");
      btnEnviar.innerHTML = rotulo;
      if (erro) {
        avisar("Não conseguimos enviar agora. Tente de novo em alguns instantes.");
        return;
      }
      sucesso();
    };

    if (!ENDPOINT) {
      // sem endpoint: simula a latência para o estado de loading ser real
      setTimeout(function () { concluir(false); }, 900);
      return;
    }
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ produtos: estado.sel })
    }).then(function (r) { concluir(!r.ok); }).catch(function () { concluir(true); });
  });

  function sucesso() {
    var box = $(".fq-form__box");
    if (!box) return;
    box.innerHTML =
      '<div class="fq-ok" role="status" tabindex="-1">' +
        '<div class="fq-ok__ic"><svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>' +
        '<h3 class="fq-ok__t">Cadastro enviado.</h3>' +
        "<p>Recebemos seus dados. A partir daqui é com a gente — você não precisa fazer mais nada.</p>" +
        '<div class="fq-ok__linha">' +
          '<div class="fq-ok__it"><em>agora</em><span><b>Confirmação por e-mail</b><span>No endereço que você informou. Se não chegar em 10 minutos, confira o spam.</span></span></div>' +
          '<div class="fq-ok__it"><em>até 3 dias úteis</em><span><b>Análise do seu perfil</b><span>Um especialista da Franq avalia histórico profissional e momento de carreira.</span></span></div>' +
          '<div class="fq-ok__it"><em>depois</em><span><b>Conversa por telefone ou WhatsApp</b><span>No celular que você cadastrou, para falar sobre o seu perfil.</span></span></div>' +
        "</div>" +
      "</div>";
    var ok = $(".fq-ok", box);
    if (ok) ok.focus({ preventScroll: true });
    var barra = $("#barra");
    if (barra) barra.removeAttribute("data-on");
  }

  /* ======================================================================
     COMPORTAMENTOS DE PÁGINA
     ================================================================== */

  /* header ganha fundo ao rolar */
  var header = $("#cabecalho");
  function solidificar() {
    if (!header) return;
    if (window.scrollY > 12) header.setAttribute("data-solido", "");
    else header.removeAttribute("data-solido");
  }
  window.addEventListener("scroll", solidificar, { passive: true });
  solidificar();

  /* menu mobile */
  var burger = $("#burger"), menu = $("#menu");
  if (burger && menu) {
    var abrir = function (v) {
      if (v) menu.setAttribute("data-open", ""); else menu.removeAttribute("data-open");
      burger.setAttribute("aria-expanded", v ? "true" : "false");
      burger.setAttribute("aria-label", v ? "Fechar menu" : "Abrir menu");
      $("path", burger).setAttribute("d", v ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16");
    };
    burger.addEventListener("click", function () {
      abrir(burger.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) abrir(false); });
    document.addEventListener("click", function (e) {
      if (burger.getAttribute("aria-expanded") !== "true") return;
      if (e.target.closest("#menu, #burger")) return;
      abrir(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") { abrir(false); burger.focus(); }
    });
  }

  /* barra fixa do mobile — e a Fran sobe para não ficar embaixo dela */
  var barra = $("#barra");
  var mqMobile = window.matchMedia("(max-width: 760px)");
  function ajustarBarra() {
    if (!barra) return;
    var hero = $("#hero");
    var passouHero = hero ? window.scrollY > hero.offsetHeight * 0.72 : window.scrollY > 400;
    var cad = $("#cadastro");
    var cadVisivel = false;
    if (cad) {
      var r = cad.getBoundingClientRect();
      cadVisivel = r.top < window.innerHeight * 0.85 && r.bottom > 0;
    }
    var mostrar = mqMobile.matches && passouHero && !cadVisivel && !$(".fq-ok");
    if (mostrar) barra.setAttribute("data-on", ""); else barra.removeAttribute("data-on");
    document.documentElement.style.setProperty(
      "--barra-mobile-h", mostrar ? barra.offsetHeight + "px" : "0px");
  }
  window.addEventListener("scroll", ajustarBarra, { passive: true });
  window.addEventListener("resize", ajustarBarra);

  /* seção ativa no menu */
  if (temIO) {
    var secoes = ["como-comecar", "simulador", "depoimentos", "duvidas"]
      .map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var obsNav = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var a = $('.fq-nav a[href="#' + e.target.id + '"]');
        if (!a) return;
        if (e.isIntersecting) {
          $$(".fq-nav a").forEach(function (x) { x.removeAttribute("aria-current"); });
          a.setAttribute("aria-current", "true");
        }
      });
    }, { threshold: 0, rootMargin: "-45% 0px -50% 0px" });
    secoes.forEach(function (s) { obsNav.observe(s); });
  }

  /* anima de um número a outro — usado pelos contadores e pelo resultado
     do simulador, para o valor nunca "pular" de um total para outro */
  function animarNumero(el, de, para, dur, fmt) {
    if (el._raf) cancelAnimationFrame(el._raf);
    if (el._fim) clearTimeout(el._fim);

    /* valor final escrito de imediato: a contagem é enfeite em cima de um
       número que já está certo */
    el.textContent = fmt(para);
    if (reduzir || de === para) return;

    dur = dur || 620;
    var t0 = performance.now();
    var passoFn = function (t) {
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(de + (para - de) * e);
      if (p < 1) el._raf = requestAnimationFrame(passoFn);
      else el._raf = null;
    };
    el._raf = requestAnimationFrame(passoFn);

    /* Rede de segurança: requestAnimationFrame fica PAUSADO em documento
       oculto, e o primeiro frame já sobrescreve o valor final pelo inicial.
       Sem isto o número congela no total anterior — erro de informação, não
       de animação. */
    el._fim = setTimeout(function () {
      if (el._raf) { cancelAnimationFrame(el._raf); el._raf = null; }
      el.textContent = fmt(para);
    }, dur + 400);
  }

  /* contadores */
  function contadores() {
    if (reduzir) return;
    var els = $$("[data-contar]");
    if (!els.length) return;
    var roda = function (el) {
      var alvo = parseInt(el.getAttribute("data-contar"), 10);
      var pre = el.getAttribute("data-prefixo") || "";
      var extra = $("span", el);
      if (!alvo) return;
      var fim = pre + alvo.toLocaleString("pt-BR");

      /* o valor certo é escrito primeiro; a contagem é enfeite em cima de um
         número que já está correto. Se o rAF nunca rodar, nada se perde. */
      el.textContent = fim;
      if (extra) el.appendChild(extra);

      /* documento oculto não anima: o rAF fica pausado e a contagem
         congelaria num valor parcial — ou seja, num dado errado na tela */
      if (document.hidden) return;

      /* segunda rede: se o rAF parar no meio (aba escondida durante a
         animação), o número volta ao valor final */
      setTimeout(function () {
        if (el.textContent.trim() !== fim) {
          el.textContent = fim;
          if (extra) el.appendChild(extra);
        }
      }, 2600);
      var t0 = performance.now(), dur = 2000;
      var passoFn = function (t) {
        var p = Math.min(1, (t - t0) / dur);
        var e = p < 0.5 ? 16 * Math.pow(p, 5) : 1 - Math.pow(-2 * p + 2, 5) / 2;
        var txt = pre + Math.round(alvo * e).toLocaleString("pt-BR");
        el.textContent = txt;
        if (extra) el.appendChild(extra);
        if (p < 1) requestAnimationFrame(passoFn);
      };
      requestAnimationFrame(passoFn);
    };
    if (!temIO) { els.forEach(roda); return; }
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        o.unobserve(e.target);
        roda(e.target);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { o.observe(el); });
  }

  /* pulinho ao marcar um chip: confirma o toque sem depender só da cor */
  document.addEventListener("click", function (e) {
    var chip = e.target.closest(".fq-chip");
    if (!chip || reduzir) return;
    chip.classList.remove("is-tap");
    void chip.offsetWidth;
    chip.classList.add("is-tap");
  });

  /* entrada do hero em sequência, no load */
  function entradaHero() {
    var hero = $("#hero");
    if (!hero) return;
    if (reduzir) { hero.classList.add("is-in"); return; }
    var alvos = $$("[data-entra]", hero);
    alvos.forEach(function (el, i) { el.style.transitionDelay = i * 110 + "ms"; });

    /* setTimeout, e não requestAnimationFrame: rAF fica PAUSADO em documento
       oculto, e o hero é a primeira tela — travar invisível ali seria o pior
       resultado possível da página. Timer é estrangulado em aba de fundo, mas
       dispara. */
    setTimeout(function () { hero.classList.add("is-in"); }, 60);

    setTimeout(function () {
      alvos.forEach(function (el) { el.style.transitionDelay = ""; });
    }, 1600);

    /* rede de segurança: sem o atributo, a regra do estado escondido deixa de
       casar e o hero aparece, independentemente de transição ou pintura */
    setTimeout(function () {
      alvos.forEach(function (el) { el.removeAttribute("data-entra"); });
    }, 4000);
  }

  /* progresso de leitura */
  function progresso() {
    var b = $("#progresso");
    if (!b) return;
    var tick = false;
    var att = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
      b.style.transform = "scaleX(" + p.toFixed(4) + ")";
    };
    window.addEventListener("scroll", function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () { att(); tick = false; });
    }, { passive: true });
    window.addEventListener("resize", att);
    att();
  }

  /* ======================================================================
     FOCO DOS TÍTULOS (blur reveal)
     O título entra unidade por unidade: transparente, desfocada e abaixo da
     linha de base, ganhando nitidez com atraso sobre a anterior. Uma vez só.

     A divisão percorre o DOM em vez de achatar o texto. Cinco títulos desta
     página têm <em class="fq-em"> — o acento lima — e um tem <br>; usar
     textContent, como costuma aparecer nas receitas do efeito, apagaria os
     dois e a página perderia o sistema de ênfase inteiro.
     ================================================================== */
  function focoTitulos() {
    var titulos = $$("[data-foco]");
    if (!titulos.length || reduzir) return;

    /* grafemas, não code units: "ã" e "ç" compostos quebrariam ao meio */
    var seg = (typeof Intl !== "undefined" && Intl.Segmenter)
      ? new Intl.Segmenter("pt-BR", { granularity: "grapheme" })
      : null;
    function grafemas(t) {
      if (!seg) return Array.from(t);
      var out = [], it = seg.segment(t);
      for (var g of it) out.push(g.segment);
      return out;
    }

    function dividir(el) {
      var modo = el.getAttribute("data-foco");
      /* o rótulo acessível é a frase inteira: o leitor de tela não deve
         soletrar as unidades */
      /* o <br> não produz espaço em textContent: sem isto o leitor de tela
         ouviria "clientes.Faltava" colado */
      var frase = "";
      (function texto(no) {
        Array.prototype.forEach.call(no.childNodes, function (f) {
          if (f.nodeType === 3) frase += f.nodeValue;
          else if (f.nodeType === 1) { if (f.tagName === "BR") frase += " "; else texto(f); }
        });
      })(el);
      el.setAttribute("aria-label", frase.replace(/\s+/g, " ").trim());
      var i = 0;

      (function percorre(no) {
        var filhos = Array.prototype.slice.call(no.childNodes);
        filhos.forEach(function (f) {
          if (f.nodeType === 3) {
            var frag = document.createDocumentFragment();
            /* separa só em espaço COMUM. `\s` inclui o espaço inquebrável
               (U+00A0), e dividir nele o transformaria em separador de
               palavra — o nbsp perderia o efeito justamente onde ele existe
               para impedir a quebra: "as regras" no h1 e o "×" da comparação. */
            f.nodeValue.split(/([ \t\r\n]+)/).forEach(function (parte) {
              if (!parte) return;
              if (/^[ \t\r\n]+$/.test(parte)) { frag.appendChild(document.createTextNode(" ")); return; }
              var palavra = document.createElement("span");
              palavra.className = "fq-foco__p";
              palavra.setAttribute("aria-hidden", "true");
              var unidades = modo === "palavra" ? [parte] : grafemas(parte);
              unidades.forEach(function (u) {
                var un = document.createElement("span");
                un.className = "fq-foco__u";
                un.style.setProperty("--i", i++);
                un.textContent = u;
                palavra.appendChild(un);
              });
              frag.appendChild(palavra);
            });
            no.replaceChild(frag, f);
          } else if (f.nodeType === 1 && f.tagName !== "BR") {
            percorre(f);      /* preserva <em>, <strong>, o que houver */
          }
        });
      })(el);

      return i;
    }

    function tocar(el, total) {
      el.classList.add("is-focado");
      var passo = parseFloat(getComputedStyle(el).getPropertyValue("--foco-passo")) || 35;
      setTimeout(function () { el.classList.add("is-pronto"); }, 700 + total * passo);
    }

    function iniciar() {
      var totais = titulos.map(dividir);

      if (!temIO) { titulos.forEach(function (el, n) { tocar(el, totais[n]); }); return; }

      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          var n = titulos.indexOf(e.target);
          /* no hero, um respiro antes de começar */
          var espera = e.target.tagName === "H1" ? 150 : 0;
          setTimeout(function () { tocar(e.target, totais[n]); }, espera);
        });
      }, { threshold: 0.25 });
      titulos.forEach(function (el) { io.observe(el); });

      /* Rede de segurança. O texto só fica visível se a transição rodar e se
         o observer disparar; se qualquer um dos dois falhar, o título some da
         página. Passados 6s, quem não tocou entra sem efeito — título
         invisível é pior do que título sem animação. */
      setTimeout(function () {
        titulos.forEach(function (el) {
          if (el.classList.contains("is-focado")) return;
          io.unobserve(el);
          el.classList.add("is-focado", "is-pronto");
        });
      }, 6000);
    }

    /* dividir só depois das fontes: a Playfair muda a métrica e sem esperar
       o texto salta quando ela chega */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(iniciar);
      /* rede de segurança: se `fonts.ready` nunca resolver, o título ficaria
         inteiro e sem efeito — aceitável, mas melhor tentar */
      setTimeout(function () {
        if (!titulos[0].querySelector(".fq-foco__u")) iniciar();
      }, 2500);
    } else {
      iniciar();
    }
  }

  /* ======================================================================
     IPHONE DO HERO — acompanha o mouse
     Um só loop escreve --dx / --my / --dy no elemento; o transform em si
     mora no CSS. Assim o parallax de scroll e o movimento do mouse não
     disputam a mesma propriedade, e a animação de entrada (que fica no
     palco, um nível acima) também não entra no meio.

     Só TRANSLAÇÃO, nenhuma rotação: a perspectiva já vem embutida no render
     do aparelho, e girar por cima dela deixaria o iPhone com duas
     perspectivas somadas — pareceria dobrado.

     O movimento tem inércia: o alvo vem do cursor, mas a peça persegue o
     alvo com interpolação. Objeto pesado não cola no ponteiro — colar é o
     que faz esse efeito parecer barato.
     ================================================================== */
  function foneTilt() {
    var fone = $("#fone");
    var palco = $("#fone-palco");
    if (!fone || !palco) return;

    /* curso curto: o render é grande e qualquer deslocamento maior lê como
       a imagem escorregando, não como o objeto reagindo */
    var MAX_X = 14, MAX_Y = 9;

    var alvoX = 0, alvoY = 0, atualX = 0, atualY = 0;
    var rolagem = 0, alvoRolagem = 0;
    var rodando = false, ativo = false;

    /* sem movimento onde ele não faz sentido ou incomoda: teclado e toque não
       têm cursor para seguir, e reduced-motion pediu para ficar parado */
    var podeMover = !reduzir &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function loop() {
      /* perseguição exponencial: 12% da distância por frame */
      atualX += (alvoX - atualX) * 0.12;
      atualY += (alvoY - atualY) * 0.12;
      rolagem += (alvoRolagem - rolagem) * 0.14;

      fone.style.setProperty("--dx", atualX.toFixed(2) + "px");
      fone.style.setProperty("--my", atualY.toFixed(2) + "px");
      fone.style.setProperty("--dy", rolagem.toFixed(2) + "px");

      var parado = Math.abs(alvoX - atualX) < 0.05 &&
                   Math.abs(alvoY - atualY) < 0.05 &&
                   Math.abs(alvoRolagem - rolagem) < 0.05;
      if (parado) { rodando = false; return; }
      requestAnimationFrame(loop);
    }

    function acordar() {
      if (rodando) return;
      rodando = true;
      requestAnimationFrame(loop);
    }

    if (podeMover) {
      window.addEventListener("mousemove", function (e) {
        if (!ativo) return;           /* só trabalha com o hero na tela */
        var r = palco.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        /* normaliza pela metade da janela: o curso máximo acontece nas bordas
           da tela, então o aparelho reage ao mouse em qualquer ponto do hero */
        var nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
        var ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
        alvoX = nx * MAX_X;
        alvoY = ny * MAX_Y;
        acordar();
      }, { passive: true });

      /* mouse saiu da janela: volta ao repouso em vez de congelar torto */
      document.addEventListener("mouseleave", function () {
        alvoX = 0; alvoY = 0; acordar();
      });
    }

    /* parallax de scroll continua, com ou sem cursor fino */
    if (!reduzir) {
      window.addEventListener("scroll", function () {
        var y = window.scrollY;
        alvoRolagem = y < 900 ? y * -0.045 : -40.5;
        acordar();
      }, { passive: true });
    }

    /* liga e desliga junto com a visibilidade do hero */
    if (temIO) {
      new IntersectionObserver(function (es) {
        ativo = es[0].isIntersecting;
        if (!ativo) { alvoX = 0; alvoY = 0; acordar(); }
      }, { threshold: 0 }).observe(palco);
    } else {
      ativo = true;
    }
  }


  /* reveal no scroll — mesmas três redes de segurança da v1:
     estado escondido só sob <html class="reveal">, timer folgado que derruba
     a classe, e um listener de scroll para contextos que reportam a aba como
     oculta (onde o observer não dispara e o timer é estrangulado). */
  function reveal() {
    if (reduzir || !temIO) return;
    var alvos = $$("[data-reveal]");
    if (!alvos.length) return;

    // stagger entre irmãos do mesmo container
    var porPai = {};
    alvos.forEach(function (el) {
      var k = el.parentNode;
      porPai[k] = porPai[k] || [];
      var i = porPai[k].length;
      porPai[k].push(el);
      if (i) el.style.transitionDelay = Math.min(i * 80, 320) + "ms";
    });

    var mostrar = function (el) {
      el.classList.add("is-in");
      setTimeout(function () { el.style.transitionDelay = ""; }, 900);
    };
    var tudo = function () {
      document.documentElement.classList.remove("reveal");
      alvos.forEach(function (el) { el.classList.add("is-in"); el.style.transitionDelay = ""; });
    };

    try {
      document.documentElement.classList.add("reveal");
      var o = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          o.unobserve(e.target);
          mostrar(e.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -4% 0px" });
      alvos.forEach(function (el) { o.observe(el); });
    } catch (err) {
      document.documentElement.classList.remove("reveal");
      return;
    }

    setTimeout(tudo, 8000);
    var aoRolar = function () {
      var travado = alvos.some(function (el) {
        if (el.classList.contains("is-in")) return false;
        var r = el.getBoundingClientRect();
        return r.top < window.innerHeight * 0.5 && r.bottom > 0;
      });
      if (!travado) return;
      window.removeEventListener("scroll", aoRolar);
      tudo();
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
  }

  /* ======================================================================
     BOOT
     ================================================================== */
  montarChipsSim($("#sim-chips"));
  montarChipsCategoria($("#form-chips"));
  renderDeps();
  videoDepoimentos();

  aoMudar(sincronizarChips);
  aoMudar(renderSim);

  daHash();          // simulação compartilhada por link
  emitir();
  aplicarPasso();
  ajustarBarra();
  contadores();
  entradaHero();
  progresso();
  focoTitulos();
  foneTilt();
  reveal();
})();
