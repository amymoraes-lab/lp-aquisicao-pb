# PD-135 · Landing de captação de PB — v2

Redesenho conforme o brief. Objetivo único: conversão no formulário de 3 etapas.

| | |
| --- | --- |
| **v2 (esta)** | `index.html` + `assets/css/lp.css` + `assets/js/lp.js` — autoral, classes reais, sem dependências |
| **v1 (anterior)** | `v1-canvas.html`, gerada do `.dc.html` por `tools/build.py`. Preservada e ainda regenerável; o build não sobrescreve mais a v2 |

O brief redefine a página (4 seções novas, ordem nova, CTA novo), então o `.dc.html`
deixou de ser fonte da verdade da estrutura. A v2 é escrita à mão — e isso melhora
o handoff: classes reais em vez de `style` inline, que é o que o time de
WordPress/Elementor consegue mapear para componentes.

```bash
python3 -m http.server 4173   # depois: http://localhost:4173
```

**Desvios do brief, a pedido:** a seção 4.8 (*Soluções / Monte sua loja*) foi
**removida** — junto com o item “Soluções” do menu — e os depoimentos ficaram em
**3**, sem slots vazios para completar a grade. **Requisitos e simulador trocaram
de lugar** — a pedido, o simulador desceu para depois da comparação. Ordem final
das seções: hero · requisitos · agência × sua loja · simulador · suporte ·
depoimentos · cadastro · dúvidas.

---

## 1. Correção de premissa: contraste

Três das quatro suspeitas do brief se confirmaram; uma não. Medido sobre `#0C1120`:

| Par | Medido | Veredito |
| --- | --- | --- |
| Corpo `#C9D0E8` | **12,24:1** | ✅ já passava — a suspeita não se confirmou |
| Texto legal do rodapé `#7A83A0` 11px | **5,00:1** | ✅ passava em contraste; o problema era **tamanho**, não cor |
| Rodapé secundário `#6E7796` | 4,25:1 | ❌ corrigido |
| Placeholder de input `#6E7796` | 3,80:1 | ❌ corrigido |
| Branco no CTA violeta `#687BEA` | 3,74:1 | ❌ resolvido pelo CTA lima |

O corpo de texto nunca foi o problema. Os problemas reais eram os cinzas de apoio,
o placeholder e — o pior — o próprio CTA primário. A escala de texto foi
reancorada para que nenhum cinza fique abaixo de 4,5:1:

`--tx-1 #EAEDF6` 14,6:1 · `--tx-2 #C9D0E8` 12,2:1 · `--tx-3 #A8B2CE` 8,6:1 · `--tx-4 #8D97B8` 6,2:1

O texto legal foi de 11px para **13,5px** em `--tx-3`.

---

## 2. Cinco headlines

O recurso de itálico numa palavra-chave é mantido em todas.

**1. “Você já tem os clientes. Faltava a *loja*.”** ← implementada
Tensão e resolução em duas frases curtas. Usa o vocabulário da marca (“loja”) e,
para um público conservador, faz o trabalho mais importante: reduz o risco
percebido. Não diz “comece de novo”, diz “você já está 90% lá; faltava a
infraestrutura”. O pretérito de “faltava” já entrega que o problema está resolvido.

**2. “A agência te deu cinco anos de experiência. E um *teto*.”**
A mais afiada e a melhor candidata a teste A/B contra a 1. Nomeia o teto sem
caricaturar o banco — reconhece que a experiência foi ganho real, e é justamente
isso que torna a frase difícil de refutar. Custo: entrega o conflito sem entregar
o caminho, então depende mais da subheadline.

**3. “Sua carteira. Sua reputação. Agora, sua *comissão*.”**
Escalada de posse em três tempos, com a comissão no fim — a objeção nº1 aparece na
primeira tela. O ritmo funciona bem na serifada. Custo: “comissão” em destaque
puxa a página para perto do tom de venda, que é o que este público rejeita.

**4. “Você construiu a carteira. O banco ficou com a *margem*.”**
A mais confrontadora e a de maior risco. Funciona como recrutamento, mas viola o
princípio de não transformar o banco em espantalho — o leitor trabalha lá e pode
ler como desprezo à escolha dele. Recomendo não usar sem teste.

**5. “Continue sendo o bancário de confiança deles. Sem ser *funcionário*.”**
Preserva a identidade profissional (o que ele mais teme perder) e remove só o
vínculo. Boa para quem trava por medo de perder reputação, não por dinheiro.
Custo: mais longa, e “funcionário” pode soar pejorativo para quem ainda é.

---

## 3. CTA canônico

Um único tratamento de ação primária. Antes havia três (pill violeta no header,
pill branca no hero, botão retangular violeta no formulário).

**Primário — pill lima, texto navy.** O lima é o elemento mais reconhecível da
marca e nunca aparecia em ação, só em título. Colocá-lo no CTA resolveu de tabela
o pior par de contraste da página: navy sobre lima dá **16,68:1**, contra 3,74:1
do branco sobre violeta.

| Estado | Tratamento | Racional |
| --- | --- | --- |
| **default** | `#DCFF79`, texto `#0C1120`, peso 700, altura mín. 54px, pill | 16,68:1 |
| **hover** | `#E7FF9B` + `translateY(-2px)` + glow lima | **Clareia**, não escurece: sobre fundo escuro, clarear lê como avanço |
| **active** | `#C9EE55` + `translateY(1px)`, sem sombra | Afunda — resposta física ao toque |
| **focus-visible** | Contorno violeta 3px, offset 3px | Violeta, e não lima, porque contorno lima sobre botão lima desaparece |
| **disabled** | Lima a 22%, texto a 50%, `cursor: not-allowed` | Legível como inerte, sem parecer erro |
| **loading** | Spinner + “Enviando…”, `aria-busy="true"`, cliques bloqueados | Rótulo muda; o botão não vira só um spinner sem texto |

**Secundário — ghost.** Transparente com borda `--line-2`, hover preenche com
`--surf-2`. Nunca compete com o primário: só um lima por bloco de decisão.

---

## 4. Simulador de comissão

Baseado no **simulador oficial do beFranq**
(`be.franq.com.br/minha-conta/simulador-de-comissoes`). Taxonomia, percentuais,
conta e disclaimers vêm de lá — nada é inventado.

### 4.1 Uma taxonomia, seis escolhas

