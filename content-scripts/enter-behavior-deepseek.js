// DeepSeek Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  // Check if this is DeepSeek's input element (textarea with ds-scroll-area class)
  const isDeepSeekInput = event.target.tagName === "TEXTAREA" &&
                          (event.target.classList.contains("ds-scroll-area") ||
                           event.target.placeholder?.includes("DeepSeek"));

  if (!isDeepSeekInput) {
    return;
  }

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Insert newline directly
    const target = event.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const value = target.value;

    target.value = value.substring(0, start) + '\n' + value.substring(end);
    target.selectionStart = target.selectionEnd = start + 1;

    // Trigger input event for framework reactivity
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
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
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
