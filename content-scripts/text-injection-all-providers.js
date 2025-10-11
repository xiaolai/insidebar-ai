// Text injection handler for all AI providers
// Self-contained script without module imports (for iframe compatibility)

(function() {
  'use strict';

  // Provider-specific selectors
  const PROVIDER_SELECTORS = {
    chatgpt: ['#prompt-textarea'],
    claude: ['.ProseMirror[role="textbox"]'],
    gemini: ['.ql-editor'],
    grok: ['textarea', '.tiptap', '.ProseMirror'],
    deepseek: ['textarea.ds-scroll-area']
  };

  // Detect which provider we're on based on hostname
  function detectProvider() {
    const hostname = window.location.hostname;
    if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
      return 'chatgpt';
    } else if (hostname.includes('claude.ai')) {
      return 'claude';
    } else if (hostname.includes('gemini.google.com')) {
      return 'gemini';
    } else if (hostname.includes('grok.com')) {
      return 'grok';
    } else if (hostname.includes('deepseek.com')) {
      return 'deepseek';
    }
    return null;
  }

  // Find text input element by selector
  function findTextInputElement(selector) {
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

  // Inject text into an element (textarea or contenteditable)
  function injectTextIntoElement(element, text) {
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
        const newValue = currentValue + text;

        // For React - use native setter to bypass React's control
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeInputValueSetter.call(element, newValue);

        // Trigger multiple events to notify React/Vue/etc
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        // Move cursor to end (without focusing to avoid cross-origin error)
        element.selectionStart = element.selectionEnd = element.value.length;
      } else {
        // For contenteditable elements
        const currentText = element.textContent || '';
        element.textContent = currentText + text;

        // Trigger input event
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // Move cursor to end for contenteditable (without focusing)
        try {
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(element);
          range.collapse(false); // Collapse to end
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e) {
          // Ignore selection errors in cross-origin context
        }
      }

      return true;
    } catch (error) {
      console.error('Error injecting text:', error);
      return false;
    }
  }

  // Handle text injection message
  function handleTextInjection(event) {
    // Only handle INJECT_TEXT messages
    if (!event.data || event.data.type !== 'INJECT_TEXT' || !event.data.text) {
      return;
    }

    const provider = detectProvider();
    if (!provider) {
      console.warn('Unknown provider, cannot inject text');
      return;
    }

    const selectors = PROVIDER_SELECTORS[provider];
    if (!selectors) {
      console.warn('No selectors configured for provider:', provider);
      return;
    }

    // Try each selector until we find an element
    let element = null;
    for (const selector of selectors) {
      element = findTextInputElement(selector);
      if (element) break;
    }

    if (element) {
      const success = injectTextIntoElement(element, event.data.text);
      if (!success) {
        console.error(`Failed to inject text into ${provider}`);
      }
    } else {
      // Retry after a short delay in case page is still loading
      setTimeout(() => {
        let retryElement = null;
        for (const selector of selectors) {
          retryElement = findTextInputElement(selector);
          if (retryElement) break;
        }
        if (retryElement) {
          injectTextIntoElement(retryElement, event.data.text);
        } else {
          console.error(`${provider} editor not found`);
        }
      }, 1000);
    }
  }

  // Listen for messages from sidebar
  window.addEventListener('message', handleTextInjection);
})();