A ferramenta oficial lista **12 produtos em 4 famílias** — bom para um PB que já
opera, complexo demais para um prospecto na LP. Aqui ficaram **6 categorias numa lista
plana**, as mesmas do design que o formulário já usa.
Uma taxonomia só, sem mapeamento entre telas.

Cada categoria recebe o **menor** percentual entre os produtos oficiais que caem
nela. Por ser o menor, o “a partir de” é piso demonstrável, nunca otimista:

| Categoria | Base | Comissão | Origem do percentual |
| --- | --- | --- | --- |
| Consórcio | valor da venda | **3,00%** | Bens Móveis (Bens Imóveis é 3,50%) |
| Crédito PF | valor da venda | **1,50%** | Auto Equity (Consignado 2,00%, Home Equity 3,00%) |
| Crédito PJ | valor da venda | **0,50%** | Middle/Corporate (Varejo 1,25%) |
| Financiamentos | valor da venda | **1,00%** | Imobiliário (Veículo 1,50%) |
| Seguros | prêmio mensal | **20,00%** | Seguro de Vida PF ou PJ |
| Previdência | aporte mensal | **25,00%** | Plano Mensal |

**Onde a base é declarada.** Crédito e financiamento incidem sobre o valor da
venda; seguros e previdência sobre prêmio recorrente. Cheguei a agrupar os chips
por base, mas a lista ficou plana: a distinção aparece no **rótulo do slider** de
cada categoria (“crédito contratado no mês”, “prêmio mensal”), que é onde o valor
é informado e portanto onde ela pesa. Escolher a categoria não exige saber a base.

**Fora da conta:** “Previdência — Aporte Único” (0,50%) tem base avulsa, e
**Investimentos e Câmbio não têm produto no simulador oficial**. As duas seguem
selecionáveis nos chips do formulário, mas não entram na estimativa.

Para rastreabilidade, os 12 percentuais originais estão no comentário do topo de
`assets/js/lp.js`. A extração foi conferida contra a ferramenta: a soma dos 12 dá
62,75%, ou **R$ 627.500** sobre R$ 1 mi por linha — exatamente o “Total Mensal”
que ela exibiu.

### 4.2 Três decisões que precisam do seu aval

**a) “A partir de”, em vez de faixa.** O brief pedia “sempre faixa de X a Y, nunca
número único”, pela razão de “é estimativa, não promessa”. Mas os percentuais da
ferramenta oficial **são os mínimos** — o disclaimer 3 diz que podem ser maiores.
Inventar um teto seria criar justamente o número que a Franq não publica. “A
partir de R$ X” cumpre a intenção melhor: só pode ser superado, nunca frustrado.
Com os percentuais máximos em mão, viro faixa em uma linha.

**b) Sliders, e não campo numérico livre.** A ferramenta oficial usa campo R$
livre; o brief pediu slider com faixas. Mantive o slider: o público da ferramenta
interna é PB que já sabe seus números, o da LP é um bancário que não quer ser
preciso. Os degraus são escala de interface (`ESCALAS`), não dado da Franq.

**c) Agregação por menor percentual.** Simplificar de 12 para 6 exigiu agregar, e
agregar muda o número. Usar o menor mantém a promessa conservadora — mas significa
que quem vende Home Equity (3,00%) vê a estimativa de Crédito PF em 1,50%, metade
do real. Se preferir, dá para (i) usar a média da categoria, (ii) voltar aos 12
produtos, ou (iii) usar 6 categorias com faixa “de menor a maior”.

### 4.3 Estados

| Estado | O que aparece |
| --- | --- |
| **vazio** | Instrução + card tracejado com exemplo ilustrativo citando percentuais reais (“Consórcio 3,00% e Seguros 20,00%”). Nunca zeros. |
| **preenchimento parcial** | Um slider por categoria selecionada, com a base explícita no rótulo (“crédito contratado no mês”, “prêmio mensal”). Recalcula a cada movimento, sem botão “calcular”. |
| **percentuais** | Não aparecem nos chips nem nos sliders — só no breakdown, dentro do toggle. A escolha é sobre o que a pessoa vende, não sobre qual comissão é maior. |
| **resultado** | “A partir de R$ X” por mês. `aria-label` em prosa. |
| **breakdown + condições** | Atrás de um toggle único, “Como chegamos nesse número”. Fechado, o painel fica só com o número. Aparece só quando há resultado. |

**Sem botões no painel** (a pedido). Saíram o CTA de saída e o botão de
compartilhar. Duas consequências que valem registro:

- O brief pedia CTA de saída no simulador (“Receber minha estimativa detalhada”,
  levando ao formulário com os produtos pré-marcados). O caminho de conversão não
  se perdeu: a âncora logo abaixo da seção (“Já sabe o número? O cadastro leva 2
  minutos”) segue lá, com o CTA canônico. O que se perdeu foi o pré-preenchimento
  vindo do próprio painel — a etapa 2 do formulário continua sincronizada com a
  seleção, então na prática o efeito é o mesmo.
- O brief chamava o compartilhamento de “canal orgânico da campanha”, pelos grupos
  de WhatsApp de bancário. Esse sim foi perdido. **A infraestrutura ficou de pé:**
  `daHash()` continua lendo `#sim=consorcio.2_seguros.3`, então Marketing pode
  montar link já com a simulação preenchida, e reativar o botão é ~15 linhas.

**Disclaimers:** os 4 da ferramenta oficial, na íntegra, dentro do toggle. Só o item 3 foi adaptado
— a versão interna manda usar a Tabela de Comissões como material de apoio, o que
não faz sentido para quem ainda não é PB; a substância (“são os mínimos, podem ser
maiores”) foi mantida.

**Saída para conversão:** “Receber minha estimativa detalhada” leva ao formulário
com as categorias já marcadas na etapa 2.

### 4.4 Por que o simulador estava apagado

Depois da troca de posição ele perdeu o `--glow` e ficou entalado entre duas
seções `--band`, **sem fundo próprio** — literalmente um buraco entre dois
blocos com tint. E a hierarquia estava invertida: o card de entrada era maior,
mais claro e mais alto que o painel do resultado. O prêmio era o elemento mais
apagado da seção.

