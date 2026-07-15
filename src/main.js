/**
 * Main Application Orchestrator
 * Integrates CodeMirror 6 editor, left sidebar snippets library, and JSCPP C runtime.
 * Preserves exact status transitions, output console behavior, and error handling.
 */

import JSCPP from 'JSCPP';
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
 * Initializes the compiler runtime on initial page load.
 */
function initializeCompiler() {
  updateStatus('loading', '⏳ Loading compiler...');
  clearOutput();
  outputEl.textContent = 'Initializing JSCPP runtime...';

  setTimeout(() => {
    updateStatus('ready', '🟢 Ready');
    outputEl.textContent = 'Compiler ready. Click "Run Code" or press Ctrl+Enter to execute.';
  }, 50);
}

/**
 * Executes the C source code from the CodeMirror editor using JSCPP.
 */
function executeCode() {
  const code = getEditorValue();
  updateStatus('running', '⏳ Running...');
  clearOutput();

  const startTime = performance.now();
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  let success = true;

  const config = {
    stdio: {
      write: (s) => {
        stdout += s;
      }
    },
    unsigned_overflow: 'error'
  };

  try {
    const result = JSCPP.run(code, '', config);
    if (typeof result === 'number') {
      exitCode = result;
    } else if (result !== undefined && result !== null) {
      exitCode = Number(result) || 0;
    } else {
      exitCode = 0;
    }
    if (exitCode !== 0) {
      success = false;
    }
  } catch (err) {
    stderr = err.message || String(err);
    exitCode = 1;
    success = false;
  }

  const duration = Math.round(performance.now() - startTime);

  if (!success) {
    displayCompilerError(stderr || stdout || 'Execution failed with no output.');
  } else {
    displayOutput(stdout);
  }

  if (import.meta.env && import.meta.env.DEV) {
    console.log(`Runtime:\nJSCPP\nExecution Time:\n${duration} ms\nExit Code:\n${exitCode}`);
  }
}

// Initialize CodeMirror 6 editor with default snippet and Ctrl+Enter shortcut
const initialCode = SNIPPETS[0] ? SNIPPETS[0].code : '';
initEditor(editorContainer, initialCode, { onRun: executeCode });

// Initialize collapsible left sidebar educational snippet browser
initSidebar();

// Attach event listeners
runBtn.addEventListener('click', executeCode);

// Start compiler initialization
initializeCompiler();
