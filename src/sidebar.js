/**
 * Collapsible Left Sidebar Module
 * Renders category filters, search input, and educational C snippet list.
 * Manages collapse/expand UI animation and expandable snippet previews with copy feature.
 */

import { CATEGORIES, SNIPPETS, getFilteredSnippets } from './snippets.js';
import { initSearch } from './search.js';

let expandedSnippetId = null;
let currentSnippets = SNIPPETS;

/**
 * Escapes HTML characters for safe rendering in card templates.
 * @param {string} str - Raw text input
 * @returns {string} Escaped HTML string
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Initializes sidebar structure, category filter tabs, search, and toggle button.
 * @param {Object} [options] - Initialization options
 */
export function initSidebar(options = {}) {
  renderCategoryTabs();
  renderSnippetList(SNIPPETS);

  // Initialize live search and filter updates
  initSearch({
    onFilterChange: ({ category, query }) => {
      const filtered = getFilteredSnippets(category, query);
      renderSnippetList(filtered);
    }
  });

  // Bind snippet list click delegation for expandable previews and copying code
  const listEl = document.getElementById('snippetList');
  if (listEl) {
    listEl.addEventListener('click', (e) => {
      // Handle Copy Code button clicks without collapsing card
      const copyBtn = e.target.closest('.snippet-copy-btn');
      if (copyBtn) {
        e.stopPropagation();
        const card = copyBtn.closest('.snippet-card');
        if (!card) return;
        const snippetId = card.dataset.id;
        const snippet = SNIPPETS.find(s => s.id === snippetId);
        if (snippet) {
          copySnippetCode(copyBtn, snippet.code);
        }
        return;
      }

      // Ignore clicks inside the code preview area so users can highlight or select text
      if (e.target.closest('.snippet-code-preview')) {
        return;
      }

      const card = e.target.closest('.snippet-card');
      if (!card) return;

      const snippetId = card.dataset.id;
      if (expandedSnippetId === snippetId) {
        expandedSnippetId = null;
      } else {
        expandedSnippetId = snippetId;
      }

      renderSnippetList(currentSnippets);
    });
  }

  // Bind collapse/expand toggle button
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  const sidebarEl = document.getElementById('sidebar');
  const layoutEl = document.querySelector('.main-layout');

  if (toggleBtn && sidebarEl && layoutEl) {
    toggleBtn.addEventListener('click', () => {
      sidebarEl.classList.toggle('collapsed');
      layoutEl.classList.toggle('sidebar-collapsed');

      const isCollapsed = sidebarEl.classList.contains('collapsed');
      toggleBtn.title = isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar';
      toggleBtn.innerHTML = isCollapsed ? '▶ Snippets' : '◀ Snippets';
    });
  }
}

/**
 * Copies C source code to clipboard and displays temporary feedback.
 * @param {HTMLElement} btn - The Copy Code button element
 * @param {string} code - The snippet code string to copy
 */
function copySnippetCode(btn, code) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      showCopyFeedback(btn);
    }).catch(() => {
      fallbackCopyText(code, btn);
    });
  } else {
    fallbackCopyText(code, btn);
  }
}

/**
 * Displays temporary copied feedback on the button for around 2 seconds.
 * @param {HTMLElement} btn - The Copy Code button element
 */
function showCopyFeedback(btn) {
  const originalText = btn.dataset.originalText || 'Copy Code';
  btn.dataset.originalText = originalText;
  btn.textContent = '✓ Copied!';
  btn.classList.add('copied');

  if (btn._copyTimeout) clearTimeout(btn._copyTimeout);
  btn._copyTimeout = setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.remove('copied');
  }, 2000);
}

/**
 * Fallback copy mechanism for older browsers or non-secure contexts.
 * @param {string} text - Text to copy
 * @param {HTMLElement} btn - Button element
 */
function fallbackCopyText(text, btn) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showCopyFeedback(btn);
  } catch (err) {
    console.error('Copy failed:', err);
  }
}

/**
 * Renders category filter tabs into the sidebar.
 */
function renderCategoryTabs() {
  const tabsEl = document.getElementById('categoryTabs');
  if (!tabsEl) return;

  tabsEl.innerHTML = CATEGORIES.map(cat => `
    <button class="cat-btn ${cat === 'All' ? 'active' : ''}" data-category="${cat}">
      ${cat}
    </button>
  `).join('');
}

/**
 * Renders the filtered list of snippet cards into the sidebar.
 * @param {Array} snippets - Array of snippet objects to display
 */
export function renderSnippetList(snippets) {
  const listEl = document.getElementById('snippetList');
  if (!listEl) return;

  currentSnippets = snippets;

  if (snippets.length === 0) {
    listEl.innerHTML = `<div class="no-results">No snippets match your filter.</div>`;
    return;
  }

  listEl.innerHTML = snippets.map(s => {
    const isExpanded = s.id === expandedSnippetId;
    return `
    <div class="snippet-card ${isExpanded ? 'expanded active' : ''}" data-id="${s.id}">
      <div class="snippet-title">${escapeHtml(s.title)}</div>
      <div class="snippet-desc">${escapeHtml(s.description)}</div>
      <span class="snippet-badge">${escapeHtml(s.category)}</span>
      ${isExpanded ? `
      <div class="snippet-preview-container">
        <pre class="snippet-code-preview"><code>${escapeHtml(s.code)}</code></pre>
        <button class="snippet-copy-btn" type="button">Copy Code</button>
      </div>
      ` : ''}
    </div>
    `;
  }).join('');
}
