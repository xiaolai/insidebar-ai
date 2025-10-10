// ChatGPT Enter/Shift+Enter behavior swap
// Makes Enter = newline, Shift+Enter = send
// Based on ChatGPT-Ctrl-Enter-Sender implementation

function handleEnterSwap(event) {
  // Only handle trusted Enter key events on the prompt textarea
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  const isPromptTextarea = event.target.id === "prompt-textarea";
  if (!isPromptTextarea) {
    return;
  }

  const isOnlyEnter = !event.ctrlKey && !event.metaKey && !event.shiftKey;
  const isShiftEnter = event.shiftKey && !event.ctrlKey && !event.metaKey;

  // Enter alone: Convert to Shift+Enter to insert newline
  if (isOnlyEnter) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const newEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      bubbles: true,
      cancelable: true,
      ctrlKey: false,
      metaKey: false,
      shiftKey: true  // This makes ChatGPT insert a newline
    });
    event.target.dispatchEvent(newEvent);
  }
  // Shift+Enter: Convert to Meta+Enter to send message
  else if (isShiftEnter) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const newEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      bubbles: true,
      cancelable: true,
      ctrlKey: false,
      metaKey: true,  // Use Meta instead of Ctrl for sidebar/narrow view compatibility
      shiftKey: false
    });
    event.target.dispatchEvent(newEvent);
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