| O que mudou | Por quê |
| --- | --- |
| Seção ganha ambiente próprio (`.fq-sec--sim`) e fio **lima** no topo | Deixa de ser vão entre vizinhas. O fio lima é o mesmo sinal das bandas de conversão: "isto importa" |
| Entrada **afunda**, resultado **sobe** | Sobre o tint da seção o card de entrada escurece; o painel do resultado é o único elemento da página com borda e halo lima. A hierarquia passa a apontar para o número |
| Número num **mostrador afundado** | Superfície escura dentro do painel claro: o olho encontra a leitura antes de ler qualquer rótulo. Fonte de 40px → 56px |
| Trilha do slider pinta de lima o trecho percorrido | Era uma linha cinza que não dizia onde se estava. O `--p` vem do JS, que já sincronizava o valor |
| Rótulo do painel em lima; chips mais presentes em repouso | O rótulo do prêmio competia em violeta com o rótulo da entrada |
| Exemplo ilustrativo sai do mostrador | No estado vazio empilhava três caixas com borda. Exemplo é dica, não leitura |

**Dois cuidados que a mudança exigiu:**

- `.fq-card` também serve o **card de prova social** da seção do formulário, que
  vive no fundo liso. O escurecimento está escopado em `.fq-sec--sim .fq-card` —
  sem isso o card de prova desapareceria contra a página.
- As vizinhas são `--band` e já desenham fio nas emendas. Um `margin-top: -1px`
  faz o fio lima **cobrir** o da seção de cima em vez de empilhar sob ele, e a
  borda de baixo ficou com a seção de suporte. Conferido pixel a pixel: uma
  régua de 1px em cada emenda, não duas.

**Contraste conferido no pixel renderizado** (não na conta em cima dos tokens,
que erra com gradiente e camada translúcida): rótulo lima 10,09:1 · estado
vazio 8,16:1 · rótulo do card 7,24:1 · descrição 8,74:1 · chip 14,13:1 ·
exemplo 7,07:1. Todos passam AA.

## 5. Formulário — 3 etapas e estados

**CPF saiu da etapa 1** e foi para a etapa 3, depois do compromisso assumido. Era
o campo de maior fricção da página e estava na primeira tela, ao lado de nome e
e-mail, sem explicação por perto.

**A microcópia foi para o lado do campo.** A explicação existia, mas na FAQ, seis
seções abaixo — longe do momento do medo. Agora está sob o input, ligada por
`aria-describedby`, e diz mais do que a original: que o CPF não é consultado em
bureau e não é compartilhado com as parceiras.

| Etapa | Campos |
| --- | --- |
| 01 · Dados | Nome, e-mail, celular |
| 02 · Perfil | Experiência 5+ anos, produtos que mais vende (vem do simulador), instituições, LinkedIn |
| 03 · Endereço | **CPF**, CEP, endereço, número, complemento, consentimento |

**Botões.** Alinhados à direita, com régua e respiro de 56px separando a decisão
do preenchimento; “Voltar” fica empurrado para a esquerda. “Voltar” só existe se
houver passo anterior. “Enviar cadastro” aparece
no último passo, mas fica **inativo até que os três passos estejam completos** —
com `aria-disabled`, não `disabled`, para o botão continuar focável e para o
clique **revelar o que falta** em vez de não fazer nada. “Continuar” segue sempre
ativo de propósito: ali o clique é que ensina, mostrando os erros do passo.

**Estados:** validação inline por campo com mensagem específica (“Confira o
e-mail — parece faltar algo”, “O CEP tem 8 dígitos”), `aria-invalid` no input;
máscara em celular, CPF e CEP; **dígitos verificadores do CPF conferidos no
cliente** — pega erro de digitação sem consultar nada; loading com spinner e
`aria-busy`; erro de rede com alerta em `role="alert"`.

**Erro que não pune:** rosa `#FF7A9C` em vez de vermelho de alarme, ícone de
informação em vez de proibido, e a mensagem diz o que fazer, não o que se errou.

**Tela de sucesso** (não existia): diz o que acontece, em quanto tempo e por qual
canal — confirmação por e-mail agora, análise em até 3 dias úteis, conversa por
telefone ou WhatsApp depois. Recebe foco ao aparecer.

**Reasseguramento acima/ao lado:** leva 2 minutos · sem custo e sem mensalidade
para se cadastrar · não afeta seu vínculo atual · dados não compartilhados com as
instituições. Ao lado, prova social (10.000 PBs + depoimento do Douglas), porque
o formulário sozinho num card escuro é frio.

---

## 5.1 Bandas de conversão entre seções

As âncoras intermediárias viraram **bandas** com peso visual alto: hairline
lima no topo, eyebrow monoespaçado, display serifado de até 40px com itálico lima,
CTA de 62px e uma linha de reasseguramento em mono.

**O que deliberadamente não entrou:** urgência. Nada de contador regressivo, “vagas
limitadas” ou promessa de rendimento — o brief proíbe, e o público rejeita estética
de infoproduto. A saliência vem de **tamanho, contraste e centralização**, não de
pressão. A copy segue adulta:

| Onde | Copy |
| --- | --- |
| Depois do simulador | “Você acabou de ver quanto a *sua* carteira vale.” |
| Depois da comparação | “A diferença entre as duas colunas é *um cadastro*.” |

A banda que ficava depois dos depoimentos (“*10.000* bancários já fizeram essa
conta.”) foi **removida a pedido**. Ela era a mais dispensável das três: o
formulário vem imediatamente abaixo, então o CTA mandava o leitor para uma seção
que já estava na tela. Sobraram duas bandas, nos dois pontos onde há de fato
distância até o cadastro.

A linha de reasseguramento (“2 minutos · sem custo…”) foi removida das bandas a
pedido. Ela segue na coluna ao lado do formulário, onde a objeção é mais aguda.

Se você quiser mais agressividade do que isso, o caminho que eu recomendaria é
aumentar ainda mais a escala tipográfica e o contraste — não adicionar pressão.

---

## 5.2 Eyebrows

Os eyebrows monoespaçados de seção (“Simulador”, “Como começar”, “Prova”…) foram
removidos a pedido — sobrou só o do hero (“— SEJA UM PERSONAL BANKER”). As seções
começam direto no H2 serifado lima.

O recurso monoespaçado continua na página em três lugares, onde ele carrega
informação em vez de rotular: o `01 · O QUE VOCÊ VENDE HOJE` do simulador, os
`01 · DADOS / 02 · PERFIL / 03 · ENDEREÇO` do formulário e os eyebrows das bandas
de conversão. **Os das bandas eu mantive** por serem parte daquele componente, e
não do cabeçalho de seção — se a intenção era tirar esses também, é uma linha.

---

## 6. Acessibilidade

