// Perplexity Conversation History Extractor
// Extracts current conversation from Perplexity DOM and saves to extension
//
// IMPORTANT: Requires conversation-extractor-utils.js to be loaded first

(function() {
  'use strict';

  console.log('[Perplexity Extractor] Script loaded');

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

  let saveButton = null;

  // Initialize after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[Perplexity Extractor] Initializing...');
    console.log('[Perplexity Extractor] In iframe?', window !== window.top);
    console.log('[Perplexity Extractor] URL:', window.location.href);

    // Only run on search pages (not homepage)
    if (!window.location.href.includes('https://www.perplexity.ai/search/')) {
      console.log('[Perplexity Extractor] Not on search page, skipping');
      return;
    }

    // Wait a bit for Perplexity to fully render
    setTimeout(() => {
      console.log('[Perplexity Extractor] Attempting to insert save button...');
      insertSaveButton();
      observeForShareButton();
    }, 2000);
  }

  // Create save button matching Perplexity's button style
  function createSaveButton() {
    const button = document.createElement('button');
    button.id = 'insidebar-save-conversation';
    button.setAttribute('data-testid', 'save-button');
    button.type = 'button';
    button.className = 'bg-subtle text-foreground md:hover:text-quiet font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out select-none items-center relative group/button font-semimedium justify-center text-center items-center rounded-lg cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 px-2.5';
    button.title = 'Save this conversation to insidebar.ai';

    // Create button structure matching share button
    button.innerHTML = `
      <div class="flex items-center min-w-0 gap-two justify-center">
        <div class="flex shrink-0 items-center justify-center size-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" color="currentColor" class="tabler-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2 M7 11l5 5l5 -5 M12 4l0 12"></path>
          </svg>
        </div>
        <div class="relative truncate text-center px-1 leading-loose -mb-px" data-label="save">Save</div>
      </div>
    `;

    button.addEventListener('click', handleSaveClick);
    return button;
  }

  // Insert save button after share button
  function insertSaveButton() {
    // Check if button already exists
    if (document.getElementById('insidebar-save-conversation')) {
      console.log('[Perplexity Extractor] Save button already exists');
      return;
    }

    // Only insert on search pages
    if (!window.location.href.includes('https://www.perplexity.ai/search/')) {
      console.log('[Perplexity Extractor] Not on search page');
      return;
    }

    // Find share button
    const shareButton = document.querySelector('button[data-testid="share-button"]');

    console.log('[Perplexity Extractor] Looking for share button...');
    console.log('[Perplexity Extractor] Share button found?', !!shareButton);

    if (!shareButton) {
      console.log('[Perplexity Extractor] Share button not found yet, will retry');
      return;
    }

    // Check if conversation exists
    const hasConversation = detectConversation();
    console.log('[Perplexity Extractor] Has conversation?', hasConversation);

    // If share button exists, assume there's a conversation
    if (!hasConversation) {
      console.log('[Perplexity Extractor] No conversation detected via messages, but share button exists');
      console.log('[Perplexity Extractor] Inserting button anyway - messages may load later');
    }

    // Create and wrap both buttons
    const parentSpan = shareButton.parentElement;
    const grandparent = parentSpan.parentElement;

    // Create wrapper for save button (matching share button's span wrapper)
    const saveButtonWrapper = document.createElement('span');
    saveButton = createSaveButton();
    saveButtonWrapper.appendChild(saveButton);

    // Insert after share button's wrapper span
    grandparent.insertBefore(saveButtonWrapper, parentSpan.nextSibling);

    console.log('[Perplexity Extractor] Save button inserted after share button');
  }

  // Detect if there's a conversation on the page
  function detectConversation() {
    // Look for messages in Perplexity's structure
    const messages = getMessages();
    return messages && messages.length > 0;
  }

  // Observe DOM for share button appearance and conversation changes
  function observeForShareButton() {
    const observer = new MutationObserver(() => {
      // Try to insert button if it doesn't exist
      insertSaveButton();

      // Remove button if conversation no longer exists or not on search page
      const existingButton = document.getElementById('insidebar-save-conversation');
      if (existingButton) {
        if (!window.location.href.includes('https://www.perplexity.ai/search/')) {
          existingButton.parentElement?.remove(); // Remove wrapper span
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

  // Extract conversation title from current thread in sidebar
  function getConversationTitle() {
    // Find the current thread (has opacity-100 in hover div)
    const currentThread = document.querySelector('a[data-testid*="thread-title-"]');

    if (currentThread) {
      const titleSpan = currentThread.querySelector('span');
      if (titleSpan) {
        const title = titleSpan.textContent.trim();
        if (title && title.length > 0) {
          console.log('[Perplexity Extractor] Found title from current thread:', title);
          return title;
        }
      }
    }

    // Fallback: Try to extract from URL
    const urlMatch = window.location.pathname.match(/\/search\/[^\/]+-([^\/]+)/);
    if (urlMatch) {
      return `Perplexity Search ${urlMatch[1].substring(0, 8)}`;
    }

    // Ultimate fallback
    console.log('[Perplexity Extractor] No title found, using default');
    return 'Untitled Perplexity Search';
  }

  // Extract all messages from the conversation
  function getMessages() {
    const messages = [];

    // Perplexity likely uses a main content area
    const mainContent = document.querySelector('main, [role="main"]');

    if (!mainContent) {
      console.log('[Perplexity Extractor] No main content area found');
      return messages;
    }

    // Try to find message containers with various patterns
    let messageContainers = mainContent.querySelectorAll('[class*="message"], [data-testid*="query"], [data-testid*="answer"]');

    // If not found, try looking for structured conversation elements
    if (messageContainers.length === 0) {
      messageContainers = mainContent.querySelectorAll('div[class*="prose"], article');
    }

    console.log('[Perplexity Extractor] Found message containers:', messageContainers.length);

    messageContainers.forEach((container, index) => {
      try {
        const message = extractMessageFromContainer(container, index);
        if (message) {
          messages.push(message);
        }
      } catch (error) {
        console.warn('[Perplexity Extractor] Error extracting message:', error);
      }
    });

    return messages;
  }

  // Extract a single message from its container
  function extractMessageFromContainer(container, index) {
    // Determine role based on multiple indicators
    let role = 'unknown';

    // Try data-testid
    const testId = container.getAttribute('data-testid');
    if (testId) {
      if (testId.includes('query') || testId.includes('user')) {
        role = 'user';
      } else if (testId.includes('answer') || testId.includes('assistant')) {
        role = 'assistant';
      }
    }

    // Try class-based detection
    if (role === 'unknown') {
      const className = container.className || '';
      if (className.includes('user') || className.includes('query')) {
        role = 'user';
      } else if (className.includes('assistant') || className.includes('answer')) {
        role = 'assistant';
      }
    }

    // Alternating pattern fallback
    if (role === 'unknown') {
      role = index % 2 === 0 ? 'user' : 'assistant';
    }

    // Get message content
    const contentElement = container.querySelector('[class*="prose"], .markdown, [class*="content"]') || container;

    if (!contentElement) return null;

    // Extract markdown from the content
    const content = extractMarkdownFromElement(contentElement);

    if (!content.trim()) return null;

    console.log('[Perplexity Extractor] Extracted message:', { role, contentLength: content.length });

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
        provider: 'Perplexity'
      };
    } catch (error) {
      console.error('[Perplexity Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('[Perplexity Extractor] Save button clicked');

    if (!saveButton) return;

    // Check if chrome API is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.error('[Perplexity Extractor] Chrome extension API not available');
      showNotification('Extension API not available. Try reloading the page.', 'error');
      return;
    }

    // Disable button during save
    saveButton.disabled = true;
    const labelDiv = saveButton.querySelector('[data-label="save"]');
    const originalText = labelDiv.textContent;
    labelDiv.textContent = 'Saving...';

    try {
      const conversation = extractConversation();
      console.log('[Perplexity Extractor] Extracted conversation:', {
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
          labelDiv.textContent = originalText;
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
          console.error('[Perplexity Extractor] Chrome runtime error:', chrome.runtime.lastError);
          showNotification('Failed to save: ' + chrome.runtime.lastError.message, 'error');
          saveButton.disabled = false;
          labelDiv.textContent = originalText;
          return;
        }

        if (response && response.success) {
          console.log('[Perplexity Extractor] Conversation saved successfully');
          // Success notification now shown in sidebar
        } else {
          const errorMsg = response?.error || 'Unknown error';
          showNotification('Failed to save: ' + errorMsg, 'error');
        }

        // Re-enable button
        saveButton.disabled = false;
        labelDiv.textContent = originalText;
      });
    } catch (error) {
      console.error('[Perplexity Extractor] Error during extraction:', error);
      showNotification('Failed to extract conversation: ' + error.message, 'error');
      saveButton.disabled = false;
      labelDiv.textContent = originalText;
    }
  }

  // Setup keyboard shortcut (Ctrl+Shift+S or Cmd+Shift+S)
  setupKeyboardShortcut(() => {
    if (window.location.href.includes('https://www.perplexity.ai/search/')) {
      handleSaveClick();
    }
  }, detectConversation);

  // Listen for URL changes (Perplexity is a SPA)
  observeUrlChanges((url) => {
    console.log('[Perplexity Extractor] URL changed to:', url);

    // Remove button if leaving search page
    if (!url.includes('https://www.perplexity.ai/search/')) {
      const existingButton = document.getElementById('insidebar-save-conversation');
      if (existingButton) {
        existingButton.parentElement?.remove(); // Remove wrapper span
        saveButton = null;
      }
    } else {
      // Try to insert button on search page
      setTimeout(() => insertSaveButton(), 1000);
    }
  });

})();
