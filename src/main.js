/**
 * Main Application Orchestrator
 * Browser C Compiler — BrowserCC (LLVM Clang + WASI) runtime.
 *
 * Execution Flow:
 *   Phase 1 — Compile: BrowserCC compiles C source to a WASM module.
 *
 *   Phase 2 — Classify & Collect:
 *     analyzeStdin() inspects the C source and returns one of three cases:
 *
 *     'none'    — program never reads stdin.
 *                 Skip input collection entirely; execute immediately.
 *
 *     'fixed'   — program calls scanf / getchar / fgets a fixed N times,
 *                 never inside a loop.  collectStdin(N) auto-resolves after
 *                 the user submits N lines.  No Ctrl+D required.
 *
 *     'unknown' — stdin is inside a loop or is EOF-driven (while(scanf…)).
 *                 collectStdin(null) waits until the user presses Ctrl+D.
 *
 *   Phase 3 — Execute: The collected stdin is fed to wasi.start(). During
 *             synchronous execution an ordered event queue is populated:
 *               stdout events (from ConsoleStdout / printf)
 *               stdin  events (from EchoingStdin  / scanf)
 *             Because wasi.start() is single-threaded and synchronous the
 *             callbacks fire in exactly the chronological order the C
 *             program produces them.
 *
 *   Phase 4 — Render: Terminal is cleared and the event queue is replayed
 *             in order, producing output that is visually identical to a
 *             native Linux terminal session.
 *
 * GitHub Pages compatible — no SharedArrayBuffer, no COOP/COEP, no backend.
 */

import { compile } from 'browsercc';
import { WASI, File, OpenFile, ConsoleStdout, PreopenDirectory } from '@bjorn3/browser_wasi_shim';
import { initEditor, getEditorValue } from './editor.js';
import { initSidebar } from './sidebar.js';
import { SNIPPETS } from './snippets.js';
import { InteractiveTerminal } from './terminal.js';
import { analyzeStdin } from './analyzer.js';

// ─── DOM References ───────────────────────────────────────────────────────────
const runBtn = document.getElementById('runBtn');
const statusEl = document.getElementById('status');
const editorContainer = document.getElementById('editor-container');
const terminalContainer = document.getElementById('terminal-container');

// ─── Terminal ─────────────────────────────────────────────────────────────────
const terminal = new InteractiveTerminal(terminalContainer);

// ─── EchoingStdin ─────────────────────────────────────────────────────────────
/**
 * Wraps OpenFile so that every chunk of bytes the WASI runtime reads from
 * stdin is also pushed as a {type:'stdin'} event into the caller-supplied
 * event queue.  The bytes returned to the runtime are NEVER modified.
 *
 * CONTRACT
 *   - Does NOT modify the `size` parameter passed to fd_read.
 *   - Does NOT split reads on newline boundaries.
 *   - Only observes the exact bytes the runtime naturally consumes.
 */
class EchoingStdin extends OpenFile {
  constructor(file, onRead) {
    super(file);
    this._onRead = onRead;
  }

