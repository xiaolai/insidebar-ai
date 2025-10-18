// Claude Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings
//
// CRITICAL: Uses window.addEventListener with capture:true to intercept
// Enter keys BEFORE ProseMirror sees them (based on working extension pattern)

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

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  // Check configuration
  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    return;
  }

  // Get the currently focused element
  const activeElement = document.activeElement;

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

  // Debug logging
  console.log('[Claude Enter] Active element:', activeElement);
  console.log('[Claude Enter] Tag:', activeElement?.tagName);
  console.log('[Claude Enter] isMainPrompt:', isMainPrompt);
  console.log('[Claude Enter] isEditingTextarea:', isEditingTextarea);

  if (!isMainPrompt && !isEditingTextarea) {
    console.log('[Claude Enter] Not a Claude input, returning');
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    console.log('[Claude Enter] Newline action triggered');
    if (isEditingTextarea) {
      // For regular textarea: let native Enter behavior work
      // Don't preventDefault - just return and let browser handle it
      console.log('[Claude Enter] Textarea: allowing native Enter');
      return;
    } else {
      // For ProseMirror: intercept IMMEDIATELY before ProseMirror sees it
      event.stopImmediatePropagation();
      event.preventDefault();

      // ProseMirror treats Shift+Enter as newline
      const enterEvent = createEnterEvent({ shift: true });
      activeElement.dispatchEvent(enterEvent);
      return;
    }
  }

  // Check if this matches send action
  if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    console.log('[Claude Enter] Send action triggered');
    // Stop the original event
    event.stopImmediatePropagation();
    event.preventDefault();

    // Find and click the Send/Save button (more reliable for both element types)
    const sendButton = findSendButton();
    console.log('[Claude Enter] Found button:', sendButton);

    if (sendButton && !sendButton.disabled) {
      sendButton.click();
    } else {
      // Fallback: dispatch plain Enter
      const enterEvent = createEnterEvent();
      activeElement.dispatchEvent(enterEvent);
    }
    return;
  }

  // Block any other Enter combinations (Ctrl+Enter, Alt+Enter, Meta+Enter, etc.)
  // This prevents Claude's native keyboard shortcuts from interfering with user settings.
  // For example, if the user configured "swapped" mode (Enter=newline, Shift+Enter=send),
  // then Ctrl+Enter should do nothing to avoid confusion and ensure only the configured keys work.
  event.stopImmediatePropagation();
  event.preventDefault();
}

// CRITICAL: Use window with capture:true to intercept BEFORE ProseMirror
window.addEventListener("keydown", handleEnterSwap, { capture: true });

// Apply the setting on initial load
applyEnterSwapSetting();

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enterKeyBehavior) {
    applyEnterSwapSetting();
  }
});
