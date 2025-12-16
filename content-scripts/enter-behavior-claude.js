// Claude Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

// Helper: Create a synthetic Enter KeyboardEvent with specified modifiers
function createEnterEvent(modifiers = {}) {
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
    shiftKey: modifiers.shift || false,
    ctrlKey: modifiers.ctrl || false,
    metaKey: modifiers.meta || false,
    altKey: modifiers.alt || false
  });

  // Mark this as a synthetic event from our extension
  // so handleEnterSwap ignores it
  Object.defineProperty(event, '_synthetic_from_extension', {
    value: true,
    writable: false
  });

  return event;
}

// Helper: Find Claude's Send/Save button (works for both main prompt and editing)
function findSendButton() {
  // Try aria-label first (new message area)
  const byAriaLabel = document.querySelector('button[aria-label*="Send"]') ||
                      document.querySelector('button[aria-label*="send"]');
  if (byAriaLabel) return byAriaLabel;

  // Try data-testid
  const byTestId = document.querySelector('[data-testid="send-button"]');
  if (byTestId) return byTestId;

  // Fallback: search by text content (editing area has "Save" button)
  return Array.from(document.querySelectorAll('button')).find(btn =>
    btn.textContent.trim() === 'Save' ||
    btn.textContent.trim() === 'Send' ||
    btn.getAttribute('type') === 'submit'
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

  // Trigger input event so Claude detects the change
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function handleEnterSwap(event) {
  // Only handle Enter key events
  // Skip if IME composition is in progress (e.g., Chinese/Japanese input method)
  if (event.code !== "Enter" || event.isComposing) {
    return;
  }

  // Skip synthetic events we created (let them pass through to Claude)
  if (event._synthetic_from_extension) {
    return;
  }

  // Check configuration
  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    return;
  }

  // Get the currently focused element
  const activeElement = document.activeElement;
  if (!activeElement) {
    return;
  }

  // Simplified detection: just check if it's a textarea
  const isTextarea = activeElement.tagName === "TEXTAREA";

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    // MUST preventDefault for both types, or Claude's handler will send the message
    event.stopImmediatePropagation();
    event.preventDefault();

    if (isTextarea) {
      // For regular textarea: manually insert newline
      insertTextareaNewline(activeElement);
    } else {
      // For ProseMirror/contenteditable: dispatch Shift+Enter
      // Claude's native behavior: Shift+Enter = newline
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        shiftKey: true
      });

      // Mark this as synthetic so we don't process it again
      Object.defineProperty(enterEvent, '_synthetic_from_extension', {
        value: true,
        writable: false
      });

      activeElement.dispatchEvent(enterEvent);
    }
    return;
  }

  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Find and click the Send/Save button (more reliable for both element types)
    const sendButton = findSendButton();

    if (sendButton && !sendButton.disabled) {
      sendButton.click();
    } else {
      // Fallback: dispatch plain Enter
      const enterEvent = createEnterEvent();
      activeElement.dispatchEvent(enterEvent);
    }
    return;
  }
  else {
    // Block any other Enter combinations (Ctrl+Enter, Alt+Enter, Meta+Enter, etc.)
    // This prevents Claude's native keyboard shortcuts from interfering with user settings.
    // For example, if the user configured "swapped" mode (Enter=newline, Shift+Enter=send),
    // then Ctrl+Enter should do nothing to avoid confusion and ensure only the configured keys work.
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