- **Skip link** “Pular para o conteúdo” (WCAG 2.4.1, nível A — exigido pela
  conformidade AA). Não existia.
- **Ordem de foco** segue a ordem visual. O menu mobile é um painel depois do
  botão que o controla, com `aria-controls` / `aria-expanded`, e fecha por `Esc`,
  clique fora ou clique num link — devolvendo o foco ao botão.
- **`scroll-padding-top`** no `html` para as âncoras não pararem embaixo do header
  fixo. Sem isso, quem navega por âncora perde o título da seção.
- **Alvos de toque** ≥ 44px em toda a página: chips 46px, itens de menu 48px,
  inputs 52px, botões 54px.
- **`prefers-reduced-motion`** desliga marquee, contadores, parallax, reveal e
  todas as transições.
- **Chips** são `<button aria-pressed>`, não checkbox escondido — estado lido
  corretamente por leitor de tela.
- **Comparação** com `role="table"`/`columnheader`; no mobile, os rótulos de
  coluna viram prefixo de cada bloco via `::before`, então a informação não se
  perde quando o cabeçalho é escondido.
- **Resultado do simulador** com `aria-live="polite"` e `aria-label` em prosa
  (“de X a Y por mês”), porque o travessão entre os valores não é lido.
- **`inputmode`** correto em celular, CPF, CEP e número; inputs em **16px** para
  não disparar o zoom automático do iOS.
- **Foco visível** em lima 3px com offset — exceto no próprio botão lima, onde o
  contorno é violeta para não desaparecer.

---

## 7. Placeholders — dados que faltam

Nada foi inventado. Cada lacuna está marcada na interface com o token `⟨…⟩`.

| Onde | O que falta | Como preencher |
| --- | --- | --- |
| **Simulador** | ~~Faixas de comissão~~ | ✅ **resolvido** — percentuais reais extraídos do simulador oficial do beFranq (seção 4) |
| **Simulador** | Percentuais **máximos**, se existirem | Hoje o resultado é “a partir de”. Com os máximos, virá faixa “de X a Y” |
| **Requisitos** | Prazo do passo 03 | `⟨prazo⟩` no `index.html` |
| **Depoimentos** | Vídeos verticais e fotos reais | 3 cards; os textos já são reais. Banco de origem e produto que mais vende saíram da linha de metadados a pedido — sobrou cidade · tempo de Franq |
| **Formulário** | Endpoint de envio | `ENDPOINT` em `lp.js`. Com `null`, o envio é simulado (900ms) para o estado de loading ser real |
| ~~**Hero** — captura real do beFranq~~ | ✅ **resolvido** — a tela do MacBook é a captura real da tela de nova venda do beFranq (`assets/img/befranq-nova-venda.jpg`). O quadro tem 1,770:1 e a captura 2,35:1, então o recorte foi calculado, não estimado: varri os pixels e a barra de busca vai de x=1577 a 2387, com um vão limpo até 2431 — cortar antes disso a decepava. O corte ficou em x=2409 e y=1140 (uma faixa vazia entre os cartões e as barras azuis), e **a tela do app foi estendida 221px para baixo** — branco no corpo e a barra lateral continuada, nas cores amostradas da própria captura. Resultado: 1,769:1 contra 1,770:1 do quadro, **0% descartado na largura** em desktop, mobile e nos dois temas. O `sips` não serviu para o recorte (corta a partir do centro e ignora a origem); foi feito no canvas. **Não há dado pessoal na captura** — nenhum nome de cliente, CPF ou valor —, e como não há mais número de exemplo na tela, a ressalva de "dados de exemplo" deixou de ser necessária. Saíram 48 regras de CSS da ilustração que ela substituiu. |

**Depoimentos — decisão:** não reaproveitei a foto atual. O brief pede zero banco
de imagens e diz que a que existe tem aparência de stock/IA; reusá-la contrariaria
o próprio pedido. Os 3 slots estão desenhados para vídeo vertical de até 30s.

**Erro factual corrigido:** Karen Lopes estava creditada como *Gravataí/SC*.
Gravataí é **RS**.

---

## 7.5 Hierarquia visual — por que a página não se lia

Diagnóstico medido, não impressão: extraí o **perfil de luminância** da página
renderizada inteira e os estilos computados de cada seção e título.

| O que a medição mostrou | Consequência |
| --- | --- |
| Os **7 títulos** eram idênticos: 42px, todos em `--lima` | O lima, único acento da página, estava gasto por igual em todo título. **Acento que está em tudo não acentua nada** — era a causa principal de "não dá para diferenciar o que é o quê" |
| Os **9 fundos de seção** eram dois valores quase iguais: transparente ou tint de 4,3% | Em miniatura a página inteira virava uma cor só |
| Amplitude de luminância da página: **48 níveis** (18 a 66) | Nenhum ponto de parada. Nada para o olho ancorar |

**A correção foi racionar o acento e criar degraus reais**, sem introduzir
nenhuma hue nova — só o lima da marca e o navy, redistribuídos:

| Camada | Tratamento |
| --- | --- |
| Título de seção | Nasce **claro** (`--tx-1`); o lima marca só o trecho que carrega o argumento. 5 dos 8 títulos têm um acento; os 3 puramente navegacionais ficam brancos |
| Fundo de seção | Dois planos com degrau medível: `--plano-1 #0C1120` e `--plano-2 #131B33`, no lugar do tint de 4,3% |
| **Banda de conversão** | **Invertida: lima cheio com texto escuro.** É o único lugar da página com o acento como fundo. Restou **uma**, depois do simulador — a de depois da comparação foi removida a pedido, para a página ter um pico só |
| **Ação isolada** (`.fq-acao`) | Botão sozinho, centralizado (desvio de 0px do eixo, medido) e com `margin-top: 30px` fixo, no fim da comparação e do suporte. Sem placa: a banda invertida fica reservada ao simulador, e estes não competem com aquele pico. Seta para baixo, porque o clique rola para o formulário |
| Simulador | Ambiente próprio + painel do resultado com borda e halo lima (ver 4.4) |
| Formulário | Ambiente violeta próprio + caixa com fio lima no topo — a terceira parada. No perfil ele era indistinguível de tudo à volta |

**Resultado medido:** amplitude de **48 → 148 níveis** e degraus de valor
distintos de **6 → 13**, com **um pico único** a 41% da página (167 de 255) —
a banda depois do simulador. Com as duas bandas o perfil tinha dois picos
equivalentes a 30% e 45%; deixar um só concentra a chamada num ponto e mantém o
tom sóbrio que o brief pede.

