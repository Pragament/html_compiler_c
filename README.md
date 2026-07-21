# Browser C Compiler

A modern, browser-based C compiler and interactive execution environment powered by **WebAssembly**. It runs entirely client-side without any backend server, allowing you to write, compile, and interactively execute C programs directly in your browser.

---

## Features

- **True C Compilation in Browser**: Uses **BrowserCC** (LLVM Clang) to compile C code into WebAssembly modules locally.
- **WASM & WASI Runtime**: Executes compiled C code securely in the browser using a WebAssembly System Interface (WASI) shim.
- **Interactive Terminal**: Full-featured terminal powered by **xterm.js** that faithfully simulates a native Linux terminal environment.
- **Smart Stdin Handling**: Automatically analyzes C source code to provide the best input experience:
  - Immediate execution for programs with no input.
  - Auto-execution after exact input lines are collected for fixed-input programs.
  - Standard `Ctrl+D` EOF support for loop-driven input.
- **Modern Code Editor**: Powered by **CodeMirror 6** with C syntax highlighting, line numbers, auto-closing brackets, and a Catppuccin Mocha dark theme.
- **Keyboard Shortcuts**: Quickly compile and run with `Ctrl+Enter`.
- **Snippet Library**: Built-in, categorized educational C snippets with live search, filtering, and 1-click copy functionality.
- **100% Client-Side**: No code is ever sent to a server. Works completely offline after the initial load.
- **GitHub Pages Ready**: Optimized and pre-configured for static hosting deployment.

---

## Architecture

The compiler achieves a native-like interactive batch execution flow entirely in the browser:

1. **User writes C code** in the CodeMirror editor.
2. **Analysis**: The `analyzer.js` module tokenizes the source to intelligently classify `stdin` requirements (`none`, `fixed`, `unknown`).
3. **Compilation**: `BrowserCC` invokes LLVM Clang (running via WASM) to compile the C source into a WebAssembly executable module.
4. **Input Collection**: If required, the `InteractiveTerminal` collects user input based on the analyzed strategy.
5. **WASI Execution**: The `@bjorn3/browser_wasi_shim` provides a WASI environment. The WASM module executes synchronously, pushing `stdout`, `stderr`, and echoed `stdin` events into a chronological event queue.
6. **Replay**: The terminal clears the collection UI and seamlessly replays the event queue, interleaving program output and user input exactly as a native terminal would.

---

## Tech Stack

| Component | Technology |
|---|---|
| **Frontend UI** | HTML5, CSS3, JavaScript (ES Modules) |
| **Compiler** | [BrowserCC](https://github.com/dzaima/browsercc) (LLVM Clang via WebAssembly) |
| **Runtime** | WebAssembly (WASM), WASI (`@bjorn3/browser_wasi_shim`) |
| **Terminal** | [xterm.js](https://xtermjs.org/) |
| **Editor** | [CodeMirror 6](https://codemirror.net/) |
| **Bundler** | Vite |
| **Deployment** | GitHub Actions, GitHub Pages |
| **Language** | C |

---

## Folder Structure

```text
html_compiler_c/
│
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions deployment to Pages
│
├── public/
│   └── browsercc/          # Precompiled Clang/LLD WASM binaries and sysroot
│
├── src/
│   ├── analyzer.js         # C source tokeniser & stdin usage classifier
│   ├── editor.js           # CodeMirror 6 editor configuration
│   ├── main.js             # Execution orchestration and WASI runtime setup
│   ├── search.js           # Snippet search and filtering logic
│   ├── sidebar.js          # Sidebar UI and snippet management
│   ├── snippets.js         # Built-in C code snippets library
│   └── terminal.js         # xterm.js interactive terminal & event replay
│
├── index.html              # Main application UI and layout
├── package.json            # Project dependencies and scripts
├── vite.config.js          # Vite bundler configuration
└── LICENSE                 # GNU Affero General Public License v3.0
```

---

## How It Works

### Compilation Pipeline
The compilation pipeline completely circumvents backend APIs. When the user clicks "Run Code", the raw text is passed to `BrowserCC` which runs a WebAssembly build of `clang`. This emits a compiled `.wasm` file in memory. 

During execution, `@bjorn3/browser_wasi_shim` provides the virtual filesystem (`PreopenDirectory`), standard streams (`ConsoleStdout`), and system calls required by the C standard library (musl libc).

### Input Handling
Because modern browsers lack true multithreaded blocking synchronous I/O without `SharedArrayBuffer` (which requires restrictive COOP/COEP headers that break GitHub pages), the project implements a **batch execution model** masked by a smart terminal UI.

Before execution, `analyzer.js` tokenizes the C code to determine input requirements:
- **No Stdin (`none`)**: Program never reads `stdin` (e.g., just `printf`). Executes immediately without an input prompt.
- **Fixed Stdin (`fixed`)**: Program calls `scanf`/`getchar`/`fgets` a fixed `N` times outside of loops. The terminal collects exactly `N` lines and auto-executes the program. No `Ctrl+D` needed.
- **Unknown Stdin (`unknown`)**: `stdin` is inside a loop (e.g. `while(scanf(...) == 1)`). The terminal collects input until the user explicitly signals EOF by pressing `Ctrl+D`.

---

## Installation

Clone the repository:
```bash
git clone <repository-url>
cd html_compiler_c
```

Install dependencies:
```bash
npm install
```

Start the local development server:
```bash
npm run dev
```

Build the production version:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## Deployment

The project is configured for seamless deployment to **GitHub Pages**. 
A GitHub Actions workflow (`.github/workflows/deploy.yml`) is included to automatically build and deploy the `main` branch. 

*Note: The `vite.config.js` uses a `base` path of `/html_compiler_c/` which corresponds to the GitHub repository name.*

---

## Screenshots

### Editor & Workspace
*(Add screenshot of the main layout, CodeMirror editor, and sidebar here)*

### Interactive Terminal Execution
*(Add screenshot of the xterm.js terminal showing interleaved input/output here)*

---

## Future Improvements

- Add support for multiple file tabs (e.g. headers and multiple `.c` files).
- Provide options for custom compiler flags (`-Wall`, `-Wextra`, `-O3`).
- Implement virtual file upload/download capabilities into the WASI virtual filesystem.
- Offer adjustable terminal themes and layouts.

---

## License

This project is released under the **GNU Affero General Public License v3.0** (AGPL-3.0). See the [LICENSE](LICENSE) file for details.

---

## Author

Developed as an open-source initiative to make C programming accessible directly in the browser without server-side constraints.
