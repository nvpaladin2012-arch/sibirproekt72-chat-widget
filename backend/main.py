import asyncio
import hashlib
import hmac
import os
import re
import secrets
import time
import uuid
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sibirproekt-gigachat-proxy")

# === НАСТРОЙКИ (можно задать через .env / переменные окружения) ===
# ВАЖНО: сюда (в .env) вставьте Authorization Key от Sber Developer
# (значение используется в заголовке: Authorization: Basic <GIGACHAT_AUTH_KEY>)
GIGACHAT_AUTH_KEY = os.getenv("GIGACHAT_AUTH_KEY", "").strip()
GIGACHAT_SCOPE = os.getenv("GIGACHAT_SCOPE", "GIGACHAT_API_PERS").strip()
GIGACHAT_MODEL = os.getenv("GIGACHAT_MODEL", "GigaChat").strip()

OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
CHAT_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"

# SSL: для тестового режима можно отключить строгую проверку сертификатов Сбера
# установив GIGACHAT_VERIFY_SSL=false (в продакшене рекомендуется настроить доверенный CA)
_verify_env = os.getenv("GIGACHAT_VERIFY_SSL", "true").strip().lower()
_ca_bundle = os.getenv("GIGACHAT_CA_BUNDLE", "").strip()
if _ca_bundle:
    GIGACHAT_VERIFY: Any = _ca_bundle
elif _verify_env in {"0", "false", "no", "off"}:
    GIGACHAT_VERIFY = False
else:
    GIGACHAT_VERIFY = True

# Явно перечисляем origins: live-чатиспользует cookie оператора, поэтому
# подстановочный '*' с allow_credentials=true браузер не примет.
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:8080,http://127.0.0.1:8080,"
        "http://localhost:8000,http://127.0.0.1:8000,"
        "https://sibirproekt72.ru,https://www.sibirproekt72.ru",
    ).split(",")
    if o.strip()
]

