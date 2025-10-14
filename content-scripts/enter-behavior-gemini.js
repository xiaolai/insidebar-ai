// Gemini Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  // Check if this is Gemini's input element
  const isGeminiInput = event.target.tagName === "DIV" &&
                        event.target.contentEditable === "true" &&
                        (event.target.classList.contains("ql-editor") ||
                         (event.target.classList.contains("textarea") &&
                          event.target.getAttribute("role") === "textbox"));

  if (!isGeminiInput) {
    return;
  }

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();
      // Enter pressed - insert newline
      try {
        // Try using execCommand first (works well with Quill)
        if (document.execCommand) {
          document.execCommand('insertLineBreak');
        } else {
          // Fallback: manual DOM manipulation
          const selection = window.getSelection();
          const range = selection.getRangeAt(0);

          const br = document.createElement('br');
          range.deleteContents();
          range.insertNode(br);

          // Insert second br if at end (Quill needs this)
          const isAtEnd = !br.nextSibling ||
                          (br.nextSibling && br.nextSibling.nodeName === 'BR');
          if (isAtEnd) {
            const br2 = document.createElement('br');
            br.parentNode.insertBefore(br2, br.nextSibling);
          }

          // Move cursor
          range.setStartAfter(br);
          range.setEndAfter(br);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        // Trigger input event for framework
        event.target.dispatchEvent(new Event('input', { bubbles: true }));
        event.target.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {
        console.error('[Gemini Enter] Failed to insert newline:', e);
      }
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Dispatch plain Enter to send
    const newEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false
    });
    event.target.dispatchEvent(newEvent);
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
