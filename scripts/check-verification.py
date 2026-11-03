#!/usr/bin/env python3
"""Confere uma release do Calcula Dinheiro sem seguir redirects ou carregar anúncios."""

import datetime as dt
import http.client
import json
import math
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser


FINAL_ORIGIN = "https://calculadinheiro.com.br"
FINAL_HOST = "calculadinheiro.com.br"
PUBLISHER = "ca-pub-4178012487609221"
CONTACT = "contato@tickerlab.com.br"
REVISED = "2026-10-25"
ADS_TEXT = "google.com, pub-4178012487609221, DIRECT, f08c47fec0942fa0\n"
# O modo vem da própria release: "verificacao" (anúncios desligados) ou "ativo" (depois do "Pronto" do AdSense).
MODE = json.loads((pathlib.Path(__file__).resolve().parents[1] / "config/publicacao.json").read_text())["adsense"]["modo"]
EXPECTED_PATHS = {
    "/", "/juros-compostos", "/porcentagem", "/a-vista-ou-parcelado", "/financiamento",
    "/emprestimo", "/quanto-rende", "/quanto-guardar-por-mes", "/salario-liquido", "/decimo-terceiro", "/rescisao", "/ferias", "/cartao-rotativo", "/correcao-ipca", "/conversor-de-moedas",
    "/sobre", "/metodologia", "/privacidade", "/termos", "/contato",
}
MAX_BODY = 16 * 1024 * 1024
TIMEOUT = 12


class CheckError(Exception):
    pass


def require(condition, reason):
    if not condition:
        raise CheckError(reason)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Response:
    def __init__(self, status, headers, body, path):
        self.status = status
        self.headers = headers
        self.body = body
        self.path = path
        self.media_type = headers.get("Content-Type", "").split(";", 1)[0].strip().lower()

    def text(self):
        try:
            return self.body.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise CheckError(self.path + ": resposta não é UTF-8 válido") from None


class Client:
    def __init__(self, origin):
        try:
            parsed = urllib.parse.urlsplit(origin)
            port = parsed.port
        except ValueError:
            raise CheckError("ORIGIN inválida") from None
        require(
            parsed.scheme in ("http", "https") and parsed.hostname
            and parsed.username is None and parsed.password is None
            and parsed.path in ("", "/") and not parsed.query and not parsed.fragment,
            "ORIGIN deve ser http(s)://host[:porta], sem caminho, credenciais ou parâmetros",
        )
        require(port is None or 1 <= port <= 65535, "Porta inválida em ORIGIN")
        self.origin = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))
        self.netloc = parsed.netloc.lower()
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    def get(self, path, host=FINAL_HOST):
        require(path.startswith("/") and not path.startswith("//"), "Caminho HTTP inválido")
        request = urllib.request.Request(
            self.origin + path,
            headers={
                "Host": host,
                "User-Agent": "CalculaDinheiro-ReleaseCheck/1.0",
                "Accept-Encoding": "identity",
                "Connection": "close",
            },
        )
        try:
            try:
                response = self.opener.open(request, timeout=TIMEOUT)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                body = response.read(MAX_BODY + 1)
                require(len(body) <= MAX_BODY, path + ": resposta maior que o limite de leitura")
                return Response(response.code, response.headers, body, path)
        except CheckError:
            raise
        except (urllib.error.URLError, TimeoutError, OSError, http.client.HTTPException) as error:
            reason = str(getattr(error, "reason", error)).replace("\n", " ")[:180]
            raise CheckError(path + ": falha HTTP/rede: " + reason) from None

    def local_asset(self, value, page_path):
        try:
            parsed = urllib.parse.urlsplit(urllib.parse.urljoin(FINAL_ORIGIN + page_path, value))
        except ValueError:
            return None
        if parsed.scheme not in ("http", "https"):
            return None
        if parsed.username or parsed.password:
            return None
        if parsed.netloc.lower() not in (FINAL_HOST, self.netloc):
            return None
        path = parsed.path or "/"
        if not path.startswith("/") or path.startswith("//"):
            return None
        return path + (("?" + parsed.query) if parsed.query else "")


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.meta = []
        self.canonicals = []
        self.links = []
        self.css = []
        self.js = []
        self.script_sources = []
        self.ad_slots = 0
        self.visible = []
        self.hidden = []
        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        previously_hidden = bool(self.hidden)
        if tag in ("script", "style", "template"):
            self.hidden.append(tag)
        if previously_hidden:
            return
        if tag == "meta" and (attrs.get("name") or "").lower() == "google-adsense-account":
            self.meta.append(attrs.get("content", ""))
        if tag == "link":
            rel = (attrs.get("rel") or "").lower().split()
            href = attrs.get("href") or ""
            if "canonical" in rel:
                self.canonicals.append(href)
            if "stylesheet" in rel and href:
                self.css.append(href)
            if href and ("modulepreload" in rel or ("preload" in rel and attrs.get("as") == "script")):
                self.js.append(href)
        if tag == "a":
            self.links.append(attrs.get("href") or "")
        if tag == "script" and attrs.get("src"):
            self.script_sources.append(attrs["src"])
            self.js.append(attrs["src"])
        if tag == "ins" and "adsbygoogle" in (attrs.get("class") or "").split():
            self.ad_slots += 1

    def handle_endtag(self, tag):
        if tag in self.hidden:
            index = len(self.hidden) - 1 - self.hidden[::-1].index(tag)
            del self.hidden[index:]

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_data(self, data):
        if not self.hidden:
            self.visible.append(data)

    @property
    def visible_text(self):
        return " ".join(" ".join(self.visible).split())


