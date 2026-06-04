const Timer = {
    interval:       null,
    seconds:        0,
    mode:           'pomodoro',
    running:        false,
    sessionId:      null,
    pomodoroLength: 25 * 60,
    breakLength:    5 * 60,

    // ── Focus tracking ──────────────────────────────────────────────────
    _focusedMs:     0,
    _unfocusedMs:   0,
    _lastFocusTick: null,
    _tabVisible:    true,
    _idleTimeout:   null,
    _isIdle:        false,
    _idleThreshold: 60000,  // 60 seconds of no activity = idle

    _initFocusTracking() {
        this._focusedMs     = 0;
        this._unfocusedMs   = 0;
        this._lastFocusTick = Date.now();
        this._tabVisible    = !document.hidden;
        this._isIdle        = false;

        this._onVisChange = () => {
            this._flushFocusTick();
            this._tabVisible = !document.hidden;
            this._lastFocusTick = Date.now();
        };
        this._onActivity = () => {
            if (this._isIdle) {
                this._flushFocusTick();
                this._isIdle = false;
                this._lastFocusTick = Date.now();
            }
            clearTimeout(this._idleTimeout);
            this._idleTimeout = setTimeout(() => {
                if (this.running) {
                    this._flushFocusTick();
                    this._isIdle = true;
                    this._lastFocusTick = Date.now();
                }
            }, this._idleThreshold);
        };

        document.addEventListener('visibilitychange', this._onVisChange);
        document.addEventListener('mousemove', this._onActivity);
        document.addEventListener('keydown', this._onActivity);
        document.addEventListener('click', this._onActivity);
        document.addEventListener('scroll', this._onActivity);
    },

    _flushFocusTick() {
        if (!this._lastFocusTick) return;
        const now = Date.now();
        const elapsed = now - this._lastFocusTick;
        if (this._tabVisible && !this._isIdle) {
            this._focusedMs += elapsed;
        } else {
            this._unfocusedMs += elapsed;
        }
        this._lastFocusTick = now;
    },

    _stopFocusTracking() {
        this._flushFocusTick();
        document.removeEventListener('visibilitychange', this._onVisChange);
        document.removeEventListener('mousemove', this._onActivity);
        document.removeEventListener('keydown', this._onActivity);
        document.removeEventListener('click', this._onActivity);
        document.removeEventListener('scroll', this._onActivity);
        clearTimeout(this._idleTimeout);
    },

    _calculateFocusScore() {
        const total = this._focusedMs + this._unfocusedMs;
        if (total === 0) return 85;
        const raw = Math.round((this._focusedMs / total) * 100);
        return Math.max(10, Math.min(100, raw));
    },

    // ── Storage ─────────────────────────────────────────────────────────
    _save() {
        if (typeof Store === 'undefined' || !Store.isLoggedIn) return;
        try {
            localStorage.setItem('mugtuon_timer', JSON.stringify({
                seconds:   this.seconds,
                mode:      this.mode,
                running:   this.running,
                savedAt:   this.running ? Date.now() : null,
                sessionId: this.sessionId || null,
            }));
        } catch {}
    },

    _restore() {
        try {
            const raw = localStorage.getItem('mugtuon_timer');
            if (!raw) return false;
            const data = JSON.parse(raw);
            this.mode      = data.mode || 'pomodoro';
            this.sessionId = data.sessionId || null;
            if (data.running && data.savedAt) {
                const elapsed = Math.floor((Date.now() - data.savedAt) / 1000);
                this.seconds = Math.max(0, (data.seconds || 0) - elapsed);
            } else {
                this.seconds = data.seconds || this.getModeLength();
            }
            return !!data.running;
        } catch {
            return false;
        }
    },

    // ── resume() — call on EVERY dashboard render (NOT init) ───────────
    resume() {
        if (this.interval !== null) {
            this.updateDisplay();
            return;
        }
        const wasRunning = this._restore();
        if (wasRunning) {
            if (this.seconds <= 0) {
                this.complete();
            } else {
                this._startTicking();
            }
        } else {
            this.updateDisplay();
        }
    },

    // ── init() — call ONLY on logout ────────────────────────────────────
    init() {
        clearInterval(this.interval);
        this.interval  = null;
        this.running   = false;
        this.seconds   = 0;
        this.mode      = 'pomodoro';
        this.sessionId = null;
        try { localStorage.removeItem('mugtuon_timer'); } catch {}
        Store.set('timerRunning', false);
        Store.set('timerSeconds', 0);
        Store.set('timerMode',    'pomodoro');
        this.updateDisplay();
    },

    // ── Core controls ────────────────────────────────────────────────────
    getModeLength() {
        switch (this.mode) {
            case 'pomodoro':    return this.pomodoroLength;
            case 'deep_work':   return 90 * 60;
            case 'short_break': return this.breakLength;
            default:            return this.pomodoroLength;
        }
    },

    async start() {
        if (this.running) return;
        this.running = true;
        this.seconds = this.seconds || this.getModeLength();
        Store.set('timerRunning', true);

        if (this.mode !== 'short_break') {
            this._initFocusTracking();
        }

        if (!this.sessionId && this.mode !== 'short_break' && Store.isLoggedIn) {
            try {
                const session = await API.post('/sessions/start', { sessionType: this.mode });
                this.sessionId = session.id;
            } catch(e) { /* non-blocking */ }
        }

        this._startTicking();
    },

    _startTicking() {
        this._save();
        this.interval = setInterval(() => {
            this.seconds--;
            Store.set('timerSeconds', this.seconds);
            if (this.seconds % 5 === 0) this._save();
            this.updateDisplay();
            if (this.seconds <= 0) this.complete();
        }, 1000);
        this.updateDisplay();
    },

    pause() {
        this.running = false;
        Store.set('timerRunning', false);
        clearInterval(this.interval);
        this.interval = null;
        this._flushFocusTick();
        this._save();
        this.updateDisplay();
    },

    async reset() {
        const wasRunning = this.running;
        clearInterval(this.interval);
        this.interval = null;
        this.running  = false;
        Store.set('timerRunning', false);

        if (wasRunning && this.sessionId && Store.isLoggedIn) {
            this._stopFocusTracking();
            const partialScore = Math.max(10, Math.round(this._calculateFocusScore() * 0.6));
            await this._endSession(partialScore);
        } else {
            this._stopFocusTracking();
        }

        this.seconds = this.getModeLength();
        Store.set('timerSeconds', this.seconds);
        this._save();
        this.updateDisplay();
    },

    setMode(mode) {
        const wasRunning = this.running;
        if (wasRunning && this.sessionId && Store.isLoggedIn) {
            this._stopFocusTracking();
            const partialScore = Math.max(10, Math.round(this._calculateFocusScore() * 0.6));
            this._endSession(partialScore);
        } else {
            this._stopFocusTracking();
        }
        clearInterval(this.interval);
        this.interval  = null;
        this.running   = false;
        this.sessionId = null;
        this.mode      = mode;
        Store.set('timerMode', mode);
        this.seconds = this.getModeLength();
        Store.set('timerSeconds', this.seconds);
        Store.set('timerRunning', false);
        this._save();
        this.updateDisplay();
    },

    async complete() {
        clearInterval(this.interval);
        this.interval = null;
        this.running  = false;
        Store.set('timerRunning', false);
        try { localStorage.removeItem('mugtuon_timer'); } catch {}

        this._stopFocusTracking();
        const realScore = this._calculateFocusScore();

        if (this.sessionId && Store.isLoggedIn) {
            await this._endSession(realScore);
        } else {
            Helpers.showToast(
                'Session Complete!',
                `Your ${this.mode.replace(/_/g, ' ')} session is done.`,
                'success'
            );
        }

        this.seconds = this.getModeLength();
        this.updateDisplay();
    },

    async _endSession(focusScore) {
        if (!this.sessionId) return;
        const sid = this.sessionId;
        this.sessionId = null;
        try {
            const result = await API.put(`/sessions/${sid}/end`, { focusScore });
            if (result && result.xp_earned) {
                const totalXP = result.xp_earned + (result.bonus_xp || 0);
                const user = Store.get('user');
                if (user) {
                    user.xp = (user.xp || 0) + totalXP;
                    Store.set('user', user);
                    localStorage.setItem('mugtuon_user', JSON.stringify(user));
                }

                let msg = `+${result.xp_earned} XP earned!`;
                if (result.bonus_xp > 0) msg += ` +${result.bonus_xp} bonus XP!`;
                if (result.badges_earned && result.badges_earned.length > 0) {
                    const badges = result.badges_earned.map(b => `${b.icon} ${b.name}`).join(', ');
                    msg += ` Badge unlocked: ${badges}`;
                }
                Helpers.showToast('Session Complete!', msg, 'success');

                // Show individual badge toasts
                if (result.badges_earned) {
                    result.badges_earned.forEach((b, i) => {
                        setTimeout(() => {
                            Helpers.showToast('Achievement Unlocked!', `${b.icon} ${b.name} — +${b.xp} XP`, 'success');
                        }, (i + 1) * 1500);
                    });
                }
            }
        } catch(e) {
            Helpers.showToast(
                'Session Complete!',
                `Your ${this.mode.replace(/_/g, ' ')} session is done.`,
                'success'
            );
        }
    },

    // ── DOM sync ─────────────────────────────────────────────────────────
    updateDisplay() {
        const display = document.getElementById('timerDisplay');
        if (display) {
            display.textContent = Helpers.formatTime(this.seconds || this.getModeLength());
        }
        const startBtn = document.getElementById('timerStartBtn');
        const pauseBtn = document.getElementById('timerPauseBtn');
        if (startBtn) startBtn.style.display = this.running ? 'none' : '';
        if (pauseBtn) pauseBtn.style.display = this.running ? '' : 'none';

        document.querySelectorAll('.timer-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.mode);
        });

        const focusEl = document.getElementById('timerFocusScore');
        if (focusEl) {
            if (this.running && this.mode !== 'short_break') {
                this._flushFocusTick();
                this._lastFocusTick = Date.now();
                focusEl.style.display = 'block';
                focusEl.textContent = `Focus: ${this._calculateFocusScore()}%`;
            } else {
                focusEl.style.display = 'none';
            }
        }
    },

    // ── Widget HTML ──────────────────────────────────────────────────────
    renderWidget() {
        const time = Helpers.formatTime(this.seconds || this.getModeLength());
        const modeLabels = {
            pomodoro:    'Pomodoro',
            deep_work:   'Deep Work',
            short_break: 'Break',
        };

        return `
        <div class="timer-widget">
            <div style="display:inline-flex;gap:2px;background:var(--color-bg);border-radius:var(--radius-full);padding:3px;margin-bottom:var(--space-5)">
                <button class="timer-preview__mode-btn timer-mode-btn ${this.mode === 'pomodoro'    ? 'active' : ''}" data-mode="pomodoro"    onclick="Timer.setMode('pomodoro')">Pomodoro</button>
                <button class="timer-preview__mode-btn timer-mode-btn ${this.mode === 'deep_work'   ? 'active' : ''}" data-mode="deep_work"   onclick="Timer.setMode('deep_work')">Deep Work</button>
                <button class="timer-preview__mode-btn timer-mode-btn ${this.mode === 'short_break' ? 'active' : ''}" data-mode="short_break" onclick="Timer.setMode('short_break')">Break</button>
            </div>

            <div class="timer-widget__display" id="timerDisplay">${time}</div>
            <div class="timer-widget__session-type">${modeLabels[this.mode]} Session</div>
            <div id="timerFocusScore" style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1);display:${this.running && this.mode !== 'short_break' ? 'block' : 'none'}">Focus: —%</div>

            <div class="timer-widget__controls">
                <button class="btn btn--accent btn--lg" id="timerStartBtn" onclick="Timer.start()"
                        ${this.running ? 'style="display:none"' : ''}>
                    ▶ Start Focus
                </button>
                <button class="btn btn--outline btn--lg" id="timerPauseBtn" onclick="Timer.pause()"
                        ${!this.running ? 'style="display:none"' : ''}>
                    ⏸ Pause
                </button>
                <button class="btn btn--ghost" onclick="Timer.reset()">↺ Reset</button>
            </div>
        </div>
        `;
    }
};
