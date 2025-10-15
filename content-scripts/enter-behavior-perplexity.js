// Perplexity Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

console.log('[Perplexity] Script loaded');

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  console.log('[Perplexity] Enter key detected', {
    target: event.target,
    id: event.target.id,
    isContentEditable: event.target.isContentEditable,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey
  });

  // Check if this is Perplexity's Lexical editor input
  const isPerplexityInput =
    (event.target.id === "ask-input" && event.target.isContentEditable) ||
    (event.target.getAttribute?.('data-lexical-editor') === "true" &&
     event.target.getAttribute?.('role') === "textbox");

  console.log('[Perplexity] Is Perplexity input?', isPerplexityInput);

  if (!isPerplexityInput) {
    return;
  }

  console.log('[Perplexity] Config:', enterKeyConfig);

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    console.log('[Perplexity] Config not enabled or not loaded');
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    console.log('[Perplexity] Newline action triggered');

    // Stop the original event completely
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    // Dispatch a synthetic Shift+Enter event (Perplexity's default for newline)
    const syntheticEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      shiftKey: true,  // Shift+Enter is Perplexity's default newline
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      bubbles: true,
      cancelable: true,
      composed: true
    });

    console.log('[Perplexity] Dispatching synthetic Shift+Enter');
    event.target.dispatchEvent(syntheticEvent);

    return;
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    console.log('[Perplexity] Send action triggered');

    // Stop the original event completely
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    // Dispatch a synthetic plain Enter event (Perplexity's default for send)
    const syntheticEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      shiftKey: false,  // Plain Enter is Perplexity's default send
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      bubbles: true,
      cancelable: true,
      composed: true
    });

    console.log('[Perplexity] Dispatching synthetic plain Enter');
    event.target.dispatchEvent(syntheticEvent);

    return;
  }

  console.log('[Perplexity] No modifier match, allowing default');
}

// Apply the setting on initial load
applyEnterSwapSetting();
