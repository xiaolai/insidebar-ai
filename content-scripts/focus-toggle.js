// Focus toggle content script
// Handles focus switching between sidebar and main page input

/**
 * Find the AI provider's input element
 * Returns the main input field for the current AI platform
 */
function findProviderInput() {
  const host = window.location.hostname;

  // ChatGPT
  if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) {
    return document.querySelector('#prompt-textarea') ||
           document.querySelector('textarea[data-id="root"]');
  }

  // Claude
  if (host.includes('claude.ai')) {
    return document.querySelector('[contenteditable="true"].ProseMirror') ||
           document.querySelector('div[contenteditable="true"]') ||
           document.querySelector('textarea');
  }

  // Gemini
  if (host.includes('gemini.google.com')) {
    return document.querySelector('.ql-editor[contenteditable="true"]') ||
           document.querySelector('div.textarea[role="textbox"]') ||
           document.querySelector('textarea');
  }

  // Google AI Mode
  if (host.includes('google.com')) {
    return document.querySelector('textarea.ITIRGe') ||
           document.querySelector('textarea[aria-label="Ask anything"]') ||
           document.querySelector('textarea[maxlength="8192"]');
  }

  // Grok
  if (host.includes('grok.com')) {
    return document.querySelector('.tiptap.ProseMirror') ||
           document.querySelector('div[contenteditable="true"].ProseMirror');
  }

  // DeepSeek
  if (host.includes('chat.deepseek.com')) {
    return document.querySelector('textarea[placeholder*="DeepSeek"]') ||
           document.querySelector('textarea.ds-scroll-area');
  }

  // Perplexity
  if (host.includes('perplexity.ai')) {
    return document.querySelector('#ask-input[data-lexical-editor="true"]') ||
           document.querySelector('div[data-lexical-editor="true"][role="textbox"]');
  }

  // Copilot
  if (host.includes('copilot.microsoft.com') || host.includes('bing.com')) {
    return document.querySelector('#userInput') ||
           document.querySelector('textarea[data-testid="composer-input"]');
  }

  // Generic fallback: find any visible textarea or contenteditable
  const textarea = document.querySelector('textarea:not([hidden])');
  if (textarea && textarea.offsetParent !== null) return textarea;

  const contentEditable = document.querySelector('[contenteditable="true"]:not([hidden])');
  if (contentEditable && contentEditable.offsetParent !== null) return contentEditable;

  return null;
}

/**
 * Focus the provider's input element
 */
function focusProviderInput() {
  const input = findProviderInput();
  if (input) {
    input.focus();
    // For contenteditable elements, also set cursor at end
    if (input.isContentEditable) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(input);
      range.collapse(false); // collapse to end
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return true;
  }
  return false;
}

/**
 * Check if the page currently has focus
 */
function checkPageFocus() {
  return document.hasFocus();
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkFocus') {
    sendResponse({ hasFocus: checkPageFocus() });
  } else if (message.action === 'takeFocus') {
    const success = focusProviderInput();
    sendResponse({ success });
  }
  return true; // Keep channel open for async response
});
