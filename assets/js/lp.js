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
     (be.franq.com.br/minha-conta/simulador-de-comissoes), que lista 12 produtos
     em 4 famílias. Cada categoria aqui recebe o **menor** percentual entre os
     produtos que caem nela — `fonte` registra qual. Por ser o menor, o "a
     partir de" exibido é piso demonstrável, nunca otimista:

       Consórcio      3,00%  (Bens Móveis; Bens Imóveis é 3,50%)
       Crédito PF     1,50%  (Auto Equity; Consignado 2,00%, Home Equity 3,00%)
       Crédito PJ     0,50%  (Middle/Corporate; Varejo 1,25%)
       Financiamentos 1,00%  (Imobiliário; Veículo 1,50%)
       Seguros       20,00%  (Seguro de Vida PF ou PJ)
       Previdência   25,00%  (Plano Mensal)

     `base` importa: crédito e financiamento incidem sobre o valor da venda,
     seguros e previdência sobre prêmio recorrente. A lista de chips é plana, e
     a base é declarada no rótulo do slider de cada categoria — que é onde o
     valor é informado, e portanto onde a distinção pesa.

     Fora da conta: "Previdência — Aporte Único" (0,50%) tem base avulsa, e
     Investimentos e Câmbio não têm produto no simulador oficial.
     ================================================================== */
  var CATS = {
    consorcio:      { nome: "Consórcio",      pct: 0.030, base: "crédito contratado no mês", escala: "media",  fonte: "Consórcios de Bens Móveis" },
    "credito-pf":   { nome: "Crédito PF",     pct: 0.015, base: "volume liberado no mês",    escala: "media",  fonte: "Auto Equity" },
    "credito-pj":   { nome: "Crédito PJ",     pct: 0.005, base: "volume liberado no mês",    escala: "grande", fonte: "Empréstimo Parcelado Middle / Corporate" },
    financiamentos: { nome: "Financiamentos", pct: 0.010, base: "volume financiado no mês",  escala: "grande", fonte: "Financiamento Imobiliário" },
    seguros:        { nome: "Seguros",        pct: 0.200, base: "prêmio mensal",             escala: "premio", fonte: "Seguro de Vida PF ou PJ" },
    previdencia:    { nome: "Previdência",    pct: 0.250, base: "aporte mensal do plano",    escala: "premio", fonte: "Previdência — Plano Mensal" },
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
     Os 3 depoimentos reais. Campos que não temos ficam marcados, não
     inventados.

     `capa` é a arte vertical que ocupa o slot ENQUANTO o vídeo não existe —
     é cartaz, não frame de vídeo, então não leva botão de play: não há nada
     para tocar. Quando o .mp4 chegar, `video` assume e a capa passa a ser o
     poster dele.

     ATENÇÃO: as capas 2 e 3 são de Rogério Rojo e Erica Vieira, mas os
     depoimentos 2 e 3 são de Jeferson Cantanhede e Douglas Biscaia. O cartão
     mostra dois nomes diferentes. Ver a nota no HANDOFF.
     ================================================================== */
  var DEPS = [
    {
      q: "Com a Franq tenho a oportunidade de atender meus clientes com soluções que irão agregar valor, sem colocar em risco minha credibilidade a qual construí na minha trajetória profissional.",
      nome: "Karen Lopes",
      cidade: "Gravataí/RS", // corrigido: Gravataí é RS, estava creditado como SC
      tempo: "Personal Banker há 2 anos",
      foto: null, video: null,
      capa: "assets/img/depoimentos/karen-lopes.jpg",
      capaDe: "Karen Lopes"
    },
    {
      q: "Gosto muito da ideia de estimular as pessoas a empreender, encorajá-las a trilhar seu próprio caminho. A Franq, aliada à tecnologia de uma nova era do mercado financeiro, faz isso acontecer.",
      nome: "Jeferson Cantanhede",
      cidade: "Porto Alegre/RS",
      tempo: "Personal Banker há 3 anos",
      foto: null, video: null,
      capa: "assets/img/depoimentos/rogerio-rojo.jpg",
      capaDe: "Rogério Rojo"
    },
    {
      q: "A Franq é totalmente diferente de um banco. Empreender com ela é ter liberdade nas suas escolhas e buscar a melhor opção para atender os seus clientes, respeitando o seu momento de vida.",
      nome: "Douglas Biscaia",
      cidade: "Curitiba/PR",
      tempo: "Personal Banker há 2 anos",
      foto: null, video: null,
      capa: "assets/img/depoimentos/erica-vieira.jpg",
      capaDe: "Erica Vieira"
    }
  ];

  function renderDeps() {
    var cx = $("#deps");
    if (!cx) return;
    cx.innerHTML = DEPS.map(function (d) {
      var meta = '<span class="fq-dep__ln">' + d.cidade + "</span>" +
                 '<span class="fq-dep__ln">' + d.tempo + "</span>";
      return '<article class="fq-dep" data-reveal>' +
        '<div class="fq-dep__v">' + (d.capa
          /* dimensões declaradas: sem elas a imagem entra depois do layout e
             empurra o texto do cartão para baixo */
          ? '<img src="' + d.capa + '" width="480" height="846" loading="lazy" ' +
            'decoding="async" alt="' + (d.capaDe || d.nome) + ', Personal Banker da Franq">'
          : '<div class="fq-dep__slot">' +
            '<svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="14" height="16" rx="2"/><path d="M16 10l6-3v10l-6-3z"/></svg>' +
            "⟨vídeo vertical de " + d.nome.split(" ")[0] + "⟩</div>") + "</div>" +
        '<div class="fq-dep__b">' +
          '<p class="fq-dep__q">' + d.q + "</p>" +
          '<div class="fq-dep__id">' +
            '<span class="fq-dep__foto fq-dep__foto--vazia">⟨foto⟩</span>' +
            "<span><span class=\"fq-dep__nm\">" + d.nome + "</span>" +
            '<span class="fq-dep__mt">' + meta + "</span></span>" +
          "</div>" +
        "</div></article>";
    }).join("");
  }

  /* ======================================================================
     4.10 FORMULÁRIO
     ================================================================== */
  var ENDPOINT = null; // ⟨sem endpoint definido⟩ — com null, o envio é simulado

  var form = $("#form");
  var passo = 0;
  var ULTIMO = 2;

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
  mascara($("#f-cpf"), function (v) {
    var d = v.replace(/\D/g, "").slice(0, 11);
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  });

  // valida os dígitos verificadores: evita erro de digitação sem consultar nada
  function cpfValido(v) {
    var d = v.replace(/\D/g, "");
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    var s = 0, r;
    for (var i = 0; i < 9; i++) s += +d[i] * (10 - i);
    r = (s * 10) % 11 % 10;
    if (r !== +d[9]) return false;
    s = 0;
    for (var j = 0; j < 10; j++) s += +d[j] * (11 - j);
    r = (s * 10) % 11 % 10;
    return r === +d[10];
  }

  /* uma checagem só, usada para exibir erro e para saber se o form está
     completo — assim as duas coisas nunca divergem */
  function problema(c) {
    if (c.type === "radio" || c.type === "checkbox") return "";
    if (!c.required) return "";
    var v = c.value.trim();
    if (!v) return "Preencha este campo para continuar.";
    if (c.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Confira o e-mail — parece faltar algo.";
    if (c.id === "f-tel" && v.replace(/\D/g, "").length < 10) return "Informe o DDD e o número completo.";
    if (c.id === "f-cpf" && !cpfValido(v)) return "Confira os números do CPF.";
    if (c.id === "f-cep" && v.replace(/\D/g, "").length !== 8) return "O CEP tem 8 dígitos.";
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

  /* CEP */
  var cep = $("#f-cep"), cepMsg = $("#cep-msg"), end = $("#endereco");
  if (cep) {
    cep.addEventListener("input", function () {
      var d = cep.value.replace(/\D/g, "").slice(0, 8);
      cep.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
      if (cep.getAttribute("aria-invalid")) erroCampo(cep, "");
      if (d.length < 8) return;
      if (cepMsg) cepMsg.textContent = "Buscando endereço…";
      fetch("https://viacep.com.br/ws/" + d + "/json/")
        .then(function (r) { return r.json(); })
        .catch(function () { return null; })
        .then(function (j) {
          if (end) end.hidden = false;
          var set = function (sel, v) { var e = $(sel); if (e) e.value = v || ""; };
          if (j && !j.erro) {
            set("#f-rua", j.logradouro); set("#f-bairro", j.bairro);
            set("#f-cidade", j.localidade); set("#f-uf", j.uf);
            if (cepMsg) cepMsg.textContent = "Endereço carregado. Complete o número.";
          } else {
            if (cepMsg) cepMsg.textContent = "Não encontramos esse CEP. Preencha o endereço manualmente.";
            ["#f-rua", "#f-bairro", "#f-cidade", "#f-uf"].forEach(function (s) {
              var e = $(s); if (e) e.readOnly = false;
            });
          }
          var n = $("#f-num"); if (n) n.focus();
        });
    });
  }

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
     MACBOOK DO HERO — gira conforme o mouse
     Um só loop escreve --rx / --ry / --dy / --gl no elemento; o transform
     em si mora no CSS. Assim o parallax de scroll e o giro do mouse não
     disputam a mesma propriedade, e a animação de entrada (que fica no
     palco, um nível acima) também não entra no meio.

     O movimento tem inércia: o alvo vem do cursor, mas a peça persegue o
     alvo com interpolação. Objeto pesado não cola no ponteiro — colar é o
     que faz esse efeito parecer barato.
     ================================================================== */
  function macTilt() {
    var mac = $("#mac");
    var palco = $("#mac-palco");
    if (!mac || !palco) return;

    /* Limites do giro. O eixo X é bem mais curto que o Y de propósito: cada
       grau em X abre o deck do laptop, e passando de ~5° o alumínio vira a
       coisa mais clara da tela e o objeto lê como prateleira. */
    var MAX_Y = 13, MAX_X = 4.5;

    var alvoX = 0, alvoY = 0, atualX = 0, atualY = 0;
    var scrollY = 0, alvoScroll = 0;
    var rodando = false, ativo = false;

    /* sem giro onde ele não faz sentido ou incomoda: teclado/toque não têm
       cursor para seguir, e reduced-motion pediu para ficar parado */
    var podeGirar = !reduzir &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function loop() {
      /* perseguição exponencial: 12% da distância por frame */
      atualX += (alvoX - atualX) * 0.12;
      atualY += (alvoY - atualY) * 0.12;
      scrollY += (alvoScroll - scrollY) * 0.14;

      mac.style.setProperty("--rx", atualX.toFixed(3) + "deg");
      mac.style.setProperty("--ry", atualY.toFixed(3) + "deg");
      mac.style.setProperty("--dy", scrollY.toFixed(2) + "px");
      /* o reflexo corre para o lado oposto ao giro, como vidro de verdade */
      mac.style.setProperty("--gl", (atualY * -1.6).toFixed(2));

      var parado = Math.abs(alvoX - atualX) < 0.01 &&
                   Math.abs(alvoY - atualY) < 0.01 &&
                   Math.abs(alvoScroll - scrollY) < 0.05;
      if (parado) { rodando = false; return; }
      requestAnimationFrame(loop);
    }

    function acordar() {
      if (rodando) return;
      rodando = true;
      requestAnimationFrame(loop);
    }

    if (podeGirar) {
      window.addEventListener("mousemove", function (e) {
        /* só trabalha enquanto o hero está na tela */
        if (!ativo) return;
        var r = palco.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        /* normaliza pela metade da janela: o giro máximo acontece nas
           bordas da tela, não nas bordas do objeto — assim o Mac reage ao
           mouse em qualquer lugar do hero, não só sobre ele */
        var nx = (e.clientX - cx) / (window.innerWidth / 2);
        var ny = (e.clientY - cy) / (window.innerHeight / 2);
        nx = Math.max(-1, Math.min(1, nx));
        ny = Math.max(-1, Math.min(1, ny));
        alvoY = nx * MAX_Y;
        alvoX = -ny * MAX_X;
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
        alvoScroll = y < 900 ? y * -0.045 : -40.5;
        acordar();
      }, { passive: true });
    }

    /* liga e desliga junto com a visibilidade do hero: fora da tela, nem
       o mousemove nem o loop têm o que fazer */
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

  aoMudar(sincronizarChips);
  aoMudar(renderSim);

  daHash();          // simulação compartilhada por link
  emitir();
  aplicarPasso();
  ajustarBarra();
  contadores();
  entradaHero();
  progresso();
  macTilt();
  reveal();
})();
