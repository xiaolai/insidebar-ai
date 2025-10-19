// Gemini Conversation History Extractor
// Extracts current conversation from Gemini DOM and saves to extension
//
// IMPORTANT: Requires conversation-extractor-utils.js to be loaded first

(function() {
  'use strict';

  console.log('[Gemini Extractor] Script loaded');

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
  // Gemini doesn't have a text-based share button, use null to fallback to document language
  const SHARE_BUTTON_SELECTOR = null;

  let saveButton = null;

  // Initialize after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[Gemini Extractor] Initializing...');
    console.log('[Gemini Extractor] In iframe?', window !== window.top);
    console.log('[Gemini Extractor] URL:', window.location.href);

    // Only run on conversation pages (not homepage)
    if (!window.location.href.includes('https://gemini.google.com/app/')) {
      console.log('[Gemini Extractor] Not on conversation page, skipping');
      return;
    }

    // Wait a bit for Gemini to fully render
    setTimeout(() => {
      console.log('[Gemini Extractor] Attempting to insert save button...');
      insertSaveButton();
      observeForModeButton();
    }, 2000);
  }

  // Create save button matching Gemini's referral button style
  function createSaveButton() {
    // Detect provider's UI language and get matching Save button text
    const { text, tooltip } = window.LanguageDetector.getSaveButtonText(SHARE_BUTTON_SELECTOR);

    const button = document.createElement('button');
    button.id = 'insidebar-save-conversation';
    button.className = 'mdc-button mat-mdc-button-base gds-referral-button mdc-button--unelevated mat-mdc-unelevated-button mat-unthemed';
    button.setAttribute('mat-flat-button', '');
    button.setAttribute('data-test-id', 'insidebar-save-button');
    button.type = 'button';
    button.title = tooltip;

    // Create button structure matching Gemini's referral button
    button.innerHTML = `
      <span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span>
      <span class="mdc-button__label">
        <span data-test-id="save-label" class="gds-label-m">${text}</span>
      </span>
      <span class="mat-focus-indicator"></span>
      <span class="mat-mdc-button-touch-target"></span>
    `;

    button.addEventListener('click', handleSaveClick);
    return button;
  }

  // Insert save button after referral button in buttons-container
  function insertSaveButton() {
    // Check if button already exists
    if (document.getElementById('insidebar-save-conversation')) {
      console.log('[Gemini Extractor] Save button already exists');
      return;
    }

    // Only insert on conversation pages
    if (!window.location.href.includes('https://gemini.google.com/app/')) {
      console.log('[Gemini Extractor] Not on conversation page');
      return;
    }

    // Find referral button container
    const referralContainer = document.querySelector('.buttons-container.referral');

    console.log('[Gemini Extractor] Looking for referral button container...');
    console.log('[Gemini Extractor] Referral container found?', !!referralContainer);

    if (!referralContainer) {
      console.log('[Gemini Extractor] Referral container not found yet, will retry');
      return;
    }

    // Check if conversation exists
    const hasConversation = detectConversation();
    console.log('[Gemini Extractor] Has conversation?', hasConversation);

    if (!hasConversation) {
      console.log('[Gemini Extractor] No conversation detected, skipping button insertion');
      return;
    }

    // Create wrapper div matching referral container structure
    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'buttons-container ng-star-inserted';
    buttonWrapper.setAttribute('data-test-id', 'insidebar-save-container');

    saveButton = createSaveButton();
    buttonWrapper.appendChild(saveButton);

    // Insert after referral container
    referralContainer.parentElement.insertBefore(buttonWrapper, referralContainer.nextSibling);

    console.log('[Gemini Extractor] Save button inserted after referral button');
  }

  // Detect if there's a conversation on the page
  function detectConversation() {
    // Look for messages in Gemini's structure
    const messages = getMessages();
    return messages && messages.length > 0;
  }

  // Observe DOM for referral button appearance and conversation changes
  function observeForModeButton() {
    const observer = new MutationObserver(() => {
      // Try to insert button if it doesn't exist
      insertSaveButton();

      // Remove button wrapper if conversation no longer exists or not on conversation page
      const existingContainer = document.querySelector('[data-test-id="insidebar-save-container"]');
      if (existingContainer) {
        if (!detectConversation() || !window.location.href.includes('https://gemini.google.com/app/')) {
          existingContainer.remove();
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

  // Extract conversation title from selected conversation in sidebar
  function getConversationTitle() {
    // Priority 1: Extract conversation ID from URL and find matching sidebar element
    const urlMatch = window.location.pathname.match(/\/app\/([^\/]+)/);

    if (urlMatch) {
      const conversationId = urlMatch[1];

      // Try to find a conversation element with matching ID
      // Gemini might use data attributes or href patterns
      const matchingConversation = document.querySelector(`[data-test-id="conversation"][href*="${conversationId}"]`) ||
                                    document.querySelector(`a[href*="/app/${conversationId}"]`);

      if (matchingConversation) {
        const titleDiv = matchingConversation.querySelector('.conversation-title');
        if (titleDiv) {
          const title = titleDiv.textContent.trim();
          if (title && title.length > 0) {
            console.log('[Gemini Extractor] Found title from URL-matched conversation:', title);
            return title;
          }
        }
      }

      // Fallback: Try the old method (.selected class)
      const selectedConversation = document.querySelector('[data-test-id="conversation"].selected');
      if (selectedConversation) {
        const titleDiv = selectedConversation.querySelector('.conversation-title');
        if (titleDiv) {
          const title = titleDiv.textContent.trim();
          if (title && title.length > 0) {
            console.log('[Gemini Extractor] Found title from selected conversation (class fallback):', title);
            return title;
          }
        }
      }

      // Ultimate fallback: Use URL-based title
      console.log('[Gemini Extractor] Falling back to URL-based title');
      return `Gemini Conversation ${conversationId.substring(0, 8)}`;
    }

    // No URL match - use default
    console.log('[Gemini Extractor] No conversation ID in URL, using default');
    return 'Untitled Gemini Conversation';
  }

  // Extract all messages from the conversation
  function getMessages() {
    const messages = [];

    // Gemini uses message-content elements for both user and model messages
    const messageContainers = document.querySelectorAll('message-content');

    console.log('[Gemini Extractor] Found message containers:', messageContainers.length);

    messageContainers.forEach(container => {
      try {
        const message = extractMessageFromContainer(container);
        if (message) {
          messages.push(message);
        }
      } catch (error) {
        console.warn('[Gemini Extractor] Error extracting message:', error);
      }
    });

    return messages;
  }

  // Extract a single message from its container
  function extractMessageFromContainer(container) {
    // Determine role based on container attributes
    let role = 'unknown';

    // Check for user-query (user message) or model-response (assistant message)
    const userQuery = container.querySelector('user-query');
    const modelResponse = container.querySelector('model-response');

    if (userQuery) {
      role = 'user';
    } else if (modelResponse) {
      role = 'assistant';
    }

    // Get message content
    const contentElement = container.querySelector('.query-content, .model-response-text, [class*="message-content"]') || container;

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
        provider: 'Gemini'
      };
    } catch (error) {
      console.error('[Gemini Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('[Gemini Extractor] Save button clicked');

    if (!saveButton) return;

    // Check if chrome API is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.error('[Gemini Extractor] Chrome extension API not available');
      showNotification('Extension API not available. Try reloading the page.', 'error');
      return;
    }

    // Disable button during save
    saveButton.disabled = true;
    const labelSpan = saveButton.querySelector('[data-test-id="save-label"]');
    const originalText = labelSpan.textContent;
    labelSpan.textContent = 'Saving...';

    try {
      const conversation = extractConversation();
      console.log('[Gemini Extractor] Extracted conversation:', {
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
          labelSpan.textContent = originalText;
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
          console.error('[Gemini Extractor] Chrome runtime error:', chrome.runtime.lastError);
          const errorMsg = chrome.runtime.lastError.message;

          // Provide user-friendly message for context invalidation
          if (errorMsg.includes('Extension context invalidated')) {
            showNotification('Extension was reloaded. Please reload this page and try saving again.', 'error');
          } else {
            showNotification('Failed to save: ' + errorMsg, 'error');
          }
          saveButton.disabled = false;
          labelSpan.textContent = originalText;
          return;
        }

        if (response && response.success) {
          console.log('[Gemini Extractor] Conversation saved successfully');
          // Success notification now shown in sidebar
        } else {
          const errorMsg = response?.error || 'Unknown error';
          showNotification('Failed to save: ' + errorMsg, 'error');
        }

        // Re-enable button
        saveButton.disabled = false;
        labelSpan.textContent = originalText;
      });
    } catch (error) {
      console.error('[Gemini Extractor] Error during extraction:', error);
      showNotification('Failed to extract conversation: ' + error.message, 'error');
      saveButton.disabled = false;
      labelSpan.textContent = originalText;
    }
  }

  // Setup keyboard shortcut (Ctrl+Shift+S or Cmd+Shift+S)
  setupKeyboardShortcut(() => {
    if (window.location.href.includes('https://gemini.google.com/app/')) {
      handleSaveClick();
    }
  }, detectConversation);

  // Listen for URL changes (Gemini is a SPA)
  observeUrlChanges((url) => {
    console.log('[Gemini Extractor] URL changed to:', url);

    // Remove button container if leaving conversation page
    if (!url.includes('https://gemini.google.com/app/')) {
      const existingContainer = document.querySelector('[data-test-id="insidebar-save-container"]');
      if (existingContainer) {
        existingContainer.remove();
        saveButton = null;
      }
    } else {
      // Try to insert button on conversation page
      setTimeout(() => insertSaveButton(), 1000);
    }
  });

})();