def response_ok(response, accepted_types):
    require(response.status == 200, response.path + ": HTTP " + str(response.status) + ", esperado 200")
    require(response.media_type in accepted_types,
            response.path + ": Content-Type inesperado: " + (response.media_type or "ausente"))
    require(bool(response.body.strip()), response.path + ": corpo vazio")


def read_page(client, path):
    response = client.get(path)
    response_ok(response, ("text/html", "application/xhtml+xml"))
    page = Page(response.text())
    require(page.meta and all(value == PUBLISHER for value in page.meta),
            path + ": meta google-adsense-account ausente ou incorreta")
    expected_canonicals = {FINAL_ORIGIN + path}
    if path == "/":
        expected_canonicals.add(FINAL_ORIGIN)
    require(page.canonicals, path + ": canonical ausente")
    require(all(value in expected_canonicals for value in page.canonicals),
            path + ": canonical incorreto; esperado "
            + json.dumps(sorted(expected_canonicals), ensure_ascii=True)
            + "; recebido " + json.dumps(page.canonicals, ensure_ascii=True))
    for source in page.script_sources:
        lowered = source.lower()
        require("adsbygoogle" not in lowered and "fundingchoices" not in lowered,
                path + ": script de publicidade/CMP no HTML do servidor (deve carregar só no navegador)")
    require(page.ad_slots == 0, path + ": bloco ins.adsbygoogle no HTML do servidor (deve entrar só no navegador)")
    return page


def ready(client):
    reason = "servidor não respondeu"
    for attempt in range(6):
        try:
            response = client.get("/robots.txt")
            if response.status == 200:
                return response
            reason = "HTTP " + str(response.status)
        except CheckError as error:
            reason = str(error)
        if attempt < 5:
            time.sleep(2)
    raise CheckError("servidor indisponível após 6 tentativas: " + reason)


def check_sitemap(response):
    response_ok(response, ("application/xml", "text/xml"))
    try:
        root = ET.fromstring(response.body)
    except ET.ParseError:
        raise CheckError("/sitemap.xml: XML inválido") from None
    namespace = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    require(root.tag == namespace + "urlset", "/sitemap.xml: raiz/namespace inválido")
    entries = root.findall(namespace + "url")
    locations = [node.findtext(namespace + "loc", "") for node in entries]
    expected = {FINAL_ORIGIN + path for path in EXPECTED_PATHS}
    require(len(entries) == 20 and len(set(locations)) == 20 and set(locations) == expected,
            "/sitemap.xml: esperadas as 20 URLs únicas do domínio final, incluindo Contato")
    expected_lastmod = expected_lastmods()
    for node in entries:
        path = urllib.parse.urlparse(node.findtext(namespace + "loc", "")).path
        lastmod = node.findtext(namespace + "lastmod", "")
        require(lastmod == expected_lastmod[path],
                "/sitemap.xml: lastmod de %s é %s; esperado %s" % (path, lastmod, expected_lastmod[path]))


