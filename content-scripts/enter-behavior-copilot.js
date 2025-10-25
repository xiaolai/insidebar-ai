// Microsoft Copilot Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings
//
// TODO: After inspecting Copilot's DOM, update the following:
// - Text input selectors in handleEnterSwap()
// - Send button selectors in findSendButton()

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
  // TODO: Update these selectors after inspecting Copilot's DOM
  // Try specific data-testid attributes first (faster)
  const byTestId = document.querySelector('button[data-testid="send-button"]') ||
                   document.querySelector('button[aria-label*="Send"]') ||
                   document.querySelector('button[aria-label*="send"]');
  if (byTestId) return byTestId;

  // Fallback: search by text content or classes
  return Array.from(document.querySelectorAll('button')).find(btn =>
    btn.textContent.trim() === 'Send' ||
    btn.textContent.trim() === 'Submit' ||
    btn.getAttribute('aria-label')?.includes('Send') ||
    btn.getAttribute('aria-label')?.includes('Submit')
  );
}

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

  // TODO: Update these selectors after inspecting Copilot's input area
  // Check if this is Copilot's input area
  // Common patterns: textarea, contenteditable div, or specific input elements
  const isTextarea = activeElement &&
                     activeElement.tagName === "TEXTAREA" &&
                     activeElement.offsetParent !== null; // visible check

  const isContentEditable = activeElement &&
                           activeElement.contentEditable === "true" &&
                           activeElement.offsetParent !== null;

  const isCopilotInput = isTextarea || isContentEditable;

  if (!isCopilotInput) {
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    if (isTextarea) {
      // For regular textarea: let native Enter behavior work
      // Don't preventDefault - just return and let browser handle it
      return;
    } else if (isContentEditable) {
      // For contentEditable: intercept and send Shift+Enter or let default behavior
      // This may need adjustment based on how Copilot handles contentEditable
      event.preventDefault();
      event.stopImmediatePropagation();

      // Try Shift+Enter for newline
      const newEvent = createEnterEvent({ shift: true });
      activeElement.dispatchEvent(newEvent);
    }
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
      // Fallback: dispatch Enter without shift
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
