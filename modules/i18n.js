// T074: Internationalization (i18n) utility module
// Provides helper functions for Chrome i18n API

// Translation cache for custom language override
let translationCache = null;
let currentLocale = null;

/**
 * Load translations from a specific locale
 * @param {string} locale - Locale code (e.g., 'en', 'zh_CN', 'zh_TW')
 * @returns {Promise<Object>} Translation messages object
 */
async function loadTranslations(locale) {
  try {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    const response = await fetch(url);
    const messages = await response.json();
    return messages;
  } catch (error) {
    console.warn(`Failed to load translations for locale: ${locale}`, error);
    return null;
  }
}

/**
 * Initialize i18n with user's preferred language
 * @param {string} preferredLocale - User's preferred locale from settings
 */
export async function initializeLanguage(preferredLocale = null) {
  // Determine which locale to use
  let locale = preferredLocale;

  if (!locale) {
    // Try to get from storage
    try {
      const result = await chrome.storage.sync.get({ language: null });
      locale = result.language;
    } catch (error) {
      // Storage not available, use browser default
    }
  }

  // If still no locale, use browser's language
  if (!locale) {
    locale = getBrowserLocale();
  }

  // Load the translations
  translationCache = await loadTranslations(locale);
  currentLocale = locale;

  // If loading failed, try fallback to English
  if (!translationCache && locale !== 'en') {
    translationCache = await loadTranslations('en');
    currentLocale = 'en';
  }
}

/**
 * Get browser's locale in our supported format
 * @returns {string} Locale code
 */
function getBrowserLocale() {
  const browserLang = chrome.i18n.getUILanguage();

  // Map browser language codes to our supported locales
  if (browserLang.startsWith('zh')) {
    if (browserLang.includes('TW') || browserLang.includes('HK') || browserLang.includes('Hant')) {
      return 'zh_TW';
    }
    return 'zh_CN';
  }
  return 'en';
}

/**
 * Get translated message with substitutions support
 * @param {string} key - Message key from messages.json
 * @param {string|string[]} substitutions - Optional substitution values
 * @returns {string} Translated message
 */
export function t(key, substitutions = null) {
  // If we have custom translations loaded, use them
  if (translationCache && translationCache[key]) {
    let message = translationCache[key].message || '';

    // Handle substitutions
    if (substitutions) {
      const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
      subs.forEach((sub, index) => {
        const placeholder = `$${index + 1}`;
        message = message.replace(new RegExp(`\\$${index + 1}`, 'g'), sub);
        // Also try $PLACEHOLDER$ format
        if (translationCache[key].placeholders) {
          Object.entries(translationCache[key].placeholders).forEach(([name, config]) => {
            if (config.content === placeholder) {
              message = message.replace(new RegExp(`\\$${name.toUpperCase()}\\$`, 'g'), sub);
            }
          });
        }
      });
    }

    return message;
  }

  // Fallback to Chrome's native i18n
  return chrome.i18n.getMessage(key, substitutions) || key;
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
  initI18n,
  initializeLanguage
};
