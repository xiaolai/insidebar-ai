// Ollama (Open WebUI) Enter/Shift+Enter behavior swap
// Makes Enter = newline, Shift+Enter = send

function handleEnterSwap(event) {
  // Only handle trusted Enter key events on textarea elements
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  const isOllamaInput = event.target.tagName === "TEXTAREA";

  if (!isOllamaInput) {
    return;
  }

  const isOnlyEnter = !event.ctrlKey && !event.metaKey && !event.shiftKey;
  const isShiftEnter = event.shiftKey && !event.ctrlKey && !event.metaKey;

  if (isOnlyEnter || isShiftEnter) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const newEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      bubbles: true,
      cancelable: true,
      shiftKey: isOnlyEnter  // Shift for newline, no Shift for send
    });
    event.target.dispatchEvent(newEvent);
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
