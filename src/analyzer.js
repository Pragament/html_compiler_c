/**
 * C Stdin Usage Analyzer
 *
 * Classifies a C program's stdin usage into one of three categories:
 *
 *   'none'    — program never reads stdin  → execute immediately, no input UI
 *   'fixed'   — N stdin calls, none in a loop → collect N lines, auto-execute
 *   'unknown' — stdin in a loop / EOF-driven  → require Ctrl+D
 *
 * ─── Algorithm ───────────────────────────────────────────────────────────────
 *
 *   Phase 1 — Tokenise
 *     Strip comments, string/char literals, preprocessor directives.
 *     Emit only:
 *       { k:'id', v:'<name>' }  identifiers
 *       { k:'p',  v:'<char>' }  punctuation from  { } ( ) ; ,
 *
 *   Phase 2 — Walk token stream
 *     State machine tracks:
 *       parenDepth   — depth inside ( )
 *       pendingLoop  — saw while/for keyword, not yet past its condition )
 *       awaitingBody — past condition ) or saw 'do'; next { is a loop body
 *       scopeStack   — array of { loop:bool }, one per { } block
 *
 *     inLoop() = pendingLoop || awaitingBody || any stack entry has loop:true
 *
 *   Phase 3 — Classify
 *     No calls detected      → { type:'none',    count: 0 }
 *     Any call has inLoop    → { type:'unknown', count: 0 }
 *     All calls outside loop → { type:'fixed',   count: N }
 *
 * ─── Known limitations ───────────────────────────────────────────────────────
 *   • Macro-expanded calls (#define RD scanf) are not detected.
 *   • Recursive user-functions with stdin are classified 'fixed', not 'unknown'
 *     (full call-graph analysis is out of scope for a lightweight classifier).
 *   • Conditional scanf (if with no else) is counted as fixed — an extra unused
 *     input collected is harmless.
 *
 * GitHub Pages compatible — pure synchronous JS, no Worker, no eval.
 */

// ─── Stdin function sets ──────────────────────────────────────────────────────

/**
 * Functions that ALWAYS read from stdin.
 * Classified as stdin calls whenever followed by '('.
 */
const STDIN_UNCONDITIONAL = new Set([
  'scanf',  'vscanf',
  'getchar', 'getchar_unlocked',
  'gets',   'gets_s',
]);

/**
 * Functions where the stream argument must be confirmed to be 'stdin'
 * (e.g.  fgets(buf, n, stdin)  vs  fgets(buf, n, fp)).
 */
const STDIN_CONDITIONAL = new Set([
  'fscanf',  'vfscanf',
  'fgets',
  'fread',
  'fgetc',
  'getc',    'getc_unlocked',
]);

// ─── Phase 1: Tokeniser ───────────────────────────────────────────────────────

/**
 * Tokenise C source into a minimal token array suitable for stdin analysis.
 *
 * @param {string} src  Raw C source code.
 * @returns {Array<{k:'id'|'p', v:string}>}
 */
function tokenize(src) {
  const toks = [];
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];

    // ── line comment  // … ─────────────────────────────────────────────
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }

    // ── block comment  /* … */ ─────────────────────────────────────────
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i + 1 < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // ── string literal  " … " ──────────────────────────────────────────
    if (c === '"') {
      i++;
      while (i < n && src[i] !== '"') {
        if (src[i] === '\\') i++;  // skip escaped char
        i++;
      }
      i++;   // consume closing "
      continue;
    }

    // ── character literal  ' … ' ───────────────────────────────────────
    if (c === "'") {
      i++;
      while (i < n && src[i] !== "'") {
        if (src[i] === '\\') i++;
        i++;
      }
      i++;   // consume closing '
      continue;
    }

    // ── preprocessor directive — skip entire logical line ─────────────
    if (c === '#') {
      while (i < n) {
        if (src[i] === '\\' && src[i + 1] === '\n') { i += 2; continue; } // line continuation
        if (src[i] === '\n') break;
        i++;
      }
      continue;
    }

    // ── identifier ─────────────────────────────────────────────────────
    if (/[A-Za-z_]/.test(c)) {
      const start = i;
      while (i < n && /\w/.test(src[i])) i++;
      toks.push({ k: 'id', v: src.slice(start, i) });
      continue;
    }

    // ── tracked punctuation ────────────────────────────────────────────
    if ('{}();,'.includes(c)) {
      toks.push({ k: 'p', v: c });
      i++;
      continue;
    }

    // everything else (operators, digits, whitespace) — silently skip
    i++;
  }

  return toks;
}

