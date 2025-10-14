// Grok Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

const DEBUG_GROK_ENTER = false;

function debugLog(...args) {
  if (DEBUG_GROK_ENTER) {
    console.log('[Grok Debug]', ...args);
  }
}

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  // Check if this is Grok's input (textarea or TipTap/ProseMirror editor)
  const isTextarea = event.target.tagName === "TEXTAREA";
  const isTipTap = event.target.tagName === "DIV" &&
                   event.target.contentEditable === "true" &&
                   (event.target.classList.contains("tiptap") ||
                    event.target.classList.contains("ProseMirror"));

  const isGrokInput = isTextarea || isTipTap;

  if (!isGrokInput) {
    return;
  }

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    return;
  }

  debugLog('Key event:', event, enterKeyConfig);

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    debugLog('Newline action triggered');

    // For textarea in iframe, use direct manipulation
    if (event.target.tagName === "TEXTAREA" && window !== window.top) {
      const target = event.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;

      target.value = value.substring(0, start) + '\n' + value.substring(end);
      target.selectionStart = target.selectionEnd = start + 1;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // Use Shift+Enter for newline
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
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    debugLog('Send action triggered');

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
