// Perplexity Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

const DEBUG = false; // Set to true for console logging

function log(...args) {
  if (DEBUG) {
    console.log('[Perplexity Enter]', ...args);
  }
}

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  // Check if this is Perplexity's Lexical editor input
  // Support multiple detection methods for robustness
  const isPerplexityInput =
    (event.target.id === "ask-input" && event.target.contentEditable === "true") ||
    (event.target.getAttribute?.('data-lexical-editor') === "true" && event.target.getAttribute?.('role') === "textbox") ||
    (event.target.closest?.('[data-lexical-editor="true"]')?.getAttribute?.('role') === "textbox");

  if (!isPerplexityInput) {
    return;
  }

  log('Detected Perplexity input, config:', enterKeyConfig);

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    log('Enter key customization disabled');
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    log('Newline action triggered, preventing default and dispatching Shift+Enter');
    event.preventDefault();
    event.stopImmediatePropagation();

    // For Lexical: Shift+Enter inserts newline
    const newEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      shiftKey: true,
      ctrlKey: false,
      metaKey: false,
      altKey: false
    });
    event.target.dispatchEvent(newEvent);
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    log('Send action triggered, preventing default and dispatching plain Enter');
    event.preventDefault();
    event.stopImmediatePropagation();

    // Plain Enter to send
    const newEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false
    });
    event.target.dispatchEvent(newEvent);
  } else {
    log('No modifier match, allowing default behavior');
  }
}

// Log initialization
log('Perplexity Enter behavior script loaded');

// Apply the setting on initial load
applyEnterSwapSetting();