### Três coisas que a inversão exigiu

- **O CTA dentro da banda inverte** — escuro com texto lima. Botão lima em
  banda lima desapareceria. O hover global escreve `background`/`color` direto,
  então o override na banda também tem de ser direto: custom property sozinha
  perderia a especificidade.
- **A ênfase dentro da banda deixa de ser cor.** Lima sobre lima é invisível: o
  `<em>` passa a itálico + sublinhado, que funciona em qualquer fundo.
- **O header sobre a banda lima.** Com 82% de opacidade e blur, o header ganha
  um tom oliva (`rgb(50,60,47)`) quando a banda passa por baixo. Medido no
  pixel: menu 9,84:1, item ativo 10,22:1, logo 11,52:1 — tudo passa, e o CTA
  lima do header se destaca a 10,22:1 (o mínimo para componente é 3:1).

**Uma falha que a medição pegou:** o eyebrow da banda em `rgba(12,17,32,.66)`
dava **4,45:1** sobre a ponta mais escura do gradiente lima — reprovava por
pouco no mínimo de 4,5 para texto pequeno. Subiu para `.8`, e a varredura da
caixa do texto (núcleo do glifo, não pixel de antialiasing) confirma **9,73:1**
na própria linha e 8,10:1 contra o ponto mais escuro da banda.

## 8. O que mudou por seção

| Seção | Mudança |
| --- | --- |
| Header | Fixo, transparente sobre o hero, fundo + blur ao rolar. Seção ativa marcada no menu. No mobile o CTA sai do header e vira barra fixa no rodapé |
| Hero | Headline de conflito; **MacBook em CSS 3D** com o beFranq aberto, girando conforme o mouse, no lugar da foto de banco de imagens; contadores animados nos 3 números |
| Logos | Marquee com **pausa no hover**; altura **óptica** por logo (`data-otica`), não altura de caixa — a tinta dentro dos tiles vai de 23% a 68% da altura, então altura uniforme deixava os wordmarks 3× menores |
| Requisitos | Timeline com linha e marcadores lima. As labels de expectativa de tempo (“2 min para preencher”, “⟨prazo⟩”) foram removidas a pedido — o brief as pedia, mas a decisão foi sua; com isso saiu o último placeholder de prazo. **Passou a abrir o conteúdo**, no lugar do simulador; com isso o wrap estreito de 1000px virou o de 1200px das vizinhas — enterrada no meio da página o recuo não se via, na primeira posição o eixo esquerdo saltava 100px contra o hero |
| Agência tradicional × Personal Banker | **Nova.** Título trocado a pedido (era “Agência × sua loja”); o acento lima passou para “Personal Banker”, o lado do argumento. Espaço inquebrável antes do `×` — sem ele o operador caía órfão no começo da segunda linha no mobile. A banda de conversão que ficava aqui saiu, e no lugar entrou um **botão isolado** (`.fq-acao`). 6 eixos. Coluna do PB favorecida com borda e tint lima, ✓ e texto mais claro; a da agência fica neutra com um traço, não um ✗ — o leitor trabalha lá. Badge “com a Franq” no cabeçalho. No mobile vira blocos, com os rótulos de coluna virando prefixo |
| Simulador | **Nova.** Percentuais reais do simulador oficial do beFranq, simplificados de 12 produtos para 6 categorias. Ver seção 4. **Destacado a pedido** — ver 4.4 |
| Suporte | Ganhou um **botão isolado** no fim, a pedido. 2×2 → **4 colunas** (em 1440px metade da tela ficava vazia); ícones de 38px→58px com hover |
| Depoimentos | **Capas verticais no lugar dos vídeos** (ver 8.1). Carrossel de um → **grade de 3**, formato para vídeo vertical. Carrossel escondia a quantidade de prova |
| Formulário | Ver seção 5 |
| FAQ | Objeções financeiras subiram para o topo; “Saiba mais” virou link de verdade |
| Rodapé | Texto legal de 11px → 13,5px, contraste 8,6:1 |
| Flutuantes | Hierarquia definida: barra de CTA (z 40) < Fran (z 45) < menu (z 60). A Fran **sobe** acima da barra via `--barra-mobile-h`, medido: Fran termina em 826px, barra começa em 860px |

**Sem urgência artificial**, como exigido: nenhum contador regressivo, nenhuma
menção a vaga limitada, nenhuma promessa de rendimento. Toda estimativa é faixa
com disclaimer.

---

## 9. Handoff para Marketing/Web (Elementor)

**Replicável em Elementor:** header, hero (menos o MacBook), requisitos, pilares,
comparação, depoimentos, FAQ (accordion nativo) e rodapé — são layout e conteúdo.

**Exige código customizado**, tudo isolado em `assets/js/lp.js`:
simulador de comissão, contadores animados,
marquee com pausa, formulário de 3 etapas com máscaras e validação, busca de CEP
na ViaCEP, reveal no scroll e a barra fixa do mobile.

**Tokens** estão todos em `:root` no `lp.css` — é o único lugar a editar para
mudar a paleta.

---

### 8.1 As capas dos depoimentos — e um conflito de nomes

Os slots de vídeo receberam as três artes verticais como **cartaz provisório**,
até os `.mp4` existirem. São cartaz, não frame de vídeo, então não levam botão
de play: não há nada para tocar.

| Detalhe | Decisão |
| --- | --- |
| Peso | 581×1024 originais (920 KB somados) → **480×846 JPEG q84, 326 KB** — ainda 2,5× o tamanho de exibição, folgado para retina |
| Onde | `assets/img/depoimentos/{karen-lopes,rogerio-rojo,erica-vieira}.jpg`, apontados pelo campo `capa` em `DEPS` |
| Altura do slot | `max-height` de 340px → **464px**. Em 340 o slot ficava quase quadrado e o corte **decepava as frases** da arte no meio; 464px cobre ~77% da arte — entra rosto, nome e a frase inteira nas três, e o logo do pé fica de fora |
| Enquadramento | `object-position: 50% 0` — ancorado no topo, porque o texto da arte vive na metade de baixo |
| Quando o vídeo chegar | `video` assume o slot e a capa passa a ser o `poster` dele. O fallback do slot vazio continua no código para qualquer depoimento sem capa |

