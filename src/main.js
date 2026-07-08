/**
 * Main Application Orchestrator
 * Integrates CodeMirror 6 editor, left sidebar snippets library, and picoc-js runtime.
 * Preserves exact Release 1 compiler integration, status transitions, and error handling.
 */

import { runC } from 'picoc-js';
import { initEditor, getEditorValue, setEditorValue } from './editor.js';
import { initSidebar } from './sidebar.js';
import { SNIPPETS } from './snippets.js';

// DOM element references
const runBtn = document.getElementById('runBtn');
const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');
const editorContainer = document.getElementById('editor-container');

/**
 * Updates the UI status indicator and Run button state.
 * @param {string} state - The current state ('loading' | 'ready' | 'running' | 'finished' | 'error')
 * @param {string} text - The display label for the status badge
 */
function updateStatus(state, text) {
  statusEl.textContent = text;
  if (state === 'loading' || state === 'running') {
    runBtn.disabled = true;
  } else if (state === 'ready' || state === 'finished' || state === 'error') {
    runBtn.disabled = false;
  }
}

/**
 * Clears the output console and resets its styling class.
 */
function clearOutput() {
  outputEl.textContent = '';
  outputEl.className = '';
}

/**
 * Displays successful program output in the console.
 * @param {string} text - The formatted stdout content
 */
function displayOutput(text) {
  outputEl.textContent = text || 'Program completed with no output.';
  outputEl.className = '';
  updateStatus('finished', '🟢 Finished');
}

/**
 * Displays compiler diagnostics or runtime error output in the console.
 * @param {string} text - The error message or compiler diagnostic output
 */
function displayCompilerError(text) {
  outputEl.textContent = text || 'Execution failed with no output.';
  outputEl.className = 'error';
  updateStatus('error', '🔴 Error');
}

/**
 * Initializes the WebAssembly compiler runtime on initial page load.
 */
function initializeCompiler() {
  updateStatus('loading', '⏳ Loading compiler...');
  clearOutput();
  outputEl.textContent = 'Initializing WASM compiler runtime...';

  setTimeout(() => {
    updateStatus('ready', '🟢 Ready');
    outputEl.textContent = 'Compiler ready. Click "Run Code" or press Ctrl+Enter to execute.';
  }, 50);
}

/**
 * Executes the C source code from the CodeMirror editor using picoc-js.
 */
function executeCode() {
  const code = getEditorValue();
  updateStatus('running', '⏳ Running...');
  clearOutput();

  let outputLines = [];
  let hasError = false;

  try {
    // Execute C compilation and runtime evaluation using frozen picoc-js integration
    runC(code, (out) => {
      if (out !== undefined && out !== null) {
        const line = String(out);
        outputLines.push(line);
        
        // Detect compilation diagnostics since Emscripten's callMain swallows ExitStatus
        if (line.includes('file.c:') || line.includes('error:') || line.includes('Aborted') || line.includes("';' expected")) {
          hasError = true;
        }
      }
    });
  } catch (err) {
    outputLines.push('Runtime Exception: ' + (err.message || String(err)));
    hasError = true;
  }

  // Allow synchronous callMain and stream flushing to settle
  setTimeout(() => {
    const finalOutput = outputLines.join('\n');
    if (hasError) {
      displayCompilerError(finalOutput);
    } else {
      displayOutput(finalOutput);
    }
  }, 300);
}

// Initialize CodeMirror 6 editor with default snippet and Ctrl+Enter shortcut
const initialCode = SNIPPETS[0] ? SNIPPETS[0].code : '';
initEditor(editorContainer, initialCode, { onRun: executeCode });

// Initialize collapsible left sidebar and snippet selection loader
initSidebar({
  onSelectSnippet: (snippet) => {
    setEditorValue(snippet.code);
    clearOutput();
    outputEl.textContent = `Loaded snippet: "${snippet.title}". Click "Run Code" or press Ctrl+Enter to execute.`;
  }
});

// Attach event listeners
runBtn.addEventListener('click', executeCode);

// Start compiler initialization
initializeCompiler();
