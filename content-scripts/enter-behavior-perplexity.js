// Perplexity Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  // Check if this is Perplexity's Lexical editor input
  const isPerplexityInput =
    (event.target.id === "ask-input" && event.target.isContentEditable) ||
    (event.target.getAttribute?.('data-lexical-editor') === "true" && event.target.getAttribute?.('role') === "textbox");

  if (!isPerplexityInput) {
    return;
  }

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    return;
  }

  // For Perplexity with "swapped" behavior (default):
  // - Plain Enter should insert newline (normally sends message)
  // - Shift+Enter should send message (normally inserts newline)

  // Check if this matches newline action (user wants newline, default is send)
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    // User pressed the key combo for newline, but Perplexity would send
    // We need to prevent send and allow newline behavior
    // In Lexical, Shift+Enter creates newline, so if user pressed plain Enter,
    // we stop propagation and let Shift+Enter behavior happen instead
    event.preventDefault();
    event.stopPropagation();

    // Insert newline manually by using execCommand or directly manipulating content
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const br = document.createElement('br');
    range.insertNode(br);
    range.setStartAfter(br);
    range.setEndAfter(br);
    selection.removeAllRanges();
    selection.addRange(range);

    // Trigger input event for Lexical to update its state
    event.target.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  // Check if this matches send action (user wants send, default is newline)
  if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    // User pressed Shift+Enter (wants to send), but Perplexity would add newline
    // We need to trigger the submit button instead
    event.preventDefault();
    event.stopPropagation();

    // Find and click the submit button
    const submitButton = document.querySelector('[data-testid="submit-button"]') ||
                        document.querySelector('button[aria-label="Submit"]') ||
                        document.querySelector('button[type="submit"]');

    if (submitButton && !submitButton.disabled) {
      submitButton.click();
    }
    return;
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
