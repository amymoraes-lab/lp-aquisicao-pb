/* ============================================================================
   Personal Banker — Franq (PD-135)
   Porte para JS puro da lógica do protótipo ("Personal Banker.dc.html").
   Sem dependências. Espelha o componente DCLogic do Claude Design:
   contadores do hero, carrossel de depoimentos, formulário em 3 passos,
   selects múltiplos, busca de CEP e estado de sucesso.
   ========================================================================== */
(function () {
  "use strict";

  /* O menu mobile só é montado com JS; a classe deixa o CSS saber disso
     e, sem JS, o nav continua se comportando como no design. */
  document.documentElement.classList.add("js");

  /* --- refs (eram React.createRef no canvas) ----------------------------- */
  var ref = {};
  document.querySelectorAll("[data-ref]").forEach(function (el) {
    ref[el.dataset.ref] = el;
  });

  // setado por setupStickyCta(); o render() chama quando `sent` muda
  var stickyUpdate = null;

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- estado ------------------------------------------------------------ */
  var state = {
    sent: false,
    dep: 0,
    step: 0,
    openCombo: null,
    inst: [],
    cargo: [],
    cert: []
  };

  var COMBOS = {
    inst: {
      empty: "Selecione as instituições",
      items: ["Banco do Brasil", "Bradesco", "BTG Pactual", "Caixa Econômica Federal",
              "Itaú Unibanco", "Safra", "Santander", "Sicoob", "Sicredi",
              "XP Investimentos", "Outra"]
    },
    cargo: {
      empty: "Selecione os cargos",
      items: ["Caixa", "Assistente", "Analista", "Gerente de relacionamento PF",
              "Gerente de relacionamento PJ", "Gerente geral",
              "Assessor de investimentos", "Especialista de produtos", "Superintendente"]
    },
    cert: {
      empty: "Selecione as certificações",
      items: ["CPA-10", "CPA-20", "CEA", "CFP", "Ancord", "CGA", "CNPI", "Susep", "Nenhuma"]
    }
  };

  // derivado do DOM: o build injeta os depoimentos de DEPOIMENTOS_EXTRA,
  // então travar em 3 quebraria os dots e o wrap-around das setas
  var DEP_COUNT = document.querySelectorAll('[data-ref^="depRef"]').length || 1;
  var LAST_STEP = 2;

  /* --- valores derivados (era renderVals) -------------------------------- */
  function comboSummary(key) {
    var sel = state[key];
    if (!sel.length) return COMBOS[key].empty;
    return sel.length <= 2 ? sel.join(", ") : sel.length + " selecionados";
  }

  var derived = {
    notSent: function () { return !state.sent; },
    sent: function () { return state.sent; },
    openInst: function () { return state.openCombo === "inst"; },
    openCargo: function () { return state.openCombo === "cargo"; },
    openCert: function () { return state.openCombo === "cert"; },
    instSummary: function () { return comboSummary("inst"); },
    cargoSummary: function () { return comboSummary("cargo"); },
    certSummary: function () { return comboSummary("cert"); }
  };

  var COMBO_OF_LIST = { instOptions: "inst", cargoOptions: "cargo", certOptions: "cert" };
  var COMBO_OF_FLAG = { openInst: "inst", openCargo: "cargo", openCert: "cert" };

  /* --- render ------------------------------------------------------------ */
  var ifBlocks = Array.prototype.slice.call(document.querySelectorAll("[data-if]"));
  var textNodes = Array.prototype.slice.call(document.querySelectorAll("[data-text]"));
  var templates = Array.prototype.slice.call(document.querySelectorAll("template[data-for]"));

  /* As opções são criadas uma única vez: recriar os nós a cada marcação
     tiraria o foco do teclado e resetaria o scroll do dropdown. */
  function buildOptions(tpl) {
    var key = COMBO_OF_LIST[tpl.dataset.for];
    var parent = tpl.parentNode;
    var frag = document.createDocumentFragment();

    COMBOS[key].items.forEach(function (label) {
      var node = tpl.content.firstElementChild.cloneNode(true);
      node.setAttribute("data-option", "");
      var text = node.querySelector('[data-text="opt.label"]');
      if (text) text.textContent = label;
      var box = node.querySelector("[data-bind-checked]");
      if (box) {
        box.checked = state[key].indexOf(label) !== -1;
        box.addEventListener("change", function () {
          var cur = state[key];
          state[key] = box.checked
            ? cur.concat([label])
            : cur.filter(function (x) { return x !== label; });
          render();
        });
      }
      frag.appendChild(node);
    });
    parent.appendChild(frag);
  }

  function syncOptions(tpl) {
    var key = COMBO_OF_LIST[tpl.dataset.for];
    var items = COMBOS[key].items;
    tpl.parentNode.querySelectorAll("[data-option] [data-bind-checked]")
      .forEach(function (box, i) {
        box.checked = state[key].indexOf(items[i]) !== -1;
      });
  }

  function applyDep() {
    for (var i = 0; i < DEP_COUNT; i++) {
      var fig = ref["depRef" + i], dot = ref["dotRef" + i];
      if (fig) fig.style.display = i === state.dep ? "grid" : "none";
      if (dot) {
        dot.style.background = i === state.dep ? "#DCFF79" : "rgba(139,155,255,.3)";
        dot.setAttribute("aria-current", i === state.dep ? "true" : "false");
      }
    }
  }

  function applyStep() {
    for (var i = 0; i <= LAST_STEP; i++) {
      var pane = ref["step" + i + "Ref"], bar = ref["stepBar" + i];
      if (pane) pane.style.display = i === state.step ? "grid" : "none";
      if (bar) {
        var done = i <= state.step;
        var line = bar.firstElementChild, lab = bar.lastElementChild;
        if (line) line.style.background = done ? "#DCFF79" : "rgba(139,155,255,.22)";
        if (lab) lab.style.color = done ? "#DCFF79" : "#98A1C2";
      }
    }
    if (ref.backRef) ref.backRef.style.display = state.step === 0 ? "none" : "inline-flex";
    if (ref.nextRef) ref.nextRef.style.display = state.step === LAST_STEP ? "none" : "inline-flex";
    if (ref.submitRef) ref.submitRef.style.display = state.step === LAST_STEP ? "inline-flex" : "none";
  }

  function render() {
    ifBlocks.forEach(function (el) {
      var fn = derived[el.dataset.if];
      el.hidden = fn ? !fn() : false;
    });
    textNodes.forEach(function (el) {
      var fn = derived[el.dataset.text];
      if (fn) el.textContent = fn();
    });
    templates.forEach(syncOptions);
    Object.keys(COMBO_OF_FLAG).forEach(function (flag) {
      var key = COMBO_OF_FLAG[flag];
      var btn = document.querySelector('[data-click="toggle' +
        key.charAt(0).toUpperCase() + key.slice(1) + '"]');
      if (btn) btn.setAttribute("aria-expanded", derived[flag]() ? "true" : "false");
    });
    applyDep();
    applyStep();
    if (stickyUpdate) stickyUpdate();
  }

  /* --- carrossel de depoimentos ------------------------------------------ */
  function goDep(n) {
    state.dep = ((n % DEP_COUNT) + DEP_COUNT) % DEP_COUNT;
    render();
  }

  /* --- formulário --------------------------------------------------------- */
  function showErr(msg) {
    var el = ref.errRef;
    if (!el) return;
    el.textContent = msg || "";
    el.style.display = msg ? "block" : "none";
  }

  function validateStep() {
    var root = ref["step" + state.step + "Ref"];
    if (!root) return true;
    var fields = Array.prototype.slice.call(root.querySelectorAll("input"));
    for (var i = 0; i < fields.length; i++) {
      if (fields[i].required && !fields[i].checkValidity()) {
        fields[i].reportValidity();
        return false;
      }
    }
    if (state.step === 1 && !root.querySelector('input[name="experiencia5"]:checked')) {
      showErr("Selecione sim ou não para a pergunta de experiência.");
      return false;
    }
    showErr("");
    return true;
  }

  function onNext() {
    if (!validateStep()) return;
    state.step = Math.min(LAST_STEP, state.step + 1);
    state.openCombo = null;
    render();
  }

  function onBack() {
    showErr("");
    state.step = Math.max(0, state.step - 1);
    state.openCombo = null;
    render();
  }

  function toggleCombo(key) {
    state.openCombo = state.openCombo === key ? null : key;
    render();
  }

  function onCep(e) {
    var digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    e.target.value = digits.length > 5 ? digits.slice(0, 5) + "-" + digits.slice(5) : digits;
    if (digits.length < 8) return;
    if (ref.cepMsgRef) ref.cepMsgRef.textContent = "Buscando endereço…";

    fetch("https://viacep.com.br/ws/" + digits + "/json/")
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (data) {
        if (ref.addrRef) ref.addrRef.style.display = "grid";
        var set = function (el, v) { if (el) el.value = v || ""; };
        if (data && !data.erro) {
          set(ref.ruaRef, data.logradouro);
          set(ref.bairroRef, data.bairro);
          set(ref.cidadeRef, data.localidade);
          set(ref.ufRef, data.uf);
          if (ref.cepMsgRef) ref.cepMsgRef.textContent = "Endereço carregado. Complete o número.";
        } else {
          if (ref.cepMsgRef) {
            ref.cepMsgRef.textContent =
              "Não foi possível buscar o CEP. Preencha o endereço manualmente.";
          }
          ["ruaRef", "bairroRef", "cidadeRef", "ufRef"].forEach(function (k) {
            var el = ref[k];
            if (!el) return;
            el.readOnly = false;
            el.style.background = "rgba(255,255,255,.05)";
            el.style.color = "#fff";
          });
        }
        var num = document.getElementById("fq-num");
        if (num) num.focus();
      });
  }

  function onSubmit(e) {
    e.preventDefault();
    var root = ref.step2Ref;
    if (root) {
      var cep = ref.cepRef;
      if (cep && cep.value.replace(/\D/g, "").length !== 8) {
        showErr("Informe um CEP válido.");
        return;
      }
      var num = document.getElementById("fq-num");
      if (num && !num.value.trim()) {
        showErr("Informe o número do endereço.");
        num.focus();
        return;
      }
      var consent = root.querySelector('input[name="consentimento"]');
      if (consent && !consent.checked) {
        showErr("É preciso autorizar o contato para enviar o cadastro.");
        return;
      }
    }
    showErr("");
    state.sent = true;
    render();

    var section = document.getElementById("cadastro");
    if (section) {
      window.scrollTo({ top: section.offsetTop - 40, behavior: reduceMotion ? "auto" : "smooth" });
    }
    var ok = document.querySelector('[role="status"]');
    if (ok) {
      ok.setAttribute("tabindex", "-1");
      ok.focus({ preventScroll: true });
    }
  }

  /* --- handlers nomeados (eram os binds do renderVals) ------------------- */
  var handlers = {
    onNext: onNext,
    onBack: onBack,
    onCep: onCep,
    onSubmit: onSubmit,
    toggleInst: function () { toggleCombo("inst"); },
    toggleCargo: function () { toggleCombo("cargo"); },
    toggleCert: function () { toggleCombo("cert"); },
    depPrev: function () { goDep(state.dep - 1); },
    depNext: function () { goDep(state.dep + 1); }
  };

  // goTo0..goTo(N-1), um por depoimento presente
  for (var d = 0; d < DEP_COUNT; d++) {
    handlers["goTo" + d] = (function (n) {
      return function () { goDep(n); };
    })(d);
  }

  [["click", "click"], ["input", "input"], ["submit", "submit"]].forEach(function (pair) {
    document.querySelectorAll("[data-" + pair[1] + "]").forEach(function (el) {
      var fn = handlers[el.getAttribute("data-" + pair[1])];
      if (fn) el.addEventListener(pair[0], fn);
    });
  });

  /* Fecha os selects múltiplos ao clicar fora ou apertar Esc (navegação por
     teclado — critério WCAG AA do PD-135; o protótipo só fechava no botão). */
  document.addEventListener("click", function (e) {
    if (!state.openCombo) return;
    if (e.target.closest("[data-click^='toggle'], [data-if^='open']")) return;
    state.openCombo = null;
    render();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !state.openCombo) return;
    var btn = document.querySelector('[data-click="toggle' +
      state.openCombo.charAt(0).toUpperCase() + state.openCombo.slice(1) + '"]');
    state.openCombo = null;
    render();
    if (btn) btn.focus();
  });

  /* --- nav mobile ---------------------------------------------------------
     No design os 5 links do header são irmãos diretos do <nav>, o que no
     mobile empilhava tudo em 228px de altura. Agrupamos os 5 num painel: no
     desktop ele é a mesma linha flex de antes (layout idêntico); no mobile
     vira um dropdown atrás do botão de menu. */
  function setupNav() {
    var nav = document.querySelector("header nav");
    if (!nav) return;
    var items = Array.prototype.slice.call(nav.querySelectorAll(":scope > a"));
    if (!items.length) return;

    var menu = document.createElement("div");
    menu.className = "fq-navmenu";
    menu.id = "fq-navmenu";
    nav.insertBefore(menu, items[0]);
    items.forEach(function (a) { menu.appendChild(a); });

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "fq-navtoggle";
    toggle.setAttribute("aria-controls", menu.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = '<svg aria-hidden="true" width="20" height="20" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>';
    nav.appendChild(toggle);

    var isOpen = function () { return toggle.getAttribute("aria-expanded") === "true"; };

    function setOpen(open) {
      if (open) menu.setAttribute("data-open", "");
      else menu.removeAttribute("data-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      toggle.querySelector("path").setAttribute("d",
        open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16");
    }
    setOpen(false);

    toggle.addEventListener("click", function () { setOpen(!isOpen()); });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("click", function (e) {
      if (!isOpen() || e.target.closest(".fq-navmenu, .fq-navtoggle")) return;
      setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !isOpen()) return;
      setOpen(false);
      toggle.focus();
    });

    var mq = window.matchMedia("(max-width: 760px)");
    var reset = function () { if (!mq.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener("change", reset);
    else if (mq.addListener) mq.addListener(reset);
  }

  /* --- CTA fixo no mobile -------------------------------------------------
     Revive o comportamento que o design especificava e que ficou órfão de
     markup na V2 (prop `showSticky` + `ctaRef`/`onScroll` + a regra
     `.fq-sticky { bottom:104px }`): um CTA fixo que entra depois do hero e sai
     quando o formulário está à vista — assim ele nunca cobre justamente a
     seção para onde aponta, nem concorre com o CTA do próprio hero. */
  function setupStickyCta() {
    var target = document.getElementById("cadastro");
    if (!target) return;

    var cta = document.createElement("a");
    cta.className = "fq-sticky";
    cta.href = "#cadastro";
    cta.innerHTML = 'Quero me tornar PB' +
      '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="2.5" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 5v14M19 12l-7 7-7-7"></path></svg>';
    document.body.appendChild(cta);

    var mq = window.matchMedia("(max-width: 760px)");
    var on = null;
    function update() {
      var r = target.getBoundingClientRect();
      var targetVisible = r.top < window.innerHeight * 0.92 && r.bottom > 0;
      // mq.matches: no desktop nem entra no tab order (o CSS já o esconde)
      var show = mq.matches && window.scrollY > window.innerHeight * 0.75 &&
                 !targetVisible && !state.sent;
      if (show === on) return;
      on = show;
      cta.classList.toggle("is-on", show);
      // fora da árvore de acessibilidade e do tab order quando escondido
      cta.setAttribute("aria-hidden", show ? "false" : "true");
      cta.tabIndex = show ? 0 : -1;
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    if (mq.addEventListener) mq.addEventListener("change", update);
    else if (mq.addListener) mq.addListener(update);
    stickyUpdate = update;
    update();
  }

  /* --- reveal no scroll ----------------------------------------------------
     Equivalente ao AOS (fade-up com stagger), em IntersectionObserver puro.

     O que NÃO entra, de propósito:
     - hero e barra de números: estão acima da dobra, e os números já têm a
       própria animação de contagem;
     - `.fq-dep` (depoimentos) e o miolo do formulário: o applyDep()/applyStep()
       trocam `display` neles. Um elemento em display:none nunca intersecta,
       então ficaria preso invisível quando o carrossel/passo o exibisse;
     - marquees: são decorativos e já animam sozinhos.

     Nenhum alvo é ancestral dos elementos `position:fixed` (CTA fixo e bolha
     da Fran vivem direto no <body>) — um `transform` num ancestral viraria
     containing block e quebraria o posicionamento deles. */
  function setupReveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    var GRUPOS = [
      { sel: "#como-comecar h2, #como-comecar > div > p" },
      { sel: '[style*="minmax(min(100%,240px),1fr)"] > div', stagger: 80 },
      { sel: "#solucoes h2, #solucoes > div > div > p" },
      { sel: '[style*="repeat(2,minmax(0,1fr))"] > div', stagger: 80 },
      { sel: "#depoimentos h2, #depoimentos > div > p" },
      { sel: "#cadastro > div > h2, #cadastro > div > p" },
      { sel: "#duvidas h2, #duvidas > div > p" },
      { sel: "#duvidas details", stagger: 40 }
    ];

    var alvos = [];
    GRUPOS.forEach(function (g) {
      var els = Array.prototype.slice.call(document.querySelectorAll(g.sel));
      els.forEach(function (el, i) {
        if (el.hasAttribute("data-reveal")) return;
        el.setAttribute("data-reveal", "");
        if (g.stagger) el.style.transitionDelay = i * g.stagger + "ms";
        alvos.push(el);
      });
    });
    if (!alvos.length) return;

    var mostrar = function (el) {
      el.classList.add("is-in");
      // o delay era só para a entrada; segurá-lo atrasaria o hover depois
      window.setTimeout(function () { el.style.transitionDelay = ""; }, 900);
    };

    try {
      document.documentElement.classList.add("reveal");
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          obs.unobserve(e.target);
          mostrar(e.target);
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -5% 0px" });
      alvos.forEach(function (el) { obs.observe(el); });
    } catch (err) {
      document.documentElement.classList.remove("reveal");
      return;
    }

    // Rede de segurança, incondicional: nenhum conteúdo pode ficar invisível.
    // Já tentei condicionar ao `visibilitychange` para preservar o efeito em
    // aba aberta em segundo plano, mas existem contextos que reportam
    // `visibilityState: "hidden"` com a página renderizada na tela — ali nem o
    // observer nem o timer disparavam e o texto sumia de vez. Perder o efeito
    // é cosmético; conteúdo preso invisível é bug. O timer sempre arma.
    var revelarTudo = function () {
      // Tira a classe da raiz em vez de só marcar `is-in`: isso derruba a
      // regra do estado escondido de uma vez, sem depender de transição —
      // que fica pausada em aba oculta e deixaria a opacidade travada no
      // valor inicial mesmo com `is-in` aplicado.
      document.documentElement.classList.remove("reveal");
      alvos.forEach(function (el) {
        el.classList.add("is-in");
        el.style.transitionDelay = "";
      });
    };
    window.setTimeout(revelarTudo, 8000);

    // Segunda rede, para contextos que reportam a aba como oculta enquanto a
    // página está na tela: ali o IntersectionObserver não dispara E o
    // setTimeout é estrangulado, então o texto ficaria invisível à vista de
    // todos. Se alguém está rolando e um alvo já passou da metade da viewport
    // ainda escondido, o observer não está fazendo o trabalho.
    // Numa página saudável isso nunca dispara: o observer revela bem antes de
    // o elemento chegar à metade da tela.
    var aoRolar = function () {
      var travado = alvos.some(function (el) {
        if (el.classList.contains("is-in")) return false;
        var r = el.getBoundingClientRect();
        return r.top < window.innerHeight * 0.5 && r.bottom > 0;
      });
      if (!travado) return;
      window.removeEventListener("scroll", aoRolar);
      revelarTudo();
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
  }

  /* --- contadores do hero -------------------------------------------------- */
  function startCounters() {
    if (reduceMotion) return;
    var els = [ref.numRef0, ref.numRef1, ref.numRef2].filter(Boolean);
    if (!els.length) return;

    var fmt = function (v) { return v.toLocaleString("pt-BR"); };
    var run = function (el, i) {
      var raw = el.textContent.trim();
      var prefix = raw.charAt(0) === "+" ? "+" : "";
      var target = parseInt(raw.replace(/\D/g, ""), 10);
      if (!target) return;
      el.textContent = prefix + "0";
      var dur = 2400 + i * 260;
      var t0 = performance.now();
      var step = function (t) {
        var p = Math.min(1, (t - t0) / dur);
        // easeInOutQuint — arranque lento e chegada longa no valor final
        var eased = p < 0.5 ? 16 * Math.pow(p, 5) : 1 - Math.pow(-2 * p + 2, 5) / 2;
        el.textContent = prefix + fmt(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = prefix + fmt(target);
      };
      requestAnimationFrame(step);
    };

    if (!("IntersectionObserver" in window)) {
      els.forEach(run);
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        run(e.target, els.indexOf(e.target));
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { obs.observe(el); });
  }

  /* --- boot ---------------------------------------------------------------- */
  setupNav();
  setupStickyCta();
  setupReveal();
  templates.forEach(buildOptions);
  render();
  startCounters();
})();
