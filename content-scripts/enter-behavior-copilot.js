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
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    console.log('[Copilot] Enter key config disabled or missing');
    return;
  }

  // Get the currently focused element
  const activeElement = document.activeElement;
  console.log('[Copilot] Enter pressed in:', activeElement?.tagName, activeElement?.id, activeElement?.getAttribute('data-testid'));

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
  console.log('[Copilot] isCopilotInput:', isCopilotInput);

  if (!isCopilotInput) {
    return;
  }

  console.log('[Copilot] Shift key:', event.shiftKey, 'Config newline mods:', enterKeyConfig.newlineModifiers, 'Config send mods:', enterKeyConfig.sendModifiers);

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    console.log('[Copilot] Newline action - allowing native');
    // For Copilot textarea: let native Enter behavior work for newlines
    // Don't preventDefault - just return and let browser handle it
    return;
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    console.log('[Copilot] Send action - clicking button');
    event.preventDefault();
    event.stopImmediatePropagation();

    // Find and click the Send button
    const sendButton = findSendButton();

    if (sendButton && !sendButton.disabled) {
      sendButton.click();
    } else {
      // Fallback: dispatch Enter without modifiers
      const newEvent = createEnterEvent({});
      activeElement.dispatchEvent(newEvent);
    }
  }
  else {
    console.log('[Copilot] Blocking other combination');
    // Block any other Enter combinations to avoid conflicts
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

console.log('[Copilot] Script loaded');

// Apply the setting on initial load
applyEnterSwapSetting();
