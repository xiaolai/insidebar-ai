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

        console.log('[Content Script] Setting textarea value. Current length:', currentValue.length, 'New length:', newValue.length);

        // For React - use native setter to bypass React's control
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeInputValueSetter.call(element, newValue);

        // Trigger multiple events to notify React/Vue/etc
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        // Focus and move cursor to end
        element.focus();
        element.selectionStart = element.selectionEnd = element.value.length;

        console.log('[Content Script] Textarea value after setting:', element.value.substring(0, 100) + (element.value.length > 100 ? '...' : ''));
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

  // Handle text injection message
  function handleTextInjection(event) {
    console.log('[Content Script] Received message:', event.data);

    // Only handle INJECT_TEXT messages
    if (!event.data || event.data.type !== 'INJECT_TEXT' || !event.data.text) {
      return;
    }

    console.log('[Content Script] INJECT_TEXT message received, text length:', event.data.text.length);

    const provider = detectProvider();
    if (!provider) {
      console.warn('[Content Script] Unknown provider, cannot inject text');
      return;
    }

    console.log('[Content Script] Detected provider:', provider);

    const selectors = PROVIDER_SELECTORS[provider];
    if (!selectors) {
      console.warn('[Content Script] No selectors configured for provider:', provider);
      return;
    }

    console.log('[Content Script] Trying selectors:', selectors);

    // Try each selector until we find an element
    let element = null;
    for (const selector of selectors) {
      element = findTextInputElement(selector);
      if (element) {
        console.log('[Content Script] Found element with selector:', selector);
        break;
      }
    }

    if (element) {
      console.log('[Content Script] Element found, injecting text...');
      const success = injectTextIntoElement(element, event.data.text);
      if (success) {
        console.log(`[Content Script] ✅ Text injected into ${provider} editor`);
      } else {
        console.error(`[Content Script] ❌ Failed to inject text into ${provider}`);
      }
    } else {
      console.warn(`[Content Script] ${provider} editor not found, will retry in 1s...`);
      // Retry after a short delay in case page is still loading
      setTimeout(() => {
        console.log('[Content Script] Retry attempt...');
        let retryElement = null;
        for (const selector of selectors) {
          retryElement = findTextInputElement(selector);
          if (retryElement) {
            console.log('[Content Script] Found element on retry:', selector);
            break;
          }
        }
        if (retryElement) {
          const success = injectTextIntoElement(retryElement, event.data.text);
          if (success) {
            console.log(`[Content Script] ✅ Text injected into ${provider} editor (retry)`);
          }
        } else {
          console.error(`[Content Script] ❌ ${provider} editor still not found after retry`);
        }
      }, 1000);
    }
  }

  // Listen for messages from sidebar
  window.addEventListener('message', handleTextInjection);

  console.log('Text injection listener registered for', detectProvider());
})();