**Um bug que a troca criou e foi corrigido:** `height: 100%` num pai cuja altura
é limitada por `max-height` **não resolve** — a imagem caía no aspecto
intrínseco (~600px), transbordava o slot de 340px e pintava por cima do texto
do cartão. Corrigido com `overflow: hidden` no slot e `position: absolute;
inset: 0` na imagem, que assim preenche a caixa sem nunca influenciar a altura
dela.

**⚠ Conflito de nomes, pendente de decisão:**

| Cartão | Capa mostra | Byline credita |
| --- | --- | --- |
| 1 | Karen Lopes | Karen Lopes ✅ |
| 2 | **Rogério Rojo** | **Jeferson Cantanhede** ⚠ |
| 3 | **Erica Vieira** | **Douglas Biscaia** ⚠ |

Os cartões 2 e 3 exibem **dois nomes diferentes** — a arte credita uma pessoa e
a assinatura credita outra, o que atribui a citação a quem não a disse. Não
resolvi sozinho porque as duas saídas dependem de dado que não tenho:

1. **Trocar os depoimentos** para Rogério e Erica — preciso da citação, cidade e
   tempo de cada um. As frases impressas nas artes (“Franq: benefícios que
   superam expectativas”, “Suporte completo para atender os seus clientes”) são
   títulos de campanha, não citações em primeira pessoa, então não servem.
2. **Trocar as capas** para artes de Jeferson e Douglas, se existirem.

Enquanto isso não se decide, **a seção não deve ir ao ar** como está.

**Nota de acessibilidade:** o `alt` de cada capa nomeia a pessoa, mas a frase
gravada na arte não é acessível a leitor de tela. Isso se resolve por si quando
o vídeo entrar com legenda.

## 8.2 Publicação no Google Apps Script

`python3 tools/build-appsscript.py` gera `build/appsscript/` com os 4 arquivos
para colar no editor, o `appsscript.json` e um `PREVIEW.html` achatado para
conferir local. Passo a passo em `build/appsscript/LEIA-ME.md`.

**O que o build resolve:** o Apps Script não serve arquivo estático — não há URL
para `assets/css/lp.css`, `logos/itau.webp` nem uma `.woff2`. CSS e JS entram
por template (`<?!= incluir('estilo') ?>`), as 17 imagens viram `data:` URI, e a
Playfair passa a vir do Google Fonts (poupa 38 KB e ganha cache de CDN).

**O envio deixa de ser `fetch`.** Passa a `google.script.run.salvarCadastro(...)`,
que grava numa planilha — sem CORS e sem endpoint público. Isso fechou o
placeholder `ENDPOINT: null`, ao menos nesta versão.

**Auditoria antes de publicar** (18 checks no bundle gerado — scriptlets
intrusos, fechamento precoce de `<script>`/`<style>`, caminho local
sobrevivente, escopos, acesso, guardas). Achou dois problemas além dos dois
abaixo:

- **Os links de campanha `#sim=` morriam em silêncio.** A página roda num
  iframe de sandbox e o que vem depois do `#` fica na URL do PAI — nunca chega
  ao iframe. Corrigido: `doGet(e)` lê a query e injeta em
  `<meta name="fq-params">` (com `<?= ?>`, que escapa — o valor vem da URL).
  Os links passam a ser `?sim=…`. Verificado: `?sim=consorcio.4_seguros.2`
  marca os dois produtos e mostra R$ 47.400.
- **`google.script.run` sem guarda** lançava `ReferenceError` fora do Apps
  Script, o que quebrava o próprio `PREVIEW.html`. Agora cai no envio simulado.

E dois efeitos colaterais que a auditoria deixou melhores: a coluna **origem**
passou a gravar os `utm_*` em vez de `document.referrer` (que dentro do iframe
é o wrapper do Google, não a origem real), e o `addMetaTag('viewport')` ficou
documentado como **não redundante** — a meta do nosso HTML vale só para o
iframe; é a do `doGet` que o celular enxerga.

**Dois bugs que o build revelou:**

- A varredura de assets olhava só o HTML, e as **3 capas dos depoimentos** são
  apontadas pelo campo `capa` dentro do `lp.js`. Iriam para produção como
  caminho relativo que o Apps Script não serve — três imagens quebradas. Agora
  o build varre HTML e JS, e falha se sobrar qualquer caminho local.
- O coletor do formulário buscava o consentimento por `#f-consent`, mas o
  checkbox **não tem id, só `name`** — gravaria `false` sempre, num campo que é
  o registro de consentimento LGPD. Corrigido para `input[name="consentimento"]`.
  Os 17 campos foram testados contra o formulário preenchido: nenhum volta vazio.

**Peso:** ~530 KB de HTML num response único, sem cache do navegador (o
`HtmlService` não permite). O grosso são as capas (~250 KB em base64) — elas
saem quando os vídeos entrarem.

## 8.3 Tema claro e a troca de tema

A página nasceu escura. O claro **não é uma inversão automática** — duas coisas
impedem:

- **Lima sobre branco dá 1,3:1.** Como FUNDO o lima é ótimo (texto escuro em
  cima dá 16,7:1); como TEXTO no claro ele some. Por isso existem dois tokens:
  `--lima` (fundo, não muda) e `--lima-tx` (texto — no claro vira a azeitona
  `#4C6900`).
- **Três elementos só fazem sentido escuros:** o MacBook (é um objeto físico),
  a banda de conversão (lima cheio com texto escuro) e o mostrador do resultado
  (é um display).

### O mecanismo: canais RGB em token

O problema real eram **167 cores cravadas** fora do `:root` — 76 delas em
`rgba()` com alfa próprio, que nenhuma troca de token alcançaria. A saída foi
tokenizar o **canal**, não a cor:

    --c-linha: 139,155,255;   /* usado como rgba(var(--c-linha), .16) */
    --c-luz: 255,255,255;     /* no claro vira 12,17,32 */
    --c-sombra: 4,6,18;

Com isso 76 declarações viraram tema-conscientes sem serem reescritas: o alfa
fica em cada uso e o tema troca só o canal. `--c-luz` é o caso bonito — no
escuro clareia o fundo escuro, no claro escurece o branco, com o mesmo alfa.

**O refactor foi verificado como neutro:** renderizei a página inteira antes e
depois e os dois JPEGs saíram **idênticos byte a byte**.

### Ilhas escuras, por herança