SYSTEM_PROMPT = """# РОЛЬ И КОНТЕКСТ
Ты — виртуальный ИИ-консультант и экспресс-аудитор компании «Сибирь Проект» (г. Тюмень, часовой пояс МСК+2).
Компания более 15 лет занимается тендерным сопровождением, выпуском независимых (банковских) гарантий, кредитованием контрактов, факторингом, выпуском ЭЦП/МЧД и защитой интересов поставщиков в ФАС по 44-ФЗ, 223-ФЗ и 615-ПП РФ. Работаем дистанционно по всей России.

Твоя главная задача — дать пользователю быстрый, точный и понятный ответ по закупкам, помочь оценить риски или стоимость услуг, а при необходимости — передать задачу профильному юристу, строго соблюдая политику анонимности сайта.

# ГЛАВНОЕ ПРАВИЛО АНОНИМНОСТИ (СТРОГО ОБЯЗАТЕЛЬНО)
На сайте «Сибирь Проект» запрещен сбор персональных данных.
1. НИКОГДА не запрашивай у пользователя имя, номер телефона, электронную почту или название/ИНН его компании, если он сам не решил их сообщить.
2. Для оценки закупки, проверки отклонения или расчета гарантии запрашивай ТОЛЬКО открытые данные: реестровый номер закупки (ИКЗ), ссылку на процедуру в ЕИС/ЭТП, сумму и срок контракта, либо текст/суть протокола отклонения.
3. Если пользователю нужен расчет от специалиста, подготовка документов или срочная помощь юриста:
   - Сформируй краткое резюме его задачи.
   - Предложи продолжить диалог здесь в анонимном чате (позови оператора/юриста) ИЛИ предложи пользователю самому связаться по контактам компании, чтобы избежать спам-звонков:
     * Руководитель (Вискалин Роман Николаевич): 8 (922) 477-05-34
     * Работа с клиентами (Татьяна): +7 (982) 972-98-68
     * Почта: sibir-proekt72@mail.ru / sibir-proekt72@yandex.ru
4. Не обещай перезвон или письмо на контакты пользователя. Не повторяй в ответе контакты, которые пользователь случайно прислал, — вежливо напомни, что чат анонимный, и предложи связаться с компанией самостоятельно по указанным выше контактам.
5. Не проси присылать в чат сканы паспортов, доверенности и документы компании. Если для оформления нужен пакет документов — только перечисли его состав и предложи передать его через защищённый канал при оформлении либо связаться с компанией самостоятельно.

# ТОНАЛЬНОСТЬ И СТИЛЬ ОБЩЕНИЯ
- Общайся спокойно, уважительно, по-деловому и без канцелярита.
- Если пользователь новичок — объясняй термины (НМЦК, РНП, ЕИС, МЧД, структурированная заявка) простым человеческим языком, без высокомерия.
- Если пользователь опытный участник — отвечай максимально конкретно, оперируя нормами 44-ФЗ, 223-ФЗ, 615-ПП и сроками регламентов.
- Используй географическое преимущество: если задача срочная, упоминай, что офис работает по времени Тюмени (МСК+2), поэтому специалисты начинают работу на 2 часа раньше Москвы и успевают подготовить документы к открытию торгов.
- Пиши кратко и структурированно (используй списки). Не пиши «простыни» текста.

# БАЗА ЗНАНИЙ ПО УСЛУГАМ И ОРИЕНТИРАМ
Используй только эти данные о компании (не выдумывай несуществующие услуги и акции):
1. **Независимые (банковские) гарантии:**
   - Виды: на участие, на исполнение контракта, на гарантийные обязательства (44-ФЗ, 223-ФЗ, 615-ПП и коммерческие договоры).
   - Стоимость: от 1 000 ₽ (точный предварительный расчет можно сделать в калькуляторе на сайте; при наличии конкурентного предложения от другого банка можно запросить согласование скидки).
   - Срок выпуска: в день обращения (от 4 часов после согласования макета с заказчиком и контроля ЕИС).
   - Базовый пакет документов (потребуется уже при оформлении): ИКЗ закупки, карточка предприятия, скан паспорта руководителя/учредителей и финотчетность (при необходимости).
2. **Тендерное сопровождение:**
   - Полный цикл: анализ закупки и заказчика, подготовка структурированной заявки в ЕИС (взамен устаревшей бумажной «Формы 2»), подача, протоколы разногласий, защита от попадания в РНП.
   - Срок подготовки документов: в среднем 1–2 рабочих дня.
3. **Защита интересов в ФАС:**
   - Правовой аудит извещения или протокола отклонения, составление и подача жалобы, представительство в УФАС (включая ВКС).
   - Срок подготовки: от 1 рабочего дня (строго с учетом регламентных сроков обжалования).
4. **Кредитование контракта (КИК) и Факторинг:**
   - КИК: пополнение оборотки без залога недвижимости по партнерским программам банков.
   - Факторинг: закрытие кассовых разрывов при отсрочке платежа до 150 дней. Финансирование до 95% от суммы поставки сразу после отгрузки, лимит от 10 млн ₽ без залога и поручительств.
5. **Электронная подпись (ЭЦП) и МЧД:**
   - Выпуск КЭП через аккредитованный УЦ (партнер с лицензией ФСБ), настройка КриптоПро, формирование машиночитаемой доверенности (МЧД) для сотрудников, настройка входа в ЕИС и ЭТП.
   - Стоимость: от 3 500 ₽. Срок: от 1 рабочего дня.
6. **Бесплатные материалы:**
   - На сайте доступен для скачивания без регистрации PDF-чек-лист «12 критических точек проверки заявки до подачи (44-ФЗ и 223-ФЗ)». Предлагай его пользователям, которые готовят заявку самостоятельно.
7. **Дополнительная база знаний:** фрагменты PDF-чек-листа и полезных статей сайта могут приходить отдельным сообщением «ДОПОЛНИТЕЛЬНАЯ БАЗА ЗНАНИЙ САЙТА». Используй их для экспертных уточнений, но не выдумывай услуги, акции и цены сверх указанных здесь.

# СЦЕНАРИИ ДИАЛОГА
1. **Если пользователь прислал данные из калькулятора гарантий:**
   - Поблагодари за расчет, проверь, нет ли усложняющих факторов (например, наличие аванса по контракту, закрытая процедура, 615-ПП или сжатые сроки до подписания контракта).
   - Подскажи, что предварительный аудит документов и подбор банка-партнера проводятся бесплатно, и предложи подключить специалиста в этот же чат для согласования макета.
2. **Если у пользователя «горит» срок (отклонили заявку, последний день подписания контракта, угроза РНП):**
   - Действуй максимально оперативно. Сразу запроси реестровый номер закупки (ИКЗ) и суть проблемы (или текст причины отклонения из протокола).
   - Напомни о сжатых сроках обжалования в УФАС и возможности выпуска гарантии от 4 часов. Предложи немедленно перевести диалог на дежурного юриста.
3. **Если вопрос касается сложной юридической коллизии или точной цены сопровождения:**
   - Дай общую правовую справку по закону.
   - Честно укажи, что точная стоимость тендерного сопровождения или жалобы в ФАС рассчитывается индивидуально под сложность закупки и фиксируется в договоре до старта работ.
   - Уточни детали задачи (номер закупки, этап процедуры), чтобы специалист мог назвать финальную цену.

# ОГРАНИЧЕНИЯ (ЧЕГО ДЕЛАТЬ НЕЛЬЗЯ)
- Не давай 100% гарантий выигрыша дела в ФАС или одобрения конкретным банком до проверки документов.
- Не выдумывай точные процентные ставки банков по гарантиям и кредитам — называй только нижний порог цены (от 1 000 ₽ за гарантию) и ориентируй на предварительный расчет.
- Не ссылайся на устаревшие нормы (например, не предлагай заполнить бумажную «Форму 2» для 44-ФЗ — напоминай, что теперь характеристики подаются в структурированном виде в ЕИС).
- Не обсуждай темы, не связанные с бизнесом, финансами и закупками. На посторонние вопросы вежливо отвечай, что ты профильный консультант по госзаказу.

# СПРАВОЧНЫЕ ССЫЛКИ САЙТА
- Сайт компании: https://sibirproekt72.ru
- PDF-чек-лист «12 критических точек проверки заявки до подачи» (без регистрации): https://sibirproekt72.ru/assets/files/Check-list-pered-tenderom-Sibir-Proekt.pdf
- Страница чек-листа: https://sibirproekt72.ru/checklist.html
"""

