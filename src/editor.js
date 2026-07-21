/**
 * CodeMirror 6 Editor Module
 * Configured with C syntax highlighting, line numbers, auto indentation,
 * bracket matching, auto closing brackets, Catppuccin dark theme, and Ctrl+Enter shortcut.
 */

import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { indentUnit } from '@codemirror/language';

let editorView = null;

// Custom Catppuccin Mocha background and UI styling override
const catppuccinTheme = EditorView.theme({
  "&": {
    color: "#cdd6f4",
    backgroundColor: "#1e1e2e",
    fontSize: "14px",
    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
    border: "1px solid #45475a",
    borderRadius: "8px",
    height: "320px"
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace"
  },
  ".cm-content": {
    padding: "10px 0",
    caretColor: "#89b4fa"
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "#89b4fa"
  },
  ".cm-gutters": {
    backgroundColor: "#181825",
    color: "#6c7086",
    border: "none",
    borderRight: "1px solid #313244",
    borderTopLeftRadius: "8px",
    borderBottomLeftRadius: "8px"
  },
  ".cm-activeLine": {
    backgroundColor: "#31324460"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#31324460",
    color: "#cdd6f4"
  }
}, { dark: true });

/**
 * Initializes CodeMirror 6 inside the given container element.
 * @param {HTMLElement} container - DOM element to mount editor into
 * @param {string} initialCode - Initial C source code string
 * @param {Object} options - Configuration options ({ onRun })
 * @returns {EditorView} The initialized editor view instance
 */
export function initEditor(container, initialCode = '', { onRun = () => { } } = {}) {
  // Clear any fallback textarea if present
  container.innerHTML = '';

  const runShortcut = keymap.of([
    {
      key: 'Mod-Enter', // Mod maps to Ctrl on Windows/Linux and Cmd on macOS
      run: () => {
        onRun();
        return true;
      }
    }
  ]);

  const state = EditorState.create({
    doc: initialCode,
    extensions: [
      basicSetup, // Includes lineNumbers, bracketMatching, closeBrackets, history, etc.
      cpp(),      // C and C++ language syntax highlighting
      indentUnit.of("    "), // 4-space indentation
      oneDark,    // CodeMirror OneDark token syntax colors
      catppuccinTheme, // Catppuccin Mocha UI overrides
      runShortcut // Ctrl+Enter / Cmd+Enter shortcut
    ]
  });

  editorView = new EditorView({
    state,
    parent: container
  });

  return editorView;
}

/**
 * Retrieves the current text from the CodeMirror editor.
 * @returns {string} The C source code
 */
export function getEditorValue() {
  if (!editorView) return '';
  return editorView.state.doc.toString();
}

/**
 * Sets new text content into the CodeMirror editor without breaking undo history.
 * @param {string} code - The new C source code
 */
export function setEditorValue(code) {
  if (!editorView) return;
  const currentLen = editorView.state.doc.length;
  editorView.dispatch({
    changes: { from: 0, to: currentLen, insert: code }
  });
}
