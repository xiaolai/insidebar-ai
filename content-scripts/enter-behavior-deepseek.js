// DeepSeek Enter/Shift+Enter behavior swap
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
 * Selector array for finding DeepSeek's Submit/Send button
 * Priority order: icon button detection → structural selectors → multi-language text
 */
const SEND_BUTTON_SELECTORS = [
  // Priority 1: Icon button with SVG (language-independent, most reliable for new messages)
  {
    type: 'function',
    matcher: () => {
      const iconButton = document.querySelector('button.ds-icon-button:not([aria-disabled="true"])') ||
                        document.querySelector('.ds-icon-button[role="button"]:not([aria-disabled="true"])');
      if (iconButton) {
        // Verify it's the send button by checking if it has an up arrow SVG
        const hasSendIcon = iconButton.querySelector('svg path[d*="M8.3125"]') ||
                           iconButton.querySelector('svg');
        if (hasSendIcon) return iconButton;
      }
      return null;
    }
  },

  // Priority 2: Generic icon button fallback
  {
    type: 'function',
    matcher: () => {
      return Array.from(document.querySelectorAll('button, [role="button"]')).find(btn => {
        return btn.classList.contains('ds-icon-button') &&
               !btn.getAttribute('aria-disabled') &&
               btn.querySelector('svg');
      });
    }
  }
];

// Helper: Find DeepSeek's Submit/Send button (context-aware for editing vs new messages)
function findSendButton(activeElement, isEditingTextarea) {
  // When editing old messages: search locally from the textarea's parent container
  if (isEditingTextarea && activeElement) {
    // Search upward to find the editing container, then search within it
    let container = activeElement.parentElement;

    // Traverse up to find a suitable container (usually within 10 levels)
    for (let i = 0; i < 10 && container; i++) {
      // Look for Send button within this container (multi-language)
      const sendButton = Array.from(container.querySelectorAll('button')).find(btn => {
        const text = btn.textContent.trim();
        return window.ButtonFinderUtils.TEXT_MAPS.send.some(t => t === text) &&
               (btn.classList.contains('ds-basic-button--primary') ||
                btn.classList.contains('ds-atom-button'));
      });

      if (sendButton) return sendButton;
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

  // Trigger input event so DeepSeek detects the change
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

  // Check if this is DeepSeek's input area:
  // 1. Main prompt: textarea with placeholder "Message DeepSeek" or ds-scroll-area class
  // 2. Editing area: textarea with name="user query" or parent has ds-textarea class
  const isMainPrompt = activeElement &&
                       activeElement.tagName === "TEXTAREA" &&
                       (activeElement.placeholder?.includes("DeepSeek") ||
                        (activeElement.classList.contains("ds-scroll-area") &&
                         !activeElement.getAttribute("name")));

  const isEditingTextarea = activeElement &&
                           activeElement.tagName === "TEXTAREA" &&
                           (activeElement.getAttribute("name") === "user query" ||
                            activeElement.classList.contains("ds-textarea__textarea") ||
                            activeElement.closest('.ds-textarea')) &&
                           activeElement.offsetParent !== null; // visible check

  if (!isMainPrompt && !isEditingTextarea) {
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // For textarea (both main and editing): manually insert newline
    insertTextareaNewline(activeElement);
    return;
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Find and click the Submit/Send button (context-aware for editing vs new messages)
    const sendButton = findSendButton(activeElement, isEditingTextarea);

    if (sendButton && !sendButton.getAttribute('aria-disabled')) {
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
    // This prevents DeepSeek's native keyboard shortcuts from interfering with user settings.
    // For example, if the user configured "swapped" mode (Enter=newline, Shift+Enter=send),
    // then Ctrl+Enter should do nothing to avoid confusion and ensure only the configured keys work.
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
