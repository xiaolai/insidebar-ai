// Microsoft Copilot Enter/Shift+Enter behavior swap
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

// Helper: Find Copilot's Send button
function findSendButton() {
  // Copilot uses data-testid="submit-button" for the send button
  const byTestId = document.querySelector('button[data-testid="submit-button"]');
  if (byTestId) return byTestId;

  // Fallback: search by aria-label
  const byAriaLabel = document.querySelector('button[aria-label="Submit message"]');
  if (byAriaLabel) return byAriaLabel;

  // Another fallback: search all buttons for matching aria-label
  return Array.from(document.querySelectorAll('button')).find(btn =>
    btn.getAttribute('aria-label')?.includes('Submit') ||
    btn.getAttribute('title')?.includes('Submit')
  );
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

  // Check if this is Copilot's input area
  // Copilot uses textarea with id="userInput" and data-testid="composer-input"
  const isMainComposer = activeElement &&
                         activeElement.tagName === "TEXTAREA" &&
                         (activeElement.id === "userInput" ||
                          activeElement.getAttribute('data-testid') === 'composer-input') &&
                         activeElement.offsetParent !== null;

  // Also check for floating/inline textarea (appears during editing)
  const isFloatingTextarea = activeElement &&
                            activeElement.tagName === "TEXTAREA" &&
                            activeElement.placeholder?.includes('question or edit') &&
                            activeElement.offsetParent !== null;

  const isCopilotInput = isMainComposer || isFloatingTextarea;

  if (!isCopilotInput) {
    return;
  }

  // IMPORTANT: Copilot's native behavior is OPPOSITE of ChatGPT/Claude:
  // - Enter (no shift) = Send message
  // - Shift+Enter = Newline
  // So we must ALWAYS preventDefault and handle both actions ourselves

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Insert a newline character at cursor position
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    const value = activeElement.value;
    activeElement.value = value.substring(0, start) + '\n' + value.substring(end);
    activeElement.selectionStart = activeElement.selectionEnd = start + 1;

    // Trigger input event so Copilot knows the content changed
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
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
      // Let Copilot's native Enter behavior send the message
      const newEvent = createEnterEvent({});
      activeElement.dispatchEvent(newEvent);
    }
  }
  else {
    // Block any other Enter combinations to avoid conflicts
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
