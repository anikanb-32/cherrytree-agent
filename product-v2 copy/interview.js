(function () {
  const DEFAULT_REPLY = 'You can choose an option below, or just write what you want.';

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

  function Interview(opts) {
    this.questions = opts.questions || [];
    this.storagePrefix = opts.storagePrefix || '';
    this.onComplete = opts.onComplete || null;
    this.thread = document.getElementById(opts.threadId || 'interview-thread');
    this.input = document.getElementById(opts.inputId || 'iv-input');
    this.sendBtn = document.getElementById(opts.sendId || 'iv-send');
    this.nextBar = document.getElementById(opts.nextBarId || 'next-section-bar');
    this.index = 0;
    this.pending = new Set();
    this.custom = [];
    this.turnEl = null;
    this.controlsEl = null;
    this.busy = false;
  }

  Interview.prototype.begin = function () {
    this.thread.innerHTML = '';
    this.index = 0;
    this.pending = new Set();
    this.custom = [];
    if (this.nextBar) this.nextBar.classList.remove('visible');
    this.input.disabled = false;
    this.sendBtn.disabled = false;
    if (!this._bound) {
      this._bound = true;
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.submitText();
        }
      });
      this.sendBtn.addEventListener('click', () => this.submitText());
    }
    this.showQuestion(0);
  };

  Interview.prototype.current = function () {
    return this.questions[this.index];
  };

  Interview.prototype.scroll = function () {
    requestAnimationFrame(() => {
      this.thread.scrollTop = this.thread.scrollHeight;
    });
  };

  Interview.prototype.progress = function () {
    const fill = document.getElementById('iv-progress-fill');
    if (!fill) return;
    const total = this.questions.length || 1;
    const at = this.questions[this.index] ? this.index + 1 : total;
    fill.style.width = Math.min(100, (at / total) * 100) + '%';
  };

  Interview.prototype.showQuestion = function (i) {
    const q = this.questions[i];
    if (!q) {
      this.finish();
      return;
    }
    this.index = i;
    this.pending = new Set();
    this.custom = [];
    this.busy = false;

    this.turnEl = document.createElement('div');
    this.turnEl.className = 'iv-turn';
    this.turnEl.dataset.qid = q.id;

    const ask = document.createElement('div');
    ask.className = 'iv-ask';
    const text = document.createElement('div');
    text.className = 'iv-ask-text';
    text.textContent = q.question;
    ask.appendChild(text);
    if (q.hint) {
      const hint = document.createElement('div');
      hint.className = 'iv-hint';
      hint.textContent = q.hint;
      ask.appendChild(hint);
    }
    this.turnEl.appendChild(ask);
    this.thread.appendChild(this.turnEl);
    this.renderControls();
    this.progress();
    this.scroll();
    setTimeout(() => this.input.focus(), 80);
  };

  Interview.prototype.renderControls = function () {
    const q = this.current();
    if (!q || this.busy) return;
    if (this.controlsEl) this.controlsEl.remove();
    this.controlsEl = document.createElement('div');
    this.controlsEl.className = 'iv-controls';

    (q.choices || []).forEach((c) => {
      this.controlsEl.appendChild(this.choiceButton(c.value, c.label, this.pending.has(c.value)));
    });
    this.custom.forEach((txt) => {
      this.controlsEl.appendChild(this.choiceButton(txt, txt, true, true));
    });

    if (q.type === 'multi' && (this.pending.size || this.custom.length)) {
      const done = document.createElement('button');
      done.type = 'button';
      done.className = 'iv-choice iv-done';
      done.textContent = q.doneLabel || "That's all";
      done.addEventListener('click', () => this.commitMulti());
      this.controlsEl.appendChild(done);
    }

    this.turnEl.appendChild(this.controlsEl);
    this.scroll();
  };

  Interview.prototype.choiceButton = function (value, label, selected, isCustom) {
    const q = this.current();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'iv-choice' + (selected ? ' selected' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      if (q.type === 'multi') this.toggleChoice(value, isCustom);
      else this.commitSingle(value, label);
    });
    return btn;
  };

  Interview.prototype.toggleChoice = function (value, isCustom) {
    const q = this.current();
    const exclusive = q.exclusive || [];
    if (isCustom) {
      this.custom = this.custom.filter((t) => t !== value);
    } else if (this.pending.has(value)) {
      this.pending.delete(value);
    } else {
      if (exclusive.includes(value)) {
        this.pending.clear();
        this.custom = [];
        this.pending.add(value);
      } else {
        exclusive.forEach((ex) => this.pending.delete(ex));
        this.pending.add(value);
      }
    }
    this.renderControls();
  };

  Interview.prototype.submitText = function () {
    if (this.busy) return;
    const q = this.current();
    if (!q) return;
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = '';

    if (looksLikeQuestion(text)) {
      const reply = typeof q.reply === 'function' ? q.reply(text) : DEFAULT_REPLY;
      this.addFollowup(reply || DEFAULT_REPLY);
      return;
    }

    if (q.type === 'multi') {
      (q.exclusive || []).forEach((ex) => this.pending.delete(ex));
      this.custom.push(text);
      this.commitMulti();
      return;
    }

    const matched = matchChoice(q, text);
    if (matched) this.commitSingle(matched.value, text);
    else this.commitSingle(text, text);
  };

  Interview.prototype.addFollowup = function (copy) {
    const ask = document.createElement('div');
    ask.className = 'iv-ask followup';
    const text = document.createElement('div');
    text.className = 'iv-ask-text';
    text.textContent = copy;
    ask.appendChild(text);
    if (this.controlsEl) this.turnEl.insertBefore(ask, this.controlsEl);
    else this.turnEl.appendChild(ask);
    this.scroll();
    this.input.focus();
  };

  Interview.prototype.commitSingle = function (value, display) {
    const q = this.current();
    this.finishTurn(display || value);
    this.save(q, value);
    this.advance();
  };

  Interview.prototype.commitMulti = function () {
    const q = this.current();
    const values = [...this.pending, ...this.custom];
    if (!values.length) return;
    this.finishTurn(values.join(', '));
    this.save(q, values);
    this.advance();
  };

  Interview.prototype.finishTurn = function (display) {
    this.busy = true;
    if (this.controlsEl) {
      this.controlsEl.remove();
      this.controlsEl = null;
    }
    const user = document.createElement('div');
    user.className = 'iv-user';
    user.textContent = display;
    this.turnEl.appendChild(user);
    this.scroll();
  };

  Interview.prototype.save = function (q, value) {
    if (!q.key) return;
    const stored = Array.isArray(value) ? JSON.stringify(value) : String(value);
    try { localStorage.setItem(this.storagePrefix + q.key, stored); } catch (e) {}
  };

  Interview.prototype.advance = function () {
    const next = this.index + 1;
    setTimeout(() => this.showQuestion(next), 420);
  };

  Interview.prototype.finish = function () {
    this.input.disabled = true;
    this.sendBtn.disabled = true;
    if (this.nextBar) {
      this.nextBar.classList.add('visible');
      setTimeout(() => this.nextBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
    this.progress();
    if (typeof this.onComplete === 'function') this.onComplete();
  };

  Interview.looksLikeQuestion = looksLikeQuestion;

  Interview.start = function (opts) {
    const iv = new Interview(opts);
    iv.begin();
    return iv;
  };

  window.Interview = Interview;
})();
