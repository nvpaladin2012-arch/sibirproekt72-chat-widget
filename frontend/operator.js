(function () {
  'use strict';

  var API = String(window.SIBIRPROEKT_LIVE_API || '/api/live').replace(/\/$/, '');
  var visitors = [];
  var selectedId = null;
  var lastMsgId = 0;
  var pollTimer = null;
  var msgTimer = null;
  var phrases = [];

  var $ = function (id) { return document.getElementById(id); };
  var loginView = $('loginView');
  var appView = $('appView');
  var topActions = $('topActions');
  var loginForm = $('loginForm');
  var loginStatus = $('loginStatus');
  var visitorsList = $('visitorsList');
  var visitorsCount = $('visitorsCount');
  var messagesEl = $('messages');
  var chatTitle = $('chatTitle');
  var chatSub = $('chatSub');
  var replyInput = $('replyInput');
  var sendBtn = $('sendBtn');
  var spellBtn = $('spellBtn');
  var spellResult = $('spellResult');
  var inviteBtn = $('inviteBtn');
  var inviteBox = $('inviteBox');
  var inviteText = $('inviteText');
  var inviteSendBtn = $('inviteSendBtn');
  var inviteCancelBtn = $('inviteCancelBtn');
  var inviteStatus = $('inviteStatus');
  var takeoverBtn = $('takeoverBtn');
  var releaseBtn = $('releaseBtn');
  var phrasesEl = $('phrases');
  var phraseEditor = $('phraseEditor');
  var phrasesText = $('phrasesText');

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtSec(sec) {
    sec = Math.max(0, parseInt(sec || 0, 10));
    var m = Math.floor(sec / 60), s = sec % 60;
    if (m < 60) return m + ' мин ' + s + ' с';
    var h = Math.floor(m / 60); m = m % 60;
    return h + ' ч ' + m + ' мин';
  }
  function shortUrl(url) {
    try { var u = new URL(url, location.origin); return u.pathname + (u.search || ''); } catch (e) { return url || '/'; }
  }

  async function api(action, opts) {
    opts = opts || {};
    var method = opts.method || 'GET';
    var url = API + '?action=' + encodeURIComponent(action);
    if (method === 'GET' && opts.query) {
      Object.keys(opts.query).forEach(function (k) { url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(opts.query[k]); });
    }
    var res = await fetch(url, {
      method: method,
      credentials: 'include',
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify(opts.body || {}) : undefined
    });
    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || !data || data.ok === false) {
      var err = new Error((data && (data.error || data.detail)) || ('HTTP ' + res.status));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function showApp(on) {
    loginView.style.display = on ? 'none' : '';
    appView.style.display = on ? '' : 'none';
    topActions.style.display = on ? 'flex' : 'none';
  }

  function selectedVisitor() {
    return visitors.find(function (v) { return v.id === selectedId; }) || null;
  }

  function renderVisitors() {
    visitorsCount.textContent = String(visitors.length);
    if (!visitors.length) {
      visitorsList.innerHTML = '<div class="empty">Сейчас на сайте никого нет. Список обновляется автоматически.</div>';
      return;
    }
    visitorsList.innerHTML = visitors.map(function (v) {
      var active = v.id === selectedId ? ' active' : '';
      var mode = v.mode === 'operator' ? '<span class="pill op">оператор</span>' : '<span class="pill">ИИ</span>';
      var unread = v.unread ? '<span class="pill unread">+' + v.unread + '</span>' : '';
      var title = esc(v.title || shortUrl(v.url));
      var meta = esc(shortUrl(v.url)) + '<br>На сайте: ' + fmtSec(v.seconds) + (v.last_message ? '<br>Последнее: ' + esc(v.last_message.slice(0, 70)) : '');
      return '<div class="visitor' + active + '" data-id="' + esc(v.id) + '">' +
        '<div class="row"><div class="url" title="' + esc(v.url) + '">' + title + '</div><div style="display:flex;gap:6px">' + unread + mode + '</div></div>' +
        '<div class="meta">' + meta + '</div></div>';
    }).join('');
  }

  function renderMessages(items, append) {
    if (!append) messagesEl.innerHTML = '';
    if (!append && !items.length) {
      messagesEl.innerHTML = '<div class="empty">Сообщений пока нет. Можно отправить приглашение или подключиться к диалогу.</div>';
      return;
    }
    var empty = messagesEl.querySelector('.empty');
    if (empty) empty.remove();
    items.forEach(function (m) {
      var role = m.role === 'user' ? 'user' : (m.role === 'operator' ? 'operator' : (m.role === 'system' ? 'system' : 'assistant'));
      var div = document.createElement('div');
      div.className = 'msg ' + role;
      div.textContent = m.text || '';
      messagesEl.appendChild(div);
      lastMsgId = Math.max(lastMsgId, parseInt(m.id || 0, 10));
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function updateChatHeader() {
    var v = selectedVisitor();
    if (!v) {
      chatTitle.textContent = 'Выберите посетителя';
      chatSub.textContent = 'Слева отображаются посетители, которые сейчас на сайте. Можно отправить приглашение или подключиться к диалогу.';
      inviteBtn.disabled = takeoverBtn.disabled = releaseBtn.disabled = sendBtn.disabled = spellBtn.disabled = replyInput.disabled = true;
      $('composerHint').textContent = 'Подключитесь к диалогу, чтобы отвечать как оператор.';
      return;
    }
    chatTitle.textContent = (v.title || shortUrl(v.url)) + ' • ' + fmtSec(v.seconds);
    chatSub.textContent = shortUrl(v.url) + ' • режим: ' + (v.mode === 'operator' ? 'оператор' : 'ИИ-консультант') + ' • последнее обновление: ' + new Date((v.last_seen || 0) * 1000).toLocaleTimeString('ru-RU');
    inviteBtn.disabled = false;
    takeoverBtn.disabled = v.mode === 'operator';
    releaseBtn.disabled = v.mode !== 'operator';
    var canSend = v.mode === 'operator';
    sendBtn.disabled = spellBtn.disabled = replyInput.disabled = !canSend;
    $('composerHint').textContent = canSend ? 'Enter — отправить, Shift+Enter — новая строка.' : 'Подключитесь к диалогу, чтобы отвечать как оператор.';
  }

  async function loadVisitors() {
    try {
      var data = await api('visitors');
      visitors = data.visitors || [];
      renderVisitors();
      updateChatHeader();
    } catch (e) {
      if (e.status === 401) { stopPolling(); showApp(false); loginStatus.textContent = 'Сессия истекла, войдите снова.'; loginStatus.className = 'status err'; }
    }
  }

  async function loadMessages(reset) {
    if (!selectedId) return;
    if (reset) { lastMsgId = 0; }
    try {
      var data = await api('messages', { query: { id: selectedId, since: String(lastMsgId) } });
      renderMessages(data.messages || [], !reset);
      if (data.mode) {
        var v = selectedVisitor();
        if (v) { v.mode = data.mode; v.unread = 0; renderVisitors(); updateChatHeader(); }
      }
    } catch (e) {
      if (e.status === 401) { stopPolling(); showApp(false); }
    }
  }

  async function selectVisitor(id) {
    selectedId = id;
    lastMsgId = 0;
    setInviteBox(false);
    renderVisitors();
    updateChatHeader();
    await loadMessages(true);
  }

  async function sendReply() {
    var v = selectedVisitor();
    var text = replyInput.value.trim();
    if (!v || !text) return;
    sendBtn.disabled = true;
    try {
      await api('message', { method: 'POST', body: { id: v.id, text: text } });
      replyInput.value = '';
      spellResult.style.display = 'none';
      await loadMessages(false);
      await loadVisitors();
    } catch (e) {
      alert(e.message || 'Не удалось отправить сообщение');
    } finally {
      updateChatHeader();
    }
  }

  function setInviteBox(open) {
    inviteBox.style.display = open ? 'flex' : 'none';
    inviteStatus.textContent = '';
    if (open) inviteText.focus();
  }

  async function sendInvite() {
    var v = selectedVisitor();
    var text = inviteText.value.trim();
    if (!v || !text) return;
    inviteSendBtn.disabled = true;
    inviteStatus.textContent = 'Отправляю...';
    try {
      await api('invite', { method: 'POST', body: { id: v.id, text: text } });
      inviteStatus.style.color = '#86efac';
      inviteStatus.textContent = 'Приглашение отправлено в виджет посетителя.';
      setTimeout(function () { setInviteBox(false); }, 1200);
    } catch (e) {
      inviteStatus.style.color = '#fca5a5';
      inviteStatus.textContent = e.message || 'Ошибка отправки приглашения';
    } finally {
      inviteSendBtn.disabled = false;
      updateChatHeader();
    }
  }

  async function doTakeover() {
    var v = selectedVisitor(); if (!v) return;
    await api('takeover', { method: 'POST', body: { id: v.id } });
    await loadVisitors(); await loadMessages(false);
  }
  async function doRelease() {
    var v = selectedVisitor(); if (!v) return;
    await api('release', { method: 'POST', body: { id: v.id } });
    await loadVisitors(); await loadMessages(false);
  }

  function renderPhrases() {
    phrasesEl.innerHTML = '';
    phrases.forEach(function (p) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'phrase'; btn.textContent = p;
      btn.addEventListener('click', function () {
        if (replyInput.disabled) return;
        var sep = replyInput.value && !/\s$/.test(replyInput.value) ? '\n' : '';
        replyInput.value += sep + p;
        replyInput.focus();
      });
      phrasesEl.appendChild(btn);
    });
  }

  async function loadPhrases() {
    try {
      var data = await api('phrases');
      phrases = data.phrases || [];
      renderPhrases();
    } catch (e) {}
  }

  async function savePhrases() {
    var items = phrasesText.value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    var data = await api('phrases', { method: 'POST', body: { phrases: items } });
    phrases = data.phrases || items;
    renderPhrases();
    phraseEditor.style.display = 'none';
    phrasesEl.style.display = '';
  }

  async function checkSpelling() {
    var text = replyInput.value;
    if (!text.trim()) return;
    spellBtn.disabled = true;
    spellResult.style.display = 'block';
    spellResult.textContent = 'Проверяю...';
    try {
      var data = await api('spellcheck', { method: 'POST', body: { text: text } });
      var errors = data.errors || [];
      if (!errors.length) {
        spellResult.innerHTML = '<span style="color:#86efac">Ошибок не найдено</span>' + (data.source === 'local' ? ' <span style="color:#93a4c4">(локальная проверка)</span>' : '');
        return;
      }
      var html = '<div style="margin-bottom:6px;color:#fcd34d">Найдены возможные ошибки:</div>';
      errors.slice(0, 12).forEach(function (e, i) {
        var sug = (e.suggestions || []).slice(0, 4).map(function (s) {
          return '<span class="err" data-i="' + i + '" data-s="' + esc(s) + '">' + esc(s) + '</span>';
        }).join(', ');
        html += '<div style="margin:4px 0"><b>' + esc(e.word) + '</b>' + (sug ? ' → ' + sug : '') + '</div>';
      });
      spellResult.innerHTML = html;
      spellResult.querySelectorAll('.err').forEach(function (el) {
        el.addEventListener('click', function () {
          var i = parseInt(el.getAttribute('data-i'), 10);
          var sug = el.getAttribute('data-s') || '';
          var err = errors[i];
          if (!err) return;
          replyInput.value = replyInput.value.replace(err.word, sug);
          el.style.color = '#86efac';
          el.textContent = sug + ' ✓';
        });
      });
    } catch (e) {
      spellResult.textContent = 'Не удалось проверить орфографию: ' + (e.message || 'ошибка');
    } finally { spellBtn.disabled = replyInput.disabled; }
  }

  function startPolling() {
    stopPolling();
    loadVisitors(); loadPhrases();
    pollTimer = setInterval(loadVisitors, 5000);
    msgTimer = setInterval(function () { if (selectedId) loadMessages(false); }, 3000);
  }
  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    if (msgTimer) clearInterval(msgTimer);
    pollTimer = msgTimer = null;
  }

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    loginStatus.textContent = 'Вход...'; loginStatus.className = 'status';
    try {
      await api('login', { method: 'POST', body: { password: $('password').value } });
      $('password').value = '';
      showApp(true);
      startPolling();
    } catch (err) {
      loginStatus.textContent = err.message || 'Ошибка входа';
      loginStatus.className = 'status err';
    }
  });

  $('logoutBtn').addEventListener('click', async function () {
    try { await api('logout', { method: 'POST', body: {} }); } catch (e) {}
    stopPolling(); showApp(false);
  });

  visitorsList.addEventListener('click', function (e) {
    var item = e.target.closest('.visitor');
    if (item) selectVisitor(item.getAttribute('data-id'));
  });
  sendBtn.addEventListener('click', sendReply);
  replyInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
  });
  inviteBtn.addEventListener('click', function () { setInviteBox(true); });
  inviteSendBtn.addEventListener('click', sendInvite);
  inviteCancelBtn.addEventListener('click', function () { setInviteBox(false); });
  inviteText.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); sendInvite(); }
  });
  takeoverBtn.addEventListener('click', doTakeover);
  releaseBtn.addEventListener('click', doRelease);
  spellBtn.addEventListener('click', checkSpelling);
  $('editPhrasesBtn').addEventListener('click', function () {
    phraseEditor.style.display = '';
    phrasesEl.style.display = 'none';
    phrasesText.value = phrases.join('\n');
  });
  $('cancelPhrasesBtn').addEventListener('click', function () { phraseEditor.style.display = 'none'; phrasesEl.style.display = ''; });
  $('savePhrasesBtn').addEventListener('click', savePhrases);

  // Авто-вход, если сессия уже есть
  (async function boot() {
    try {
      await api('visitors');
      showApp(true);
      startPolling();
    } catch (e) {
      showApp(false);
    }
  })();
})();
