// Perplexity Enter/Shift+Enter behavior swap
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
    composed: true,
    shiftKey: modifiers.shift || false,
    ctrlKey: modifiers.ctrl || false,
    metaKey: modifiers.meta || false,
    altKey: modifiers.alt || false
  });
}

// Helper: Find Perplexity's Submit/Save button (context-aware for editing vs new messages)
function findSendButton(activeElement, isEditingLexical) {
  // When editing old messages: search locally from the editor's parent container
  if (isEditingLexical && activeElement) {
    // Search upward to find the editing container, then search within it
    let container = activeElement.parentElement;

    // Traverse up to find a suitable container (usually within 10 levels)
    for (let i = 0; i < 10 && container; i++) {
      // Look for Save button within this container
      const saveButton = container.querySelector('button[data-testid="confirm-edit-query-button"]') ||
                        Array.from(container.querySelectorAll('button')).find(btn => {
                          const ariaLabel = btn.getAttribute('aria-label');
                          return ariaLabel?.includes('Save and rewrite') ||
                                 ariaLabel?.includes('confirm-edit');
                        });

      if (saveButton) return saveButton;
      container = container.parentElement;
    }
  }

  // For new messages: search globally for Submit button
  // Try by data-testid first
  const byTestId = document.querySelector('button[data-testid="submit-button"]');
  if (byTestId) return byTestId;

  // Try by aria-label
  const byAriaLabel = document.querySelector('button[aria-label="Submit"]');
  if (byAriaLabel) return byAriaLabel;

  // Fallback: search by aria-label content
  return Array.from(document.querySelectorAll('button')).find(btn =>
    btn.getAttribute('aria-label')?.includes('Submit')
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

  // Check if this is Perplexity's input area:
  // 1. Main prompt: Lexical editor with id="ask-input"
  // 2. Editing area: Lexical editor without id (but has data-lexical-editor and role="textbox")
  const isMainPrompt = activeElement &&
                       activeElement.id === "ask-input" &&
                       activeElement.isContentEditable &&
                       activeElement.getAttribute("data-lexical-editor") === "true" &&
                       activeElement.getAttribute("role") === "textbox";

  const isEditingLexical = activeElement &&
                          !activeElement.id && // No id for editing
                          activeElement.isContentEditable &&
                          activeElement.getAttribute("data-lexical-editor") === "true" &&
                          activeElement.getAttribute("role") === "textbox" &&
                          activeElement.offsetParent !== null; // visible check

  if (!isMainPrompt && !isEditingLexical) {
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // For Lexical editor (both main and editing): Shift+Enter inserts newline
    const newEvent = createEnterEvent({ shift: true });
    activeElement.dispatchEvent(newEvent);
    return;
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Find and click the Submit/Save button (context-aware for editing vs new messages)
    const sendButton = findSendButton(activeElement, isEditingLexical);

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
    // This prevents Perplexity's native keyboard shortcuts from interfering with user settings.
    // For example, if the user configured "swapped" mode (Enter=newline, Shift+Enter=send),
    // then Ctrl+Enter should do nothing to avoid confusion and ensure only the configured keys work.
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