  fd_read(size) {
    const result = super.fd_read(size);
    if (result.ret === 0 && result.data.length > 0) {
      this._onRead(result.data);
    }
    return result;
  }
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function updateStatus(state, text) {
  statusEl.textContent = text;
  runBtn.disabled = (state === 'loading' || state === 'running');
}

// ─── Main execution flow ──────────────────────────────────────────────────────
async function executeCode() {
  const code = getEditorValue();
  const dec = new TextDecoder();
  const enc = new TextEncoder();

  // ── Phase 1: Compile ──────────────────────────────────────────────────────
  terminal.clear();
  updateStatus('running', '⏳ Compiling…');
  terminal.writeInfo('⬡ BrowserCC — compiling…');

  let compileResult;
  try {
    compileResult = await compile({ source: code, fileName: 'main.c', flags: ['-O2'] });
  } catch (err) {
    terminal.writeError(`Compiler Exception:\n${err.message || String(err)}`);
    updateStatus('error', '🔴 Error');
    return;
  }

  const { module, compileOutput } = compileResult;

  if (compileOutput && compileOutput.trim().length > 0) {
    terminal.writeColored('[Compiler Diagnostics]\r\n', '33');
    terminal.write(compileOutput.trim() + '\r\n\r\n');
  }

  if (!module) {
    terminal.writeError('Compilation failed — no executable produced.');
    updateStatus('error', '🔴 Error');
    return;
  }

  // ── Phase 2: Classify stdin usage and collect accordingly ────────────────
  //
  // analyzeStdin() tokenises the C source (strips comments/literals/macros)
  // and classifies the program into one of three categories:
  //
  //   'none'    → no stdin calls detected      → execute immediately
  //   'fixed'   → N calls, none inside a loop  → auto-submit after N lines
  //   'unknown' → stdin inside loop / EOF-loop → require Ctrl+D
  //
  // This avoids forcing the user to press Ctrl+D for simple programs.
  const analysis = analyzeStdin(code);
  let stdinStr = '';

  if (analysis.type === 'none') {
    // ── CASE 1: No stdin ─────────────────────────────────────────────────
    terminal.writeInfo('✓ Compiled. Running…\r\n');
    updateStatus('running', '⏳ Running…');
    // stdinStr stays '' — no input collection needed

  } else if (analysis.type === 'fixed') {
    // ── CASE 2: Fixed input ───────────────────────────────────────────────
    // The program reads stdin exactly analysis.count times (no loops).
    // Show a clear prompt and auto-execute once all lines are submitted.
    const n = analysis.count;
    const plural = n !== 1 ? 's' : '';
    terminal.writeInfo(
      `✓ Compiled. This program reads ${n} input${plural}. ` +
      `Type each value and press Enter.\r\n`
    );
    updateStatus('running', `⌨️  Enter ${n} input${plural}…`);
    stdinStr = await terminal.collectStdin(n);

  } else {
    // ── CASE 3: Unknown / loop-driven stdin ───────────────────────────────
    // The program reads stdin inside a loop or EOF-driven pattern.
    // The user must press Ctrl+D to signal end-of-input.
    terminal.writeInfo(
      '✓ Compiled. Type stdin — Enter after each line, Ctrl+D when done.\r\n'
    );
    updateStatus('running', '⌨️  Waiting for input… (Ctrl+D = EOF)');
    stdinStr = await terminal.collectStdin(null);
  }

  // ── Phase 3: Execute WASM — build ordered event queue ─────────────────────
  updateStatus('running', '⏳ Running…');

  const stdinBytes = enc.encode(stdinStr);

  /**
   * eventQueue holds every output event in the exact chronological order
   * produced by the C program.  Because wasi.start() is synchronous and
   * single-threaded the callbacks for ConsoleStdout (stdout/stderr) and
   * EchoingStdin (stdin) fire in program-execution order, so the queue is
   * inherently sorted without any additional logic.
   *
   * @type {Array<{type:'stdout'|'stdin'|'stderr', text:string}>}
   */
  const eventQueue = [];

  const fs = new Map();
  const fds = [
    // fd 0 — stdin: pushes {type:'stdin'} events
    new EchoingStdin(new File(stdinBytes), (data) => {
      eventQueue.push({ type: 'stdin', text: dec.decode(data) });
    }),
    // fd 1 — stdout: pushes {type:'stdout'} events
    new ConsoleStdout((data) => {
      eventQueue.push({ type: 'stdout', text: dec.decode(data) });
    }),
    // fd 2 — stderr: pushes {type:'stderr'} events
    new ConsoleStdout((data) => {
      eventQueue.push({ type: 'stderr', text: dec.decode(data) });
    }),
    // fd 3 — virtual filesystem (file I/O)
    new PreopenDirectory('.', fs),
  ];

  const wasi = new WASI([], [], fds);
  let exitCode = 0;
  let success = true;

  try {
    const instance = await WebAssembly.instantiate(module, {
      wasi_snapshot_preview1: wasi.wasiImport,
    });
    exitCode = wasi.start(instance);
    if (exitCode !== 0) success = false;
  } catch (err) {
    eventQueue.push({ type: 'stderr', text: `\nRuntime Exception: ${err.message || String(err)}` });
    exitCode = 1;
    success = false;
  }

  // ── Phase 4: Replay event queue in chronological order ────────────────────
  //
  // Clear the terminal so the xterm keystroke-echo from Phase 2 is removed.
  // Then replay each event in order — stdout normally, stdin in cyan (so the
  // user can visually distinguish typed input from program output), stderr red.
  terminal.clear();
  terminal.replayEvents(eventQueue);

  // Footer
  terminal.write('\r\n');
  if (success) {
    terminal.writeInfo(`── Exit code: ${exitCode} ────────────────────────────────────────`);
    updateStatus('finished', '🟢 Finished');
  } else {
    terminal.writeColored(
      `── Exit code: ${exitCode} (error) ──────────────────────────────────\r\n`, '31'
    );
    updateStatus('error', '🔴 Error');
  }
}

// ─── Initialization ───────────────────────────────────────────────────────────
const initialCode = SNIPPETS[0] ? SNIPPETS[0].code : '';
initEditor(editorContainer, initialCode, { onRun: executeCode });
initSidebar();
runBtn.addEventListener('click', executeCode);

updateStatus('loading', '⏳ Loading BrowserCC…');
terminal.writeInfo('⬡ BrowserCC interactive terminal ready.');
terminal.writeInfo('Write your C program above and click ▶ Run Code.');
setTimeout(() => updateStatus('ready', '🟢 Ready'), 50);
