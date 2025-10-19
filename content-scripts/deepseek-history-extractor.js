// DeepSeek Conversation History Extractor
// Extracts current conversation from DeepSeek DOM and saves to extension
//
// IMPORTANT: Requires conversation-extractor-utils.js and language-detector.js to be loaded first

(function() {
  'use strict';

  // Import shared utilities from global namespace
  const {
    extractMarkdownFromElement,
    formatMessagesAsText,
    generateConversationId,
    checkForDuplicate,
    showDuplicateWarning,
    showNotification,
    setupKeyboardShortcut,
    observeUrlChanges
  } = window.ConversationExtractorUtils;

  // Share button selector for language detection
  // DeepSeek doesn't have a text-based share button, use null to fallback to document language
  const SHARE_BUTTON_SELECTOR = null;

  let saveButton = null;

  // Initialize after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[DeepSeek Extractor] Initializing...');
    console.log('[DeepSeek Extractor] In iframe?', window !== window.top);
    console.log('[DeepSeek Extractor] URL:', window.location.href);

    // Only run on conversation pages (not homepage)
    if (!window.location.href.startsWith('https://chat.deepseek.com/a/chat/')) {
      console.log('[DeepSeek Extractor] Not on conversation page, skipping');
      return;
    }

    // Wait a bit for DeepSeek to fully render
    setTimeout(() => {
      console.log('[DeepSeek Extractor] Attempting to insert save button...');
      insertSaveButton();
      observeForChanges();
    }, 2000);
  }

  // Create save button matching DeepSeek's icon button style
  function createSaveButton() {
    // Detect provider's UI language and get matching Save button text
    const { text, tooltip, lang } = window.LanguageDetector.getSaveButtonText(SHARE_BUTTON_SELECTOR);
    console.log('[DeepSeek Extractor] Creating Save button in language:', lang);

    const button = document.createElement('div');
    button.id = 'insidebar-save-conversation';
    button.className = 'ds-icon-button _57370c5 _5dedc1e';
    button.setAttribute('tabindex', '0');
    button.setAttribute('role', 'button');
    button.setAttribute('aria-disabled', 'false');
    button.setAttribute('aria-label', text);
    button.style.cssText = '--hover-size: 34px; width: 34px; height: 34px;';
    button.title = tooltip;

    // Create button structure matching share button exactly
    button.innerHTML = `
      <div class="ds-icon-button__hover-bg"></div>
      <div class="ds-icon" style="font-size: 22px; width: 22px; height: 22px;">
        <svg width="22" height="22" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.13457,10.1331 L2.13457,10.0002 C2.13457,9.70646 2.37278,9.46826 2.6666,9.46826 C2.96042,9.46826 3.19863,9.70646 3.19863,10.0002 L3.19863,10.1331 C3.19863,10.7018 3.19936,11.0966 3.22442,11.4034 C3.24896,11.7038 3.29442,11.8731 3.35879,11.9994 L3.41504,12.101 C3.55609,12.331 3.75850,12.5185 4.00019,12.6417 L4.10410,12.686 C4.21912,12.7274 4.37073,12.7576 4.59629,12.776 C4.90310,12.8011 5.29777,12.801 5.8666,12.801 L10.1330,12.801 C10.7017,12.801 11.0966,12.8011 11.4034,12.776 C11.7036,12.7515 11.873,12.706 11.9994,12.6417 L12.1010,12.5846 C12.3309,12.4436 12.5185,12.2411 12.6416,11.9994 L12.6862,11.8956 C12.7273,11.7806 12.7575,11.6288 12.776,11.4034 C12.8010,11.0966 12.801,10.7018 12.801,10.1330 L12.801,10.0002 C12.801,9.70656 13.0393,9.46836 13.3330,9.46826 C13.6268,9.46826 13.8650,9.70646 13.8650,10.0002 L13.8650,10.1331 C13.8650,10.6842 13.8655,11.1299 13.8362,11.4901 C13.8099,11.8109 13.7579,12.0998 13.6424,12.369 L13.5893,12.483 C13.3769,12.8998 13.0538,13.2484 12.6572,13.4917 L12.483,13.5893 C12.1816,13.7429 11.8565,13.8062 11.49,13.8362 C11.1298,13.8656 10.6842,13.8651 10.1330,13.8651 L5.8666,13.8651 C5.31533,13.8651 4.86976,13.8656 4.50957,13.8362 C4.18914,13.81 3.90042,13.7586 3.63145,13.6432 L3.51738,13.5893 C3.10049,13.3769 2.75129,13.0539 2.50801,12.6573 L2.41035,12.483 C2.25678,12.1817 2.19342,11.8565 2.16348,11.4901 C2.13406,11.1299 2.13457,10.6842 2.13457,10.1331 Z M7.46817,2.66671 L7.46817,8.71591 L5.70957,6.95732 C5.50186,6.74961 5.165,6.7497 4.95722,6.95732 C4.74947,7.16508 4.74947,7.5019 4.95722,7.70966 L7.62363,10.37685 L7.70488,10.44326 C7.79159,10.50102 7.89447,10.53232 8.00016,10.53232 C8.13704,10.53232 8.27632,10.47640 8.37760,10.37685 L11.0432,7.70966 C11.2506,7.50193 11.2507,7.165 11.0432,6.95732 C10.8354,6.74956 10.4978,6.74956 10.29,6.95732 L8.53224,8.71514 L8.53224,2.66671 C8.53208,2.37311 8.29384,2.13479 8.00016,2.13463 C7.70646,2.13463 7.4683,2.37303 7.46817,2.66671 Z" fill="currentColor" fill-rule="nonzero"></path>
        </svg>
      </div>
    `;

    button.addEventListener('click', handleSaveClick);
    return button;
  }

  // Insert save button after the share/upload button in main conversation area
  function insertSaveButton() {
    // Only insert button on conversation pages
    if (!window.location.href.startsWith('https://chat.deepseek.com/a/chat/')) {
      console.log('[DeepSeek Extractor] Not a conversation page, skipping save button');
      return;
    }

    // Check if button already exists
    if (document.getElementById('insidebar-save-conversation')) {
      console.log('[DeepSeek Extractor] Save button already exists');
      return;
    }

    // Find the share/upload button (has upload/share icon SVG)
    const shareButtons = document.querySelectorAll('.ds-icon-button._57370c5._5dedc1e');

    console.log('[DeepSeek Extractor] Looking for share button...');
    console.log('[DeepSeek Extractor] Found icon buttons:', shareButtons.length);

    let shareButton = null;
    for (const btn of shareButtons) {
      // Check if it has the upload/share icon
      const svg = btn.querySelector('svg path[d*="M15.7484"]');
      if (svg) {
        shareButton = btn;
        break;
      }
    }

    if (!shareButton) {
      console.log('[DeepSeek Extractor] Share button not found yet, will retry');
      return;
    }

    console.log('[DeepSeek Extractor] Share button found');

    // Check if conversation exists
    const hasConversation = detectConversation();
    console.log('[DeepSeek Extractor] Has conversation?', hasConversation);

    // If share button exists, assume there's a conversation
    if (!hasConversation) {
      console.log('[DeepSeek Extractor] No conversation detected via messages, but share button exists');
      console.log('[DeepSeek Extractor] Inserting button anyway - messages may load later');
    }

    // Get the parent container
    const parentContainer = shareButton.parentElement;
    const shareStyle = window.getComputedStyle(shareButton);

    // Create save button with exact same positioning as share button
    saveButton = createSaveButton();

    // If share button is absolutely positioned, we need to position save button accordingly
    if (shareStyle.position === 'absolute' || shareStyle.position === 'fixed') {
      saveButton.style.position = shareStyle.position;
      saveButton.style.top = shareStyle.top;

      // Calculate right position: share button's right + button width + gap
      const rightValue = parseFloat(shareStyle.right) || 0;
      saveButton.style.right = (rightValue + 34 + 8) + 'px'; // 34px button width + 8px gap
    }

    // Insert after share button in DOM
    if (shareButton.nextSibling) {
      parentContainer.insertBefore(saveButton, shareButton.nextSibling);
    } else {
      parentContainer.appendChild(saveButton);
    }

    console.log('[DeepSeek Extractor] Save button inserted after share button');
  }

  // Detect if there's a conversation on the page
  function detectConversation() {
    const messages = getMessages();
    return messages && messages.length > 0;
  }

  // Observe DOM for changes
  function observeForChanges() {
    const observer = new MutationObserver(() => {
      insertSaveButton();

      const existingButton = document.getElementById('insidebar-save-conversation');
      if (existingButton) {
        if (!window.location.href.startsWith('https://chat.deepseek.com/a/chat/')) {
          existingButton.remove();
          saveButton = null;
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Extract conversation title from current chat in sidebar
  function getConversationTitle() {
    const currentChat = document.querySelector('a._546d736.b64fb9ae');

    if (currentChat) {
      const titleDiv = currentChat.querySelector('.c08e6e93');
      if (titleDiv) {
        const title = titleDiv.textContent.trim();
        if (title && title.length > 0) {
          return title;
        }
      }
    }

    // Fallback: Try to extract from URL
    const urlMatch = window.location.pathname.match(/\/a\/chat\/s\/([^\/]+)/);
    if (urlMatch) {
      return `DeepSeek Conversation ${urlMatch[1].substring(0, 8)}`;
    }

    return 'Untitled DeepSeek Conversation';
  }

  // Extract all messages from the conversation using .ds-message selector
  function getMessages() {
    const messages = [];

    // Use stable ds-message selector (design system class)
    const messageContainers = document.querySelectorAll('.ds-message');

    console.log('[DeepSeek Extractor] Found message containers:', messageContainers.length);

    messageContainers.forEach((container, index) => {
      try {
        const message = extractMessageFromContainer(container, index);
        if (message) {
          messages.push(message);
        }
      } catch (error) {
        console.warn('[DeepSeek Extractor] Error extracting message:', error);
      }
    });

    return messages;
  }

  // Extract a single message from its container using .ds-message > div pattern
  function extractMessageFromContainer(container, index) {
    // Get the first child div as content wrapper (based on investigation)
    const contentDiv = container.querySelector(':scope > div');
    if (!contentDiv) {
      console.warn('[DeepSeek Extractor] No content div found in message container');
      return null;
    }

    // Extract text content
    const content = extractMarkdownFromElement(contentDiv);
    if (!content.trim()) {
      console.warn('[DeepSeek Extractor] Empty content extracted');
      return null;
    }

    // Determine role using alternating pattern (user, assistant, user, assistant...)
    // This is a fallback strategy when no explicit role markers exist
    const role = index % 2 === 0 ? 'user' : 'assistant';

    console.log('[DeepSeek Extractor] Extracted message:', {
      index,
      role,
      contentLength: content.length,
      preview: content.substring(0, 100)
    });

    return {
      role,
      content: content.trim()
    };
  }

  // NOTE: Markdown extraction and formatting functions moved to conversation-extractor-utils.js

  // Extract full conversation data
  function extractConversation() {
    try {
      const title = getConversationTitle();
      const messages = getMessages();

      if (!messages || messages.length === 0) {
        throw new Error('No messages found in conversation');
      }

      const content = formatMessagesAsText(messages);

      return {
        title,
        content,
        messages,
        timestamp: Date.now(),
        url: window.location.href,
        provider: 'DeepSeek'
      };
    } catch (error) {
      console.error('[DeepSeek Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!saveButton) return;

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.error('[DeepSeek Extractor] Chrome extension API not available');
      showNotification('Extension API not available. Try reloading the page.', 'error');
      return;
    }

    // Disable button during save
    saveButton.setAttribute('aria-disabled', 'true');
    saveButton.style.opacity = '0.6';
    saveButton.style.cursor = 'not-allowed';

    try {
      const conversation = extractConversation();

      // Generate conversation ID for deduplication
      const conversationId = generateConversationId(conversation.url, conversation.title);
      conversation.conversationId = conversationId;

      // Check for duplicates
      const duplicateCheck = await checkForDuplicate(conversationId);

      if (duplicateCheck.isDuplicate) {
        // Compare content to decide whether to save
        const existingContent = (duplicateCheck.existingConversation.content || '').trim();
        const newContent = (conversation.content || '').trim();

        if (existingContent === newContent) {
          // Content identical - silently skip save
          saveButton.setAttribute('aria-disabled', 'false');
          saveButton.style.opacity = '1';
          saveButton.style.cursor = 'pointer';
          return;
        }

        // Content changed - automatically overwrite with original timestamp
        conversation.overwriteId = duplicateCheck.existingConversation.id;
        conversation.timestamp = duplicateCheck.existingConversation.timestamp;
      }

      // Send to background script
      chrome.runtime.sendMessage({
        action: 'saveConversationFromPage',
        payload: conversation
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[DeepSeek Extractor] Chrome runtime error:', chrome.runtime.lastError);
          const errorMsg = chrome.runtime.lastError.message;

          // Provide user-friendly message for context invalidation
          if (errorMsg.includes('Extension context invalidated')) {
            showNotification('Extension was reloaded. Please reload this page and try saving again.', 'error');
          } else {
            showNotification('Failed to save: ' + errorMsg, 'error');
          }
          saveButton.setAttribute('aria-disabled', 'false');
          saveButton.style.opacity = '1';
          saveButton.style.cursor = 'pointer';
          return;
        }

        if (response && response.success) {
          // Success notification now shown in sidebar
        } else {
          const errorMsg = response?.error || 'Unknown error';
          showNotification('Failed to save: ' + errorMsg, 'error');
        }

        // Re-enable button
        saveButton.setAttribute('aria-disabled', 'false');
        saveButton.style.opacity = '1';
        saveButton.style.cursor = 'pointer';
      });
    } catch (error) {
      console.error('[DeepSeek Extractor] Error during extraction:', error);
      showNotification('Failed to extract conversation: ' + error.message, 'error');
      saveButton.setAttribute('aria-disabled', 'false');
      saveButton.style.opacity = '1';
      saveButton.style.cursor = 'pointer';
    }
  }

  // Setup keyboard shortcut (Ctrl+Shift+S or Cmd+Shift+S)
  setupKeyboardShortcut(() => {
    if (window.location.href.startsWith('https://chat.deepseek.com/a/chat/')) {
      handleSaveClick();
    }
  }, detectConversation);

  // Listen for URL changes (DeepSeek is a SPA)
  observeUrlChanges((url) => {
    console.log('[DeepSeek Extractor] URL changed to:', url);

    if (!url.startsWith('https://chat.deepseek.com/a/chat/')) {
      const existingButton = document.getElementById('insidebar-save-conversation');
      if (existingButton) {
        existingButton.remove();
        saveButton = null;
      }
    } else {
      setTimeout(() => insertSaveButton(), 1000);
    }
  });

})();
