// Grok Enter/Shift+Enter behavior swap
// Makes Enter = newline, Shift+Enter = send

const DEBUG_GROK_ENTER = false;

function debugLog(...args) {
  if (DEBUG_GROK_ENTER) {
    console.log('[Grok Debug]', ...args);
  }
}

function handleEnterSwap(event) {
  // Log every Enter key event
  if (event.code === "Enter") {
    debugLog('Enter event fired:', {
      key: event.key,
      code: event.code,
      isTrusted: event.isTrusted,
      target: event.target,
      tagName: event.target.tagName,
      contentEditable: event.target.contentEditable,
      classList: Array.from(event.target.classList || []),
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey
    });
  }

  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    if (event.code === "Enter") {
      debugLog('Skipped - not trusted Enter');
    }
    return;
  }

  // Check if this is Grok's input (textarea or TipTap/ProseMirror editor)
  const isTextarea = event.target.tagName === "TEXTAREA";
  const isTipTap = event.target.tagName === "DIV" &&
                   event.target.contentEditable === "true" &&
                   (event.target.classList.contains("tiptap") ||
                    event.target.classList.contains("ProseMirror"));

  const isGrokInput = isTextarea || isTipTap;

  debugLog('Selector check:', {
    isGrokInput,
    isTextarea,
    isTipTap,
    tagName: event.target.tagName,
    contentEditable: event.target.contentEditable,
    classList: Array.from(event.target.classList || [])
  });

  if (!isGrokInput) {
    debugLog('Not Grok input - ignoring');
    return;
  }

  const isOnlyEnter = !event.ctrlKey && !event.metaKey && !event.shiftKey;
  const isShiftEnter = event.shiftKey && !event.ctrlKey && !event.metaKey;

  debugLog('Key combination:', { isOnlyEnter, isShiftEnter });

  if (isOnlyEnter || isShiftEnter) {
    debugLog('✓ Swapping behavior');
    event.preventDefault();
    event.stopImmediatePropagation();

    if (isOnlyEnter) {
      // Enter pressed - want newline
      debugLog('Enter pressed - dispatching Shift+Enter for newline');

      // For textarea in iframe, synthetic events may not work - use direct manipulation
      if (event.target.tagName === "TEXTAREA" && window !== window.top) {
        debugLog('In iframe - using direct newline insertion');
        const target = event.target;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const value = target.value;

        target.value = value.substring(0, start) + '\n' + value.substring(end);
        target.selectionStart = target.selectionEnd = start + 1;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        debugLog('✓ Newline inserted directly');
      } else {
        // Normal page - use event dispatch
        const newEvent = new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          bubbles: true,
          cancelable: true,
          shiftKey: true  // Shift+Enter for newline
        });
        event.target.dispatchEvent(newEvent);
        debugLog('✓ Shift+Enter dispatched for newline');
      }
    } else if (isShiftEnter) {
      // Shift+Enter pressed - want to send
      debugLog('Shift+Enter pressed - dispatching plain Enter to send');
      const newEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
        shiftKey: false  // Plain Enter to send
      });
      event.target.dispatchEvent(newEvent);
      debugLog('✓ Plain Enter dispatched to send');
    }
  }
}

// Log script initialization
debugLog('Script loaded - initializing enter behavior swap');
debugLog('Document ready state:', document.readyState);
debugLog('Window location:', window.location.href);
debugLog('Is iframe:', window !== window.top);

// Test listener to verify events are working at all
document.addEventListener('keydown', (e) => {
  debugLog('Raw document keydown:', e.code, e.target);
}, { capture: true });

window.addEventListener('keydown', (e) => {
  debugLog('Raw window keydown:', e.code, e.target);
}, { capture: true });

// Apply the setting on initial load
applyEnterSwapSetting();
