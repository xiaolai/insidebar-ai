// Claude Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

console.log('[Claude Enter] Script loaded');

// Helper: Create a synthetic Enter KeyboardEvent with specified modifiers
function createEnterEvent(modifiers = {}) {
  return new KeyboardEvent('keydown', {
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
  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  console.log('[Claude Enter] Key pressed:', {
    shift: event.shiftKey,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    meta: event.metaKey
  });

  // Check configuration
  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    console.log('[Claude Enter] Config not loaded or disabled:', enterKeyConfig);
    return;
  }

  console.log('[Claude Enter] Config:', {
    preset: enterKeyConfig.preset,
    newlineModifiers: enterKeyConfig.newlineModifiers,
    sendModifiers: enterKeyConfig.sendModifiers
  });

  // Get the currently focused element
  const activeElement = document.activeElement;
  console.log('[Claude Enter] Active element:', {
    tagName: activeElement?.tagName,
    contentEditable: activeElement?.contentEditable,
    role: activeElement?.getAttribute('role'),
    classes: activeElement?.className,
    id: activeElement?.id
  });

  // Check if this is Claude's input area:
  // 1. Main prompt: ProseMirror div with role="textbox" and data-testid="chat-input"
  // 2. Editing area: Regular textarea element (appears when editing old messages)
  const isMainPrompt = activeElement &&
                       activeElement.tagName === "DIV" &&
                       activeElement.contentEditable === "true" &&
                       activeElement.classList.contains("ProseMirror") &&
                       activeElement.getAttribute("role") === "textbox";

  const isEditingTextarea = activeElement &&
                           activeElement.tagName === "TEXTAREA" &&
                           activeElement.offsetParent !== null; // visible check

  console.log('[Claude Enter] Element detection:', {
    isMainPrompt,
    isEditingTextarea,
    hasProseMirror: activeElement?.classList.contains("ProseMirror"),
    hasRole: activeElement?.getAttribute("role") === "textbox"
  });

  if (!isMainPrompt && !isEditingTextarea) {
    console.log('[Claude Enter] Not a Claude input area, ignoring');
    return;
  }

  console.log('[Claude Enter] Detected Claude input area!');

  // Check if this matches newline action
  const matchesNewline = matchesModifiers(event, enterKeyConfig.newlineModifiers);
  const matchesSend = matchesModifiers(event, enterKeyConfig.sendModifiers);

  console.log('[Claude Enter] Modifier matching:', {
    matchesNewline,
    matchesSend,
    configNewline: enterKeyConfig.newlineModifiers,
    configSend: enterKeyConfig.sendModifiers
  });

  if (matchesNewline) {
    console.log('[Claude Enter] Matched newline action - inserting newline');
    // MUST preventDefault for both types, or Claude's handler will send the message
    event.stopImmediatePropagation();
    event.preventDefault();

    if (isEditingTextarea) {
      // For regular textarea: manually insert newline
      console.log('[Claude Enter] Using textarea newline insertion');
      insertTextareaNewline(activeElement);
      return;
    } else {
      // For ProseMirror: Shift+Enter inserts newline
      // (preventDefault already called above)
      console.log('[Claude Enter] Dispatching Shift+Enter for ProseMirror');
      const enterEvent = createEnterEvent({ shift: true });
      activeElement.dispatchEvent(enterEvent);
      return;
    }
  }

  // Check if this matches send action
  else if (matchesSend) {
    console.log('[Claude Enter] Matched send action - clicking Send button');
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
