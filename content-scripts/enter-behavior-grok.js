// Grok Enter/Shift+Enter behavior swap
// Makes Enter = newline, Shift+Enter = send

function handleEnterSwap(event) {
  // Log every Enter key event
  if (event.code === "Enter") {
    console.log('[Grok Debug] Enter event fired:', {
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
      console.log('[Grok Debug] Skipped - not trusted Enter');
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

  console.log('[Grok Debug] Selector check:', {
    isGrokInput,
    isTextarea,
    isTipTap,
    tagName: event.target.tagName,
    contentEditable: event.target.contentEditable,
    classList: Array.from(event.target.classList || [])
  });

  if (!isGrokInput) {
    console.log('[Grok Debug] Not Grok input - ignoring');
    return;
  }

  const isOnlyEnter = !event.ctrlKey && !event.metaKey && !event.shiftKey;
  const isShiftEnter = event.shiftKey && !event.ctrlKey && !event.metaKey;

  console.log('[Grok Debug] Key combination:', { isOnlyEnter, isShiftEnter });

  if (isOnlyEnter || isShiftEnter) {
    console.log('[Grok Debug] ✓ Swapping behavior');
    event.preventDefault();
    event.stopImmediatePropagation();

    if (isOnlyEnter) {
      // Enter pressed - want newline
      console.log('[Grok Debug] Enter pressed - dispatching Shift+Enter for newline');

      // For textarea in iframe, synthetic events may not work - use direct manipulation
      if (event.target.tagName === "TEXTAREA" && window !== window.top) {
        console.log('[Grok Debug] In iframe - using direct newline insertion');
        const target = event.target;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const value = target.value;

        target.value = value.substring(0, start) + '\n' + value.substring(end);
        target.selectionStart = target.selectionEnd = start + 1;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('[Grok Debug] ✓ Newline inserted directly');
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
        console.log('[Grok Debug] ✓ Shift+Enter dispatched for newline');
      }
    } else if (isShiftEnter) {
      // Shift+Enter pressed - want to send
      console.log('[Grok Debug] Shift+Enter pressed - dispatching plain Enter to send');
      const newEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
        shiftKey: false  // Plain Enter to send
      });
      event.target.dispatchEvent(newEvent);
      console.log('[Grok Debug] ✓ Plain Enter dispatched to send');
    }
  }
}

// Log script initialization
console.log('[Grok Debug] Script loaded - initializing enter behavior swap');
console.log('[Grok Debug] Document ready state:', document.readyState);
console.log('[Grok Debug] Window location:', window.location.href);
console.log('[Grok Debug] Is iframe:', window !== window.top);

// Test listener to verify events are working at all
document.addEventListener('keydown', (e) => {
  console.log('[Grok Debug] Raw document keydown:', e.code, e.target);
}, { capture: true });

window.addEventListener('keydown', (e) => {
  console.log('[Grok Debug] Raw window keydown:', e.code, e.target);
}, { capture: true });

// Apply the setting on initial load
applyEnterSwapSetting();
