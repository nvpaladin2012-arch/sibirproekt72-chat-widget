import json
import math
import os
import re
import threading
import urllib.request
import urllib.error
from collections import Counter
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "knowledge_base.json"
WIDGET_DIR = BASE_DIR / "widget"

SYSTEM_PROMPT = """Ты — виртуальный консультант компании «Сибирь Проект» (сопровождение участников госзаказа и коммерческих закупок: 44-ФЗ, 223-ФЗ, 615-ПП). Твоя задача — круглосуточно помогать пользователям: быстро и точно отвечать на вопросы, предоставлять актуальную информацию об услугах компании и помогать с навигацией по сайту, условиям, ценам-ориентирам, срокам и контактам.

## Роль и зона ответственности
- Помогай разобраться в услугах компании: независимые (банковские) гарантии, тендерное сопровождение, кредитование исполнения контракта (КИК), факторинг, электронная подпись (ЭЦП), защита интересов в ФАС.
- Помогай подобрать релевантную услугу/раздел по сути запроса (например, обеспечение заявки/контракта, финансирование исполнения, обжалование в ФАС, получение ЭЦП).
- Объясняй публичные условия, этапы работы, ориентиры сроков и стоимости, а также какие документы обычно требуются — только если это указано в базе знаний/контексте.
- Давай прямые ссылки на нужные разделы сайта, если они есть в контексте.
- Не выдавай себя за юриста, сотрудника банка, ФАС, заказчика или государственного органа. Не принимай решений от имени компании и не подтверждай индивидуальные условия сделки.

## Тон общения
- Дружелюбный, профессиональный, спокойный и уважительный.
- Пиши ясно и по делу: короткие абзацы, списки при перечислениях.
- Если термин необходим (НМЦК, РНП, обеспечение и т.п.), поясни его кратко.
- Если запрос неясен — задай 1–2 уточняющих вопроса по сути задачи, не затрагивая личные данные.

## Безопасность и приватность (критически важно)
- Категорически запрещено запрашивать, собирать, подтверждать, сохранять или использовать персональные данные: ФИО, телефоны, email, адреса, паспортные/платежные/банковские данные, аккаунты и ссылки на соцсети, реквизиты, сканы/фото документов, идентифицирующие номера.
- Не проси оставить контакт, прислать документы в чат или заполнить заявку.
- Если пользователь сам сообщает личные данные, вежливо попроси не оставлять такую информацию в чате. Не повторяй и не пересказывай эти данные. Продолжай помогать анонимно.
- Если для решения требуется передача документов или персональная проверка, объясни ограничение и направь в официальные каналы компании.

## Работа с информацией
- Отвечай только на основе предоставленного контекста базы знаний. Не придумывай факты, цены, сроки, условия, гарантии одобрения/результата.
- Если указаны ориентиры, обозначай их как ориентиры и при необходимости направляй за точным расчетом/подтверждением в калькулятор или по контактам компании.
- Если в контексте нет точного ответа, честно скажи об этом.

## Если ответа нет или данных недостаточно
1. Сообщи, что в доступной информации нет точного ответа.
2. Не угадывай.
3. Предложи ближайший релевантный раздел/ссылку из контекста, если есть.
4. Дай прямые контакты компании:
   - Телефон (руководитель): 8 (922) 477-05-34
   - Телефон (работа с клиентами): +7 (982) 972-98-68
   - Email: sibir-proekt72@mail.ru, sibir-proekt72@yandex.ru
   - Адрес: г. Тюмень, ул. Республики, д. 143, офис 602/1
   - График: Пн–Пт 09:00–18:00 (МСК+2), Сб–Вс — выходные дни
   - Сайт: https://sibirproekt72.ru/
5. Спроси, могу ли помочь найти другую информацию по услугам, срокам, ориентирам стоимости или навигации по сайту.
"""