# === БАЗА ЗНАНИЙ (RAG): локальный поиск по kb/documents/*.txt ===
# По умолчанию используется та же папка, что и у PHP-чата на сайте.
KB_DIR = Path(os.getenv(
    "KB_DIR",
    str(Path(__file__).resolve().parents[2] / "sitenew" / "api" / "kb" / "documents"),
))

_KB_STOPWORDS = {
    "и", "в", "во", "не", "что", "как", "для", "по", "на", "с", "со", "из", "от", "до", "при",
    "или", "а", "но", "же", "бы", "ли", "у", "о", "об", "обо", "та", "то", "это", "тот", "такой",
    "если", "чтобы", "за", "под", "над", "про", "без", "к", "ко", "я", "вы", "мы", "он", "она",
    "мой", "ваш", "наш", "все", "всего", "может", "можно", "нужно", "будет", "был", "была",
}


def _kb_tokens(text: str) -> List[str]:
    words = re.findall(r"[\wА-Яа-яЁё]+", text.lower(), flags=re.UNICODE)
    return list(dict.fromkeys(w for w in words if len(w) > 2 and w not in _KB_STOPWORDS))


def _kb_load_chunks() -> List[Dict[str, str]]:
    chunks: List[Dict[str, str]] = []
    if not KB_DIR.is_dir():
        return chunks
    for path in sorted(KB_DIR.glob("*.txt")):
        try:
            raw = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        source, title, url = path.name, path.name, ""
        lines = raw.splitlines()
        body_start = 0
        for i, line in enumerate(lines):
            m = re.match(r"#\s*SOURCE:\s*(.+)$", line, re.I)
            if m:
                source = m.group(1).strip()
                body_start = i + 1
            m = re.match(r"#\s*TITLE:\s*(.+)$", line, re.I)
            if m:
                title = m.group(1).strip()
                body_start = i + 1
            m = re.match(r"#\s*URL:\s*(.+)$", line, re.I)
            if m:
                url = m.group(1).strip()
                body_start = i + 1
        body = "\n".join(lines[body_start:]).strip()
        if not body:
            continue
        text = re.sub(r"\s+", " ", body).strip()
        size, overlap = 900, 120
        start = 0
        while start < len(text):
            end = min(start + size, len(text))
            if end < len(text):
                cut = text.rfind(" ", start + int(size * 0.6), end)
                if cut != -1:
                    end = cut
            piece = text[start:end].strip()
            if piece:
                chunks.append({"title": title, "url": url, "source": source, "text": piece})
            if end >= len(text):
                break
            start = max(end - overlap, start + 1)
    return chunks