As três superfícies que continuam escuras reassumem o contexto inteiro do tema
escuro num único bloco:

    [data-tema="claro"] .fq-mac,
    [data-tema="claro"] .fq-band,
    [data-tema="claro"] .fq-res { --c-luz: 255,255,255; --tx-1: #EAEDF6; … }

Como custom property herda, **nada lá dentro precisa saber qual tema está
ativo** — inclusive os `rgba(var(--c-…))` já escritos.

### Três defeitos que a medição pegou

| Defeito | Correção |
| --- | --- |
| **Todos os CTAs com texto branco sobre lima** | `--btn-tx` era `var(--bg)`, que no claro vira branco. Criado `--tinta: #0C1120` — tinta para superfícies claras, que não inverte. Afetava 7 lugares |
| **Painel do resultado lavado** | O fundo era semitransparente, pensado para assentar sobre o azul. Sobre branco virava cinza. No claro a base ficou opaca |
| **5 pares de contraste abaixo de 4,5:1** | `--tx-3`, `--tx-4`, o violeta dos eyebrows e o placeholder cravado (`#98A1C2`, 2,4:1). Todos escurecidos |

**Contraste medido no pixel renderizado**, 16 alvos em cada tema: **zero falhas
nos dois**, mínimo 5,77:1 no claro e 6,03:1 no escuro.

**Nota de método:** o primeiro probe leu o fundo pelo CSS computado e deu 7
falhas — cinco eram falsas, porque ele tratava fundo semitransparente como
opaco. O segundo recortava a caixa inteira e dava 1,00:1 em rótulos pequenos
dentro de caixas com muito padding: media o preenchimento, não o texto. Só o
terceiro — recorte na caixa de conteúdo, a 2×, glifo mais escuro contra o pixel
mais claro — deu resposta confiável.

### O botão

Fica no header, à direita, antes do CTA (no mobile, ao lado do hambúrguer).
42×42px, acima do mínimo de alvo de toque.

- O **rótulo diz a ação**, não o estado: "Mudar para o tema claro".
- O **ícone mostra para onde o clique leva**, não onde se está.
- Ordem de decisão: escolha salva em `localStorage` > `prefers-color-scheme` >
  escuro. Um script no `<head>` aplica antes da primeira pintura, senão a
  página acende no tema errado e pisca.
- Sem escolha salva, a página **segue o sistema** se ele mudar durante a visita.
- `theme-color` acompanha, para a barra do navegador no mobile.
- Em modo privado o `localStorage` lança: está dentro de `try/catch` e a página
  fica no tema escuro em vez de quebrar.

## 9.0 Camada de motion

A pedido, motion em tudo que fazia sentido. Regra de orçamento: **cinco
animações infinitas** (marquee dos logos, os dois orbes do hero, os feixes de luz
e o spinner). Todo o resto é disparado por scroll, hover ou interação, para não
custar bateria no mobile — que é onde a LP mais converte. Tudo morre em
`prefers-reduced-motion: reduce`.

| Onde | Efeito |
| --- | --- |
| Topo da página | Barra de **progresso de leitura** com gradiente violeta→lima |
| Hero | Entrada em sequência (eyebrow → h1 → lead → CTAs → MacBook), 110ms entre cada |
| Hero | Dois orbes desfocados à deriva (14s e 18s, translate + scale) respirando em opacidade (9s e 11s) |
| Hero | **Três feixes de luz** varrem o hero na diagonal (16°), 22s / 31s / 38s com defasagem — dois violeta, um lima. No mobile fica só um, mais largo (60vw), por bateria |
| Hero | **O MacBook gira acompanhando o mouse** (±13° no eixo Y, ±4,5° no X) com inércia; reflexo corre no vidro; KPIs da tela contam ao entrar; parallax no scroll |
| Números | Contagem com `easeInOutQuint` ao entrar na viewport |
| Simulador | **O total conta entre valores** em vez de pular; polegar do slider cresce e brilha ao arrastar; chip dá um pulinho ao ser marcado |
| Comparação | As 18 células revelam em cascata |
| Requisitos | A linha da timeline se desenha e os pontos lima aparecem em sequência |
| Formulário | Passos deslizam na direção da navegação (frente/trás) |
| FAQ | Resposta entra com fade + deslocamento |
| Botões | Seta desliza no hover (→ nas bandas, ↓ no hero) |
| Cards | Pilares e depoimentos sobem no hover; slot de vídeo esquenta para lima |
| Fran | Entra com um respiro ao carregar |
| Seções | Reveal `fade-up` com stagger (55 alvos) |

### Os feixes de luz do hero

Antes eram só os dois orbes, animados a 12s/15s — **movimento existia, mas era
imperceptível**: 36px de deriva em 12s num orbe de 520px desfocado a 70px não se
lê como movimento. Foram substituídos por uma camada dedicada (`.fq-hero__luz`)
com três feixes que atravessam o hero.

Custo: os feixes animam **só `transform` e `opacity`**, então compõem na GPU sem
repintar nem reflow. `pointer-events: none` e `aria-hidden="true"` — não existem
para o teclado nem para o leitor de tela. O conteúdo do hero recebeu `z-index: 1`
para ficar acima da luz.

**Medido** (luminância 0–255, headless a 1440px, três frames congelados em
t = 0 s / 5 s / 11 s):

| | Resultado |
| --- | --- |
| Amplitude no topo do hero | 25 → 68 níveis (**43 de variação**) |
| Variação num mesmo ponto entre frames | até **25 níveis** — o feixe passando |
| Mobile (390px, um feixe) | 50 → 81 no pico, **+31 níveis** sobre a página sem feixe |

Sobre um fundo de luminância 25, ganhar 25–31 níveis é aproximadamente **dobrar o
brilho local** — é o limiar em que a luz deixa de ser textura e passa a ser
movimento percebido.

**Nota de método:** animação infinita não se fotografa. Toda captura precisa
pausar as animações com `animation-play-state: paused` e escolher o instante com
`animation-delay` negativo — e nunca com `--force-prefers-reduced-motion`, que
desliga a animação em vez de congelá-la. Foi por isso que os feixes pareciam
estáticos em todas as verificações anteriores.

### O MacBook do hero

Substituiu o card chapado que fazia as vezes de mockup. É alumínio e vidro
desenhados em CSS, sem imagem: tampa, bezel preto, notch, dobradiça, deck em
perspectiva 3D e sombra no chão. **Gira acompanhando o mouse**, com inércia —
persegue 12% da distância até o alvo por frame, para não colar no ponteiro.
Objeto que cola no cursor é o que faz esse efeito parecer barato.

Divisão de responsabilidades, para nada disputar o mesmo `transform`:

| Camada | Quem escreve | O quê |
| --- | --- | --- |
| `.fq-mac-palco` | CSS | perspectiva (2200px) e animação de entrada |
| `.fq-mac` | JS | `--rx` / `--ry` / `--dy` — giro e parallax, num só loop |
| `.fq-mac__vidro` | JS | `--gl` — o reflexo corre para o lado oposto ao giro |

O giro só existe onde faz sentido: `(hover: hover) and (pointer: fine)`. Em
toque não há cursor para seguir, e em `prefers-reduced-motion: reduce` fica
parado. Um `IntersectionObserver` desliga o loop quando o hero sai da tela.

**Três decisões que vieram de medição, não de gosto:**

| Decisão | Por quê |
| --- | --- |
| Perspectiva 2200px, não 1500px | Em 1500px o deck avança tanto para a câmera que fica **28% mais largo que a tampa** e o laptop lê como rampa. Em 2200px o alargamento cai para 7% — a proporção de uma foto de produto |
| `margin-bottom: -24.6%` no deck | `transform` não mexe em layout: a caixa do deck tem 30% da largura de altura mas **projeta só 5,4%**. Sem a margem negativa, o pé e a nota ficavam 123px abaixo do laptop, num vão vazio |
| Eixo X limitado a ±4,5° (contra ±13° no Y) | Cada grau em X abre o deck. Acima de ~5° o alumínio vira a coisa mais clara da tela e volta a parecer prateleira |

**A interface da tela escala por container query.** As medidas estão em `cqw`
sobre uma referência de 472px (`100cqw`), dentro de um `@supports
(container-type: size)` que deixa o bloco em px como fallback. Em px puro a
interface pedia 298px de altura numa tela de 204px no mobile e **as três
propostas ficavam cortadas** — e um breakpoint não resolveria, porque entre
1080 e 1440px a tela varia continuamente. Verificado em 13 larguras, de 320 a
1920px: nenhuma linha cortada, nenhum overflow horizontal, folga de 27 a 37px
entre o deck e a nota em qualquer estado do giro.

### Nota de método: onde o `requestAnimationFrame` não roda

Nem o Chrome headless com `--virtual-time-budget` nem o painel de preview do
app entregam frames: nos dois o documento conta como oculto, `rAF` dispara
**zero** vezes e o `IntersectionObserver` nunca chama. Isso torna as duas
superfícies inúteis para verificar qualquer coisa dirigida por `rAF` — o giro
do MacBook aparecia como "não girou" em ambas, e os contadores congelavam em
valores parciais que pareciam bug de produção.

A verificação real é por **CDP em tempo de relógio**: Chrome headless com
`--remote-debugging-port`, sem virtual time, dirigido por WebSocket
(`Input.dispatchMouseEvent` gera evento de mouse de verdade, não sintético).
Foi assim que o giro se confirmou: `rx +3,3° / ry +7,1°` com o cursor no canto
superior direito e `rx −4,4° / ry −12,6°` no inferior esquerdo.

### Uma classe de bug que apareceu três vezes

`requestAnimationFrame` fica **pausado** em documento oculto. Isso quebrou, em
sequência: a entrada do hero (ficava invisível), o total do simulador (congelava no
valor anterior) e os contadores (podiam parar num valor parcial). Nos três casos a
correção foi a mesma: **nunca depender de rAF para o estado correto**.

- Entrada do hero: `setTimeout` em vez de rAF, mais uma rede que remove
  `data-entra` após 4s — sem o atributo, a regra do escondido não casa mais.
- Contadores: o valor final é escrito **antes** de a contagem começar, e a
  contagem nem parte se `document.hidden` for verdadeiro. Um contador que
  congela mostra um número errado na tela — pior do que não animar.
- Total do simulador: o valor final é escrito **antes** de animar, e um timer em
  `dur + 400ms` reescreve o final caso a animação pare no meio. Só o valor final
  escrito não bastava: o primeiro frame do rAF sobrescreve com o valor inicial.
- Contadores: timer garante o valor final se a contagem travar parcial.

O princípio: **animação é enfeite em cima de um estado já correto**. Número
congelado num valor errado é erro de informação, não de animação.

---

## 9.1 Uma armadilha de CSS que vale conhecer

`[hidden]` é estilo de **user-agent**, e perde para qualquer `display` de autor.
Como `.fq-btn` é `display: inline-flex`, um botão com o atributo `hidden`
continuava aparecendo — foi o caso do “Continuar” no último passo e do “Voltar”
no primeiro. Os testes não pegaram porque checavam o **atributo**, não a
visibilidade renderizada.

Corrigido com uma regra global no `lp.css`:

```css
[hidden] { display: none !important; }
```

Vale para qualquer coisa que use `hidden` na página. Se o time de WordPress
recriar os componentes, essa regra precisa ir junto.

---

## 10. Verificação

Rodado em 1440px e 390px:

- Ordem das seções conferida no DOM (requisitos → comparação → simulador), âncoras
  todas resolvendo, menu marcando a seção certa; sem scroll horizontal em nenhuma largura
- Simulador: 6 categorias em lista plana, sliders, estimativa recalculando, breakdown
  no toggle e estado vazio
- Conta conferida: Consórcio R$ 400 mil × 3,00% = R$ 12.000 · Seguros R$ 12 mil
  × 20,00% = R$ 2.400 → **R$ 14.400**. E, na extração, a soma dos 12 percentuais
  originais deu R$ 627.500 sobre R$ 1 mi por linha, igual ao total oficial
- Formulário completo: erros inline por campo, máscaras, CPF com dígitos
  verificadores recusando `111.111.111-11` e aceitando válido, CEP real pela
  ViaCEP (`01310-100` → Avenida Paulista / São Paulo / SP), loading e sucesso
- Mobile: menu, header solidificando, barra fixa aparecendo depois do hero e
  recolhendo sobre o formulário, Fran acima da barra, comparação em blocos

**Não verificado por observação direta:** os listeners de `scroll` não disparam no
painel de preview deste ambiente (`visibilityState: hidden`, 0 eventos capturados
com o `scrollY` mudando). Disparando o evento à mão, header, barra e
`--barra-mobile-h` respondem corretamente — mas convém uma passada de olho rolando
a página num navegador de verdade.
