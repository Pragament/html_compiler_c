# Browser C Compiler (Release 1)

A browser-based C compiler built with **JavaScript**, **WebAssembly**, and **Vite** that allows users to write, compile, and execute C programs directly in the browser without requiring any backend server.

The application is fully client-side and provides an interactive coding environment with syntax highlighting, code snippets, and instant execution.

---

## Features

### Code Editor

- CodeMirror 6 editor
- C syntax highlighting
- Line numbers
- Auto bracket completion
- Automatic indentation
- Dark theme interface

---

### Snippet Library

Educational snippets grouped into categories:

- Basics
- Variables
- Loops
- Arrays
- Functions
- Pointers
- Structures
- File I/O

Features include:

- Search snippets
- Category filters
- One-click snippet loading
- Collapsible sidebar

---

### Browser Compilation

- 100% client-side execution
- WebAssembly-based runtime
- No backend server
- No API calls
- No Docker
- No cloud compilation

---

### User Interface

- Responsive layout
- Status indicator
- Output console
- Error display
- Modern dark theme

---

## Project Structure

```
browser-c-compiler/
│
├── src/
│   ├── main.js
│   ├── editor.js
│   ├── sidebar.js
│   ├── search.js
│   └── snippets.js
│
├── patches/
│   └── picoc-js+1.0.12.patch
│
├── index.html
├── package.json
├── package-lock.json
├── README.md
└── LICENSE
```

---

## Technologies Used

- JavaScript (ES Modules)
- Vite
- WebAssembly
- CodeMirror 6
- picoc-js
- HTML5
- CSS3

---

## Installation

Clone the repository

```bash
git clone <repository-url>
```

Go into the project directory

```bash
cd browser-c-compiler
```

Install dependencies

```bash
npm install
```

Start development server

```bash
npm run dev
```

Build production version

```bash
npm run build
```

Preview production build

```bash
npm run preview
```

---

## Current Release

### Release 1

Implemented:

- Browser-based C execution
- WebAssembly runtime integration
- Modular frontend architecture
- CodeMirror editor
- Educational snippet library
- Search and filtering
- Responsive interface
- Output console
- Error handling

---

## Known Limitations

This project currently uses the **picoc-js** WebAssembly runtime.

Because of limitations in the underlying runtime:

- Some `printf()` statements without a trailing newline (`\n`) may not immediately display output.
- Certain C standard library behaviors depend on the runtime implementation.
- This project is intended as an educational browser-based compiler rather than a complete GCC or Clang replacement.

These limitations originate from the runtime itself rather than the frontend implementation.

---

## Future Improvements

Planned enhancements include:

- Better runtime output buffering
- Input support using `scanf()`
- File upload support
- Download source code
- Theme switching
- Multiple file support
- Terminal-like console
- Compiler settings
- Better runtime diagnostics

---

## License

This project is released under the MIT License.
