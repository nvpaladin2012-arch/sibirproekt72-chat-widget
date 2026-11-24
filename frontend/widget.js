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
.spw-invite {
  position: absolute; right: 0; bottom: 76px; width: min(320px, calc(100vw - 28px));
  background: #fff; border: 1px solid #dbe4f0; border-radius: 14px; box-shadow: 0 14px 34px rgba(15,23,42,.18);
  padding: 14px; display: none; z-index: 2;
}
.spw-invite.show { display: block; }
.spw-invite-text { font-size: 14px; line-height: 1.45; color: #0f172a; margin-bottom: 10px; }
.spw-invite-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.spw-invite-btn { border: none; border-radius: 8px; padding: 8px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
.spw-invite-btn.primary { background: #2563eb; color: #fff; }
.spw-invite-btn.ghost { background: #f1f5f9; color: #334155; }
.spw-mode { font-size: 11px; color: #bfdbfe; margin-left: 6px; font-weight: 500; }
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

/* Уведомление о конфиденциальности: иконка + раскрывающаяся карточка */
.sp-privacy-btn {
  position: fixed; left: 20px; bottom: 96px; z-index: 96;
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 44px; padding: 8px 14px; border-radius: 999px;
  border: 1px solid rgba(255,209,102,.42); background: rgba(11,15,28,.94);
  color: #FFD166; font: 600 12px/1.2 "Segoe UI", Inter, Roboto, Arial, sans-serif;
  letter-spacing: .02em; cursor: pointer;
  box-shadow: 0 12px 30px -18px rgba(0,0,0,.95);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.sp-privacy-btn svg { flex: none; }
.sp-privacy-btn:hover { border-color: rgba(255,209,102,.7); background: rgba(17,23,40,.98); }
.sp-privacy-btn:focus-visible { outline: 2px solid #FFD166; outline-offset: 3px; }
.sp-privacy-note {
  position: fixed; left: 20px; bottom: 150px; z-index: 97;
  width: min(360px, calc(100vw - 40px)); padding: 18px 18px 16px;
  border-radius: 16px; border: 1px solid rgba(255,209,102,.42);
  background: linear-gradient(160deg, rgba(20,27,48,.99), rgba(9,13,26,.99));
  color: #EAEEF8; font: 14px/1.55 "Segoe UI", Inter, Roboto, Arial, sans-serif;
  box-shadow: 0 28px 70px -30px rgba(0,0,0,.98);
}
.sp-privacy-note[hidden] { display: none; }
.sp-privacy-note__close {
  position: absolute; top: 10px; right: 10px; width: 30px; height: 30px;
  display: grid; place-items: center; border: 1px solid #2a3550; border-radius: 50%;
  background: rgba(255,255,255,.05); color: #94a3b8; font-size: 18px; line-height: 1; cursor: pointer;
}
.sp-privacy-note__close:hover { color: #fff; background: rgba(255,255,255,.1); }
.sp-privacy-note__kicker {
  display: block; margin-bottom: 7px; color: #FFD166;
  font-size: 10.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
}
.sp-privacy-note b { display: block; margin: 0 26px 8px 0; color: #fff; font-size: 16px; line-height: 1.3; }
.sp-privacy-note p { margin: 0 0 9px; color: #aeb9cf; }
.sp-privacy-note p:last-child { margin-bottom: 0; }
.sp-privacy--no-bar .sp-privacy-btn { bottom: 20px; }
.sp-privacy--no-bar .sp-privacy-note { bottom: 74px; }

@media (max-width: 768px) {
  #sp-widget-root { right: 12px; bottom: 12px; }
  #sp-widget-root.sp-has-page-bar .spw-launcher-wrap { display: none; }
  .spw-panel {
    right: 0; bottom: calc(76px + env(safe-area-inset-bottom, 0px));
    width: calc(100vw - 24px); height: calc(100vh - 190px);
  }
  .sp-privacy-btn {
    left: 12px; bottom: calc(76px + env(safe-area-inset-bottom, 0px));
    min-height: 42px; padding: 7px 12px; font-size: 11px;
  }
  .sp-privacy-note {
    left: 12px; right: 12px; bottom: calc(130px + env(safe-area-inset-bottom, 0px));
    width: auto;
  }
  .sp-privacy--no-bar .sp-privacy-btn { bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
  .sp-privacy--no-bar .sp-privacy-note { bottom: calc(64px + env(safe-area-inset-bottom, 0px)); }
}
`;
    var style = document.createElement("style");
    style.id = "sp-widget-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function initPrivacyBadge() {
    if (document.getElementById("sp-privacy-btn")) return;
    injectStyles();

    var wrap = document.createElement("div");
    wrap.className = "sp-privacy";
    if (!document.querySelector("[data-chat-open]")) wrap.classList.add("sp-privacy--no-bar");
    wrap.innerHTML =
      '<button class="sp-privacy-btn" id="sp-privacy-btn" type="button" aria-expanded="false" aria-controls="sp-privacy-note">' +
        '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="M9 12.2l2.2 2.2L15.5 10"/>' +
        '</svg>' +
        '<span>Без сбора данных</span>' +
      '</button>' +
      '<div class="sp-privacy-note" id="sp-privacy-note" role="dialog" aria-label="Конфиденциальность" hidden>' +
        '<button class="sp-privacy-note__close" type="button" aria-label="Закрыть">×</button>' +
        '<span class="sp-privacy-note__kicker">Конфиденциальность</span>' +
        '<b>Персональные данные не собираются</b>' +
        '<p>Сайт не собирает персональные данные: форм регистрации нет. Анонимный чат работает на собственном сервере и не запрашивает имя, телефон и почту.</p>' +
        '<p>Сторонние виджеты не используются.</p>' +
      '</div>';
    document.body.appendChild(wrap);

    var btn = wrap.querySelector(".sp-privacy-btn");
    var note = wrap.querySelector(".sp-privacy-note");
    var close = wrap.querySelector(".sp-privacy-note__close");

    function setOpen(open) {
      note.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) close.focus();
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(note.hidden);
    });
    close.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("click", function (e) {
      if (!note.hidden && !e.target.closest(".sp-privacy")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !note.hidden) setOpen(false);
    });
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

  function deriveLiveUrl(apiUrl) {
    var u = String(apiUrl || "");
    if (/chat\.php/i.test(u)) return u.replace(/chat\.php/i, "live.php");
    if (/\/api\/chat\/?$/i.test(u)) return u.replace(/\/api\/chat\/?$/i, "/api/live");
    if (/\/chat\/?$/i.test(u)) return u.replace(/\/chat\/?$/i, "/live");
    return "/api/live";
  }

  function init(userConfig) {
    if (document.getElementById("sp-widget-root")) return;
    var config = userConfig || {};
    var apiUrl = config.apiUrl || "/api/chat";
    var liveApiUrl = config.liveApiUrl || deriveLiveUrl(apiUrl);
    var storageKey = config.storageKey || "sp_chat_history_v1";
    var greeting = config.greeting || "Здравствуйте! Я ИИ-консультант «Сибирь Проект» (Тюмень, МСК+2). Чат полностью анонимный: имя, телефон и ИНН не нужны. Для оценки закупки достаточно ИКЗ или ссылки на процедуру, суммы и срока контракта. Подскажу по 44-ФЗ, 223-ФЗ, 615-ПП, банковским гарантиям, ЭЦП/МЧД и защите в ФАС. С чего начнём?";
    var quickReplies = config.quickReplies || [
      "Банковская гарантия от 1 000 ₽",
      "Отклонили заявку / ФАС",
      "ЭЦП и МЧД от 3 500 ₽",
      "Чек-лист перед подачей",
      "Срочно: подписание контракта"
    ];

    injectStyles();

    var root = document.createElement("div");
    root.id = "sp-widget-root";
    root.innerHTML =
      '<div class="spw-invite" aria-live="polite">' +
        '<div class="spw-invite-text"></div>' +
        '<div class="spw-invite-actions">' +
          '<button type="button" class="spw-invite-btn primary" data-act="accept">Да, помогите</button>' +
          '<button type="button" class="spw-invite-btn ghost" data-act="dismiss">Спасибо, не сейчас</button>' +
        '</div>' +
      '</div>' +
      '<div class="spw-launcher-wrap">' +
        '<button class="spw-launcher" type="button" aria-label="Открыть чат">💬</button>' +
      '</div>' +
      '<div class="spw-panel" role="dialog" aria-label="Онлайн-чат">' +
        '<div class="spw-header">' +
          '<div>' +
            '<div class="spw-title">Консультант Сибирь Проект <span class="spw-mode"></span></div>' +
            '<div class="spw-sub"><span class="spw-dot"></span><span class="spw-subtext">Онлайн-консультант</span></div>' +
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
    if (document.querySelector("[data-chat-open]")) root.classList.add("sp-has-page-bar");
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
    var inviteEl = root.querySelector(".spw-invite");
    var inviteTextEl = root.querySelector(".spw-invite-text");
    var modeEl = root.querySelector(".spw-mode");
    var subTextEl = root.querySelector(".spw-subtext");

    var history = [];

    // === «Живой» чат: присутствие, приглашения и режим оператора ===
    var visitorId = null;
    var visitorStarted = 0;
    var liveMode = "ai";
    var liveSeq = 0;
    var currentInvite = null;
    var inviteShownLocally = false;

    function getVisitorId() {
      if (visitorId) return visitorId;
      try {
        visitorId = sessionStorage.getItem("sp_live_visitor_id");
        if (!visitorId || !/^[A-Za-z0-9_-]{8,64}$/.test(visitorId)) {
          visitorId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() :
            ("v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10));
          sessionStorage.setItem("sp_live_visitor_id", visitorId);
        }
        visitorStarted = parseInt(sessionStorage.getItem("sp_live_started") || "0", 10);
        if (!visitorStarted) {
          visitorStarted = Math.floor(Date.now() / 1000);
          sessionStorage.setItem("sp_live_started", String(visitorStarted));
        }
      } catch (e) {
        visitorId = "visitor" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        visitorStarted = Math.floor(Date.now() / 1000);
      }
      return visitorId;
    }

    function liveFetch(action, opts) {
      opts = opts || {};
      var url = liveApiUrl + "?action=" + encodeURIComponent(action);
      if (opts.query) {
        Object.keys(opts.query).forEach(function (k) { url += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(opts.query[k]); });
      }
      return fetch(url, {
        method: opts.method || "GET",
        credentials: "same-origin",
        headers: opts.method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: opts.method === "POST" ? JSON.stringify(opts.body || {}) : undefined
      }).then(function (res) { return res.ok ? res.json() : Promise.reject(new Error("HTTP " + res.status)); });
    }

    function setLiveMode(mode) {
      if (!mode || mode === liveMode) return;
      liveMode = mode;
      var on = mode === "operator";
      modeEl.textContent = on ? "• специалист на связи" : "";
      subTextEl.textContent = on ? "Специалист отвечает в чате" : "Онлайн-консультант";
      appendMessage("assistant", on
        ? "Специалист подключился к диалогу и отвечает здесь, в чате."
        : "ИИ-консультант снова на связи.", false);
    }

    function hideInvite() {
      inviteEl.classList.remove("show");
      currentInvite = null;
    }

    function showInvite(text, inviteId) {
      if (!text || panel.classList.contains("open") || currentInvite) return;
      currentInvite = { id: inviteId || 0, text: text };
      inviteTextEl.textContent = text;
      inviteEl.classList.add("show");
    }

    function inviteDone() {
      if (!currentInvite) return;
      var payload = { id: getVisitorId(), invite_id: currentInvite.id || 0 };
      hideInvite();
      liveFetch("invite_done", { method: "POST", body: payload }).catch(function () {});
    }

    function applyLiveData(data) {
      if (!data || !data.ok) return;
      setLiveMode(data.mode);
      var messages = data.messages || [];
      messages.forEach(function (m) {
        var id = parseInt(m.id || 0, 10);
        if (id <= liveSeq) return;
        liveSeq = Math.max(liveSeq, id);
        var role = String(m.role || "");
        if (role === "user" || role === "system") return;
        appendMessage("assistant", String(m.text || ""), false);
      });
      // Не сдвигаем liveSeq по last_message_id: heartbeat может «перепрыгнуть»
      // через ещё не прочитанное сообщение оператора и потерять его.
      if (data.invite && data.invite.text) {
        showInvite(data.invite.text, data.invite.id);
      }
    }

    function heartbeat() {
      return liveFetch("ping", {
        method: "POST",
        body: {
          id: getVisitorId(),
          url: location.href,
          title: document.title,
          started: visitorStarted,
          since: liveSeq
        }
      }).then(applyLiveData).catch(function () {});
    }

    function pollLive() {
      return liveFetch("poll", { query: { id: getVisitorId(), since: String(liveSeq) } })
        .then(applyLiveData).catch(function () {});
    }

    function maybeLocalInvite(reason) {
      // Один раз за загрузку страницы. История чата и флаг из sessionStorage
      // больше не блокируют приглашение: иначе повторные заходы и переходы
      // между страницами в той же вкладке не показывали его вообще.
      if (inviteShownLocally || panel.classList.contains("open") || currentInvite) return;
      inviteShownLocally = true;
      var texts = {
        time: "Здравствуйте! Если есть вопрос по закупке или гарантии — помогу прямо здесь, в чате.",
        scroll: "Нужна помощь с заявкой, гарантией или ЭЦП? Напишите здесь — отвечу оперативно.",
        exit: "Уходите? Оставьте вопрос в чате — подскажу по 44-ФЗ, гарантиям и срокам.",
        page: "Здравствуйте! По этой странице есть вопросы? Отвечу в чате анонимно и без регистрации."
      };
      showInvite(texts[reason] || texts.time, 0);
    }

    function initInviteTriggers() {
      setTimeout(function () { maybeLocalInvite("time"); }, 30000);
      var scrollDone = false;
      window.addEventListener("scroll", function () {
        if (scrollDone) return;
        var h = document.documentElement.scrollHeight - window.innerHeight;
        if (h > 300 && window.scrollY / h > 0.55) { scrollDone = true; maybeLocalInvite("scroll"); }
      }, { passive: true });
      document.addEventListener("mouseout", function (e) {
        if (!e.relatedTarget && e.clientY <= 0) maybeLocalInvite("exit");
      });
      var keyPage = /checklist|bankovskie-garantii|uslugi|kik|faktoring|ecp|zashchita-fas|garantii|tendernoe|operator/i.test(location.pathname);
      if (keyPage) setTimeout(function () { maybeLocalInvite("page"); }, 12000);
    }

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

    function mirrorLive(role, text) {
      return liveFetch("message", { method: "POST", body: { id: getVisitorId(), role: role, text: String(text || "") } })
        .then(function (d) { if (d && d.id) liveSeq = Math.max(liveSeq, parseInt(d.id, 10)); })
        .catch(function () {});
    }

    function getRefreshUrl() {
      if (/chat\.php(\?.*)?$/i.test(apiUrl)) return apiUrl.replace(/chat\.php(\?.*)?$/i, "refresh_token.php$1");
      return apiUrl.replace(/\/?$/, "") + "/../refresh_token.php";
    }

    async function triggerTokenRefresh() {
      try {
        var ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 25000) : null;
        var res = await fetch(getRefreshUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl ? ctrl.signal : undefined
        });
        if (timer) clearTimeout(timer);
        if (res && res.ok) {
          try { await res.json(); } catch (e) {}
          return true;
        }
      } catch (e) {}
      return false;
    }

    async function requestAnswer(message, historyForRequest, attempt) {
      attempt = attempt || 1;
      var maxAttempts = 6;
      var res, data = null, rawText = "";
      try {
        res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: message, history: historyForRequest })
        });
        rawText = await res.text();
        try { data = rawText ? JSON.parse(rawText) : null; } catch (e) { data = null; }
      } catch (e) {
        if (attempt < maxAttempts) {
          await new Promise(function (resolve) { setTimeout(resolve, 1500 * attempt); });
          return requestAnswer(message, historyForRequest, attempt + 1);
        }
        throw e;
      }

      if (data && data.retry && attempt < maxAttempts) {
        if (data.need_refresh) {
          await triggerTokenRefresh();
        }
        await new Promise(function (resolve) { setTimeout(resolve, 1200); });
        return requestAnswer(message, historyForRequest, attempt + 1);
      }

      if (res.ok && data && data.answer) return String(data.answer);

      // Временные ошибки хостинга/сети (например 502 interstitial) — повторяем
      if (attempt < maxAttempts && (res.status === 502 || res.status === 503 || res.status === 504 || res.status === 429)) {
        if (res.status === 503 || res.status === 502) {
          try { await triggerTokenRefresh(); } catch (e) {}
        }
        await new Promise(function (resolve) { setTimeout(resolve, 1500 * attempt); });
        return requestAnswer(message, historyForRequest, attempt + 1);
      }

      var err = new Error("HTTP " + res.status);
      err.data = data;
      err.raw = rawText;
      throw err;
    }

    async function sendMessage(text) {
      var message = String(text != null ? text : input.value || "").trim();
      if (!message || sendBtn.disabled) return;
      appendMessage("user", message);
      input.value = "";
      input.style.height = "auto";

      // В режиме оператора сообщение уходит оператору, ИИ не вызывается.
      if (liveMode === "operator") {
        setTyping(false);
        try {
          var sent = await liveFetch("message", { method: "POST", body: { id: getVisitorId(), text: message } });
          if (sent && sent.id) liveSeq = Math.max(liveSeq, parseInt(sent.id, 10));
        } catch (e) {
          appendMessage("assistant", "Не удалось передать сообщение оператору. Попробуйте ещё раз или напишите на sibir-proekt72@mail.ru.");
        }
        return;
      }

      var historyForRequest = history.slice(0, -1).slice(-12);
      setTyping(true);
      mirrorLive("user", message);
      try {
        var answer = await requestAnswer(message, historyForRequest, 1);
        appendMessage("assistant", answer);
        mirrorLive("assistant", answer);
      } catch (e) {
        var fallback = "Сейчас не удалось получить ответ. Пожалуйста, попробуйте чуть позже или свяжитесь со специалистами:\n- Руководитель: 8 (922) 477-05-34\n- Отдел по работе с клиентами: +7 (982) 972-98-68\n- Почта: sibir-proekt72@mail.ru, sibir-proekt72@yandex.ru\n- График: Пн–Пт 09:00–18:00 (МСК+2)";
        appendMessage("assistant", fallback);
        mirrorLive("assistant", fallback);
      } finally {
        setTyping(false);
      }
    }

    function openPanel() {
      panel.classList.add("open");
      if (currentInvite) inviteDone();
      setTimeout(function () { input.focus(); }, 50);
    }
    function closePanel() { panel.classList.remove("open"); }

    window.SibirProektGigaChatWidgetOpen = openPanel;
    window.SibirProektGigaChatWidgetClose = closePanel;
    // Отправка расчёта из калькулятора гарантий в этот же анонимный чат
    window.SibirProektGigaChatWidgetSend = function (text) {
      openPanel();
      sendMessage(text);
    };

    launcher.addEventListener("click", function () { panel.classList.contains("open") ? closePanel() : openPanel(); });
    closeBtn.addEventListener("click", closePanel);
    inviteEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".spw-invite-btn");
      if (!btn) return;
      var act = btn.getAttribute("data-act");
      var text = currentInvite ? currentInvite.text : "";
      inviteDone();
      if (act !== "accept") return;
      openPanel();
      if (text) appendMessage("assistant", text, false);
    });

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

    // Присутствие, приглашения и опрос сообщений оператора
    getVisitorId();
    initInviteTriggers();
    heartbeat();
    setInterval(heartbeat, 15000);
    setInterval(pollLive, 4000);
    window.addEventListener("beforeunload", function () {
      try {
        navigator.sendBeacon(liveApiUrl + "?action=ping", JSON.stringify({
          id: getVisitorId(),
          url: location.href,
          title: document.title,
          started: visitorStarted,
          since: liveSeq
        }));
      } catch (e) {}
    });
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
      if (current.dataset.liveApiUrl) cfg.liveApiUrl = current.dataset.liveApiUrl;
      if (current.dataset.storageKey) cfg.storageKey = current.dataset.storageKey;
    }
    initPrivacyBadge();
    init(cfg);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})();
