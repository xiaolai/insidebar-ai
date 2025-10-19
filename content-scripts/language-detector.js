/**
 * Language Detector for Content Scripts
 * Detects provider's UI language and provides matching text for our Save buttons
 *
 * NOTE: This file must be loaded BEFORE any *-history-extractor.js files in manifest.json
 * It exports functions to window.LanguageDetector
 */

(function() {
  'use strict';

  // Create global namespace for language detector utilities
  window.LanguageDetector = window.LanguageDetector || {};

  /**
   * Share button text in different languages
   * Used to detect what language the provider is using
   * Note: Some providers use multiple variations for the same language
   */
  const SHARE_BUTTON_TEXT = {
    'en': ['Share'],
    'zh_CN': ['分享', '共享'],      // ChatGPT uses 共享, others use 分享
    'zh_TW': ['分享', '共享'],
    'ja': ['共有する', '共有'],    // Grok uses 共有する (verb), others use 共有 (noun)
    'ko': ['공유'],
    'ru': ['Поделиться'],
    'es': ['Compartir'],
    'fr': ['Partager'],
    'de': ['Teilen'],
    'it': ['Condividi']
  };

  /**
   * Save button text in different languages
   * Matches the language detected from provider's UI
   */
  const SAVE_BUTTON_TEXT = {
    'en': 'Save',
    'zh_CN': '保存',
    'zh_TW': '保存',
    'ja': '保存',
    'ko': '저장',
    'ru': 'Сохранить',
    'es': 'Guardar',
    'fr': 'Enregistrer',
    'de': 'Speichern',
    'it': 'Salva'
  };

  /**
   * Save button tooltip text in different languages
   */
  const SAVE_TOOLTIP_TEXT = {
    'en': 'Save this conversation to insidebar.ai',
    'zh_CN': '保存此对话到 insidebar.ai',
    'zh_TW': '保存此對話到 insidebar.ai',
    'ja': 'この会話を insidebar.ai に保存',
    'ko': '이 대화를 insidebar.ai에 저장',
    'ru': 'Сохранить этот разговор в insidebar.ai',
    'es': 'Guardar esta conversación en insidebar.ai',
    'fr': 'Enregistrer cette conversation dans insidebar.ai',
    'de': 'Dieses Gespräch in insidebar.ai speichern',
    'it': 'Salva questa conversazione su insidebar.ai'
  };

  /**
   * Detect provider's UI language by examining their Share button
   *
   * Strategy:
   * 1. Find Share button using provided selector
   * 2. Read its text content
   * 3. Match against known translations
   * 4. Fallback to document language if Share button not found
   * 5. Final fallback to English
   *
   * @param {string|null} shareButtonSelector - CSS selector for provider's Share button
   * @returns {string} Language code (e.g., 'en', 'zh_CN', 'ja')
   *
   * @example
   * // ChatGPT
   * const lang = window.LanguageDetector.detectProviderLanguage('[data-testid="share-chat-button"]');
   *
   * // No Share button (fallback to document lang)
   * const lang = window.LanguageDetector.detectProviderLanguage(null);
   */
  window.LanguageDetector.detectProviderLanguage = function(shareButtonSelector) {
    // Try to detect from Share button first
    if (shareButtonSelector) {
      try {
        const shareButton = document.querySelector(shareButtonSelector);
        if (shareButton) {
          const shareText = shareButton.textContent?.trim();

          if (shareText) {
            // Match against known Share button texts
            for (const [lang, texts] of Object.entries(SHARE_BUTTON_TEXT)) {
              // texts is now an array of possible variations
              if (texts.includes(shareText)) {
                console.debug('[Language Detector] Detected from Share button:', lang, 'text:', shareText);
                return lang;
              }
            }

            console.debug('[Language Detector] Share button text not recognized:', shareText);
          }
        }
      } catch (error) {
        console.warn('[Language Detector] Error reading Share button:', error);
      }
    }

    // Fallback: detect from document language attribute
    const docLang = detectFromDocumentLanguage();
    console.debug('[Language Detector] Using document language fallback:', docLang);
    return docLang;
  };

  /**
   * Detect language from HTML lang attribute
   * @private
   */
  function detectFromDocumentLanguage() {
    const htmlLang = document.documentElement.lang;

    if (!htmlLang) {
      console.debug('[Language Detector] No document language set, using English');
      return 'en';
    }

    // Map common lang codes to our supported languages
    const langLower = htmlLang.toLowerCase();

    // Chinese variants
    if (langLower.includes('zh-cn') || langLower.includes('zh-hans') || langLower === 'zh') {
      return 'zh_CN';
    }
    if (langLower.includes('zh-tw') || langLower.includes('zh-hk') || langLower.includes('zh-hant')) {
      return 'zh_TW';
    }

    // Other languages (match by prefix)
    if (langLower.startsWith('ja')) return 'ja';
    if (langLower.startsWith('ko')) return 'ko';
    if (langLower.startsWith('ru')) return 'ru';
    if (langLower.startsWith('es')) return 'es';
    if (langLower.startsWith('fr')) return 'fr';
    if (langLower.startsWith('de')) return 'de';
    if (langLower.startsWith('it')) return 'it';

    // Default to English
    return 'en';
  }

  /**
   * Get Save button text in the detected language
   *
   * This is the main function to use in history extractors
   *
   * @param {string|null} shareButtonSelector - CSS selector for provider's Share button
   * @returns {Object} Object with text, tooltip, and detected language
   * @returns {string} return.text - Save button text in detected language
   * @returns {string} return.tooltip - Tooltip text in detected language
   * @returns {string} return.lang - Detected language code
   *
   * @example
   * // In ChatGPT history extractor
   * const { text, tooltip, lang } = window.LanguageDetector.getSaveButtonText('[data-testid="share-chat-button"]');
   * button.textContent = text;           // "Save" or "保存" etc.
   * button.title = tooltip;              // Translated tooltip
   * console.log('Using language:', lang); // "en" or "zh_CN" etc.
   */
  window.LanguageDetector.getSaveButtonText = function(shareButtonSelector) {
    const lang = window.LanguageDetector.detectProviderLanguage(shareButtonSelector);

    return {
      text: SAVE_BUTTON_TEXT[lang] || SAVE_BUTTON_TEXT['en'],
      tooltip: SAVE_TOOLTIP_TEXT[lang] || SAVE_TOOLTIP_TEXT['en'],
      lang: lang
    };
  };

  // Expose language maps for direct use if needed
  window.LanguageDetector.SHARE_BUTTON_TEXT = SHARE_BUTTON_TEXT;
  window.LanguageDetector.SAVE_BUTTON_TEXT = SAVE_BUTTON_TEXT;
  window.LanguageDetector.SAVE_TOOLTIP_TEXT = SAVE_TOOLTIP_TEXT;

})();