def expected_lastmods():
    """Data esperada no <lastmod> de cada URL: a revisão da própria calculadora (revisadoEm em lib/conteudo.ts,
    lido do pacote desta release) e, nas outras páginas, a data do site."""
    lastmods = {path: REVISED for path in EXPECTED_PATHS}
    content = pathlib.Path(__file__).resolve().parent.parent / "lib" / "conteudo.ts"
    if content.is_file():
        for slug, revised in re.findall(r"'([a-z0-9-]+)':\{revisadoEm:'(\d{4}-\d{2}-\d{2})'", content.read_text(encoding="utf-8")):
            require("/" + slug in lastmods, "lib/conteudo.ts: calculadora %s fora das 20 URLs esperadas" % slug)
            require(valid_date(revised) and revised <= dt.date.today().isoformat(),
                    "lib/conteudo.ts: revisadoEm de %s inválido ou no futuro (%s)" % (slug, revised))
            lastmods["/" + slug] = revised
    return lastmods


def number(value):
    try:
        return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
    except OverflowError:
        return False


def valid_month(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}", value):
        return False
    try:
        dt.date.fromisoformat(value + "-01")
        return True
    except ValueError:
        return False


def valid_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return False
    try:
        dt.date.fromisoformat(value)
        return True
    except ValueError:
        return False


def check_api(response):
    response_ok(response, ("application/json",))
    try:
        data = json.loads(response.text())
    except (ValueError, TypeError):
        raise CheckError("/api/dados: JSON inválido") from None
    require(isinstance(data, dict), "/api/dados: objeto JSON esperado")
    generated = data.get("gerado_em")
    require(isinstance(generated, str) and bool(generated), "/api/dados: gerado_em ausente")
    try:
        dt.datetime.fromisoformat(generated.replace("Z", "+00:00"))
    except ValueError:
        raise CheckError("/api/dados: gerado_em não é uma data ISO válida") from None
    ipca = data.get("ipca")
    require(isinstance(ipca, dict), "/api/dados: objeto ipca ausente")
    months = ipca.get("meses")
    require(isinstance(months, list) and bool(months), "/api/dados: série IPCA vazia ou inválida")
    require(all(isinstance(item, list) and len(item) == 2 and valid_month(item[0])
                and number(item[1]) and item[1] > -1 for item in months),
            "/api/dados: mês ou valor de IPCA inválido")
    dates = [item[0] for item in months]
    require(dates == sorted(dates) and ipca.get("ultimo") == dates[-1],
            "/api/dados: ordem da série ou último mês inconsistente")
    currencies = data.get("moedas")
    require(isinstance(currencies, list) and len(currencies) == 2
            and all(isinstance(item, dict) for item in currencies),
            "/api/dados: esperadas duas moedas")
    require({item.get("codigo") for item in currencies} == {"USD", "EUR"},
            "/api/dados: moedas USD/EUR ausentes ou duplicadas")
    require(all(number(item.get("venda")) and item["venda"] > 0
                and valid_date(item.get("data")) for item in currencies),
            "/api/dados: cotação ou data inválida")


def check_asset(client, candidates, accepted_types, description):
    for page_path, url in candidates:
        path = client.local_asset(url, page_path)
        if path:
            response = client.get(path)
            response_ok(response, accepted_types)
            beginning = response.body.lstrip(b"\xef\xbb\xbf \r\n\t").lower()
            require(not beginning.startswith((b"<!doctype html", b"<html")),
                    description + ": URL de asset devolveu HTML")
            return
    raise CheckError("HTML não contém URL local de " + description)


