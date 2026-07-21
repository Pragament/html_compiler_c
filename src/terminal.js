/**
 * InteractiveTerminal
 *
 * Manages an xterm.js terminal for batch-mode WebAssembly execution
 * (BrowserCC + WASI).  Supports three stdin collection strategies that
 * are selected by the caller after source analysis:
 *
 *   'none'    — program never reads stdin; skip input collection entirely.
 *
 *   'fixed'   — program reads stdin a known N times; collectStdin(N) resolves
 *               automatically after the user submits N lines. Ctrl+D is
 *               intentionally suppressed in this mode.
 *
 *   'unknown' — stdin is inside a loop or EOF-driven; collectStdin(null) waits
 *               until the user presses Ctrl+D to signal end-of-input.
 *
 * After collection, the event queue produced by EchoingStdin / ConsoleStdout
 * during synchronous wasi.start() execution is replayed in chronological order
 * via replayEvents(), producing output identical to a native terminal session.
 *
 * GitHub Pages compatible: No SharedArrayBuffer, no COOP/COEP, no backend.
 */

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export class InteractiveTerminal {
  /**
   * @param {HTMLElement} container - The DOM element to mount the terminal into
   */
  constructor(container) {
    this._container = container;
    this._term = new Terminal({
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f5c2e7',
        selectionBackground: '#45475a',
        black: '#45475a',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#cba6f7',
        cyan: '#89dceb',
        white: '#bac2de',
        brightBlack: '#585b70',
        brightRed: '#f38ba8',
        brightGreen: '#a6e3a1',
        brightYellow: '#f9e2af',
        brightBlue: '#89b4fa',
        brightMagenta: '#cba6f7',
        brightCyan: '#89dceb',
        brightWhite: '#a6adc8',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 14,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      convertEol: true,
      allowProposedApi: true,
    });

    this._fitAddon = new FitAddon();
    this._term.loadAddon(this._fitAddon);
    this._term.open(container);
    this._fitAddon.fit();

    // State machine
    this._mode = 'idle'; // 'idle' | 'collecting' | 'running'
    this._currentLine = '';
    this._stdinQueue = [];
    this._keyListener = null;

    // Resize observer keeps terminal sized to its container
    this._resizeObserver = new ResizeObserver(() => {
      try { this._fitAddon.fit(); } catch (_) { }
    });
    this._resizeObserver.observe(container);
  }

  // ─────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────

  /** Write raw text to the terminal, converting bare LF to CR+LF. */
  write(text) {
    this._term.write(text.replace(/\r?\n/g, '\r\n'));
  }

  /** Write text with an ANSI color code then reset. */
  writeColored(text, ansiCode) {
    this._term.write(`\x1b[${ansiCode}m${text.replace(/\r?\n/g, '\r\n')}\x1b[0m`);
  }

  /** Write a dimmed informational line ending with CRLF. */
  writeInfo(text) {
    this.writeColored(text + '\r\n', '2');
  }

  /** Write an error line (red) ending with CRLF. */
  writeError(text) {
    this.writeColored(text + '\r\n', '31');
  }

  /** Clear the terminal screen and scroll buffer. */
  clear() {
    this._term.clear();
    this._term.reset();
  }

  /**
   * Enter interactive input-collection mode.
   *
   * The terminal becomes keyboard-active.  The user types stdin lines one at a
   * time, pressing Enter to submit each line.  The collected input is echoed to
   * the terminal as typed (standard terminal behaviour).
   *
   * Two modes depending on `maxLines`:
   *
   *   maxLines = null (default)
   *     UNKNOWN mode — Ctrl+D on an empty line (or mid-line) signals EOF and
   *     resolves the promise.  Use this for programs with loop-driven stdin.
   *
   *   maxLines = N  (positive integer)
   *     FIXED mode — Ctrl+D is suppressed.  The promise resolves automatically
   *     the moment the user has submitted exactly N lines.  Use this when the
   *     analyzer has determined the program reads stdin a fixed N times.
   *
   * @param {number|null} maxLines  Line limit for auto-resolve, or null for Ctrl+D mode.
   * @returns {Promise<string>}     All collected lines joined by '\n', each with trailing '\n'.
   */
  collectStdin(maxLines = null) {
    return new Promise((resolve) => {
      this._mode = 'collecting';
      this._stdinQueue = [];
      this._currentLine = '';

      const finish = () => {
        if (this._keyListener) {
          this._keyListener.dispose();
          this._keyListener = null;
        }
        this._mode = 'running';
        // Join lines with '\n'; append a trailing '\n' so the last line is
        // terminated, matching what a real Unix terminal sends.
        resolve(this._stdinQueue.join('\n') + (this._stdinQueue.length > 0 ? '\n' : ''));
      };

      this._keyListener = this._term.onKey(({ key, domEvent }) => {
        // ── Ctrl+D: EOF ───────────────────────────────────────────────
        // Only active in UNKNOWN mode (maxLines === null).
        // In FIXED mode Ctrl+D is silently ignored so the program cannot
        // be accidentally submitted before all required inputs are given.
        if (domEvent.ctrlKey && domEvent.key === 'd') {
          if (maxLines !== null) return;  // suppress in fixed mode
          if (this._currentLine.length > 0) {
            this._stdinQueue.push(this._currentLine);
            this._currentLine = '';
            this.write('\r\n');
          }
          finish();
          return;
        }

        // ── Enter: submit line ────────────────────────────────────────
        if (domEvent.keyCode === 13) {
          this._stdinQueue.push(this._currentLine);
          this._currentLine = '';
          this.write('\r\n');

          // In FIXED mode: auto-resolve once the required number of lines
          // has been collected.  No Ctrl+D required.
          if (maxLines !== null && this._stdinQueue.length >= maxLines) {
            finish();
          }
          return;
        }

        // ── Backspace ─────────────────────────────────────────────────
        if (domEvent.keyCode === 8) {
          if (this._currentLine.length > 0) {
            this._currentLine = this._currentLine.slice(0, -1);
            this._term.write('\b \b');
          }
          return;
        }

        // ── Printable characters ──────────────────────────────────────
        if (!domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey && key.length === 1) {
          this._currentLine += key;
          this._term.write(key);
        }
      });
    });
  }

  /** Stop any active input collection immediately. */
  stopCollecting() {
    if (this._keyListener) {
      this._keyListener.dispose();
      this._keyListener = null;
    }
    this._mode = 'idle';
    this._currentLine = '';
  }

  /**
   * Replay an ordered event queue produced during wasi.start() execution.
   *
   * Each event is one of:
   *   {type: 'stdout', text: string}  — output from the C program (printf, puts …)
   *   {type: 'stdin',  text: string}  — bytes consumed from stdin (scanf, fgets …)
   *   {type: 'stderr', text: string}  — output on fd 2 (fprintf(stderr,…), perror …)
   *
   * Because wasi.start() is synchronous and single-threaded the callbacks
   * that populate the queue fire in exactly the order the C program produces
   * output and consumes input, so replaying the queue sequentially gives
   * output that is visually identical to a native terminal session.
   *
   * Styling conventions (all optional — change freely):
   *   stdout → default foreground (white/cream)
   *   stdin  → cyan  (\x1b[96m) to visually distinguish typed input
   *   stderr → red   (\x1b[31m)
   *
   * @param {Array<{type:string, text:string}>} events
   */
  replayEvents(events) {
    for (const ev of events) {
      switch (ev.type) {
        case 'stdout':
          this.write(ev.text);
          break;
        case 'stdin':
          // Echo stdin in cyan so the user can tell what they typed vs. what
          // the program printed.  The text already contains the trailing \n
          // that the C runtime consumed, so we only need to convert LF→CRLF.
          this.writeColored(ev.text, '96');
          break;
        case 'stderr':
          this.writeColored(ev.text, '31');
          break;
        default:
          this.write(ev.text);
      }
    }
  }

  /** Trigger a resize to fit the current container dimensions. */
  fit() {
    try { this._fitAddon.fit(); } catch (_) { }
  }

  get mode() { return this._mode; }

  /** Dispose all resources. */
  dispose() {
    this._resizeObserver.disconnect();
    this.stopCollecting();
    this._term.dispose();
  }
}
