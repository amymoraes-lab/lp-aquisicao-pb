#!/usr/bin/env python3
"""Servidor local para revisão: sem cache e com paralelismo.

Dois problemas do `python -m http.server` que este resolve:

1. Ele não manda Cache-Control nem ETag. Nessa ausência o Chrome aplica cache
   heurístico e um recarregamento normal pode servir o CSS antigo do disco sem
   nem falar com o servidor — numa revisão em que o CSS muda a cada minuto, o
   revisor olha uma versão que já não existe.

2. Ele é single-threaded e HTTP/1.0. O navegador pede HTML, CSS, JS, fontes e
   logos em paralelo; numa fila única com a conexão fechando a cada resposta o
   carregamento trava no meio. ThreadingHTTPServer + HTTP/1.1 resolve.
"""
import http.server
import sys
from http.server import ThreadingHTTPServer


class SemCache(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"          # habilita keep-alive

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        linha = fmt % args
        if ".html" in linha or '"GET / ' in linha:   # só as páginas, sem o ruído dos assets
            sys.stderr.write(linha + "\n")


porta = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
ThreadingHTTPServer.allow_reuse_address = True
with ThreadingHTTPServer(("127.0.0.1", porta), SemCache) as s:
    print(f"servindo em http://localhost:{porta}/  (sem cache, multithread)")
    s.serve_forever()
