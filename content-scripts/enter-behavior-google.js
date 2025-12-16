// Google AI Mode Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

// Helper: Create a synthetic Enter KeyboardEvent with specified modifiers
function createEnterEvent(modifiers = {}) {
  return new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
    shiftKey: modifiers.shift || false,
    ctrlKey: modifiers.ctrl || false,
    metaKey: modifiers.meta || false,
    altKey: modifiers.alt || false
  });
}

// Helper: Find Google's Send button
function findSendButton() {
  // Try by data-xid first (most reliable)
  const byDataXid = document.querySelector('button[data-xid="input-plate-send-button"]');
  if (byDataXid) return byDataXid;

  // Try by aria-label
  const byAriaLabel = document.querySelector('button[aria-label="Send"]');
  if (byAriaLabel) return byAriaLabel;

  // Try by class (Google-specific)
  const byClass = document.querySelector('button.OEueve');
  if (byClass) return byClass;

  // Fallback: search by aria-label content
  return Array.from(document.querySelectorAll('button')).find(btn =>
    btn.getAttribute('aria-label')?.includes('Send')
  );
}

// Helper: Manually insert newline into textarea at cursor position
function insertTextareaNewline(textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  // Insert newline at cursor position
  textarea.value = value.substring(0, start) + '\n' + value.substring(end);

  // Move cursor after the newline
  textarea.selectionStart = textarea.selectionEnd = start + 1;

  // Trigger input event so Google detects the change
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
}

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  // Skip if IME composition is in progress (e.g., Chinese/Japanese input method)
  if (!event.isTrusted || event.code !== "Enter" || event.isComposing) {
    return;
  }

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    return;
  }

  // Get the currently focused element
  const activeElement = document.activeElement;

  // Check if this is Google AI Mode's textarea element
  // Note: Google AI Mode does not support editing old messages
  const isGoogleInput = activeElement &&
                        activeElement.tagName === "TEXTAREA" &&
                        (activeElement.classList.contains("ITIRGe") ||
                         activeElement.getAttribute("aria-label") === "Ask anything" ||
                         activeElement.getAttribute("maxlength") === "8192") &&
                        activeElement.offsetParent !== null; // visible check

  if (!isGoogleInput) {
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // For textarea: manually insert newline
    insertTextareaNewline(activeElement);
    return;
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Find and click the Send button
    const sendButton = findSendButton();

    if (sendButton && !sendButton.disabled) {
      sendButton.click();
    } else {
      // Fallback: dispatch plain Enter
      const newEvent = createEnterEvent();
      activeElement.dispatchEvent(newEvent);
    }
    return;
  }
  else {
    // Block any other Enter combinations (Ctrl+Enter, Alt+Enter, Meta+Enter, etc.)
    // This prevents Google's native keyboard shortcuts from interfering with user settings.
    // For example, if the user configured "swapped" mode (Enter=newline, Shift+Enter=send),
    // then Ctrl+Enter should do nothing to avoid confusion and ensure only the configured keys work.
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