def kb_search(query: str, limit: int = 4, max_chars: int = 3600) -> str:
    tokens = _kb_tokens(query)
    if not tokens:
        return ""
    phrase = " ".join(tokens)
    scored: List[Dict[str, Any]] = []
    for chunk in _kb_load_chunks():
        text_lower = chunk["text"].lower()
        title_lower = chunk["title"].lower()
        score = 0.0
        for token in tokens:
            if re.search(r"(?<!\w)" + re.escape(token) + r"(?!\w)", text_lower):
                score += 1.0
            if token in title_lower:
                score += 1.5
        if score > 0 and phrase in text_lower:
            score += 3.0
        if score > 0:
            scored.append({**chunk, "score": score})
    scored.sort(key=lambda c: (-c["score"], c["title"]))
    out = ""
    used = 0
    count = 0
    for chunk in scored:
        if count >= limit or used >= max_chars:
            break
        ref = chunk["url"] or chunk["source"]
        block = f"[{count + 1}] «{chunk['title']}» — {ref}\n{chunk['text']}\n\n"
        if used + len(block) > max_chars and count > 0:
            break
        out += block
        used += len(block)
        count += 1
    return out.strip()


app = FastAPI(title="SibirProekt GigaChat Proxy", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if CORS_ORIGINS == ["*"] else CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoryItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    history: List[HistoryItem] = Field(default_factory=list)


# Кэш access_token в памяти процесса (не сохраняется в БД, история чатов тоже не сохраняется)
_token_cache: Dict[str, Any] = {"access_token": None, "expires_at": 0.0}
_token_lock = asyncio.Lock()


async def get_access_token() -> str:
    """Получение и автоматическое обновление access_token GigaChat (действует ~30 минут)."""
    if not GIGACHAT_AUTH_KEY:
        raise HTTPException(status_code=500, detail="GIGACHAT_AUTH_KEY is not configured on server")

    now = time.time()
    # обновляем заранее (за 60 секунд до истечения), чтобы не отправлять запрос с протухшим токеном
    if _token_cache.get("access_token") and now < float(_token_cache.get("expires_at", 0)) - 60:
        return str(_token_cache["access_token"])

    # блокировка, чтобы параллельные запросы не запрашивали токен одновременно
    if _token_lock:
        async with _token_lock:
            now = time.time()
            if _token_cache.get("access_token") and now < float(_token_cache.get("expires_at", 0)) - 60:
                return str(_token_cache["access_token"])
            return await _fetch_new_token()
    return await _fetch_new_token()


async def _fetch_new_token() -> str:
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "RqUID": str(uuid.uuid4()),
        "Authorization": f"Basic {GIGACHAT_AUTH_KEY}",
    }
    data = {"scope": GIGACHAT_SCOPE}
    timeout = httpx.Timeout(30.0, connect=10.0)

    async with httpx.AsyncClient(verify=GIGACHAT_VERIFY, timeout=timeout) as client:
        try:
            resp = await client.post(OAUTH_URL, headers=headers, data=data)
            resp.raise_for_status()
            payload = resp.json()
        except httpx.HTTPStatusError as e:
            logger.error("OAuth error: %s %s", e.response.status_code, e.response.text)
            raise HTTPException(status_code=502, detail="Failed to obtain GigaChat access token")
        except Exception as e:
            logger.exception("OAuth request failed: %s", e)
            raise HTTPException(status_code=502, detail="Failed to connect to GigaChat OAuth")

    token = payload.get("access_token")
    if not token:
        logger.error("OAuth response has no access_token: %s", payload)
        raise HTTPException(status_code=502, detail="Invalid OAuth response from GigaChat")

    # expires_at в ответе обычно в миллисекундах (unix ms); подстрахуемся
    expires_at = payload.get("expires_at")
    if expires_at:
        try:
            exp = float(expires_at)
            if exp > 10**12:  # ms -> s
                exp = exp / 1000.0
            _token_cache["expires_at"] = exp
        except Exception:
            _token_cache["expires_at"] = time.time() + 29 * 60
    else:
        _token_cache["expires_at"] = time.time() + 29 * 60

    _token_cache["access_token"] = token
    logger.info("GigaChat access token refreshed")
    return token


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "model": GIGACHAT_MODEL,
        "auth_configured": bool(GIGACHAT_AUTH_KEY),
        "ssl_verify": GIGACHAT_VERIFY is not False,
    }


