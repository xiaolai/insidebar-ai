// ChatGPT Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

function handleEnterSwap(event) {
  // Only handle trusted Enter key events on the prompt textarea
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  const isPromptTextarea = event.target.id === "prompt-textarea";
  if (!isPromptTextarea) {
    return;
  }

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // For ChatGPT: Shift+Enter inserts newline
    const newEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      shiftKey: true,  // ChatGPT treats Shift+Enter as newline
      ctrlKey: false,
      metaKey: false,
      altKey: false
    });
    event.target.dispatchEvent(newEvent);
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // For ChatGPT: Meta+Enter sends (works in sidebar)
    const newEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      metaKey: true,  // Use Meta for send
      shiftKey: false,
      ctrlKey: false,
      altKey: false
    });
    event.target.dispatchEvent(newEvent);
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
