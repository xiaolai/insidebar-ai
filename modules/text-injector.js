/**
 * Text injection utilities for inserting text into provider textareas
 * Handles both standard textarea elements and contenteditable elements
 */

/**
 * Find a text input element by selector
 * @param {string} selector - CSS selector for the element
 * @returns {HTMLElement|null} - The found element or null
 */
export function findTextInputElement(selector) {
  if (!selector || typeof selector !== 'string') {
    return null;
  }

  try {
    return document.querySelector(selector);
  } catch (error) {
    console.error('Error finding element:', error);
    return null;
  }
}

/**
 * Inject text into an element (textarea or contenteditable)
 * @param {HTMLElement} element - The target element
 * @param {string} text - The text to inject
 * @returns {boolean} - True if injection was successful
 */
export function injectTextIntoElement(element, text) {
  if (!element || !text || typeof text !== 'string' || text.trim() === '') {
    return false;
  }

  try {
    const isTextarea = element.tagName === 'TEXTAREA' || element.tagName === 'INPUT';
    const isContentEditable = element.isContentEditable || element.getAttribute('contenteditable') === 'true';

    if (!isTextarea && !isContentEditable) {
      console.warn('Element is not a textarea or contenteditable:', element);
      return false;
    }

    if (isTextarea) {
      // For textarea/input elements
      const currentValue = element.value || '';
      element.value = currentValue + text;

      // Trigger input event to notify React/Vue/etc
      element.dispatchEvent(new Event('input', { bubbles: true }));

      // Focus and move cursor to end
      element.focus();
      element.selectionStart = element.selectionEnd = element.value.length;
    } else {
      // For contenteditable elements
      const currentText = element.textContent || '';
      element.textContent = currentText + text;

      // Trigger input event
      element.dispatchEvent(new Event('input', { bubbles: true }));

      // Focus and move cursor to end
      element.focus();

      // Move cursor to end for contenteditable
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(element);
      range.collapse(false); // Collapse to end
      selection.removeAllRanges();
      selection.addRange(range);
    }

    return true;
  } catch (error) {
    console.error('Error injecting text:', error);
    return false;
  }
}
