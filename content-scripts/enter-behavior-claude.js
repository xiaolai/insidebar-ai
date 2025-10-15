// Claude Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings
//
// CRITICAL: Uses window.addEventListener with capture:true to intercept
// Enter keys BEFORE ProseMirror sees them (based on working extension pattern)

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

  // Check if this is Claude's ProseMirror input
  const isClaudeInput = activeElement &&
                        activeElement.tagName === "DIV" &&
                        activeElement.contentEditable === "true" &&
                        activeElement.classList.contains("ProseMirror") &&
                        activeElement.getAttribute("role") === "textbox";

  if (!isClaudeInput) {
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    // CRITICAL: Stop the event IMMEDIATELY before ProseMirror sees it
    event.stopImmediatePropagation();
    event.preventDefault();

    // Dispatch synthetic Shift+Enter which ProseMirror accepts for newlines
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
      shiftKey: true,  // ProseMirror treats Shift+Enter as newline
      ctrlKey: false,
      metaKey: false,
      altKey: false
    });

    activeElement.dispatchEvent(enterEvent);
    return;
  }

  // Check if this matches send action
  if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    // Stop the original event
    event.stopImmediatePropagation();
    event.preventDefault();

    // Find and click the send button (more reliable than synthetic events)
    const sendButton = document.querySelector('button[aria-label*="Send"]') ||
                       document.querySelector('button[aria-label*="send"]') ||
                       document.querySelector('[data-testid="send-button"]');

    if (sendButton && !sendButton.disabled) {
      sendButton.click();
    } else {
      // Fallback: dispatch plain Enter
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false
      });
      activeElement.dispatchEvent(enterEvent);
    }
    return;
  }
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
