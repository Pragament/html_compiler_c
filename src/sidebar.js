/**
 * Collapsible Left Sidebar Module
 * Renders category filters, search input, and educational C snippet list.
 * Manages collapse/expand UI animation and snippet selection events.
 */

import { CATEGORIES, SNIPPETS, getFilteredSnippets } from './snippets.js';
import { initSearch } from './search.js';

let activeSnippetId = 'hello-world';
let onSelectCallback = () => {};

/**
 * Initializes sidebar structure, category filter tabs, search, and toggle button.
 * @param {Object} options - Initialization options
 * @param {Function} options.onSelectSnippet - Callback invoked when a snippet item is clicked
 */
export function initSidebar({ onSelectSnippet }) {
  onSelectCallback = onSelectSnippet || (() => {});

  renderCategoryTabs();
  renderSnippetList(SNIPPETS);

  // Initialize live search and filter updates
  initSearch({
    onFilterChange: ({ category, query }) => {
      const filtered = getFilteredSnippets(category, query);
      renderSnippetList(filtered);
    }
  });

  // Bind snippet list click delegation
  const listEl = document.getElementById('snippetList');
  if (listEl) {
    listEl.addEventListener('click', (e) => {
      const card = e.target.closest('.snippet-card');
      if (!card) return;

      const snippetId = card.dataset.id;
      const snippet = SNIPPETS.find(s => s.id === snippetId);
      if (snippet) {
        activeSnippetId = snippetId;
        highlightActiveSnippet();
        onSelectCallback(snippet);
      }
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

  if (snippets.length === 0) {
    listEl.innerHTML = `<div class="no-results">No snippets match your filter.</div>`;
    return;
  }

  listEl.innerHTML = snippets.map(s => `
    <div class="snippet-card ${s.id === activeSnippetId ? 'active' : ''}" data-id="${s.id}">
      <div class="snippet-title">${s.title}</div>
      <div class="snippet-desc">${s.description}</div>
      <span class="snippet-badge">${s.category}</span>
    </div>
  `).join('');
}

/**
 * Updates visual active state highlights among rendered snippet cards.
 */
function highlightActiveSnippet() {
  const listEl = document.getElementById('snippetList');
  if (!listEl) return;

  const cards = listEl.querySelectorAll('.snippet-card');
  cards.forEach(c => {
    c.classList.toggle('active', c.dataset.id === activeSnippetId);
  });
}
