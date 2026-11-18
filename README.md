# Анонимный онлайн-чат «На связи 24/7» для `sibirproekt72.ru` (GigaChat API)

Готовый к установке виджет онлайн-чата: **frontend** (чистый HTML/CSS/Vanilla JS, один скрипт) + **backend** (Python/FastAPI прокси к GigaChat API) с безопасной работой с ключами и автообновлением `access_token`.

## 1. Структура файлов проекта

```text
.
├── backend/
│   ├── main.py              # FastAPI-прокси: получение/обновление access_token, запросы в GigaChat
│   ├── requirements.txt     # Зависимости backend
│   └── .env.example         # Пример настроек (сюда указывается Authorization Key)
├── frontend/
│   └── widget.js            # Встраиваемый виджет (один скрипт: инжектит стили, UI, логику)
├── index.html               # Демо-страница для локальной проверки
├── .gitignore
└── README.md
```

## 2. Backend (GigaChat прокси)

### Возможности
- Принимает запросы виджета: `POST /api/chat` (`{ message, history }`).
- Получает `access_token` через OAuth GigaChat (`https://ngw.devices.sberbank.ru:9443/api/v2/oauth`) с `Authorization: Basic <GIGACHAT_AUTH_KEY>`.
- **Автоматически обновляет `access_token`** (действует ~30 минут): кэш в памяти процесса, обновление с запасом до истечения, защита от параллельного обновления.
- Отправляет запросы в `https://gigachat.devices.sberbank.ru/api/v1/chat/completions` (модель настраивается, по умолчанию `GigaChat`), всегда добавляет системный промпт компании первым сообщением.
- Поддержка SSL: можно отключить строгую проверку для тестового режима (`GIGACHAT_VERIFY_SSL=false`) или указать CA-bundle (`GIGACHAT_CA_BUNDLE`).
- CORS настраивается через `CORS_ORIGINS`.
- История диалога **не сохраняется на сервере** (принимается только для контекста текущего запроса).

### Куда вставить `Authorization Key` от Sber Developers
1. Скопируйте `backend/.env.example` в `backend/.env`.
2. Вставьте ключ в переменную `GIGACHAT_AUTH_KEY`:

```env
GIGACHAT_AUTH_KEY=ВАШ_AUTHORIZATION_KEY_ИЗ_SBER_DEVELOPERS
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_MODEL=GigaChat
GIGACHAT_VERIFY_SSL=false
CORS_ORIGINS=https://sibirproekt72.ru,https://www.sibirproekt72.ru
```

> `GIGACHAT_AUTH_KEY` — это значение для заголовка `Authorization: Basic <...>` при получении токена. Не публикуйте ключ в репозитории и не передавайте его на фронтенд.

## 3. Frontend (виджет)

Реализован в `frontend/widget.js` (подключение **одним скриптом**, стили и разметка инжектятся автоматически).

### UX/функции
- Плавающая кнопка в правом нижнем углу с иконкой чата и индикатором **«Онлайн 24/7»**.
- Окно чата: заголовок **«Консультант Сибирь Проект • 24/7»**, адаптивная верстка (ПК/планшет/смартфон).
- Приветственное сообщение при первом открытии (анонимный режим, без запроса имени/телефона).
- Быстрые кнопки-подсказки: «Банковская гарантия за 1 день», «Стоимость услуг», «Отклонили заявку / ФАС», «Контакты и график работы».
- Индикатор **«Консультант печатает...»** во время ожидания ответа.
- Отправка по Enter (Shift+Enter — новая строка) и кнопкой.
- Форматирование ответов: списки, абзацы, кликабельные ссылки, `mailto:` и `tel:` (телефоны).
- **Приватность:** нет полей имени/телефона/email; история хранится только в `sessionStorage` текущей вкладки (очищается при закрытии вкладки), на сервер не записывается.

## 4. Запуск на сервере (backend)

Требования: Python 3.10+.

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows (на Linux/macOS: cp .env.example .env)
# заполните .env (минимум GIGACHAT_AUTH_KEY)

uvicorn main:app --host 0.0.0.0 --port 8000
```

Проверка:
- `GET http://localhost:8000/api/health` — статус, настроен ли ключ, модель.

### Рекомендации для production
- Запускать через `systemd`/supervisor/Docker за reverse-proxy (Nginx/Caddy) с HTTPS.
- Ограничить `CORS_ORIGINS` доменами сайта (`https://sibirproekt72.ru`, `https://www.sibirproekt72.ru`).
- Для SSL к GigaChat: в идеале использовать доверенный CA-bundle (`GIGACHAT_CA_BUNDLE`); `GIGACHAT_VERIFY_SSL=false` применять только как тестовый режим.
- Добавить rate limiting/защиту от злоупотреблений на уровне прокси.

## 5. Встраивание виджета на сайт

1. Разместите `frontend/widget.js` на доступном HTTPS-адресе (тот же сервер, CDN или статику сайта).
2. Добавьте **один скрипт** перед закрывающим `</body>` на страницах `https://sibirproekt72.ru/`:

```html
<script>
  window.SIBIRPROEKT_WIDGET_CONFIG = {
    apiUrl: "https://chat-api.sibirproekt72.ru/api/chat"
  };
</script>
<script src="https://chat-api.sibirproekt72.ru/widget.js"></script>
```

Альтернатива (URL API через data-атрибут скрипта):

```html
<script src="https://chat-api.sibirproekt72.ru/widget.js" data-api-url="https://chat-api.sibirproekt72.ru/api/chat"></script>
```

> Замените `https://chat-api.sibirproekt72.ru` на реальный адрес, где размещены backend и файл виджета. Backend должен быть доступен по HTTPS с того же домена/поддомена, разрешенного CORS.

## 6. Локальная проверка демо

1. Запустите backend на `http://localhost:8000` (см. выше).
2. Из корня проекта запустите статический сервер, например: `python -m http.server 8080`.
3. Откройте `http://localhost:8080/index.html` — виджет в демо настроен на `http://localhost:8000/api/chat`.

## Примечания по безопасности
- Ключ GigaChat хранится только на сервере (в `.env`/переменных окружения), не попадает в браузер.
- В интерфейсе нет сбора имени/телефона/email; системный промпт инструктирует бота не запрашивать ПДн и корректно реагировать, если пользователь их указал.
- История чата хранится только в `sessionStorage` клиента и не пишется в БД на сервере (для полного соответствия политике приватности также настройте минимальное/анонимизированное логирование на веб-сервере/прокси).
