"""Extrai texto de PDF com fontes em subconjunto.

Os operadores trazem códigos de glifo (<0026> Tj), não caracteres: só o mapa
/ToUnicode de cada fonte diz o que cada código significa. Por isso é preciso
seguir qual fonte está ativa (/F4 Tf) e decodificar com o mapa dela.
"""
import re, zlib, sys, pathlib

def objetos(d):
    """num -> (dicionário bruto, stream descomprimido ou None)"""
    out = {}
    for m in re.finditer(rb'(\d+)\s+(\d+)\s+obj\b', d):
        num = int(m.group(1)); ini = m.end()
        fim = d.find(b'endobj', ini)
        corpo = d[ini:fim]
        st = None
        ms = re.search(rb'stream\r?\n', corpo)
        if ms:
            bruto = corpo[ms.end(): corpo.find(b'endstream', ms.end())]
            try: st = zlib.decompress(bruto)
            except Exception: st = bruto
        out[num] = (corpo, st)
    return out

def cmap(st):
    """lê um ToUnicode e devolve {codigo: texto}"""
    m = {}
    for bl in re.findall(rb'beginbfchar(.*?)endbfchar', st, re.S):
        for a, b in re.findall(rb'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', bl):
            m[int(a, 16)] = bytes.fromhex(b.decode()).decode('utf-16-be', 'replace')
    for bl in re.findall(rb'beginbfrange(.*?)endbfrange', st, re.S):
        for a, b, c in re.findall(rb'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', bl):
            ini, fim, dst = int(a, 16), int(b, 16), int(c, 16)
            for k in range(ini, fim + 1):
                m[k] = chr(dst + k - ini)
    return m

def extrai(caminho):
    d = pathlib.Path(caminho).read_bytes()
    objs = objetos(d)

    # fonte -> mapa, pelo /ToUnicode de cada objeto de fonte
    mapas = {}
    for num, (corpo, _) in objs.items():
        mt = re.search(rb'/ToUnicode\s+(\d+)\s+0\s+R', corpo)
        if not mt: continue
        alvo = objs.get(int(mt.group(1)))
        if alvo and alvo[1]: mapas[num] = cmap(alvo[1])

    # /Fx -> objeto de fonte, nas páginas
    nomes = {}
    for num, (corpo, _) in objs.items():
        for nome, ref in re.findall(rb'/(F\d+)\s+(\d+)\s+0\s+R', corpo):
            nomes[nome.decode()] = int(ref)

    paginas = []
    for num, (corpo, st) in sorted(objs.items()):
        if not st or (b'Tj' not in st and b'TJ' not in st): continue
        atual = {}
        x = y = 0.0
        tm = [1, 0, 0, 1, 0, 0]
        glifos = []   # (y, x, caractere)
        padrao = re.compile(
            rb'/(F\d+)\s+[\d.]+\s+Tf'
            rb'|<([0-9A-Fa-f]+)>\s*Tj'
            rb'|\[(.*?)\]\s*TJ'
            rb'|([-\d.]+)\s+([-\d.]+)\s+Td'
            rb'|([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+Tm', re.S)
        for m in padrao.finditer(st):
            if m.group(1):
                atual = mapas.get(nomes.get(m.group(1).decode(), -1), {})
            elif m.group(4) is not None:            # Td desloca
                x += float(m.group(4)); y += float(m.group(5))
            elif m.group(6) is not None:            # Tm reposiciona
                x = float(m.group(10)); y = float(m.group(11))
            else:
                hexes = [m.group(2)] if m.group(2) is not None else re.findall(rb'<([0-9A-Fa-f]+)>', m.group(3))
                for h in hexes:
                    t = h.decode()
                    for i in range(0, len(t), 4):
                        c = atual.get(int(t[i:i+4], 16), '')
                        if c.strip(): glifos.append((round(y, 1), x, c))
                        x += 6   # avanço aproximado, só para ordenar
        if not glifos: continue
        # agrupa por linha (mesma coordenada Y, com tolerância) e ordena por X
        linhas, atualY, buf = [], None, []
        for gy, gx, c in sorted(glifos, key=lambda g: (g[0], g[1])):
            if atualY is None or abs(gy - atualY) > 2:
                if buf: linhas.append(''.join(ch for _, ch in sorted(buf)))
                buf, atualY = [], gy
            buf.append((gx, c))
        if buf: linhas.append(''.join(ch for _, ch in sorted(buf)))
        paginas.append(linhas)
    return paginas

if __name__ == '__main__':
    for i, pg in enumerate(extrai(sys.argv[1]), 1):
        print(f"\n{'='*20} página {i} {'='*20}")
        print('\n'.join(l for l in pg if l.strip()))
