// Common text injection handler for all AI providers
// Listens for postMessage from sidebar and injects text using the provided selector(s)

import { findTextInputElement, injectTextIntoElement } from '../modules/text-injector.js';

/**
 * Create a text injection handler for a specific provider
 * @param {string|string[]} selectors - CSS selector(s) to find the input element
 * @param {string} providerName - Name of the provider for logging
 * @returns {Function} Event handler function
 */
export function createTextInjectionHandler(selectors, providerName) {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

  return function handleTextInjection(event) {
    // Only handle INJECT_TEXT messages
    if (!event.data || event.data.type !== 'INJECT_TEXT' || !event.data.text) {
      return;
    }

    // Try each selector until we find an element
    let element = null;
    for (const selector of selectorArray) {
      element = findTextInputElement(selector);
      if (element) break;
    }

    if (element) {
      const success = injectTextIntoElement(element, event.data.text);
      if (success) {
        console.log(`Text injected into ${providerName} editor`);
      } else {
        console.error(`Failed to inject text into ${providerName}`);
      }
    } else {
      console.warn(`${providerName} editor not found, will retry...`);
      // Retry after a short delay in case page is still loading
      setTimeout(() => {
        let retryElement = null;
        for (const selector of selectorArray) {
          retryElement = findTextInputElement(selector);
          if (retryElement) break;
        }
        if (retryElement) {
          injectTextIntoElement(retryElement, event.data.text);
        }
      }, 1000);
    }
  };
}

/**
 * Setup text injection listener for a provider
 * @param {string|string[]} selectors - CSS selector(s) to find the input element
 * @param {string} providerName - Name of the provider for logging
 */
export function setupTextInjectionListener(selectors, providerName) {
  const handler = createTextInjectionHandler(selectors, providerName);
  window.addEventListener('message', handler);
}