def run(client):
    robots = ready(client)
    print("OK: servidor pronto.", flush=True)
    homepage = read_page(client, "/")
    calculator = read_page(client, "/juros-compostos")
    print("OK: inicial/calculadora, meta e canonical; sem anúncios no HTML.", flush=True)

    ads = client.get("/ads.txt")
    response_ok(ads, ("text/plain",))
    require(ads.body == ADS_TEXT.encode("utf-8"), "/ads.txt: linha do editor diferente da esperada")
    print("OK: ads.txt do editor correto.", flush=True)

    contact = read_page(client, "/contato")
    privacy = read_page(client, "/privacidade")
    require("mailto:" + CONTACT in contact.links, "/contato: link de e-mail ausente ou incorreto")
    require(any(client.local_asset(link, "/") == "/contato" for link in homepage.links),
            "Inicial: link para Contato ausente")
    require(CONTACT in privacy.visible_text and "mailto:" + CONTACT in privacy.links,
            "/privacidade: contato ausente ou incorreto")
    expected_ads_text = "Os anúncios estão desligados." if MODE == "verificacao" else "Exibimos anúncios do Google AdSense"
    require(expected_ads_text in privacy.visible_text,
            "/privacidade: texto de publicidade do modo " + MODE + " ausente")
    old_notices = ("O canal público de contato ainda não está disponível",
                   "O canal público de atendimento está sendo configurado")
    require(not any(notice in privacy.visible_text for notice in old_notices),
            "/privacidade: aviso antigo de contato indisponível")
    print("OK: Contato, rodapé e Privacidade.", flush=True)

    check_sitemap(client.get("/sitemap.xml"))
    response_ok(robots, ("text/plain",))
    lines = {line.strip() for line in robots.text().splitlines()}
    require("Allow: /" in lines and "Disallow: /" not in lines
            and "Sitemap: " + FINAL_ORIGIN + "/sitemap.xml" in lines,
            "/robots.txt: regras do domínio final incorretas")
    local_robots = client.get("/robots.txt", host="localhost")
    response_ok(local_robots, ("text/plain",))
    local_lines = {line.strip() for line in local_robots.text().splitlines()}
    require("Disallow: /" in local_lines and "Allow: /" not in local_lines,
            "/robots.txt: Host localhost deveria bloquear indexação")
    redirect_path = "/juros-compostos?verificacao=1&origem=teste"
    redirect = client.get(redirect_path, host="www." + FINAL_HOST)
    require(redirect.status == 308 and redirect.headers.get("Location") == FINAL_ORIGIN + redirect_path,
            "www: esperado 308 para raiz preservando caminho e parâmetros")
    print("OK: sitemap com 20 URLs, robots por Host e redirect www.", flush=True)

    favicon = client.get("/favicon.svg")
    response_ok(favicon, ("image/svg+xml",))
    try:
        svg = ET.fromstring(favicon.body)
    except ET.ParseError:
        raise CheckError("/favicon.svg: SVG/XML inválido") from None
    require(svg.tag.rsplit("}", 1)[-1] == "svg", "/favicon.svg: elemento SVG ausente")
    pages = [("/", homepage), ("/juros-compostos", calculator)]
    css = [(path, url) for path, page in pages for url in page.css]
    js = [(path, url) for path, page in pages for url in page.js]
    check_asset(client, css, ("text/css",), "CSS")
    check_asset(client, js, ("text/javascript", "application/javascript", "application/x-javascript",
                             "text/ecmascript", "application/ecmascript"), "JavaScript")
    print("OK: favicon, CSS e JavaScript do artefato standalone.", flush=True)

    check_api(client.get("/api/dados"))
    print("OK: API de índices/moedas com estrutura e datas válidas.", flush=True)
    print("APROVADO: verificações HTTP da release em modo verificacao concluídas.", flush=True)


def main():
    if len(sys.argv) != 2:
        print("Uso: python3 check-verification.py ORIGIN", file=sys.stderr)
        return 1
    try:
        run(Client(sys.argv[1]))
        return 0
    except CheckError as error:
        print("FALHA: " + str(error), file=sys.stderr, flush=True)
        return 1
    except (ValueError, TypeError, KeyError, ET.ParseError) as error:
        print("FALHA: resposta inesperada (" + type(error).__name__ + ").", file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
