# Subir a landing no Google Apps Script

Gerado por `tools/build-appsscript.py`. **Não edite os arquivos daqui** — o
build limpa a pasta a cada execução. Edite `index.html`,
`assets/css/lp.css` e `assets/js/lp.js` na raiz e rode o build de novo.

## Por que existe um build

O Apps Script **não serve arquivo estático**. Não há como publicar
`assets/css/lp.css`, `logos/itau.webp` ou uma fonte `.woff2` com URL própria: o
projeto só aceita arquivos `.gs` e `.html`, e o `HtmlService` devolve HTML.

| Recurso | Como fica |
| --- | --- |
| CSS e JS | embutidos, via `<?!= incluir('estilo') ?>` e `<?!= incluir('script') ?>` |
| 17 imagens (13 logos, avatar, 3 capas) | `data:` URI dentro do HTML e do JS |
| Playfair Display | passa a vir do **Google Fonts** (era local) — poupa 38 KB e ganha cache de CDN |
| DM Sans e JetBrains Mono | já vinham do Google Fonts, sem mudança |
| Envio do formulário | deixa de ser `fetch` e passa a `google.script.run` → grava numa planilha |

## As 8 coordenadas

1. **Crie a planilha** que vai receber os cadastros. Copie o ID da URL:
   `docs.google.com/spreadsheets/d/`**`ESTE_PEDAÇO`**`/edit`.
   Não precisa criar aba nem cabeçalho — o script cria na primeira gravação.

2. **Crie o projeto**: <https://script.new>. Renomeie para algo como
   `LP Personal Banker`.

3. **Cole os arquivos.** No editor, `+` ao lado de *Arquivos*:

   | Arquivo aqui | No Apps Script | Tipo |
   | --- | --- | --- |
   | `Codigo.gs` | `Codigo` | Script |
   | `pagina.html` | `pagina` | HTML |
   | `estilo.html` | `estilo` | HTML |
   | `script.html` | `script` | HTML |

   Os nomes têm de ser **exatamente** esses: `Codigo.gs` chama
   `createTemplateFromFile('pagina')` e `incluir('estilo')` / `incluir('script')`.

4. **Aponte a planilha**: ⚙️ *Configurações do projeto* → *Propriedades do
   script* → *Adicionar propriedade* → nome `PLANILHA_ID`, valor o ID do passo 1.

5. **Manifesto** (opcional, mas evita cliques): em *Configurações do projeto*,
   marque *Mostrar arquivo de manifesto `appsscript.json`*, abra o arquivo e
   cole o conteúdo de `appsscript.json` daqui.

6. **Implante**: *Implantar* → *Nova implantação* → tipo **App da Web**.
   - *Executar como*: **Eu** (o script grava na planilha com a sua permissão)
   - *Quem pode acessar*: **Qualquer pessoa** — sem isso o visitante precisa de
     conta Google e a landing não capta ninguém.

7. **Autorize.** Na primeira implantação o Google pede permissão de planilhas e
   mostra o aviso "app não verificado" — é para você, o dono, não para o
   visitante. *Avançado* → *Acessar (não seguro)*.

8. **Teste o endereço** `.../exec` (não o `/dev`, que exige login): preencha o
   formulário até o fim e confira se a linha apareceu na planilha.

## Links de campanha mudaram de `#` para `?`

A página é servida dentro de um iframe de sandbox, e **o que vem depois do `#`
fica na URL do pai — nunca chega ao iframe.** Os links com `#sim=` parariam de
funcionar em silêncio, sem erro visível.

O `doGet(e)` agora lê a query e injeta em `<meta name="fq-params">`, de onde o
JS da página lê. Então os links do Marketing passam a ser:

    .../exec?sim=consorcio.4_seguros.2&utm_source=linkedin&utm_campaign=pb_set26

Testado: esse link marca Consórcio e Seguros, põe os volumes em R$ 1,5 mi e
R$ 12 mil e mostra R$ 47.400. Os `utm_*` vão para a coluna **origem** da
planilha — `document.referrer` não serve aqui, porque dentro do iframe ele é o
wrapper do Google, não a origem real.

## Colar à mão ou usar clasp

`script.html` tem ~295 KB. O editor do navegador aceita, mas colar é lento e
fácil de errar. Se preferir linha de comando:

    npm i -g @google/clasp
    clasp login
    cd build/appsscript          # o clasp roda DENTRO da pasta gerada
    clasp create --type webapp --title "LP Personal Banker"
    clasp push
    clasp deploy

A partir daí, cada alteração na página é:

    python3 tools/build-appsscript.py && (cd build/appsscript && clasp push)

O build preserva o `.clasp.json`, então o projeto continua sendo o mesmo e a
URL já divulgada não muda. Depois do `push`, publique com *Implantar* →
*Gerenciar implantações* → editar → *Nova versão*.

## O que muda em relação ao localhost

| | Consequência |
| --- | --- |
| **A página roda dentro de um iframe** | O Apps Script serve num sandbox em `script.googleusercontent.com`. Header fixo, âncoras e scroll funcionam; o `<base target="_top">` já está no HTML para links não abrirem dentro do iframe |
| **URL** | `script.google.com/macros/s/…/exec`. Não aceita domínio próprio. Para usar `franq.com.br/seja-pb`, o caminho é embutir esta URL num iframe na página do site (o `XFrameOptionsMode.ALLOWALL` já permite) |
| **Cold start** | A primeira visita depois de um tempo parado leva ~1-3s a mais |
| **Peso** | ~530 KB de HTML num único response, porque as imagens vão embutidas. O texto comprime bem; o base64 das imagens, quase nada |
| **Sem cache** | O `HtmlService` não deixa o navegador cachear a página, então cada visita rebaixa os 530 KB inteiros |
| **Cotas** | O plano gratuito dá 20.000 execuções/dia e 6 min por execução. Para uma landing, folgado |
| **ViaCEP** | Continua funcionando: o `fetch` sai do navegador do visitante, não do servidor do Apps Script, e a ViaCEP manda `Access-Control-Allow-Origin: *` |
| **`addMetaTag('viewport')` no `doGet`** | Não é redundante com a meta do HTML: a do HTML vale só para o iframe, e é a do `doGet` que o celular enxerga. Sem ela o mobile renderiza em largura de desktop |

## Se o peso incomodar

O grosso são as 3 capas dos depoimentos (~250 KB de base64). Quando os vídeos
chegarem, elas saem. Antes disso, a alternativa é hospedar as imagens fora
(CDN da Franq, Cloud Storage) e trocar os `data:` URI por URL.

## Antes de publicar

Há uma pendência de conteúdo: **as capas 2 e 3 mostram Rogério Rojo e Erica
Vieira, mas os depoimentos creditam Jeferson Cantanhede e Douglas Biscaia.**
Ver a seção 8.1 do `HANDOFF-v2.md`.
