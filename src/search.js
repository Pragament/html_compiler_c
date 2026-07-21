/**
 * Real-time Search and Category Filter Module
 * Manages category selection state, live search input debouncing,
 * and triggers filtering updates for the snippet sidebar.
 */

let currentCategory = 'All';
let currentQuery = '';
let searchTimeout = null;

/**
 * Initializes search input and category filter listeners.
 * @param {Object} options - Configuration callbacks
 * @param {Function} options.onFilterChange - Callback invoked with ({ category, query })
 * @param {string} searchInputId - DOM id for the search input box
 * @param {string} categoryContainerId - DOM id for the category tabs container
 */
export function initSearch({ onFilterChange }, searchInputId = 'searchInput', categoryContainerId = 'categoryTabs') {
  const searchEl = document.getElementById(searchInputId);
  const categoryEl = document.getElementById(categoryContainerId);

  if (searchEl) {
    searchEl.addEventListener('input', (e) => {
      currentQuery = e.target.value || '';

      // Debounce search slightly for responsive typing feel
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        onFilterChange({ category: currentCategory, query: currentQuery });
      }, 100);
    });
  }

  if (categoryEl) {
    categoryEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;

      // Update active category tab
      const allBtns = categoryEl.querySelectorAll('.cat-btn');
      allBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentCategory = btn.dataset.category || 'All';
      onFilterChange({ category: currentCategory, query: currentQuery });
    });
  }
}

/**
 * Programmatically resets filter state to defaults.
 * @param {Function} onFilterChange - Callback to notify after reset
 */
export function resetFilters(onFilterChange) {
  currentCategory = 'All';
  currentQuery = '';

  const searchEl = document.getElementById('searchInput');
  if (searchEl) searchEl.value = '';

  const categoryEl = document.getElementById('categoryTabs');
  if (categoryEl) {
    const allBtns = categoryEl.querySelectorAll('.cat-btn');
    allBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.category === 'All');
    });
  }

  if (onFilterChange) {
    onFilterChange({ category: currentCategory, query: currentQuery });
  }
}
