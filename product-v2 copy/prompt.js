(function () {
  const DEFAULT_REPLY = 'Pick any that apply, write your own below, or keep asking.';

  function looksLikeQuestion(text) {
    const t = text.trim();
    if (!t) return false;
    if (/\?/.test(t)) return true;
    if (/^(yes|no|yeah|yep|nope)\b/i.test(t)) return false;
    return /^(what|why|how|should|can|could|would|do|does|is|are|who|when|where|which|help|recommend|explain|tell)\b/i.test(t);
  }

  function matchChoice(question, text) {
    const t = text.trim().toLowerCase();
    if (!question.choices) return null;
    for (const c of question.choices) {
      if (c.value.toLowerCase() === t || c.label.toLowerCase() === t) return c;
      if (c.match && c.match.test(t)) return c;
    }
    return null;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function PromptInterview(opts) {
    this.questions = opts.questions || [];
    this.storagePrefix = opts.storagePrefix || '';
    this.stage = document.getElementById(opts.stageId || 'prompt-stage');
    this.nextBar = document.getElementById(opts.nextBarId || 'next-section-bar');
    this.index = 0;
    this.pending = new Set();
    this.custom = [];
    this.busy = false;
    this.asks = [];
  }

  PromptInterview.prototype.begin = function () {
    this.index = 0;
    this.showPrompt();
  };

  PromptInterview.prototype.current = function () {
    return this.questions[this.index];
  };

  PromptInterview.prototype.corner = function () {
    return '<div class="ll-corner">Decision-making</div>';
  };

  PromptInterview.prototype.progress = function () {
    const fill = document.getElementById('ll-progress-fill');
    if (!fill) return;
    const total = this.questions.length || 1;
    const pct = Math.min(100, ((this.index + 1) / total) * 100);
    fill.style.width = pct + '%';
  };

  PromptInterview.prototype.showPrompt = function () {
    const q = this.current();
    if (!q) { this.finish(); return; }
    this.pending = new Set();
    this.custom = [];
    this.busy = false;
    this.asks = [];
    this.progress();
    this.showRespond();
  };

  PromptInterview.prototype.guide = function () {
    if (this.asks && this.asks.length) return 'Still this question — pick, write, or ask another.';
    const q = this.current();
    if (q && q.type === 'single') return 'Choose one, write your own, or ask first.';
    return 'Select any, write your own, or ask first.';
  };

  PromptInterview.prototype.showRespond = function () {
    const q = this.current();
    const asking = this.asks.length > 0;
    this.stage.classList.toggle('is-asking', asking);

    const askHtml = asking
      ? '<div class="ll-ask" id="ll-ask">' + this.asks.map((m) => this.askHtml(m.role, m.text)).join('') + '</div>'
      : '';

    this.stage.innerHTML =
      '<div class="ll-q-block">' +
        this.corner() +
        '<div class="ll-q">' + escapeHtml(q.question) + '</div>' +
        askHtml +
      '</div>' +
      '<div class="ll-response" id="ll-response">' +
        '<div class="ll-guide" id="ll-guide">' + escapeHtml(this.guide()) + '</div>' +
        '<div class="ll-choices" id="ll-choices"></div>' +
        '<div class="ll-dock">' +
          '<textarea class="ll-input" id="ll-input" rows="1" placeholder="' +
            (asking ? 'Ask a follow-up, or write your answer…' : 'Write your own, or ask a question…') +
          '"></textarea>' +
          '<button class="ll-send" id="ll-send" type="button">Continue</button>' +
        '</div>' +
      '</div>';

    this.bindRespond();
    this.renderChoices();
    this.scrollAsk();
    setTimeout(() => document.getElementById('ll-input')?.focus(), 40);
  };

  PromptInterview.prototype.askHtml = function (role, text) {
    if (role === 'typing') {
      return '<div class="ll-ask-msg mod typing"><span class="ll-ask-dots"><i></i><i></i><i></i></span></div>';
    }
    return '<div class="ll-ask-msg ' + (role === 'you' ? 'you' : 'mod') + '">' + escapeHtml(text) + '</div>';
  };

  PromptInterview.prototype.scrollAsk = function () {
    const block = this.stage.querySelector('.ll-q-block');
    if (block) requestAnimationFrame(() => { block.scrollTop = block.scrollHeight; });
  };

  PromptInterview.prototype.setWaiting = function (on) {
    this.busy = on;
    const res = document.getElementById('ll-response');
    const input = document.getElementById('ll-input');
    const send = document.getElementById('ll-send');
    if (res) res.classList.toggle('is-waiting', on);
    if (input) input.disabled = on;
    if (send) send.disabled = on;
  };

  PromptInterview.prototype.bindRespond = function () {
    const send = document.getElementById('ll-send');
    const input = document.getElementById('ll-input');
    send.addEventListener('click', () => this.submit());
    input.addEventListener('input', () => this.syncSend());
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      e.preventDefault();
      const text = input.value.trim();
      if (looksLikeQuestion(text)) this.ask(text);
      else if (text) this.addTyped(text);
      else this.commit();
    });
  };

  PromptInterview.prototype.syncSend = function () {
    const send = document.getElementById('ll-send');
    const input = document.getElementById('ll-input');
    if (!send || !input) return;
    send.textContent = looksLikeQuestion(input.value) ? 'Ask' : 'Continue';
  };

  PromptInterview.prototype.renderChoices = function () {
    const q = this.current();
    const wrap = document.getElementById('ll-choices');
    if (!wrap) return;
    wrap.innerHTML = '';
    (q.choices || []).forEach((c) => {
      wrap.appendChild(this.choiceButton(c.value, c.label, this.pending.has(c.value), false));
    });
    this.custom.forEach((txt) => {
      wrap.appendChild(this.choiceButton(txt, txt, true, true));
    });
  };

  PromptInterview.prototype.choiceButton = function (value, label, selected, isCustom) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'll-choice' + (selected ? ' selected' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => this.toggleChoice(value, isCustom));
    return btn;
  };

  PromptInterview.prototype.toggleChoice = function (value, isCustom) {
    const q = this.current();
    const exclusive = q.exclusive || [];
    if (q.type === 'single') {
      if (isCustom) {
        this.custom = this.custom[0] === value ? [] : [value];
        this.pending.clear();
      } else if (this.pending.has(value)) {
        this.pending.delete(value);
      } else {
        this.pending = new Set([value]);
        this.custom = [];
      }
      this.renderChoices();
      return;
    }
    if (isCustom) this.custom = this.custom.filter((t) => t !== value);
    else if (this.pending.has(value)) this.pending.delete(value);
    else if (exclusive.includes(value)) {
      this.pending.clear();
      this.custom = [];
      this.pending.add(value);
    } else {
      exclusive.forEach((ex) => this.pending.delete(ex));
      this.pending.add(value);
    }
    this.renderChoices();
  };

  PromptInterview.prototype.submit = function () {
    if (this.busy) return;
    const input = document.getElementById('ll-input');
    const text = (input && input.value.trim()) || '';
    if (looksLikeQuestion(text)) this.ask(text);
    else this.commit();
  };

  PromptInterview.prototype.ask = function (text) {
    if (this.busy || !text) return;
    const q = this.current();
    const reply = (typeof q.reply === 'function' ? q.reply(text) : DEFAULT_REPLY) || DEFAULT_REPLY;
    const input = document.getElementById('ll-input');
    if (input) input.value = '';
    this.syncSend();

    this.asks.push({ role: 'you', text: text });
    this.stage.classList.add('is-asking');

    let thread = document.getElementById('ll-ask');
    if (!thread) {
      thread = document.createElement('div');
      thread.className = 'll-ask';
      thread.id = 'll-ask';
      this.stage.querySelector('.ll-q-block').appendChild(thread);
    }

    const you = document.createElement('div');
    you.className = 'll-ask-msg you';
    you.textContent = text;
    thread.appendChild(you);

    const typing = document.createElement('div');
    typing.className = 'll-ask-msg mod typing';
    typing.innerHTML = '<span class="ll-ask-dots"><i></i><i></i><i></i></span>';
    thread.appendChild(typing);
    this.scrollAsk();
    this.setWaiting(true);

    setTimeout(() => {
      typing.classList.remove('typing');
      typing.innerHTML = '';
      typing.textContent = reply;
      this.asks.push({ role: 'mod', text: reply });
      const guide = document.getElementById('ll-guide');
      if (guide) guide.textContent = this.guide();
      if (input) input.placeholder = 'Ask a follow-up, or write your answer…';
      this.setWaiting(false);
      this.scrollAsk();
      input && input.focus();
    }, 720);
  };

  PromptInterview.prototype.addTyped = function (text) {
    if (!text) return;
    const q = this.current();
    const input = document.getElementById('ll-input');
    const matched = matchChoice(q, text);
    if (q.type === 'single') {
      if (matched) {
        this.pending = new Set([matched.value]);
        this.custom = [];
      } else {
        this.pending.clear();
        this.custom = [text];
      }
    } else if (matched) {
      (q.exclusive || []).forEach((ex) => this.pending.delete(ex));
      if ((q.exclusive || []).includes(matched.value)) {
        this.pending.clear();
        this.custom = [];
      }
      this.pending.add(matched.value);
    } else {
      (q.exclusive || []).forEach((ex) => this.pending.delete(ex));
      if (!this.custom.includes(text)) this.custom.push(text);
    }
    if (input) input.value = '';
    this.syncSend();
    this.renderChoices();
  };

  PromptInterview.prototype.commit = function () {
    if (this.busy) return;
    const q = this.current();
    const input = document.getElementById('ll-input');
    const text = (input && input.value.trim()) || '';
    if (text && !looksLikeQuestion(text)) this.addTyped(text);
    if (q.type === 'multi') {
      const values = [...this.pending, ...this.custom];
      if (!values.length) return;
      this.save(q, values);
    } else {
      const value = this.custom[0] || [...this.pending][0];
      if (!value) return;
      this.save(q, value);
    }
    this.advance();
  };

  PromptInterview.prototype.save = function (q, value) {
    if (!q.key) return;
    const stored = Array.isArray(value) ? JSON.stringify(value) : String(value);
    try { localStorage.setItem(this.storagePrefix + q.key, stored); } catch (e) {}
  };

  PromptInterview.prototype.advance = function () {
    this.busy = true;
    this.index += 1;
    this.stage.style.opacity = '0';
    this.stage.style.transition = 'opacity 0.2s ease';
    setTimeout(() => {
      this.stage.style.opacity = '';
      this.stage.style.transition = '';
      this.showPrompt();
    }, 220);
  };

  PromptInterview.prototype.finish = function () {
    this.busy = true;
    this.stage.innerHTML =
      '<div class="ll-q-block">' +
        '<div class="ll-corner">Decision-making</div>' +
        '<div class="ll-q">That’s this section.</div>' +
      '</div>';
    const fill = document.getElementById('ll-progress-fill');
    if (fill) fill.style.width = '100%';
    if (this.nextBar) this.nextBar.classList.add('visible');
  };

  PromptInterview.start = function (opts) {
    const iv = new PromptInterview(opts);
    iv.begin();
    return iv;
  };

  window.PromptInterview = PromptInterview;
})();
