// Perplexity Enter/Shift+Enter behavior swap
// Makes Enter = newline, Shift+Enter = send

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  // Check if this is Perplexity's Lexical editor input
  const isPerplexityInput = event.target.id === "ask-input" &&
                            event.target.contentEditable === "true";

  if (!isPerplexityInput) {
    return;
  }

  const isOnlyEnter = !event.ctrlKey && !event.metaKey && !event.shiftKey;
  const isShiftEnter = event.shiftKey && !event.ctrlKey && !event.metaKey;

  if (isOnlyEnter || isShiftEnter) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (isOnlyEnter) {
      // Enter pressed - convert to Shift+Enter for Lexical (newline)
      const newEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        shiftKey: true,  // Lexical treats Shift+Enter as line break
        ctrlKey: false,
        metaKey: false
      });
      event.target.dispatchEvent(newEvent);
    } else if (isShiftEnter) {
      // Shift+Enter pressed - convert to plain Enter to send
      const newEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false
      });
      event.target.dispatchEvent(newEvent);
    }
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