// ─── Phase 2: Token analyser ──────────────────────────────────────────────────

/**
 * Walk the token stream and collect all stdin calls, tagging each with whether
 * it is inside a loop construct.
 *
 * @param {Array<{k:string, v:string}>} toks
 * @returns {Array<{func:string, inLoop:boolean}>}
 */
function analyseTokens(toks) {
  const N     = toks.length;
  const calls = [];

  // scope stack — each entry { loop: boolean }
  const stack = [];

  let pendingLoop  = false;  // saw while/for, waiting for end of its (condition)
  let awaitingBody = false;  // condition closed or 'do' seen; next { is loop body
  let parenDepth   = 0;

  /**
   * True when the current position is semantically inside a loop.
   * Covers: inside the condition of while/for (pendingLoop), between the
   * closing ) and the body { (awaitingBody), and inside a loop body { }.
   */
  const inLoop = () => pendingLoop || awaitingBody || stack.some(s => s.loop);

  /**
   * Check whether the word 'stdin' appears in the argument list starting at
   * the given '(' token.
   *
   * @param {number} openIdx  index of '(' in toks
   * @returns {boolean}
   */
  function hasStdinArg(openIdx) {
    let depth = 0;
    for (let j = openIdx; j < N; j++) {
      const t = toks[j];
      if (t.k === 'p') {
        if      (t.v === '(') depth++;
        else if (t.v === ')') { depth--; if (depth === 0) break; }
      } else if (t.k === 'id' && t.v === 'stdin') {
        return true;
      }
    }
    return false;
  }

  for (let i = 0; i < N; i++) {
    const t = toks[i];

    // ── identifiers ───────────────────────────────────────────────────
    if (t.k === 'id') {
      switch (t.v) {

        // Loop keywords
        case 'while':
        case 'for':
          pendingLoop = true;
          break;

        case 'do':
          // 'do' body { } follows immediately (no condition to parse first)
          awaitingBody = true;
          break;

        default: {
          const next = toks[i + 1];
          const hasOpenParen = next && next.k === 'p' && next.v === '(';

          if (STDIN_UNCONDITIONAL.has(t.v)) {
            if (hasOpenParen) {
              calls.push({ func: t.v, inLoop: inLoop() });
            }
          } else if (STDIN_CONDITIONAL.has(t.v)) {
            if (hasOpenParen && hasStdinArg(i + 1)) {
              calls.push({ func: t.v, inLoop: inLoop() });
            }
          }
          break;
        }
      }
    }

    // ── punctuation ───────────────────────────────────────────────────
    else if (t.k === 'p') {
      switch (t.v) {

        case '(':
          parenDepth++;
          break;

        case ')':
          parenDepth--;
          // Closing ) at depth 0 while tracking a loop condition means we
          // just finished parsing while(…) or for(…).
          if (parenDepth === 0 && pendingLoop) {
            awaitingBody = true;
            pendingLoop  = false;
          }
          break;

        case '{':
          if (awaitingBody) {
            stack.push({ loop: true });
            awaitingBody = false;
          } else {
            stack.push({ loop: false });
          }
          break;

        case '}':
          if (stack.length > 0) stack.pop();
          // After a 'do { }', the 'while' keyword will follow and set
          // pendingLoop via the identifier branch above.
          break;

        case ';':
          // A semicolon at paren depth 0 can end a braces-less loop body:
          //   while (x) single_stmt;
          // Reset awaitingBody so tokens after the statement are not inside loop.
          if (parenDepth === 0 && awaitingBody) {
            awaitingBody = false;
          }
          break;

        // ',' — no action
      }
    }
  }

  return calls;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyse C source and classify its stdin usage.
 *
 * @param {string} source  Full C source code.
 *
 * @returns {{
 *   type:  'none' | 'fixed' | 'unknown',
 *   count: number
 * }}
 *
 * type  'none'    → no stdin calls detected; execute immediately, stdinStr = ''
 * type  'fixed'   → exactly `count` stdin calls found, none inside any loop;
 *                   collect `count` lines then auto-execute.
 * type  'unknown' → at least one stdin call is inside a loop, is inside the
 *                   loop condition itself, or is EOF-driven; require Ctrl+D.
 * count           → number of stdin calls (meaningful only when type = 'fixed').
 */
export function analyzeStdin(source) {
  const toks  = tokenize(source);
  const calls = analyseTokens(toks);

  if (calls.length === 0) {
    return { type: 'none', count: 0 };
  }

  if (calls.some(c => c.inLoop)) {
    return { type: 'unknown', count: 0 };
  }

  return { type: 'fixed', count: calls.length };
}