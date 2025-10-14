// Perplexity Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

console.log('[Perplexity Enter] Script loaded');

function handleEnterSwap(event) {
  // Only handle Enter key events
  if (event.code !== "Enter") {
    return;
  }

  console.log('[Perplexity Enter] Enter key detected', {
    target: event.target,
    id: event.target.id,
    isContentEditable: event.target.isContentEditable,
    shiftKey: event.shiftKey
  });

  // Check if this is Perplexity's Lexical editor input
  const isPerplexityInput =
    (event.target.id === "ask-input" && event.target.isContentEditable) ||
    (event.target.getAttribute?.('data-lexical-editor') === "true" && event.target.getAttribute?.('role') === "textbox");

  if (!isPerplexityInput) {
    console.log('[Perplexity Enter] Not Perplexity input, ignoring');
    return;
  }

  console.log('[Perplexity Enter] Perplexity input detected!');

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    console.log('[Perplexity Enter] Config disabled or not loaded', enterKeyConfig);
    return;
  }

  console.log('[Perplexity Enter] Config loaded:', enterKeyConfig);

  // For "swapped" preset (default):
  // - Plain Enter (no modifiers) should insert newline
  // - Shift+Enter should send message

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    console.log('[Perplexity Enter] Newline action - preventing default and inserting <br>');
    event.preventDefault();
    event.stopImmediatePropagation();

    // Insert newline manually
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const br = document.createElement('br');
      range.insertNode(br);

      // Add extra br if at end of line for proper cursor positioning
      const brAfter = document.createElement('br');
      range.insertNode(brAfter);

      range.setStartAfter(br);
      range.setEndAfter(br);
      selection.removeAllRanges();
      selection.addRange(range);

      // Trigger input event for Lexical
      event.target.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return;
  }

  // Check if this matches send action
  if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    console.log('[Perplexity Enter] Send action - preventing default and clicking submit');
    event.preventDefault();
    event.stopImmediatePropagation();

    // Find and click the submit button
    const submitButton = document.querySelector('[data-testid="submit-button"]') ||
                        document.querySelector('button[aria-label="Submit"]');

    console.log('[Perplexity Enter] Submit button found:', submitButton);

    if (submitButton && !submitButton.disabled) {
      submitButton.click();
    }
    return;
  }

  console.log('[Perplexity Enter] No modifier match, allowing default behavior');
}

// Apply the setting on initial load
console.log('[Perplexity Enter] Calling applyEnterSwapSetting');
applyEnterSwapSetting();
