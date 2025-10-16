// T074: Internationalization (i18n) utility module
// Provides helper functions for Chrome i18n API

/**
 * Get translated message
 * @param {string} key - Message key from messages.json
 * @param {string|string[]} substitutions - Optional substitution values
 * @returns {string} Translated message
 */
export function t(key, substitutions = null) {
  return chrome.i18n.getMessage(key, substitutions);
}

/**
 * Translate all elements with data-i18n attribute
 * @param {HTMLElement} root - Root element to search (default: document)
 */
export function translatePage(root = document) {
  // Translate elements with data-i18n attribute for text content
  root.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      element.textContent = t(key);
    }
  });

  // Translate elements with data-i18n-html attribute for HTML content
  root.querySelectorAll('[data-i18n-html]').forEach(element => {
    const key = element.getAttribute('data-i18n-html');
    if (key) {
      element.innerHTML = t(key);
    }
  });

  // Translate placeholders
  root.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (key) {
      element.placeholder = t(key);
    }
  });

  // Translate titles/tooltips
  root.querySelectorAll('[data-i18n-title]').forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    if (key) {
      element.title = t(key);
    }
  });

  // Translate aria-labels
  root.querySelectorAll('[data-i18n-aria]').forEach(element => {
    const key = element.getAttribute('data-i18n-aria');
    if (key) {
      element.setAttribute('aria-label', t(key));
    }
  });
}

/**
 * Get current UI language
 * @returns {string} Language code (e.g., 'en', 'zh_CN', 'zh_TW')
 */
export function getCurrentLanguage() {
  return chrome.i18n.getUILanguage();
}

/**
 * Initialize i18n for a page
 * Call this on DOMContentLoaded
 */
export function initI18n() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => translatePage());
  } else {
    translatePage();
  }
}

// Export as default for convenience
export default {
  t,
  translatePage,
  getCurrentLanguage,
  initI18n
};
