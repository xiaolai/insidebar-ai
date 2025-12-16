// Grok Enter/Shift+Enter behavior swap
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

/**
 * Selector array for finding Grok's Submit/Save button
 * Priority order: structural selectors → multi-language ARIA → multi-language text
 */
const SEND_BUTTON_SELECTORS = [
  // Priority 1: Type-based (language-independent)
  { type: 'css', value: 'button[type="submit"]' },

  // Priority 2: Multi-language ARIA label (Submit or Save)
  {
    type: 'function',
    matcher: () => {
      return Array.from(document.querySelectorAll('button')).find(btn => {
        const aria = btn.getAttribute('aria-label');
        if (!aria) return false;
        return window.ButtonFinderUtils.TEXT_MAPS.submit.some(t => aria.includes(t)) ||
               window.ButtonFinderUtils.TEXT_MAPS.save.some(t => aria.includes(t));
      });
    }
  },

  // Priority 3: Multi-language text (Submit or Save)
  {
    type: 'function',
    matcher: () => {
      return Array.from(document.querySelectorAll('button')).find(btn => {
        const text = btn.textContent?.trim();
        if (!text) return false;
        return window.ButtonFinderUtils.TEXT_MAPS.submit.some(t => t === text) ||
               window.ButtonFinderUtils.TEXT_MAPS.save.some(t => t === text);
      });
    }
  }
];

// Helper: Find Grok's Submit/Save button (context-aware for editing vs new messages)
function findSendButton(activeElement, isEditingTextarea) {
  // When editing old messages: search locally from the textarea's parent container
  if (isEditingTextarea && activeElement) {
    // Search upward to find the editing container, then search within it
    let container = activeElement.parentElement;

    // Traverse up to find a suitable container (usually within 5 levels)
    for (let i = 0; i < 5 && container; i++) {
      // Look for Save button within this container (multi-language)
      const saveButton = Array.from(container.querySelectorAll('button')).find(btn => {
        const text = btn.textContent.trim();
        return window.ButtonFinderUtils.TEXT_MAPS.save.some(t => t === text) ||
               (btn.classList.contains('bg-button-filled') && !window.ButtonFinderUtils.TEXT_MAPS.submit.some(t => t === text));
      });

      if (saveButton) return saveButton;
      container = container.parentElement;
    }
  }

  // For new messages: search globally for Submit button using selector array
  return window.ButtonFinderUtils.findButton(SEND_BUTTON_SELECTORS);
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

  // Trigger input event so Grok detects the change
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
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

  // Check if this is Grok's input area:
  // 1. Main prompt: TipTap/ProseMirror editor (contentEditable div)
  // 2. Editing area: Regular textarea (appears when editing old messages)
  const isMainPrompt = activeElement &&
                       activeElement.tagName === "DIV" &&
                       activeElement.contentEditable === "true" &&
                       (activeElement.classList.contains("tiptap") ||
                        activeElement.classList.contains("ProseMirror"));

  const isEditingTextarea = activeElement &&
                           activeElement.tagName === "TEXTAREA" &&
                           activeElement.offsetParent !== null; // visible check

  if (!isMainPrompt && !isEditingTextarea) {
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (isEditingTextarea) {
      // For regular textarea: manually insert newline
      insertTextareaNewline(activeElement);
      return;
    } else {
      // For ProseMirror: Shift+Enter inserts newline
      const newEvent = createEnterEvent({ shift: true });
      activeElement.dispatchEvent(newEvent);
      return;
    }
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Find and click the Submit/Save button (context-aware for editing vs new messages)
    const sendButton = findSendButton(activeElement, isEditingTextarea);

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
    // This prevents Grok's native keyboard shortcuts from interfering with user settings.
    // For example, if the user configured "swapped" mode (Enter=newline, Shift+Enter=send),
    // then Ctrl+Enter should do nothing to avoid confusion and ensure only the configured keys work.
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