STOPWORDS = {
    "и", "в", "во", "на", "по", "с", "со", "к", "ко", "у", "о", "об", "от", "до", "за", "из", "для",
    "как", "что", "это", "или", "а", "но", "ли", "же", "бы", "если", "то", "при", "не", "ни", "мы",
    "вы", "он", "она", "они", "я", "мне", "меня", "вам", "вас", "нас", "их", "его", "ее", "её",
    "под", "над", "без", "про", "так", "же", "там", "тут", "где", "когда", "чем", "какой", "какая",
    "какие", "нужно", "можно", "есть", "будет", "быть", "по", "либо", "также"
}

WORD_RE = re.compile(r"[a-zA-Zа-яА-ЯёЁ0-9]{2,}")


def tokenize(text):
    words = [w.lower().replace("ё", "е") for w in WORD_RE.findall(text or "")]
    return [w for w in words if w not in STOPWORDS]


class KnowledgeBase:
    def __init__(self, path):
        with open(path, "r", encoding="utf-8") as f:
            self.items = json.load(f)
        self.doc_tokens = []
        self.doc_tf = []
        self.df = Counter()
        for item in self.items:
            blob = " ".join([
                item.get("title", ""),
                item.get("section", ""),
                " ".join(item.get("tags", [])),
                item.get("content", ""),
            ])
            tokens = tokenize(blob)
            self.doc_tokens.append(tokens)
            tf = Counter(tokens)
            self.doc_tf.append(tf)
            for t in set(tokens):
                self.df[t] += 1
        self.n_docs = max(len(self.items), 1)
        self.avgdl = (sum(len(t) for t in self.doc_tokens) / self.n_docs) if self.n_docs else 0

    def search(self, query, top_k=5):
        q_tokens = tokenize(query)
        if not q_tokens:
            return []
        q_set = set(q_tokens)
        scores = []
        k1 = 1.5
        b = 0.75
        for i, item in enumerate(self.items):
            tf = self.doc_tf[i]
            dl = len(self.doc_tokens[i]) or 1
            score = 0.0
            for term in q_set:
                if term not in tf:
                    continue
                df = self.df.get(term, 0)
                idf = math.log(1 + (self.n_docs - df + 0.5) / (df + 0.5))
                freq = tf[term]
                denom = freq + k1 * (1 - b + b * dl / (self.avgdl or 1))
                score += idf * (freq * (k1 + 1)) / denom
            title_l = (item.get("title", "") or "").lower()
            tags_l = " ".join(item.get("tags", [])).lower()
            for term in q_set:
                if term in title_l:
                    score += 1.2
                if term in tags_l:
                    score += 0.8
            if score > 0:
                scores.append((score, i))
        scores.sort(reverse=True)
        results = []
        for score, i in scores[:top_k]:
            item = dict(self.items[i])
            item["_score"] = score
            results.append(item)
        return results


KB = KnowledgeBase(DATA_PATH) if DATA_PATH.exists() else None
KB_LOCK = threading.Lock()


def build_context(results):
    parts = []
    for idx, item in enumerate(results, 1):
        parts.append(
            f"[Источник {idx}]\n"
            f"Название: {item.get('title','')}\n"
            f"Раздел: {item.get('section','')}\n"
            f"URL: {item.get('url','')}\n"
            f"Содержание: {item.get('content','')}"
        )
    return "\n\n".join(parts)


def fallback_answer(query, results):
    if not results:
        return (
            "В доступной информации нет точного ответа на этот вопрос.\n\n"
            "Вы можете уточнить детали по контактам компании:\n"
            "- Телефон (руководитель): 8 (922) 477-05-34\n"
            "- Телефон (работа с клиентами): +7 (982) 972-98-68\n"
            "- Email: sibir-proekt72@mail.ru, sibir-proekt72@yandex.ru\n"
            "- График: Пн–Пт 09:00–18:00 (МСК+2), Сб–Вс — выходные дни\n"
            "- Сайт: https://sibirproekt72.ru/\n\n"
            "Могу помочь найти другую информацию по услугам, срокам, ориентирам стоимости или навигации по сайту."
        )
    top = results[0]
    lines = [
        "По доступной информации по вашему запросу:",
        "",
        top.get("content", "").strip(),
    ]
    if len(results) > 1:
        lines.append("")
        lines.append("Полезные разделы:")
        for item in results[1:4]:
            title = item.get("title", "Раздел")
            url = item.get("url", "")
            if url:
                lines.append(f"- {title}: {url}")
            else:
                lines.append(f"- {title}")
    lines.append("")
    lines.append("Если нужен точный расчет или индивидуальная консультация, можно обратиться по контактам компании: 8 (922) 477-05-34, +7 (982) 972-98-68, sibir-proekt72@mail.ru (Пн–Пт 09:00–18:00, МСК+2). Пожалуйста, не передавайте личные данные в чате.")
    return "\n".join(lines)


