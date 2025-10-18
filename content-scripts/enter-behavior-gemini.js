// Gemini Enter/Shift+Enter behavior swap
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

// Helper: Find Gemini's Send/Update button (works for both main prompt and editing)
function findSendButton() {
  // Try by aria-label or class
  const byAriaLabel = document.querySelector('button[aria-label*="Send"]') ||
                      document.querySelector('button[aria-label*="send"]');
  if (byAriaLabel) return byAriaLabel;

  // Try by class name (Gemini specific)
  const byClass = document.querySelector('button.send-button') ||
                  document.querySelector('button.update-button');
  if (byClass) return byClass;

  // Fallback: search by icon or text (editing has "Update" button)
  return Array.from(document.querySelectorAll('button')).find(btn => {
    const text = btn.textContent.trim();
    return text === 'Send' ||
           text === 'Update' ||
           btn.querySelector('mat-icon[fonticon="send"]') ||
           btn.classList.contains('submit');
  });
}

// Helper: Insert newline into Quill contentEditable div
function insertQuillNewline(div) {
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
    div.dispatchEvent(new Event('input', { bubbles: true }));
    div.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (e) {
    // Silent fail - if newline insertion fails, just do nothing
  }
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

  // Trigger input event so Gemini detects the change
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  if (!event.isTrusted || event.code !== "Enter") {
    return;
  }

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    return;
  }

  // Get the currently focused element
  const activeElement = document.activeElement;

  // Check if this is Gemini's input area:
  // 1. Main prompt: Quill editor (contentEditable div with ql-editor class)
  // 2. Editing area: Regular textarea (appears when editing old messages)
  const isQuillEditor = activeElement &&
                        activeElement.tagName === "DIV" &&
                        activeElement.contentEditable === "true" &&
                        (activeElement.classList.contains("ql-editor") ||
                         (activeElement.classList.contains("textarea") &&
                          activeElement.getAttribute("role") === "textbox"));

  const isEditingTextarea = activeElement &&
                           activeElement.tagName === "TEXTAREA" &&
                           activeElement.offsetParent !== null; // visible check

  if (!isQuillEditor && !isEditingTextarea) {
    return;
  }

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    // MUST preventDefault for both types, or Gemini's handler will send the message
    event.preventDefault();
    event.stopImmediatePropagation();

    if (isEditingTextarea) {
      // For regular textarea: manually insert newline
      insertTextareaNewline(activeElement);
      return;
    } else {
      // For Quill editor: use DOM manipulation
      insertQuillNewline(activeElement);
      return;
    }
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Find and click the Send button (more reliable for both element types)
    const sendButton = findSendButton();

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
    // This prevents Gemini's native keyboard shortcuts from interfering with user settings.
    // For example, if the user configured "swapped" mode (Enter=newline, Shift+Enter=send),
    // then Ctrl+Enter should do nothing to avoid confusion and ensure only the configured keys work.
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
