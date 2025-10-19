// Google AI Mode Conversation History Extractor
// Extracts current conversation from Google AI Mode DOM and saves to extension
//
// IMPORTANT: Requires conversation-extractor-utils.js to be loaded first

(function() {
  'use strict';

  console.log('[Google Extractor] Script loaded');

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
  // Google AI Mode doesn't have a text-based share button, use null to fallback to document language
  const SHARE_BUTTON_SELECTOR = null;

  let saveButton = null;

  // Initialize after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[Google Extractor] Initializing...');
    console.log('[Google Extractor] In iframe?', window !== window.top);
    console.log('[Google Extractor] URL:', window.location.href);

    // Only run on Google AI Mode pages (udm=50 parameter)
    if (!window.location.search.includes('udm=50')) {
      console.log('[Google Extractor] Not on AI Mode page, skipping');
      return;
    }

    // Wait a bit for Google AI Mode to fully render
    setTimeout(() => {
      console.log('[Google Extractor] Attempting to insert save button...');
      insertSaveButton();
      observeForButtons();
    }, 2000);
  }

  // Create save button with download icon matching Google's style
  function createSaveButton() {
    // Detect provider's UI language and get matching Save button text
    const { tooltip } = window.LanguageDetector.getSaveButtonText(SHARE_BUTTON_SELECTOR);

    const button = document.createElement('button');
    button.id = 'insidebar-google-save-conversation';
    button.className = 'UTNPFf';
    button.setAttribute('data-test-id', 'insidebar-google-save-button');
    button.type = 'button';
    button.title = tooltip;
    button.setAttribute('aria-label', tooltip);

    // Create button structure with download icon
    button.innerHTML = `
      <div class="juBd7">
        <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#434343"><path d="M290-290h380v-60H290v60Zm190-123.85L626.15-560 584-602.15l-74 72.77V-710h-60v180.62l-74-72.77L333.85-560 480-413.85Zm.07 313.85q-78.84 0-148.21-29.92t-120.68-81.21q-51.31-51.29-81.25-120.63Q100-401.1 100-479.93q0-78.84 29.92-148.21t81.21-120.68q51.29-51.31 120.63-81.25Q401.1-860 479.93-860q78.84 0 148.21 29.92t120.68 81.21q51.31 51.29 81.25 120.63Q860-558.9 860-480.07q0 78.84-29.92 148.21t-81.21 120.68q-51.29 51.31-120.63 81.25Q558.9-100 480.07-100Zm-.07-60q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
      </div>
    `;

    button.addEventListener('click', handleSaveClick);
    return button;
  }

  // Insert save button after "Open AI Mode history" button
  function insertSaveButton() {
    // Check if button already exists
    if (document.getElementById('insidebar-google-save-conversation')) {
      console.log('[Google Extractor] Save button already exists');
      return;
    }

    // Only insert on AI Mode pages
    if (!window.location.search.includes('udm=50')) {
      console.log('[Google Extractor] Not on AI Mode page');
      return;
    }

    // Find the OEwhSe container with the history button
    const buttonContainer = document.querySelector('.OEwhSe');

    console.log('[Google Extractor] Looking for button container...');
    console.log('[Google Extractor] Button container found?', !!buttonContainer);

    if (!buttonContainer) {
      console.log('[Google Extractor] Button container not found yet, will retry');
      return;
    }

    // Check if conversation exists
    const hasConversation = detectConversation();
    console.log('[Google Extractor] Has conversation?', hasConversation);

    if (!hasConversation) {
      console.log('[Google Extractor] No conversation detected, skipping button insertion');
      return;
    }

    saveButton = createSaveButton();

    // Insert after the second button (history button)
    const historyButton = buttonContainer.querySelectorAll('button')[1];
    if (historyButton && historyButton.nextSibling) {
      buttonContainer.insertBefore(saveButton, historyButton.nextSibling);
    } else if (historyButton) {
      historyButton.parentElement.appendChild(saveButton);
    } else {
      // Fallback: just append to container
      buttonContainer.appendChild(saveButton);
    }

    console.log('[Google Extractor] Save button inserted after history button');
  }

  // Detect if there's a conversation on the page
  function detectConversation() {
    // Look for query parameter indicating a conversation
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    // Check for messages in the DOM (this may need adjustment based on actual Google AI DOM)
    const messages = getMessages();

    return (query && query.length > 0) || (messages && messages.length > 0);
  }

  // Observe DOM for button appearance and conversation changes
  function observeForButtons() {
    const observer = new MutationObserver(() => {
      // Try to insert button if it doesn't exist
      insertSaveButton();

      // Remove button if conversation no longer exists or not on AI Mode page
      const existingButton = document.getElementById('insidebar-google-save-conversation');
      if (existingButton) {
        if (!detectConversation() || !window.location.search.includes('udm=50')) {
          existingButton.remove();
          saveButton = null;
        }
      }
    });

    // Observe the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Extract conversation title from query or page
  function getConversationTitle() {
    // Priority 1: Get from query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    if (query && query.length > 0) {
      // Use first 50 characters of query as title
      const title = query.substring(0, 50);
      console.log('[Google Extractor] Found title from query:', title);
      return title + (query.length > 50 ? '...' : '');
    }

    // Fallback: Use default
    console.log('[Google Extractor] Using default title');
    return 'Google AI Conversation';
  }

  // Extract all messages from the conversation
  function getMessages() {
    const messages = [];

    // Google AI Mode DOM structure - this will need to be adjusted based on actual DOM
    // Common patterns to look for:
    // - User messages might be in specific containers
    // - AI responses might be in different containers

    // Try to find message containers
    const possibleSelectors = [
      'div[data-processed="true"]',  // Google AI Mode primary selector
      '[role="article"]',
      '[data-message-author]',
      '.message-container',
      '.conversation-turn'
    ];

    let messageContainers = [];
    for (const selector of possibleSelectors) {
      messageContainers = document.querySelectorAll(selector);
      if (messageContainers.length > 0) {
        console.log('[Google Extractor] Found messages using selector:', selector);
        break;
      }
    }

    console.log('[Google Extractor] Found message containers:', messageContainers.length);

    messageContainers.forEach(container => {
      try {
        const message = extractMessageFromContainer(container);
        if (message) {
          messages.push(message);
        }
      } catch (error) {
        console.warn('[Google Extractor] Error extracting message:', error);
      }
    });

    // If no messages found via containers, try to extract from query
    if (messages.length === 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('q');
      if (query) {
        messages.push({
          role: 'user',
          content: query
        });
      }
    }

    return messages;
  }

  // Extract a single message from its container
  function extractMessageFromContainer(container) {
    // Determine role based on container attributes or structure
    let role = 'unknown';

    // Google AI Mode specific: Check data-processed attribute
    if (container.hasAttribute('data-processed')) {
      // Heuristic: Alternate between user and assistant
      // First message is typically user query
      const allMessages = document.querySelectorAll('div[data-processed="true"]');
      const index = Array.from(allMessages).indexOf(container);
      role = index % 2 === 0 ? 'user' : 'assistant';
    }
    // Try to detect role from attributes or classes
    else if (container.hasAttribute('data-message-author')) {
      const author = container.getAttribute('data-message-author');
      role = author === 'user' ? 'user' : 'assistant';
    } else if (container.classList.contains('user-message')) {
      role = 'user';
    } else if (container.classList.contains('assistant-message') || container.classList.contains('ai-message')) {
      role = 'assistant';
    } else {
      // Heuristic: alternate between user and assistant
      const allMessages = document.querySelectorAll('[role="article"]');
      const index = Array.from(allMessages).indexOf(container);
      role = index % 2 === 0 ? 'user' : 'assistant';
    }

    // Extract markdown from the content
    const content = extractMarkdownFromElement(container);

    if (!content.trim()) return null;

    return {
      role,
      content: content.trim()
    };
  }

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
        provider: 'Google'
      };
    } catch (error) {
      console.error('[Google Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('[Google Extractor] Save button clicked');

    if (!saveButton) return;

    // Check if chrome API is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.error('[Google Extractor] Chrome extension API not available');
      showNotification('Extension API not available. Try reloading the page.', 'error');
      return;
    }

    // Disable button during save
    saveButton.disabled = true;
    const originalTitle = saveButton.title;
    saveButton.title = 'Saving...';

    try {
      const conversation = extractConversation();
      console.log('[Google Extractor] Extracted conversation:', {
        title: conversation.title,
        messageCount: conversation.messages.length,
        contentLength: conversation.content.length,
        url: conversation.url,
        provider: conversation.provider
      });

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
          saveButton.disabled = false;
          saveButton.title = originalTitle;
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
          console.error('[Google Extractor] Chrome runtime error:', chrome.runtime.lastError);
          const errorMsg = chrome.runtime.lastError.message;

          // Provide user-friendly message for context invalidation
          if (errorMsg.includes('Extension context invalidated')) {
            showNotification('Extension was reloaded. Please reload this page and try saving again.', 'error');
          } else {
            showNotification('Failed to save: ' + errorMsg, 'error');
          }
          saveButton.disabled = false;
          saveButton.title = originalTitle;
          return;
        }

        if (response && response.success) {
          console.log('[Google Extractor] Conversation saved successfully');
          // Success notification now shown in sidebar
        } else {
          const errorMsg = response?.error || 'Unknown error';
          showNotification('Failed to save: ' + errorMsg, 'error');
        }

        // Re-enable button
        saveButton.disabled = false;
        saveButton.title = originalTitle;
      });
    } catch (error) {
      console.error('[Google Extractor] Error during extraction:', error);
      showNotification('Failed to extract conversation: ' + error.message, 'error');
      saveButton.disabled = false;
      saveButton.title = originalTitle;
    }
  }

  // Setup keyboard shortcut (Ctrl+Shift+S or Cmd+Shift+S)
  setupKeyboardShortcut(() => {
    if (window.location.search.includes('udm=50')) {
      handleSaveClick();
    }
  }, detectConversation);

  // Listen for URL changes (Google AI is likely a SPA)
  observeUrlChanges((url) => {
    console.log('[Google Extractor] URL changed to:', url);

    // Remove button if leaving AI Mode page
    if (!url.includes('udm=50')) {
      const existingButton = document.getElementById('insidebar-google-save-conversation');
      if (existingButton) {
        existingButton.remove();
        saveButton = null;
      }
    } else {
      // Try to insert button on AI Mode page
      setTimeout(() => insertSaveButton(), 1000);
    }
  });

})();
