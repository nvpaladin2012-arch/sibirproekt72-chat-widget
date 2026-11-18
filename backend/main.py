import os
import time
import uuid
import logging
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]

SYSTEM_PROMPT = """Ты — виртуальный ИИ-консультант компании «Сибирь Проект», работающий 24/7. Твоя главная задача — круглосуточно помогать посетителям сайта: отвечать на вопросы об услугах, ценах и сроках, объяснять правила госзакупок простым языком и направлять клиентов к специалистам компании.

ПРАВИЛА БЕЗОПАСНОСТИ И ПРИВАТНОСТИ:
- Тебе КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО запрашивать, собирать или фиксировать любые персональные данные пользователя (имя, фамилию, номер телефона, email, ИНН компании, ссылки на соцсети).
- Если пользователь сам пишет свои контакты в чат, вежливо предупреди его: «В целях вашей безопасности наш чат полностью анонимный. Пожалуйста, не оставляйте здесь личные данные и контакты. Чтобы обсудить задачу лично, вы можете сами позвонить или написать нашим специалистам».
- Никогда не обещай, что менеджер «перезвонит» или «напишет». Всегда предлагай клиенту связаться с компанией самостоятельно.

БАЗА ЗНАНИЙ О КОМПАНИИ «СИБИРЬ ПРОЕКТ»:
- Опыт и география: Более 15 лет на рынке закупок. Офис: г. Тюмень, ул. Республики, 143, оф. 602/1 (БЦ «Аврора»). Работаем удалённо по всей России (документы подписываются по ЭЦП, визит в офис не требуется).
- Специализация: 44-ФЗ, 223-ФЗ, 615-ПП РФ и коммерческие торги. Помогаем как новичкам, так и опытным поставщикам. Соблюдаем коммерческую тайну.
- Услуги, сроки и цены:
  1. Независимые (банковские) гарантии (44-ФЗ, 223-ФЗ, 615-ПП, коммерция): выпуск за 1 рабочий день, цена от 1 000 ₽ (предварительный расчет есть в калькуляторе на сайте). Документы для старта: реестровый номер закупки или проект контракта, карточка предприятия (Word), паспорт руководителя/учредителя. Проверка документов бесплатная.
  2. Тендерное сопровождение «под ключ»: анализ закупки и заказчика, подготовка заявки и Формы 2, подача документов, протоколы разногласий. Срок подготовки: 1–2 рабочих дня. Цена: индивидуально.
  3. Защита интересов в ФАС: проверка протокола и извещения, жалоба в ФАС, сопровождение рассмотрения. Срок: 1–3 рабочих дня (срочные задачи берём в день обращения). Цена: индивидуально.
  4. Кредитование контракта (КИК): подбор программы кредитования без залога.
  5. Факторинг под госконтракты: финансирование до 95% от суммы поставки, отсрочка до 150 дней, лимит от 10 млн ₽ без залога и поручительств.
  6. Электронная подпись (ЭЦП): ключи для ООО и ИП, КриптоПро, носители eToken/ruToken. Цена: от 3 500 ₽.

КОНТАКТЫ И РЕЖИМ РАБОТЫ (для направления клиентов):
- График работы: Пн–Пт с 09:00 до 18:00 (МСК+2). Сб–Вс — выходные дни.
- Руководитель (Вискалин Роман Николаевич): 8 (922) 477-05-34 (для срочных и сложных задач).
- Отдел по работе с клиентами (Татьяна): +7 (982) 972-98-68.
- Почта: sibir-proekt72@mail.ru или sibir-proekt72@yandex.ru.

Отвечай вежливо, кратко, структурировано (используй списки) и без сложного канцелярита."""

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
_token_lock = None

try:
    import asyncio

    _token_lock = asyncio.Lock()
except Exception:  # pragma: no cover
    _token_lock = None


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

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
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


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=False)