@app.post("/api/chat")
async def chat(req: ChatRequest):
    message = (req.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is empty")

    # История приходит от клиента (sessionStorage на стороне браузера) и не сохраняется на сервере.
    # Берем только последние сообщения для контекста.
    safe_history: List[Dict[str, str]] = []
    for item in req.history[-12:]:
        role = (item.role or "").strip()
        content = (item.content or "").strip()
        if role in {"user", "assistant"} and content:
            safe_history.append({"role": role, "content": content})

    system_content = SYSTEM_PROMPT
    kb_context = kb_search(message)
    if kb_context:
        system_content += (
            "\n\nДОПОЛНИТЕЛЬНАЯ БАЗА ЗНАНИЙ САЙТА «СИБИРЬ ПРОЕКТ» (PDF-чек-лист и полезные статьи). "
            "Используй приведённые фрагменты как авторитетный источник для уточнений по 44-ФЗ, "
            "223-ФЗ и 615-ПП. Не расширяй перечень услуг и не называй цены, которых нет в основном "
            "системном промпте. Если фрагменты не относятся к вопросу — не используй их.\n\n"
            + kb_context
        )
    messages = [{"role": "system", "content": system_content}]
    messages.extend(safe_history)
    messages.append({"role": "user", "content": message})

    token = await get_access_token()
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
    }
    payload = {
        "model": GIGACHAT_MODEL,
        "messages": messages,
        "temperature": 0.2,
        "n": 1,
    }
    timeout = httpx.Timeout(60.0, connect=10.0)

    async with httpx.AsyncClient(verify=GIGACHAT_VERIFY, timeout=timeout) as client:
        try:
            resp = await client.post(CHAT_URL, headers=headers, json=payload)
            # Если токен внезапно стал невалидным — пробуем один раз обновить
            if resp.status_code == 401:
                _token_cache["access_token"] = None
                _token_cache["expires_at"] = 0.0
                token = await get_access_token()
                headers["Authorization"] = f"Bearer {token}"
                resp = await client.post(CHAT_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            logger.error("GigaChat API error: %s %s", e.response.status_code, e.response.text)
            raise HTTPException(status_code=502, detail="GigaChat API request failed")
        except Exception as e:
            logger.exception("GigaChat request failed: %s", e)
            raise HTTPException(status_code=502, detail="Failed to connect to GigaChat API")

    try:
        answer = data["choices"][0]["message"]["content"]
    except Exception:
        logger.error("Unexpected GigaChat response: %s", data)
        raise HTTPException(status_code=502, detail="Unexpected response from GigaChat")

    return {"answer": (answer or "").strip()}


# === ЖИВОЙ ЧАТ: присутствие, приглашения, панель оператора ===
# Хранилище только в памяти процесса: анонимный ID, URL/заголовок страницы,
# текст диалога и очень короткий TTL. Имена, телефоны и e-mail не собираются.
LIVE_OPERATOR_SALT = os.getenv("LIVE_OPERATOR_SALT", "sibirproekt-live-2026")
LIVE_OPERATOR_HASH = os.getenv(
    "LIVE_OPERATOR_PASSWORD_HASH",
    "a5cc2c91f99d793b4595b67d095801e6dd557f44fd3f7a8357188c0ed8251213",
)
LIVE_SESSION_TTL = 8 * 3600
VISITOR_TTL = 120
MESSAGE_TTL = 86400

_live_visitors: Dict[str, Dict[str, Any]] = {}
_live_messages: Dict[str, List[Dict[str, Any]]] = {}
_live_invites: Dict[str, Dict[str, Any]] = {}
_live_sessions: Dict[str, Dict[str, int]] = {}
_live_phrases: List[str] = [
    "Здравствуйте! Чем могу помочь по вашей закупке?",
    "Гарантии от 1 000 ₽, выпуск от 4 часов после согласования макета с заказчиком.",
    "Для оценки достаточно ИКЗ, суммы и срока контракта — имя, телефон и e-mail не нужны.",
    "Чек-лист перед подачей заявки: https://sibirproekt72.ru/checklist.html",
    "Подскажите, пожалуйста, реестровый номер закупки (ИКЗ) или ссылку на процедуру в ЕИС.",
    "График работы: Пн–Пт 09:00–18:00 (МСК+2), Тюмень.",
]

_SPELLER_URL = "https://speller.yandex.net/services/spellservice.json/checkText"
_LOCAL_TYPOS = {
    "калькулятар": "калькулятор",
    "кантракт": "контракт",
    "пажалуйста": "пожалуйста",
    "спецеалист": "специалист",
    "закувка": "закупка",
    "гарантия": "гарантия",
    "реквизиты": "реквизиты",
    "нужно": "нужно",
    "икз": "ИКЗ",
}


def _valid_live_id(value: Any) -> bool:
    return bool(re.fullmatch(r"[A-Za-z0-9_-]{8,64}", str(value or "")))


def _clean_live_text(value: Any, limit: int = 4000) -> str:
    text = str(value or "").strip()
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", text)
    return text[:limit]


def _live_cleanup(now: int) -> None:
    for visitor_id, visitor in list(_live_visitors.items()):
        if int(visitor.get("last_seen", 0)) < now - VISITOR_TTL:
            _live_visitors.pop(visitor_id, None)
            _live_messages.pop(visitor_id, None)
            _live_invites.pop(visitor_id, None)
            continue
        kept = [
            m for m in _live_messages.get(visitor_id, [])
            if int(m.get("ts", 0)) >= now - MESSAGE_TTL
        ]
        _live_messages[visitor_id] = kept[-200:]
    for token, session in list(_live_sessions.items()):
        if int(session.get("expires", 0)) < now:
            _live_sessions.pop(token, None)


def _live_is_operator(request: Request) -> bool:
    token = request.cookies.get("sp_live_session", "")
    if not token:
        return False
    session = _live_sessions.get(hashlib.sha256(token.encode("utf-8")).hexdigest())
    return bool(session and int(session.get("expires", 0)) >= int(time.time()))


def _live_next_message_id(items: List[Dict[str, Any]]) -> int:
    return max([int(m.get("id", 0)) for m in items] or [0]) + 1


def _live_append_message(
    visitor_id: str, role: str, text: str, now: int
) -> int:
    items = _live_messages.setdefault(visitor_id, [])
    msg_id = _live_next_message_id(items)
    items.append({"id": msg_id, "role": role, "text": text, "ts": now})
    _live_messages[visitor_id] = items[-200:]
    return msg_id


def _local_spellcheck(text: str) -> List[Dict[str, Any]]:
    errors: List[Dict[str, Any]] = []
    for word in re.findall(r"[\wА-Яа-яЁё]+", text, flags=re.UNICODE):
        suggestion = _LOCAL_TYPOS.get(word.lower())
        if not suggestion or suggestion == word:
            continue
        pos = text.find(word)
        errors.append({
            "word": word,
            "pos": max(0, pos),
            "len": len(word),
            "suggestions": [suggestion],
        })
    return errors


@app.api_route("/api/live", methods=["GET", "POST"])
@app.api_route("/api/live.php", methods=["GET", "POST"], include_in_schema=False)
async def live_chat(request: Request, response: Response):
    """Endpoint'ы живого чата: совместимы с PHP-версией на сайте."""
    now = int(time.time())
    body: Dict[str, Any] = {}
    if request.method == "POST":
        try:
            parsed = await request.json()
            if isinstance(parsed, dict):
                body = parsed
        except Exception:
            body = {}

    query = request.query_params
    action = str(query.get("action") or body.get("action") or "")
    _live_cleanup(now)

    if action == "health":
        return {"ok": True, "feature": "live-chat", "version": 1}

    if action == "login":
        password = str(body.get("password") or "")
        digest = hashlib.sha256((LIVE_OPERATOR_SALT + password).encode("utf-8")).hexdigest()
        if not hmac.compare_digest(digest, LIVE_OPERATOR_HASH):
            raise HTTPException(status_code=401, detail="Неверный пароль")
        token = secrets.token_hex(32)
        _live_sessions[hashlib.sha256(token.encode("utf-8")).hexdigest()] = {
            "created": now,
            "expires": now + LIVE_SESSION_TTL,
        }
        secure = (
            request.url.scheme == "https"
            or request.headers.get("x-forwarded-proto", "").lower() == "https"
        )
        response.set_cookie(
            "sp_live_session",
            token,
            max_age=LIVE_SESSION_TTL,
            httponly=True,
            samesite="lax",
            secure=secure,
        )
        return {"ok": True}

    if action == "logout":
        token = request.cookies.get("sp_live_session", "")
        if token:
            _live_sessions.pop(hashlib.sha256(token.encode("utf-8")).hexdigest(), None)
        response.delete_cookie("sp_live_session", samesite="lax")
        return {"ok": True}

    if action in {"ping", "poll"}:
        visitor_id = str(body.get("id") or query.get("id") or "")
        if not _valid_live_id(visitor_id):
            raise HTTPException(status_code=400, detail="Некорректный идентификатор посетителя")
        visitor = _live_visitors.get(visitor_id) or {
            "id": visitor_id,
            "started": now,
            "mode": "ai",
            "last_message": "",
            "unread": 0,
            "visitor_unread": 0,
        }
        visitor["url"] = _clean_live_text(body.get("url") or query.get("url"), 500)
        visitor["title"] = _clean_live_text(body.get("title") or query.get("title"), 200)
        try:
            started = int(body.get("started") or query.get("started") or 0)
        except (TypeError, ValueError):
            started = 0
        if 0 < started <= now:
            visitor["started"] = started
        visitor["last_seen"] = now

        try:
            since = int(body.get("since") or query.get("since") or 0)
        except (TypeError, ValueError):
            since = 0
        items = _live_messages.get(visitor_id, [])
        fresh = [m for m in items if int(m.get("id", 0)) > since]
        if any(m.get("role") == "operator" for m in fresh):
            visitor["visitor_unread"] = 0
        _live_visitors[visitor_id] = visitor

        invite = _live_invites.get(visitor_id)
        return {
            "ok": True,
            "mode": str(visitor.get("mode", "ai")),
            "invite": (
                {"id": int(invite.get("id", 0)), "text": str(invite.get("text", ""))}
                if invite else None
            ),
            "messages": fresh,
            "last_message_id": _live_next_message_id(items) - 1,
            "server_time": now,
            "visitor_seconds": max(0, now - int(visitor.get("started", now))),
        }

    if action == "invite_done":
        visitor_id = str(body.get("id") or "")
        try:
            invite_id = int(body.get("invite_id") or 0)
        except (TypeError, ValueError):
            invite_id = 0
        invite = _live_invites.get(visitor_id)
        if invite and int(invite.get("id", 0)) == invite_id:
            _live_invites.pop(visitor_id, None)
        return {"ok": True}

    if action == "visitors":
        if not _live_is_operator(request):
            raise HTTPException(status_code=401, detail="Требуется вход")
        visitors: List[Dict[str, Any]] = []
        for visitor_id, visitor in _live_visitors.items():
            if int(visitor.get("last_seen", 0)) < now - 90:
                continue
            items = _live_messages.get(visitor_id, [])
            last = items[-1] if items else {}
            visitors.append({
                "id": visitor_id,
                "url": str(visitor.get("url", "")),
                "title": str(visitor.get("title", "")),
                "started": int(visitor.get("started", now)),
                "seconds": max(0, now - int(visitor.get("started", now))),
                "last_seen": int(visitor.get("last_seen", now)),
                "mode": str(visitor.get("mode", "ai")),
                "unread": int(visitor.get("unread", 0)),
                "has_chat": bool(items),
                "last_message": str(last.get("text", "")),
                "last_message_id": _live_next_message_id(items) - 1,
            })
        visitors.sort(key=lambda v: v["last_seen"], reverse=True)
        return {"ok": True, "visitors": visitors[:100], "server_time": now}

    if action == "messages":
        if not _live_is_operator(request):
            raise HTTPException(status_code=401, detail="Требуется вход")
        visitor_id = str(query.get("id") or body.get("id") or "")
        if not _valid_live_id(visitor_id):
            raise HTTPException(status_code=400, detail="Некорректный идентификатор")
        try:
            since = int(query.get("since") or body.get("since") or 0)
        except (TypeError, ValueError):
            since = 0
        fresh = [
            m for m in _live_messages.get(visitor_id, [])
            if int(m.get("id", 0)) > since
        ]
        if visitor_id in _live_visitors:
            _live_visitors[visitor_id]["unread"] = 0
        return {
            "ok": True,
            "messages": fresh,
            "mode": str(_live_visitors.get(visitor_id, {}).get("mode", "ai")),
        }

    if action == "message":
        visitor_id = _clean_live_text(body.get("id"), 64)
        text = _clean_live_text(body.get("text"), 4000)
        if not _valid_live_id(visitor_id) or not text:
            raise HTTPException(status_code=400, detail="Пустое сообщение")
        operator = _live_is_operator(request)
        role = "operator" if operator else str(body.get("role") or "")
        if not operator and role not in {"user", "assistant"}:
            role = "user"
        visitor = _live_visitors.get(visitor_id) or {
            "id": visitor_id,
            "started": now,
            "mode": "ai",
            "unread": 0,
            "visitor_unread": 0,
        }
        if operator:
            visitor["mode"] = "operator"
            _live_invites.pop(visitor_id, None)
        elif role == "user":
            visitor["unread"] = int(visitor.get("unread", 0)) + 1
        visitor["last_seen"] = now
        visitor["last_message"] = text
        _live_visitors[visitor_id] = visitor
        msg_id = _live_append_message(visitor_id, role, text, now)
        return {"ok": True, "id": msg_id, "role": role}

    if action == "invite":
        if not _live_is_operator(request):
            raise HTTPException(status_code=401, detail="Требуется вход")
        visitor_id = str(body.get("id") or "")
        text = _clean_live_text(body.get("text"), 500)
        if not _valid_live_id(visitor_id) or not text:
            raise HTTPException(status_code=400, detail="Некорректные данные приглашения")
        _live_invites[visitor_id] = {"id": now, "text": text, "ts": now}
        return {"ok": True}

    if action in {"takeover", "release"}:
        if not _live_is_operator(request):
            raise HTTPException(status_code=401, detail="Требуется вход")
        visitor_id = str(body.get("id") or "")
        if not _valid_live_id(visitor_id) or visitor_id not in _live_visitors:
            raise HTTPException(status_code=404, detail="Посетитель не найден")
        take = action == "takeover"
        _live_visitors[visitor_id]["mode"] = "operator" if take else "ai"
        _live_visitors[visitor_id]["last_seen"] = now
        _live_append_message(
            visitor_id,
            "system",
            "Специалист подключился к диалогу. Отвечать буду здесь, в чате."
            if take else "Диалог передан ИИ-консультанту.",
            now,
        )
        return {"ok": True, "mode": _live_visitors[visitor_id]["mode"]}

    if action == "phrases":
        if not _live_is_operator(request):
            raise HTTPException(status_code=401, detail="Требуется вход")
        if request.method == "POST":
            incoming = body.get("phrases")
            if not isinstance(incoming, list):
                raise HTTPException(status_code=400, detail="Некорректный список фраз")
            cleaned = [
                p for p in (_clean_live_text(item, 500) for item in incoming) if p
            ][:50]
            _live_phrases[:] = cleaned
            return {"ok": True, "phrases": list(_live_phrases)}
        return {"ok": True, "phrases": list(_live_phrases)}

    if action == "spellcheck":
        if not _live_is_operator(request):
            raise HTTPException(status_code=401, detail="Требуется вход")
        text = _clean_live_text(body.get("text"), 4000)
        errors: List[Dict[str, Any]] = []
        source = "local"
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(6.0, connect=3.0)
            ) as client:
                resp = await client.post(
                    _SPELLER_URL,
                    data={"text": text, "lang": "ru", "ignoreUrls": 1},
                )
                remote = resp.json() if resp.status_code == 200 else None
            if isinstance(remote, list):
                for item in remote:
                    if not isinstance(item, dict):
                        continue
                    errors.append({
                        "word": str(item.get("word", "")),
                        "pos": int(item.get("col", 0) or 0),
                        "len": int(item.get("len", 0) or 0),
                        "suggestions": [str(s) for s in list(item.get("s") or [])[:5]],
                    })
                source = "yandex"
        except Exception:
            errors = []
        if source != "yandex":
            errors = _local_spellcheck(text)
        return {"ok": True, "errors": errors, "source": source}

    raise HTTPException(status_code=400, detail="Неизвестное действие")


# Статические страницы демо и панели оператора. API-маршруты выше имеют приоритет.
WEB_ROOT = Path(__file__).resolve().parents[1]


@app.get("/", include_in_schema=False)
async def demo_index():
    return FileResponse(WEB_ROOT / "index.html")


@app.get("/operator.html", include_in_schema=False)
async def operator_page():
    return FileResponse(WEB_ROOT / "operator.html")


app.mount("/frontend", StaticFiles(directory=WEB_ROOT / "frontend"), name="frontend")


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=False)
