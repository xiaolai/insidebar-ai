// ChatGPT Conversation History Extractor
// Extracts current conversation from ChatGPT.com DOM and saves to extension
//
// IMPORTANT: Requires conversation-extractor-utils.js to be loaded first

(function() {
  'use strict';

  console.log('[ChatGPT Extractor] Script loaded');

  // Import shared utilities from global namespace
  const {
    extractMarkdownFromElement,
    formatMessagesAsText,
    generateConversationId,
    checkForDuplicate,
    showDuplicateWarning,
    showNotification,
    setupKeyboardShortcut
  } = window.ConversationExtractorUtils;

  // Share button selector for language detection
  const SHARE_BUTTON_SELECTOR = '[data-testid="share-chat-button"]';

  let saveButton = null;

  // Initialize after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[ChatGPT Extractor] Initializing...');
    console.log('[ChatGPT Extractor] In iframe?', window !== window.top);
    console.log('[ChatGPT Extractor] URL:', window.location.href);

    // Only run on conversation pages (not homepage)
    if (!window.location.href.startsWith('https://chatgpt.com/c/')) {
      console.log('[ChatGPT Extractor] Not on conversation page, skipping');
      return;
    }

    // Wait a bit for ChatGPT to fully render
    setTimeout(() => {
      console.log('[ChatGPT Extractor] Attempting to insert save button...');
      insertSaveButton();
      observeForShareButton();
    }, 2000);
  }

  // Create save button matching ChatGPT's UI
  function createSaveButton() {
    // Detect provider's UI language and get matching Save button text
    const { text, tooltip } = window.LanguageDetector.getSaveButtonText(SHARE_BUTTON_SELECTOR);

    const button = document.createElement('button');
    button.id = 'insidebar-save-conversation';
    button.className = 'btn relative btn-ghost text-token-text-primary mx-2';
    button.setAttribute('aria-label', text);
    button.innerHTML = `
      <div class="flex w-full items-center justify-center gap-1.5">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="-ms-0.5 icon">
          <path d="M2.66820931,12.6663 L2.66820931,12.5003 C2.66820931,12.1331 2.96598,11.8353 3.33325,11.8353 C3.70052,11.8353 3.99829,12.1331 3.99829,12.5003 L3.99829,12.6663 C3.99829,13.3772 3.9992,13.8707 4.03052,14.2542 C4.0612,14.6298 4.11803,14.8413 4.19849,14.9993 L4.2688,15.1263 C4.44511,15.4137 4.69813,15.6481 5.00024,15.8021 L5.13013,15.8577 C5.2739,15.9092 5.46341,15.947 5.74536,15.97 C6.12888,16.0014 6.62221,16.0013 7.33325,16.0013 L12.6663,16.0013 C13.3771,16.0013 13.8707,16.0014 14.2542,15.97 C14.6295,15.9394 14.8413,15.8825 14.9993,15.8021 L15.1262,15.7308 C15.4136,15.5545 15.6481,15.3014 15.802,14.9993 L15.8577,14.8695 C15.9091,14.7257 15.9469,14.536 15.97,14.2542 C16.0013,13.8707 16.0012,13.3772 16.0012,12.6663 L16.0012,12.5003 C16.0012,12.1332 16.2991,11.8355 16.6663,11.8353 C17.0335,11.8353 17.3313006,12.1331 17.3313006,12.5003 L17.3313006,12.6663 C17.3313006,13.3553 17.3319,13.9124 17.2952,14.3626 C17.2624,14.7636 17.1974,15.1247 17.053,15.4613 L16.9866,15.6038 C16.7211,16.1248 16.3172,16.5605 15.8215,16.8646 L15.6038,16.9866 C15.227,17.1786 14.8206,17.2578 14.3625,17.2952 C13.9123,17.332 13.3553,17.3314006 12.6663,17.3314006 L7.33325,17.3314006 C6.64416,17.3314006 6.0872,17.332 5.63696,17.2952 C5.23642,17.2625 4.87552,17.1982 4.53931,17.054 L4.39673,16.9866 C3.87561,16.7211 3.43911,16.3174 3.13501,15.8216 L3.01294,15.6038 C2.82097,15.2271 2.74177,14.8206 2.70435,14.3626 C2.66758,13.9124 2.66820931,13.3553 2.66820931,12.6663 Z M9.33521,3.33339 L9.33521,10.89489 L7.13696,8.69665 C6.87732,8.43701 6.45625,8.43712 6.19653,8.69665 C5.93684,8.95635 5.93684,9.37738 6.19653,9.63708 L9.52954,12.97106 L9.6311,13.05407 C9.73949,13.12627 9.86809,13.1654 10.0002,13.1654 C10.1763,13.1654 10.3454,13.0955 10.47,12.97106 L13.804,9.63708 C14.0633,9.37741 14.0634,8.95625 13.804,8.69665 C13.5443,8.43695 13.1222,8.43695 12.8625,8.69665 L10.6653,10.89392 L10.6653,3.33339 C10.6651,2.96639 10.3673,2.66849 10.0002,2.66829 C9.63308,2.66829 9.33538,2.96629 9.33521,3.33339 Z"></path>
        </svg>
        ${text}
      </div>
    `;
    button.title = tooltip;
    button.addEventListener('click', handleSaveClick);

    return button;
  }

  // Insert save button after share button
  function insertSaveButton() {
    // Only insert button on conversation pages
    if (!window.location.href.startsWith('https://chatgpt.com/c/')) {
      console.log('[ChatGPT Extractor] Not a conversation page, skipping save button');
      return;
    }

    // Check if button already exists
    if (document.getElementById('insidebar-save-conversation')) {
      console.log('[ChatGPT Extractor] Save button already exists');
      return;
    }

    // Find share button
    const shareButton = document.querySelector('[data-testid="share-chat-button"]');

    console.log('[ChatGPT Extractor] Looking for share button...');
    console.log('[ChatGPT Extractor] Share button found?', !!shareButton);

    if (!shareButton) {
      console.log('[ChatGPT Extractor] Share button not found yet, will retry');
      console.log('[ChatGPT Extractor] All buttons on page:',
        Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.textContent.substring(0, 30),
          testId: b.getAttribute('data-testid'),
          classes: b.className
        }))
      );
      return;
    }

    // Check if conversation exists
    const hasConversation = detectConversation();
    console.log('[ChatGPT Extractor] Has conversation?', hasConversation);

    if (!hasConversation) {
      console.log('[ChatGPT Extractor] No conversation detected, skipping button insertion');
      return;
    }

    // Create and insert save button after share button
    saveButton = createSaveButton();
    shareButton.parentElement.insertBefore(saveButton, shareButton.nextSibling);

    console.log('[ChatGPT Extractor] Save button inserted after share button');
  }

  // Detect if there's a conversation on the page
  function detectConversation() {
    // Look for conversation container
    const conversationContainer = document.querySelector('main [class*="react-scroll-to-bottom"]') ||
                                   document.querySelector('main [role="presentation"]') ||
                                   document.querySelector('main');

    if (!conversationContainer) return false;

    // Look for messages
    const messages = getMessages();
    return messages && messages.length > 0;
  }

  // Observe DOM for share button appearance and conversation changes
  function observeForShareButton() {
    const observer = new MutationObserver(() => {
      // Try to insert button if it doesn't exist
      insertSaveButton();

      // Remove button if conversation no longer exists
      const existingButton = document.getElementById('insidebar-save-conversation');
      if (existingButton && !detectConversation()) {
        existingButton.remove();
        saveButton = null;
      }
    });

    // Observe the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Extract conversation title
  function getConversationTitle() {
    // Priority 1: Extract conversation ID from URL and find matching sidebar link
    const urlMatch = window.location.pathname.match(/\/c\/([^\/]+)/);

    if (urlMatch) {
      const conversationId = urlMatch[1];
      const historyList = document.getElementById('history');

      if (historyList) {
        console.log('[ChatGPT Extractor] Found #history list, looking for conversation ID:', conversationId);

        // Find the sidebar link that matches this conversation ID
        const matchingLink = historyList.querySelector(`a[href*="${conversationId}"]`);

        if (matchingLink) {
          const titleSpan = matchingLink.querySelector('span[dir="auto"]');
          if (titleSpan) {
            const title = titleSpan.textContent.trim();
            if (title && !title.includes('New chat') && title.length > 0) {
              console.log('[ChatGPT Extractor] Found title from URL-matched sidebar link:', title);
              return title;
            }
          }

          // Fallback: use the entire link text content
          const title = matchingLink.textContent.trim();
          if (title && !title.includes('New chat') && title.length > 0) {
            console.log('[ChatGPT Extractor] Found title from URL-matched link (fallback):', title);
            return title;
          }
        }
      }
    }

    // Priority 2: Try to get active conversation using data-active attribute
    const historyList = document.getElementById('history');

    if (historyList) {
      console.log('[ChatGPT Extractor] Found #history list, looking for active item...');

      // Look for the active item with data-active attribute
      const activeItem = historyList.querySelector('[data-active]');

      if (activeItem) {
        // Find the span with the title text inside the active item
        const titleSpan = activeItem.querySelector('span[dir="auto"]');
        if (titleSpan) {
          const title = titleSpan.textContent.trim();
          if (title && !title.includes('New chat') && title.length > 0) {
            console.log('[ChatGPT Extractor] Found title from active item ([data-active] fallback):', title);
            return title;
          }
        }

        // Fallback: use the entire text content
        const title = activeItem.textContent.trim();
        if (title && !title.includes('New chat') && title.length > 0) {
          console.log('[ChatGPT Extractor] Found title from active item (content fallback):', title);
          return title;
        }
      } else {
        console.log('[ChatGPT Extractor] No [data-active] item found in #history');
      }
    } else {
      console.log('[ChatGPT Extractor] #history list not found');
    }

    // Priority 3: Try other selectors
    const fallbackSelectors = [
      'nav [aria-current="page"]',
      'h1',
      '[data-testid="conversation-title"]',
      'nav button[class*="font-semibold"]',
      'nav button > div'
    ];

    for (const selector of fallbackSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        console.log('[ChatGPT Extractor] Found title from fallback selector:', element.textContent.trim());
        return element.textContent.trim();
      }
    }

    // Ultimate fallback: Use default
    console.log('[ChatGPT Extractor] No title found, using default');
    return 'Untitled Conversation';
  }

  // Extract all messages from the conversation
  function getMessages() {
    const messages = [];

    // Try multiple selectors for message containers
    const messageContainers = document.querySelectorAll('[data-message-author-role]') ||
                              document.querySelectorAll('[class*="group/conversation-turn"]') ||
                              document.querySelectorAll('main [class*="flex"][class*="gap"]');

    messageContainers.forEach(container => {
      try {
        const message = extractMessageFromContainer(container);
        if (message) {
          messages.push(message);
        }
      } catch (error) {
        console.warn('[ChatGPT Extractor] Error extracting message:', error);
      }
    });

    return messages;
  }

  // Extract a single message from its container
  function extractMessageFromContainer(container) {
    // Determine role (user or assistant)
    let role = 'unknown';

    const roleAttr = container.getAttribute('data-message-author-role');
    if (roleAttr) {
      role = roleAttr;
    } else {
      // Try to detect based on structure/classes
      const classes = container.className;
      if (classes.includes('user') || container.querySelector('[class*="user"]')) {
        role = 'user';
      } else if (classes.includes('assistant') || container.querySelector('[class*="assistant"]')) {
        role = 'assistant';
      }
    }

    // Get message content
    const contentElement = container.querySelector('[class*="markdown"]') ||
                          container.querySelector('[data-message-id]') ||
                          container.querySelector('div[class*="whitespace"]') ||
                          container;

    if (!contentElement) return null;

    // Extract text content, preserving code blocks
    const content = extractContentWithFormatting(contentElement);

    if (!content.trim()) return null;

    return {
      role,
      content: content.trim()
    };
  }

  // Extract content while preserving markdown formatting
  function extractContentWithFormatting(element) {
    // Clone the element so we don't modify the original DOM
    const clone = element.cloneNode(true);

    return extractMarkdownFromElement(clone);
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
        provider: 'ChatGPT'
      };
    } catch (error) {
      console.error('[ChatGPT Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('[ChatGPT Extractor] Save button clicked');
    console.log('[ChatGPT Extractor] chrome object exists?', typeof chrome !== 'undefined');
    console.log('[ChatGPT Extractor] chrome.runtime exists?', typeof chrome?.runtime !== 'undefined');

    if (!saveButton) return;

    // Check if chrome API is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.error('[ChatGPT Extractor] Chrome extension API not available');
      showNotification('Extension API not available. Try reloading the page.', 'error');
      return;
    }

    // Disable button during save
    saveButton.disabled = true;
    const originalHTML = saveButton.innerHTML;
    saveButton.innerHTML = '<div class="flex w-full items-center justify-center gap-1.5"><span>Saving...</span></div>';

    try {
      const conversation = extractConversation();
      console.log('[ChatGPT Extractor] Extracted conversation:', {
        title: conversation.title,
        messageCount: conversation.messages.length,
        contentLength: conversation.content.length,
        url: conversation.url,
        provider: conversation.provider
      });

      // Generate conversation ID for deduplication
      const conversationId = generateConversationId(conversation.url, conversation.title);
      conversation.conversationId = conversationId;

      console.log('[ChatGPT Extractor] Generated conversation ID:', conversationId);

      // Check for duplicates
      const duplicateCheck = await checkForDuplicate(conversationId);
      console.log('[ChatGPT Extractor] Duplicate check result:', duplicateCheck);

      if (duplicateCheck.isDuplicate) {
        console.log('[ChatGPT Extractor] Duplicate found, comparing content...');

        // Compare content to decide whether to save
        const existingContent = (duplicateCheck.existingConversation.content || '').trim();
        const newContent = (conversation.content || '').trim();

        if (existingContent === newContent) {
          // Content identical - silently skip save
          console.log('[ChatGPT Extractor] Content identical, skipping save');
          saveButton.disabled = false;
          saveButton.innerHTML = originalHTML;
          return;
        }

        // Content changed - automatically overwrite with original timestamp
        console.log('[ChatGPT Extractor] Content changed, will overwrite with original timestamp');
        conversation.overwriteId = duplicateCheck.existingConversation.id;
        conversation.timestamp = duplicateCheck.existingConversation.timestamp;
      }

      // Send to background script
      chrome.runtime.sendMessage({
        action: 'saveConversationFromPage',
        payload: conversation
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[ChatGPT Extractor] Chrome runtime error:', chrome.runtime.lastError);
          const errorMsg = chrome.runtime.lastError.message;

          // Provide user-friendly message for context invalidation
          if (errorMsg.includes('Extension context invalidated')) {
            showNotification('Extension was reloaded. Please reload this page and try saving again.', 'error');
          } else {
            showNotification('Failed to save: ' + errorMsg, 'error');
          }
          saveButton.disabled = false;
          saveButton.innerHTML = originalHTML;
          return;
        }

        console.log('[ChatGPT Extractor] Response from background:', response);

        if (response && response.success) {
          console.log('[ChatGPT Extractor] Conversation saved successfully');
          // Success notification now shown in sidebar
        } else {
          console.error('[ChatGPT Extractor] Save failed. Response:', response);
          const errorMsg = response?.error || 'Unknown error';
          showNotification('Failed to save: ' + errorMsg, 'error');
        }

        // Re-enable button
        saveButton.disabled = false;
        saveButton.innerHTML = originalHTML;
      });
    } catch (error) {
      console.error('[ChatGPT Extractor] Error during extraction:', error);
      console.error('[ChatGPT Extractor] Error stack:', error.stack);
      showNotification('Failed to extract conversation: ' + error.message, 'error');

      // Re-enable button
      saveButton.disabled = false;
      saveButton.innerHTML = originalHTML;
    }
  }

  // Setup keyboard shortcut (Ctrl+Shift+S or Cmd+Shift+S)
  setupKeyboardShortcut(handleSaveClick, detectConversation);

})();