def call_llm(messages):
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY")
    if not api_key:
        return None, "no_api_key"
    base_url = (os.getenv("OPENAI_BASE_URL") or os.getenv("LLM_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL") or os.getenv("LLM_MODEL") or "gpt-4o-mini"
    url = base_url + "/chat/completions"
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        content = body["choices"][0]["message"]["content"]
        return content.strip(), None
    except Exception as e:
        return None, str(e)


class Handler(BaseHTTPRequestHandler):
    server_version = "SibirProektChat/1.0"

    def _send(self, status, body, content_type="application/json; charset=utf-8", extra_headers=None):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False).encode("utf-8")
        elif isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, b"")

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path in ("/", "/index.html"):
            p = BASE_DIR / "index.html"
            if p.exists():
                self._send(200, p.read_bytes(), "text/html; charset=utf-8")
            else:
                self._send(404, {"error": "index.html not found"})
            return
        if path.startswith("/widget/"):
            rel = path[len("/widget/"):]
            p = (WIDGET_DIR / rel).resolve()
            if WIDGET_DIR.resolve() in p.parents or p == WIDGET_DIR.resolve():
                if p.exists() and p.is_file():
                    ctype = "text/plain; charset=utf-8"
                    if p.suffix == ".js":
                        ctype = "application/javascript; charset=utf-8"
                    elif p.suffix == ".css":
                        ctype = "text/css; charset=utf-8"
                    elif p.suffix == ".html":
                        ctype = "text/html; charset=utf-utf-8"
                    self._send(200, p.read_bytes(), ctype)
                    return
            self._send(404, {"error": "not found"})
            return
        if path == "/api/health":
            self._send(200, {"status": "ok", "kb_loaded": KB is not None, "llm_configured": bool(os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY"))})
            return
        self._send(404, {"error": "not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/chat":
            self._send(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length > 0 else b"{}"
            data = json.loads(raw.decode("utf-8"))
        except Exception:
            self._send(400, {"error": "invalid json"})
            return

        message = (data.get("message") or "").strip()
        history = data.get("history") or []
        if not message:
            self._send(400, {"error": "message is required"})
            return
        if KB is None:
            self._send(500, {"error": "knowledge base not loaded"})
            return

        with KB_LOCK:
            results = KB.search(message, top_k=5)

        context = build_context(results)
        sources = [{"title": r.get("title"), "url": r.get("url")} for r in results]

        llm_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        llm_messages.append({
            "role": "system",
            "content": "Контекст из базы знаний компании (используй только его для фактов):\n\n" + context
        })
        # include short history (user/assistant only)
        clean_history = []
        for h in history[-8:]:
            role = h.get("role")
            content = (h.get("content") or "").strip()
            if role in ("user", "assistant") and content:
                clean_history.append({"role": role, "content": content})
        llm_messages.extend(clean_history)
        llm_messages.append({"role": "user", "content": message})

        answer, err = call_llm(llm_messages)
        mode = "llm"
        if answer is None:
            answer = fallback_answer(message, results)
            mode = "fallback"

        self._send(200, {"answer": answer, "sources": sources, "mode": mode, "llm_error": err if err and err != "no_api_key" else None})

    def log_message(self, fmt, *args):
        # quieter logging
        pass


def run(host="0.0.0.0", port=8000):
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"SibirProekt chat server running on http://{host}:{port}")
    print(f"KB loaded: {KB is not None} ({len(KB.items) if KB else 0} items)")
    print(f"LLM configured: {bool(os.getenv('OPENAI_API_KEY') or os.getenv('LLM_API_KEY'))}")
    server.serve_forever()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    run(host=host, port=port)
