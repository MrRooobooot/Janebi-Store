import urllib.request, re, html, gzip, io

A = "A000000000000000000000000000l7732en2"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"


def fetch(url, referer=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "fa-IR,fa;q=0.9"})
    if referer:
        req.add_header("Referer", referer)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            if r.headers.get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
            return r.status, raw.decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        raw = e.read()
        if e.headers.get("Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
        return e.code, raw.decode("utf-8", "replace")
    except Exception as e:
        return -1, f"ERR {e}"


def digest(label, url, referer=None):
    code, body = fetch(url, referer)
    msg = re.findall(r'<p class="message">(.*?)</p>', body, re.S)
    msg = html.unescape(re.sub(r"\s+", " ", msg[0]).strip()) if msg else "-"
    amounts = re.findall(r'name="?Amount"?[^>]*value="?([0-9,]+)', body)
    print(f"{label:28s} http={code} bytes={len(body)} message={msg!r} amount_field={amounts}")
    print(f"{'':28s} markers: bank_error={body.count('pg-bank-error')} form={body.count('<form')} زرین‌پال_errtitle={body.count('دسترسی از این دامنه')}")


for host in ("www.zarinpal.com", "payment.zarinpal.com"):
    u = f"https://{host}/pg/StartPay/{A}"
    digest(f"{host} noreferer", u)
    digest(f"{host} ref=janebiarena", u, "https://janebiarena.ir/")
    digest(f"{host} ref=evil.example", u, "https://evil.example/")
