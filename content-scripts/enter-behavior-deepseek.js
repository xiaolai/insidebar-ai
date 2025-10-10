// DeepSeek Enter/Shift+Enter behavior swap
// Makes Enter = newline, Shift+Enter = send

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

  const isOnlyEnter = !event.ctrlKey && !event.metaKey && !event.shiftKey;
  const isShiftEnter = event.shiftKey && !event.ctrlKey && !event.metaKey;

  if (isOnlyEnter || isShiftEnter) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (isOnlyEnter) {
      // Enter pressed - want newline
      // Use direct manipulation for both iframe and normal page (more reliable for DeepSeek)
      const target = event.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;

      target.value = value.substring(0, start) + '\n' + value.substring(end);
      target.selectionStart = target.selectionEnd = start + 1;

      // Trigger input event for framework reactivity
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (isShiftEnter) {
      // Shift+Enter pressed - want to send
      const newEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
        shiftKey: false  // Plain Enter to send
      });
      event.target.dispatchEvent(newEvent);
    }
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
