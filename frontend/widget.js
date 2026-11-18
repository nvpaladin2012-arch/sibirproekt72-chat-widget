(function () {
  "use strict";

  if (window.__SibirProektGigaChatWidgetLoaded) return;
  window.__SibirProektGigaChatWidgetLoaded = true;

  function injectStyles() {
    if (document.getElementById("sp-widget-styles")) return;
    var css = `
:root {
  --spw-header: #1e293b;
  --spw-header-2: #0f172a;
  --spw-bg: #ffffff;
  --spw-surface: #f8fafc;
  --spw-border: #e2e8f0;
  --spw-text: #0f172a;
  --spw-muted: #64748b;
  --spw-accent: #2563eb;
  --spw-accent-hover: #1d4ed8;
  --spw-user: #dbeafe;
  --spw-bot: #f1f5f9;
  --spw-online: #22c55e;
  --spw-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
  --spw-font: "Segoe UI", Inter, Roboto, Arial, sans-serif;
}
#sp-widget-root { position: fixed; right: 20px; bottom: 20px; z-index: 2147483000; font-family: var(--spw-font); }
#sp-widget-root * { box-sizing: border-box; }
.spw-launcher-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
.spw-launcher {
  width: 62px; height: 62px; border-radius: 50%; border: none; cursor: pointer;
  background: linear-gradient(135deg, var(--spw-accent), #0b3b8c); color: #fff;
  box-shadow: var(--spw-shadow); display: flex; align-items: center; justify-content: center;
  font-size: 28px; transition: transform .15s ease, box-shadow .15s ease;
}
.spw-launcher:hover { transform: translateY(-2px); }
.spw-launcher-badge {
  position: absolute; top: -2px; right: -2px; background: #fff; color: #0f172a;
  border: 1px solid #d1fae5; border-radius: 999px; font-size: 10px; font-weight: 700;
  padding: 2px 6px; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,.12);
}
.spw-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--spw-online); display: inline-block; }
.spw-panel {
  position: absolute; right: 0; bottom: 78px; width: min(390px, calc(100vw - 24px));
  height: min(640px, calc(100vh - 110px)); background: var(--spw-bg); border: 1px solid var(--spw-border);
  border-radius: 16px; box-shadow: var(--spw-shadow); display: none; flex-direction: column; overflow: hidden;
}
.spw-panel.open { display: flex; }
.spw-header {
  background: linear-gradient(135deg, var(--spw-header), var(--spw-header-2)); color: #fff;
  padding: 14px 14px 12px; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;
}
.spw-title { font-size: 15px; font-weight: 700; line-height: 1.25; }
.spw-sub { margin-top: 4px; font-size: 12px; color: rgba(255,255,255,.85); display: flex; align-items: center; gap: 6px; }
.spw-close {
  background: rgba(255,255,255,.12); color: #fff; border: none; width: 30px; height: 30px;
  border-radius: 8px; cursor: pointer; font-size: 18px; line-height: 1;
}
.spw-close:hover { background: rgba(255,255,255,.2); }
.spw-messages {
  flex: 1; overflow-y: auto; padding: 12px; background: var(--spw-surface);
  display: flex; flex-direction: column; gap: 10px;
}
.spw-msg {
  max-width: 92%; padding: 10px 12px; border-radius: 12px; font-size: 14px; line-height: 1.5;
  color: var(--spw-text); word-wrap: break-word; overflow-wrap: anywhere;
}
.spw-msg.bot { align-self: flex-start; background: var(--spw-bot); border: 1px solid #e5e7eb; }
.spw-msg.user { align-self: flex-end; background: var(--spw-user); border: 1px solid #bfdbfe; }
.spw-msg p { margin: 0 0 8px; }
.spw-msg p:last-child { margin-bottom: 0; }
.spw-msg ul, .spw-msg ol { margin: 6px 0 6px 20px; padding: 0; }
.spw-msg li { margin: 3px 0; }
.spw-msg a { color: var(--spw-accent); text-decoration: underline; }
.spw-typing { font-size: 12px; color: var(--spw-muted); padding: 0 12px 8px; display: none; }
.spw-typing.show { display: block; }
.spw-quick { padding: 8px 10px; border-top: 1px solid var(--spw-border); background: #fff; display: flex; flex-wrap: wrap; gap: 6px; }
.spw-chip {
  border: 1px solid #cbd5e1; background: #fff; color: #334155; border-radius: 999px;
  padding: 6px 10px; font-size: 12px; cursor: pointer;
}
.spw-chip:hover { background: #f1f5f9; border-color: #94a3b8; }
.spw-form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--spw-border); background: #fff; }
.spw-input {
  flex: 1; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: 14px;
  font-family: inherit; resize: none; min-height: 42px; max-height: 120px; color: var(--spw-text);
}
.spw-input:focus { outline: 2px solid rgba(37,99,235,.2); border-color: var(--spw-accent); }
.spw-send {
  border: none; border-radius: 10px; background: var(--spw-accent); color: #fff; padding: 0 14px;
  font-weight: 600; cursor: pointer; min-width: 92px;
}
.spw-send:hover { background: var(--spw-accent-hover); }
.spw-send:disabled { opacity: .6; cursor: default; }
@media (max-width: 480px) {
  #sp-widget-root { right: 12px; bottom: 12px; }
  .spw-panel { right: 0; bottom: 74px; width: calc(100vw - 24px); height: calc(100vh - 100px); }
  .spw-launcher-badge { display: none; }
}
`;
    var style = document.createElement("style");
    style.id = "sp-widget-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeUrl(url) {
    var u = String(url || "");
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    return "#";
  }

  // Простое форматирование: экранирование, ссылки, телефоны, абзацы и списки (-, *, 1.)
  function formatMessage(text) {
    var src = String(text || "").replace(/\r\n?/g, "\n");
    var lines = src.split("\n");
    var html = "";
    var inUl = false, inOl = false;

    function closeLists() {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (inOl) { html += "</ol>"; inOl = false; }
    }

    function formatInline(line) {
      var s = escapeHtml(line);
      // markdown links [text](url)
      s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+)\)/g, function (_, t, u) {
        return '<a href="' + sanitizeUrl(u) + '" target="_blank" rel="noopener noreferrer">' + t + '</a>';
      });
      // plain URLs
      s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, function (m, pre, url) {
        var clean = url.replace(/[),.;!?]+$/g, "");
        var tail = url.slice(clean.length);
        return pre + '<a href="' + sanitizeUrl(clean) + '" target="_blank" rel="noopener noreferrer">' + clean + '</a>' + tail;
      });
      // emails
      s = s.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, function (email) {
        if (email.indexOf('href="') !== -1) return email;
        return '<a href="mailto:' + email + '">' + email + '</a>';
      });
      // phones (RU formats like 8 (922) 477-05-34, +7 (982) 972-98-68)
      s = s.replace(/(^|[^\w+])((?:\+7|8)[\s\-()]*(?:\d[\s\-()]*){9,10}\d)/g, function (m, pre, phone) {
        if (phone.indexOf('href=') !== -1) return m;
        var tel = phone.replace(/[^\d+]/g, "");
        if (tel.charAt(0) === '8') tel = '+7' + tel.slice(1);
        return pre + '<a href="tel:' + tel + '">' + phone + '</a>';
      });
      s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      return s;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();
      if (!trimmed) {
        closeLists();
        continue;
      }
      var ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
      var olMatch = trimmed.match(/^\d+[\.)]\s+(.*)$/);
      if (ulMatch) {
        if (inOl) { html += "</ol>"; inOl = false; }
        if (!inUl) { html += "<ul>"; inUl = true; }
        html += "<li>" + formatInline(ulMatch[1]) + "</li>";
      } else if (olMatch) {
        if (inUl) { html += "</ul>"; inUl = false; }
        if (!inOl) { html += "<ol>"; inOl = true; }
        html += "<li>" + formatInline(olMatch[1]) + "</li>";
      } else {
        closeLists();
        html += "<p>" + formatInline(trimmed) + "</p>";
      }
    }
    closeLists();
    return html || "<p></p>";
  }

  function init(userConfig) {
    if (document.getElementById("sp-widget-root")) return;
    var config = userConfig || {};
    var apiUrl = config.apiUrl || "/api/chat";
    var storageKey = config.storageKey || "sp_chat_history_v1";
    var greeting = config.greeting || "Здравствуйте! Я виртуальный помощник «Сибирь Проект». Чат полностью анонимный — не нужно вводить имя или телефон. Подскажу по 44-ФЗ, 223-ФЗ, 615-ПП, банковским гарантиям и услугам компании. Какой у вас вопрос?";
    var quickReplies = config.quickReplies || [
      "Банковская гарантия за 1 день",
      "Стоимость услуг",
      "Отклонили заявку / ФАС",
      "Контакты и график работы"
    ];

    injectStyles();

    var root = document.createElement("div");
    root.id = "sp-widget-root";
    root.innerHTML =
      '<div class="spw-launcher-wrap">' +
        '<button class="spw-launcher" type="button" aria-label="Открыть чат">💬</button>' +
        '<span class="spw-launcher-badge"><span class="spw-dot"></span>Онлайн 24/7</span>' +
      '</div>' +
      '<div class="spw-panel" role="dialog" aria-label="Онлайн-чат">' +
        '<div class="spw-header">' +
          '<div>' +
            '<div class="spw-title">Консультант Сибирь Проект • 24/7</div>' +
            '<div class="spw-sub"><span class="spw-dot"></span>Онлайн-консультант</div>' +
          '</div>' +
          '<button class="spw-close" type="button" aria-label="Закрыть">×</button>' +
        '</div>' +
        '<div class="spw-messages" aria-live="polite"></div>' +
        '<div class="spw-typing">Консультант печатает...</div>' +
        '<div class="spw-quick"></div>' +
        '<form class="spw-form">' +
          '<textarea class="spw-input" rows="1" placeholder="Введите сообщение..." aria-label="Сообщение"></textarea>' +
          '<button class="spw-send" type="submit">Отправить</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(root);

    var launcher = root.querySelector(".spw-launcher");
    var panel = root.querySelector(".spw-panel");
    var closeBtn = root.querySelector(".spw-close");
    var messagesEl = root.querySelector(".spw-messages");
    var typingEl = root.querySelector(".spw-typing");
    var quickEl = root.querySelector(".spw-quick");
    var form = root.querySelector(".spw-form");
    var input = root.querySelector(".spw-input");
    var sendBtn = root.querySelector(".spw-send");

    var history = [];

    function saveHistory() {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(history.slice(-20)));
      } catch (e) {}
    }

    function loadHistory() {
      try {
        var raw = sessionStorage.getItem(storageKey);
        if (!raw) return;
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) history = parsed.filter(function (m) { return m && (m.role === 'user' || m.role === 'assistant') && m.content; });
      } catch (e) { history = []; }
    }

    function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

    function appendMessage(role, content, save) {
      var el = document.createElement("div");
      el.className = "spw-msg " + (role === "user" ? "user" : "bot");
      el.innerHTML = role === "user" ? '<p>' + escapeHtml(content) + '</p>' : formatMessage(content);
      messagesEl.appendChild(el);
      scrollToBottom();
      if (save !== false) {
        history.push({ role: role, content: String(content || "") });
        saveHistory();
      }
    }

    function setTyping(on) {
      typingEl.classList.toggle("show", !!on);
      sendBtn.disabled = !!on;
      scrollToBottom();
    }

    function renderQuickReplies() {
      quickEl.innerHTML = "";
      quickReplies.forEach(function (text) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "spw-chip";
        b.textContent = text;
        b.addEventListener("click", function () { sendMessage(text); });
        quickEl.appendChild(b);
      });
    }

    async function sendMessage(text) {
      var message = String(text != null ? text : input.value || "").trim();
      if (!message || sendBtn.disabled) return;
      appendMessage("user", message);
      input.value = "";
      input.style.height = "auto";

      setTyping(true);
      try {
        var res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: message, history: history.slice(0, -1).slice(-12) })
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        var data = await res.json();
        var answer = data && data.answer ? String(data.answer) : "Не удалось получить ответ. Попробуйте еще раз или свяжитесь с нами по контактам: 8 (922) 477-05-34, sibir-proekt72@mail.ru.";
        appendMessage("assistant", answer);
      } catch (e) {
        appendMessage("assistant", "Сейчас не удалось получить ответ. Пожалуйста, попробуйте чуть позже или свяжитесь со специалистами:\n- Руководитель: 8 (922) 477-05-34\n- Отдел по работе с клиентами: +7 (982) 972-98-68\n- Почта: sibir-proekt72@mail.ru, sibir-proekt72@yandex.ru\n- График: Пн–Пт 09:00–18:00 (МСК+2)");
      } finally {
        setTyping(false);
      }
    }

    function openPanel() {
      panel.classList.add("open");
      setTimeout(function () { input.focus(); }, 50);
    }
    function closePanel() { panel.classList.remove("open"); }

    launcher.addEventListener("click", function () { panel.classList.contains("open") ? closePanel() : openPanel(); });
    closeBtn.addEventListener("click", closePanel);

    form.addEventListener("submit", function (e) { e.preventDefault(); sendMessage(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    input.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 120) + "px";
    });

    renderQuickReplies();
    loadHistory();

    // Восстанавливаем историю из sessionStorage (только в рамках текущей вкладки) или показываем приветствие
    if (history.length) {
      messagesEl.innerHTML = "";
      for (var i = 0; i < history.length; i++) {
        appendMessage(history[i].role, history[i].content, false);
      }
      saveHistory();
    } else {
      appendMessage("assistant", greeting);
    }

    // Авто-открытие по конфигу (опционально)
    if (config.openOnLoad) openPanel();
  }

  window.SibirProektGigaChatWidget = { init: init };

  // Автоинициализация одним скриптом: <script src=".../widget.js" data-api-url="https://.../api/chat"></script>
  function autoInit() {
    var current = document.currentScript;
    if (!current) {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf("widget.js") !== -1) { current = scripts[i]; break; }
      }
    }
    var cfg = (window.SIBIRPROEKT_WIDGET_CONFIG || {});
    if (current && current.dataset) {
      if (current.dataset.apiUrl) cfg.apiUrl = current.dataset.apiUrl;
      if (current.dataset.storageKey) cfg.storageKey = current.dataset.storageKey;
    }
    init(cfg);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})();
