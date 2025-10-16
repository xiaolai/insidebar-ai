// Google AI Mode Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  // Check if this is Google AI Mode's textarea element
  const isGoogleInput = event.target.tagName === "TEXTAREA" &&
                        (event.target.classList.contains("ITIRGe") ||
                         event.target.getAttribute("aria-label") === "Ask anything" ||
                         event.target.getAttribute("maxlength") === "8192");

  if (!isGoogleInput) {
    return;
  }

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Insert newline
    try {
      const textarea = event.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      // Insert newline at cursor position
      textarea.value = value.substring(0, start) + '\n' + value.substring(end);

      // Move cursor after newline
      textarea.selectionStart = textarea.selectionEnd = start + 1;

      // Trigger input event for framework
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {
      console.error('[Google Enter] Failed to insert newline:', e);
    }
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Dispatch plain Enter to send
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
