// Claude Conversation History Extractor
// Extracts current conversation from Claude.ai DOM and saves to extension
//
// IMPORTANT: Requires conversation-extractor-utils.js to be loaded first

(function() {
  'use strict';

  console.log('[Claude Extractor] Script loaded');

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

  let saveButton = null;

  // Initialize after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[Claude Extractor] Initializing...');
    console.log('[Claude Extractor] In iframe?', window !== window.top);
    console.log('[Claude Extractor] URL:', window.location.href);

    // Wait a bit for Claude to fully render
    setTimeout(() => {
      console.log('[Claude Extractor] Attempting to insert save button...');
      insertSaveButton();
      observeForShareButton();
    }, 2000);
  }

  // Create save button matching Claude's UI
  function createSaveButton() {
    const button = document.createElement('button');
    button.id = 'insidebar-save-conversation';
    button.className = `inline-flex
  items-center
  justify-center
  relative
  shrink-0
  can-focus
  select-none
  disabled:pointer-events-none
  disabled:opacity-50
  disabled:shadow-none
  disabled:drop-shadow-none
    text-text-000
    font-base-bold
    border-0.5
    border-border-200
    relative
    overflow-hidden
    transition
    duration-100
    hover:border-border-300/0
    bg-bg-300/0
    hover:bg-bg-400
    backface-hidden h-8 rounded-md px-3 min-w-[4rem] active:scale-[0.985] whitespace-nowrap !text-xs`;
    button.textContent = 'Save';
    button.type = 'button';
    button.title = 'Save this conversation to insidebar.ai';
    button.style.marginLeft = '8px';
    button.addEventListener('click', handleSaveClick);

    return button;
  }

  // Insert save button after share button
  function insertSaveButton() {
    // Check if button already exists
    if (document.getElementById('insidebar-save-conversation')) {
      console.log('[Claude Extractor] Save button already exists');
      return;
    }

    // Find share button
    const shareButton = document.querySelector('[data-testid="wiggle-controls-actions-share"]');

    console.log('[Claude Extractor] Looking for share button...');
    console.log('[Claude Extractor] Share button found?', !!shareButton);

    if (!shareButton) {
      console.log('[Claude Extractor] Share button not found yet, will retry');
      return;
    }

    // Check if conversation exists
    const hasConversation = detectConversation();
    console.log('[Claude Extractor] Has conversation?', hasConversation);

    if (!hasConversation) {
      console.log('[Claude Extractor] No conversation detected, skipping button insertion');
      return;
    }

    // Create and insert save button after share button
    saveButton = createSaveButton();
    shareButton.parentElement.insertBefore(saveButton, shareButton.nextSibling);

    console.log('[Claude Extractor] Save button inserted after share button');
  }

  // Detect if there's a conversation on the page
  function detectConversation() {
    // Look for messages in Claude's structure
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

  // Extract conversation title from URL or active chat item
  function getConversationTitle() {
    // Try to get title from active chat in sidebar
    const activeChat = document.querySelector('a[class*="!bg-bg-400"]');
    if (activeChat) {
      const titleSpan = activeChat.querySelector('span[class*="truncate"]');
      if (titleSpan) {
        const title = titleSpan.textContent.trim();
        if (title && title.length > 0) {
          console.log('[Claude Extractor] Found title from active chat:', title);
          return title;
        }
      }
    }

    // Fallback: Try to extract from URL
    const urlMatch = window.location.pathname.match(/\/chat\/([^\/]+)/);
    if (urlMatch) {
      return `Claude Conversation ${urlMatch[1].substring(0, 8)}`;
    }

    // Ultimate fallback
    console.log('[Claude Extractor] No title found, using default');
    return 'Untitled Claude Conversation';
  }

  // Extract all messages from the conversation
  function getMessages() {
    const messages = [];

    // Claude uses different structure - messages are in divs with specific patterns
    // Look for message containers
    const messageContainers = document.querySelectorAll('[data-test-render-count]');

    console.log('[Claude Extractor] Found message containers:', messageContainers.length);

    messageContainers.forEach(container => {
      try {
        const message = extractMessageFromContainer(container);
        if (message) {
          messages.push(message);
        }
      } catch (error) {
        console.warn('[Claude Extractor] Error extracting message:', error);
      }
    });

    return messages;
  }

  // Extract a single message from its container
  function extractMessageFromContainer(container) {
    // Determine role based on container structure
    // Claude typically has user messages and assistant messages
    let role = 'unknown';

    // Check for role indicators in the container
    const contentDiv = container.querySelector('div[class*="font-user-message"]');
    if (contentDiv) {
      role = 'user';
    } else {
      // Likely assistant message
      role = 'assistant';
    }

    // Get message content - Claude uses different selectors
    const contentElement = container.querySelector('[class*="font-claude-message"]') ||
                          container.querySelector('[class*="font-user-message"]') ||
                          container;

    if (!contentElement) return null;

    // Extract markdown from the content
    const content = extractMarkdownFromElement(contentElement);

    if (!content.trim()) return null;

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
        provider: 'Claude'
      };
    } catch (error) {
      console.error('[Claude Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('[Claude Extractor] Save button clicked');

    if (!saveButton) return;

    // Check if chrome API is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.error('[Claude Extractor] Chrome extension API not available');
      showNotification('Extension API not available. Try reloading the page.', 'error');
      return;
    }

    // Disable button during save
    saveButton.disabled = true;
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Saving...';

    try {
      const conversation = extractConversation();
      console.log('[Claude Extractor] Extracted conversation:', {
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
        // Re-enable button first
        saveButton.disabled = false;
        saveButton.textContent = originalText;

        // Show warning and get user choice
        const userChoice = await showDuplicateWarning(conversation.title, duplicateCheck.existingConversation);

        if (userChoice === 'skip') {
          return;
        }

        if (userChoice === 'overwrite') {
          conversation.overwriteId = duplicateCheck.existingConversation.id;
        } else if (userChoice === 'save-new') {
          // Generate a new unique conversation ID to avoid duplicate detection
          conversation.conversationId = generateConversationId(conversation.url, conversation.title, true);
        }

        // Re-disable button for actual save
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
      }

      // Send to background script
      chrome.runtime.sendMessage({
        action: 'saveConversationFromPage',
        payload: conversation
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Claude Extractor] Chrome runtime error:', chrome.runtime.lastError);
          showNotification('Failed to save: ' + chrome.runtime.lastError.message, 'error');
          saveButton.disabled = false;
          saveButton.textContent = originalText;
          return;
        }

        if (response && response.success) {
          console.log('[Claude Extractor] Conversation saved successfully');
          // Success notification now shown in sidebar
        } else {
          const errorMsg = response?.error || 'Unknown error';
          showNotification('Failed to save: ' + errorMsg, 'error');
        }

        // Re-enable button
        saveButton.disabled = false;
        saveButton.textContent = originalText;
      });
    } catch (error) {
      console.error('[Claude Extractor] Error during extraction:', error);
      showNotification('Failed to extract conversation: ' + error.message, 'error');
      saveButton.disabled = false;
      saveButton.textContent = originalText;
    }
  }

  // Setup keyboard shortcut (Ctrl+Shift+S or Cmd+Shift+S)
  setupKeyboardShortcut(handleSaveClick, detectConversation);

})();
