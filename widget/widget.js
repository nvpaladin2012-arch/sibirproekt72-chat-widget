(function () {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function linkify(text) {
    var escaped = escapeHtml(text);
    var urlRe = /(https?:\/\/[^\s<]+)/g;
    return escaped.replace(urlRe, function (url) {
      var clean = url.replace(/[),.;!?]+$/g, "");
      var tail = url.slice(clean.length);
      return '<a href="' + clean + '" target="_blank" rel="noopener noreferrer">' + clean + '</a>' + tail;
    });
  }

  function createWidget(options) {
    var opts = options || {};
    var apiUrl = opts.apiUrl || "/api/chat";
    var title = opts.title || "Консультант «Сибирь Проект»";
    var subtitle = opts.subtitle || "На связи 24/7";
    var greeting = opts.greeting ||
      "Здравствуйте! Я виртуальный консультант «Сибирь Проект». Помогу разобраться в услугах по 44-ФЗ, 223-ФЗ и 615-ПП, сориентировать по срокам, ориентировочным ценам и нужному разделу сайта.\n\nОбщение анонимное — пожалуйста, не отправляйте в чат личные данные или документы. Чем могу помочь?";
    var suggestions = opts.suggestions || [
      "Какие у вас услуги?",
      "Сколько стоит банковская гарантия?",
      "Как быстро выпускается ЭЦП?",
      "Что делать, если отклонили заявку?",
      "Как с вами связаться?"
    ];

    if (document.getElementById("sp-chat-widget-root")) return;

    var root = document.createElement("div");
    root.id = "sp-chat-widget-root";
    root.innerHTML =
      '<button class="sp-chat-launcher" aria-label="Открыть чат" title="Чат с консультантом">💬</button>' +
      '<div class="sp-chat-panel" role="dialog" aria-label="Чат-консультант">' +
        '<div class="sp-chat-header">' +
          '<div class="sp-chat-header-top">' +
            '<div><div class="sp-chat-title">' + escapeHtml(title) + '</div><div class="sp-chat-subtitle">' + escapeHtml(subtitle) + '</div></div>' +
            '<button class="sp-chat-close" aria-label="Закрыть чат">×</button>' +
          '</div>' +
        '</div>' +
        '<div class="sp-chat-privacy">Общение анонимное. Не указывайте ФИО, телефоны, email, адреса, реквизиты или документы.</div>' +
        '<div class="sp-chat-messages"></div>' +
        '<div class="sp-typing">Консультант печатает…</div>' +
        '<div class="sp-chat-suggestions"></div>' +
        '<form class="sp-chat-form">' +
          '<textarea class="sp-chat-input" rows="1" placeholder="Напишите вопрос…" aria-label="Сообщение"></textarea>' +
          '<button type="submit" class="sp-chat-send">Отправить</button>' +
        '</form>' +
      '</div>';

    document.body.appendChild(root);

    var launcher = root.querySelector(".sp-chat-launcher");
    var panel = root.querySelector(".sp-chat-panel");
    var closeBtn = root.querySelector(".sp-chat-close");
    var messagesEl = root.querySelector(".sp-chat-messages");
    var form = root.querySelector(".sp-chat-form");
    var input = root.querySelector(".sp-chat-input");
    var sendBtn = root.querySelector(".sp-chat-send");
    var typingEl = root.querySelector(".sp-typing");
    var suggestionsEl = root.querySelector(".sp-chat-suggestions");

    var history = [];
    var greeted = false;

    function scrollToBottom() {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function addMessage(role, text, sources) {
      var msg = document.createElement("div");
      msg.className = "sp-msg " + (role === "user" ? "user" : "bot");
      var html = linkify(text || "");
      if (sources && sources.length) {
        var unique = [];
        var seen = {};
        for (var i = 0; i < sources.length; i++) {
          var s = sources[i];
          var key = (s.url || "") + "|" + (s.title || "");
          if (seen[key]) continue;
          seen[key] = true;
          unique.push(s);
        }
        if (unique.length) {
          html += '<div class="sp-sources"><div>Источники:</div><ul>' + unique.map(function (s) {
            var t = escapeHtml(s.title || s.url || "Источник");
            if (s.url) return '<li><a href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener noreferrer">' + t + '</a></li>';
            return '<li>' + t + '</li>';
          }).join("") + '</ul></div>';
        }
      }
      msg.innerHTML = html;
      messagesEl.appendChild(msg);
      scrollToBottom();
    }

    function setTyping(show) {
      typingEl.className = "sp-typing" + (show ? " show" : "");
      sendBtn.disabled = !!show;
      if (show) scrollToBottom();
    }

    function renderSuggestions() {
      suggestionsEl.innerHTML = "";
      suggestions.forEach(function (text) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sp-chip";
        b.textContent = text;
        b.addEventListener("click", function () {
          input.value = text;
          submitMessage(text);
        });
        suggestionsEl.appendChild(b);
      });
    }

    function openPanel() {
      panel.classList.add("open");
      if (!greeted) {
        addMessage("bot", greeting);
        greeted = true;
      }
      setTimeout(function () { input.focus(); }, 50);
    }

    function closePanel() {
      panel.classList.remove("open");
    }

    function submitMessage(text) {
      var message = (text || input.value || "").trim();
      if (!message) return;
      addMessage("user", message);
      history.push({ role: "user", content: message });
      input.value = "";
      input.style.height = "auto";
      setTyping(true);

      fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message, history: history.slice(-10) })
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (data) {
          var answer = data.answer || "Не удалось получить ответ. Пожалуйста, попробуйте еще раз или свяжитесь с нами по контактам на сайте.";
          addMessage("bot", answer, data.sources || []);
          history.push({ role: "assistant", content: answer });
        })
        .catch(function () {
          addMessage("bot", "Сейчас не удалось связаться с консультантом. Вы можете уточнить информацию по телефону 8 (922) 477-05-34 или +7 (982) 972-98-68, email: sibir-proekt72@mail.ru, sibir-proekt72@yandex.ru (Пн–Пт 09:00–18:00, МСК+2).");
        })
        .finally(function () {
          setTyping(false);
        });
    }

    launcher.addEventListener("click", function () {
      if (panel.classList.contains("open")) closePanel(); else openPanel();
    });
    closeBtn.addEventListener("click", closePanel);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      submitMessage();
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitMessage();
      }
    });

    input.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 120) + "px";
    });

    renderSuggestions();
  }

  window.SibirProektChatWidget = { init: createWidget };

  document.addEventListener("DOMContentLoaded", function () {
    if (window.SIBIRPROEKT_CHAT_AUTO_INIT !== false) {
      var cfg = window.SIBIRPROEKT_CHAT_CONFIG || {};
      createWidget(cfg);
    }
  });
})();
