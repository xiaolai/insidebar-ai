// ChatGPT Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    return;
  }

  // Get the currently focused element
  const activeElement = document.activeElement;

  // Check if this is ChatGPT's input area:
  // 1. Main prompt: ProseMirror div with id="prompt-textarea"
  // 2. Editing area: Regular textarea element (appears when editing old messages)
  const isMainPrompt = activeElement &&
                       activeElement.id === "prompt-textarea" &&
                       activeElement.contentEditable === "true" &&
                       activeElement.classList.contains("ProseMirror");

  const isEditingTextarea = activeElement &&
                           activeElement.tagName === "TEXTAREA" &&
                           activeElement.offsetParent !== null; // visible check

  if (!isMainPrompt && !isEditingTextarea) {
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    if (isEditingTextarea) {
      // For regular textarea: let native Enter behavior work
      // Don't preventDefault - just return and let browser handle it
      return;
    } else {
      // For ProseMirror: intercept and send Shift+Enter
      event.preventDefault();
      event.stopImmediatePropagation();

      const newEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        shiftKey: true,  // ProseMirror treats Shift+Enter as newline
        ctrlKey: false,
        metaKey: false,
        altKey: false
      });
      activeElement.dispatchEvent(newEvent);
    }
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Find and click the Send button (more reliable for both element types)
    // For editing: button is nearby with text "Send"
    // For main prompt: button has data-testid or aria-label
    const sendButton = document.querySelector('button[data-testid="send-button"]') ||
                       document.querySelector('button[data-testid="fruitjuice-send-button"]') ||
                       Array.from(document.querySelectorAll('button')).find(btn =>
                         btn.textContent.trim() === 'Send' ||
                         btn.getAttribute('aria-label')?.includes('Send') ||
                         btn.getAttribute('aria-label')?.includes('send')
                       );

    if (sendButton && !sendButton.disabled) {
      sendButton.click();
    } else {
      // Fallback: dispatch Meta+Enter for ProseMirror
      const newEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        metaKey: true,
        shiftKey: false,
        ctrlKey: false,
        altKey: false
      });
      activeElement.dispatchEvent(newEvent);
    }
  }
  else {
    // Block any other Enter combinations (Ctrl+Enter, Alt+Enter, etc.)
    // Only allow the configured newline and send actions
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
