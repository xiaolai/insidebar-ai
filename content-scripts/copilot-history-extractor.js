// Microsoft Copilot Conversation History Extractor
// Extracts current conversation from copilot.microsoft.com and bing.com/chat DOM and saves to extension
//
// IMPORTANT: Requires conversation-extractor-utils.js to be loaded first
//
// TODO: After manual DOM inspection, update the following selectors:
// - SHARE_BUTTON_SELECTOR: Selector for the share button (for language detection and button placement)
// - Conversation URL pattern check in init()
// - Message container selectors in getMessages()
// - Role detection attributes/classes in extractMessageFromContainer()
// - Content element selectors in extractMessageFromContainer()

(function() {
  'use strict';

  console.log('[Copilot Extractor] Script loaded');

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

  // Share button selector - handles both /chats/ and /pages/ layouts
  // /pages/ uses: title="Share"
  // /chats/ uses: title="Share conversation, [conversation name]"
  function findShareButton() {
    // Try exact match first (for /pages/)
    let shareBtn = document.querySelector('button[title="Share"]');
    if (shareBtn) return shareBtn;

    // Try partial match for /chats/ (title starts with "Share conversation")
    const allButtons = Array.from(document.querySelectorAll('button[title]'));
    shareBtn = allButtons.find(btn => btn.title.startsWith('Share conversation'));
    if (shareBtn) return shareBtn;

    // Fallback: look for button with Share text and the specific SVG
    shareBtn = allButtons.find(btn =>
      btn.textContent.includes('Share') &&
      btn.querySelector('svg path[d*="M10.25 3.00011"]')
    );

    return shareBtn;
  }

  const SHARE_BUTTON_SELECTOR = 'button[title="Share"]'; // Used for language detection fallback

  let saveButton = null;

  // Initialize after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[Copilot Extractor] Initializing...');
    console.log('[Copilot Extractor] In iframe?', window !== window.top);
    console.log('[Copilot Extractor] URL:', window.location.href);

    // Check for Copilot conversation pages: /chats/* or /pages/*
    const isCopilotConversation =
      (window.location.href.includes('copilot.microsoft.com/chats/') ||
       window.location.href.includes('copilot.microsoft.com/pages/') ||
       window.location.href.includes('bing.com/chat'));

    if (!isCopilotConversation) {
      console.log('[Copilot Extractor] Not on Copilot conversation page, skipping');
      return;
    }

    // Wait a bit for Copilot to fully render
    setTimeout(() => {
      console.log('[Copilot Extractor] Attempting to insert save button...');
      insertSaveButton();
      observeForShareButton();
    }, 2000);
  }

  // Create save button matching Copilot's UI
  function createSaveButton(shareButton) {
    // Detect provider's UI language and get matching Save button text
    const { text, tooltip } = window.LanguageDetector.getSaveButtonText(SHARE_BUTTON_SELECTOR);

    const button = document.createElement('button');
    button.id = 'insidebar-save-conversation';
    button.setAttribute('type', 'button');
    button.setAttribute('data-spatial-navigation-autofocus', 'false');

    // Detect page type and match Share button styling
    const isChatsPage = window.location.href.includes('/chats/');
    const isPagesPage = window.location.href.includes('/pages/');

    if (isChatsPage && shareButton) {
      // Match /chats/ Share button style
      button.className = 'relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-black/30 dark:active:bg-black/20 text-sm justify-start min-h-9 min-w-9 px-2.5 py-1 gap-x-1.5 rounded-xl after:rounded-xl after:absolute after:inset-0 after:pointer-events-none after:border after:border-transparent after:contrast-more:border-2 outline-2 outline-offset-1 focus-visible:z-[1] focus-visible:outline focus-visible:outline-stroke-900';
      button.setAttribute('aria-label', text);
      button.title = `${text} conversation`;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="me-1 size-4">
          <path d="M2.66820931,12.6663 L2.66820931,12.5003 C2.66820931,12.1331 2.96598,11.8353 3.33325,11.8353 C3.70052,11.8353 3.99829,12.1331 3.99829,12.5003 L3.99829,12.6663 C3.99829,13.3772 3.9992,13.8707 4.03052,14.2542 C4.0612,14.6298 4.11803,14.8413 4.19849,14.9993 L4.2688,15.1263 C4.44511,15.4137 4.69813,15.6481 5.00024,15.8021 L5.13013,15.8577 C5.2739,15.9092 5.46341,15.947 5.74536,15.97 C6.12888,16.0014 6.62221,16.0013 7.33325,16.0013 L12.6663,16.0013 C13.3771,16.0013 13.8707,16.0014 14.2542,15.97 C14.6295,15.9394 14.8413,15.8825 14.9993,15.8021 L15.1262,15.7308 C15.4136,15.5545 15.6481,15.3014 15.802,14.9993 L15.8577,14.8695 C15.9091,14.7257 15.9469,14.536 15.97,14.2542 C16.0013,13.8707 16.0012,13.3772 16.0012,12.6663 L16.0012,12.5003 C16.0012,12.1332 16.2991,11.8355 16.6663,11.8353 C17.0335,11.8353 17.3313006,12.1331 17.3313006,12.5003 L17.3313006,12.6663 C17.3313006,13.3553 17.3319,13.9124 17.2952,14.3626 C17.2624,14.7636 17.1974,15.1247 17.053,15.4613 L16.9866,15.6038 C16.7211,16.1248 16.3172,16.5605 15.8215,16.8646 L15.6038,16.9866 C15.227,17.1786 14.8206,17.2578 14.3625,17.2952 C13.9123,17.332 13.3553,17.3314006 12.6663,17.3314006 L7.33325,17.3314006 C6.64416,17.3314006 6.0872,17.332 5.63696,17.2952 C5.23642,17.2625 4.87552,17.1982 4.53931,17.054 L4.39673,16.9866 C3.87561,16.7211 3.43911,16.3174 3.13501,15.8216 L3.01294,15.6038 C2.82097,15.2271 2.74177,14.8206 2.70435,14.3626 C2.66758,13.9124 2.66820931,13.3553 2.66820931,12.6663 Z M9.33521,3.33339 L9.33521,10.89489 L7.13696,8.69665 C6.87732,8.43701 6.45625,8.43712 6.19653,8.69665 C5.93684,8.95635 5.93684,9.37738 6.19653,9.63708 L9.52954,12.97106 L9.6311,13.05407 C9.73949,13.12627 9.86809,13.1654 10.0002,13.1654 C10.1763,13.1654 10.3454,13.0955 10.47,12.97106 L13.804,9.63708 C14.0633,9.37741 14.0634,8.95625 13.804,8.69665 C13.5443,8.43695 13.1222,8.43695 12.8625,8.69665 L10.6653,10.89392 L10.6653,3.33339 C10.6651,2.96639 10.3673,2.66849 10.0002,2.66829 C9.63308,2.66829 9.33538,2.96629 9.33521,3.33339 Z"></path>
        </svg>${text}
      `;
    } else {
      // Match /pages/ Share button style (default)
      button.className = 'relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-white/8 dark:active:bg-white/5 text-sm justify-center min-h-9 min-w-9 py-1 gap-x-1.5 rounded-xl after:rounded-xl after:absolute after:inset-0 after:pointer-events-none after:border after:border-transparent after:contrast-more:border-2 outline-2 outline-offset-1 focus-visible:z-[1] focus-visible:outline focus-visible:outline-stroke-900 shrink-0 px-1';
      button.setAttribute('aria-label', text);
      button.title = text;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="size-5">
          <path d="M2.66820931,12.6663 L2.66820931,12.5003 C2.66820931,12.1331 2.96598,11.8353 3.33325,11.8353 C3.70052,11.8353 3.99829,12.1331 3.99829,12.5003 L3.99829,12.6663 C3.99829,13.3772 3.9992,13.8707 4.03052,14.2542 C4.0612,14.6298 4.11803,14.8413 4.19849,14.9993 L4.2688,15.1263 C4.44511,15.4137 4.69813,15.6481 5.00024,15.8021 L5.13013,15.8577 C5.2739,15.9092 5.46341,15.947 5.74536,15.97 C6.12888,16.0014 6.62221,16.0013 7.33325,16.0013 L12.6663,16.0013 C13.3771,16.0013 13.8707,16.0014 14.2542,15.97 C14.6295,15.9394 14.8413,15.8825 14.9993,15.8021 L15.1262,15.7308 C15.4136,15.5545 15.6481,15.3014 15.802,14.9993 L15.8577,14.8695 C15.9091,14.7257 15.9469,14.536 15.97,14.2542 C16.0013,13.8707 16.0012,13.3772 16.0012,12.6663 L16.0012,12.5003 C16.0012,12.1332 16.2991,11.8355 16.6663,11.8353 C17.0335,11.8353 17.3313006,12.1331 17.3313006,12.5003 L17.3313006,12.6663 C17.3313006,13.3553 17.3319,13.9124 17.2952,14.3626 C17.2624,14.7636 17.1974,15.1247 17.053,15.4613 L16.9866,15.6038 C16.7211,16.1248 16.3172,16.5605 15.8215,16.8646 L15.6038,16.9866 C15.227,17.1786 14.8206,17.2578 14.3625,17.2952 C13.9123,17.332 13.3553,17.3314006 12.6663,17.3314006 L7.33325,17.3314006 C6.64416,17.3314006 6.0872,17.332 5.63696,17.2952 C5.23642,17.2625 4.87552,17.1982 4.53931,17.054 L4.39673,16.9866 C3.87561,16.7211 3.43911,16.3174 3.13501,15.8216 L3.01294,15.6038 C2.82097,15.2271 2.74177,14.8206 2.70435,14.3626 C2.66758,13.9124 2.66820931,13.3553 2.66820931,12.6663 Z M9.33521,3.33339 L9.33521,10.89489 L7.13696,8.69665 C6.87732,8.43701 6.45625,8.43712 6.19653,8.69665 C5.93684,8.95635 5.93684,9.37738 6.19653,9.63708 L9.52954,12.97106 L9.6311,13.05407 C9.73949,13.12627 9.86809,13.1654 10.0002,13.1654 C10.1763,13.1654 10.3454,13.0955 10.47,12.97106 L13.804,9.63708 C14.0633,9.37741 14.0634,8.95625 13.804,8.69665 C13.5443,8.43695 13.1222,8.43695 12.8625,8.69665 L10.6653,10.89392 L10.6653,3.33339 C10.6651,2.96639 10.3673,2.66849 10.0002,2.66829 C9.63308,2.66829 9.33538,2.96629 9.33521,3.33339 Z"></path>
        </svg>
        <span class="mx-1.5 hidden sm:inline">${text}</span>
      `;
    }

    button.addEventListener('click', handleSaveClick);
    return button;
  }

  // Insert save button after share button
  function insertSaveButton() {
    // Check if button already exists
    if (document.getElementById('insidebar-save-conversation')) {
      console.log('[Copilot Extractor] Save button already exists');
      return;
    }

    // Find share button (handles both /chats/ and /pages/ layouts)
    const shareButton = findShareButton();

    console.log('[Copilot Extractor] Looking for share button...');
    console.log('[Copilot Extractor] Share button found?', !!shareButton);

    if (!shareButton) {
      console.log('[Copilot Extractor] Share button not found yet, will retry');
      console.log('[Copilot Extractor] All buttons on page:',
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
    console.log('[Copilot Extractor] Has conversation?', hasConversation);

    if (!hasConversation) {
      console.log('[Copilot Extractor] No conversation detected, skipping button insertion');
      return;
    }

    // Create and insert save button after share button
    saveButton = createSaveButton(shareButton);
    shareButton.parentElement.insertBefore(saveButton, shareButton.nextSibling);

    console.log('[Copilot Extractor] Save button inserted after share button');
  }

  // Detect if there's a conversation on the page
  function detectConversation() {
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
    // Look for conversation title in the sidebar/chat list
    // Title appears in <p class="truncate" title="...">
    const titleSelectors = [
      'p.truncate[title]',  // Primary selector for conversation title
      'h1',
      '[data-testid="conversation-title"]',
      'header h1',
      '[role="heading"]'
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const title = element.textContent.trim();
        console.log('[Copilot Extractor] Found title from selector:', selector, '->', title);
        return title;
      }
    }

    // Fallback: Use first user message or default
    const messages = getMessages();
    if (messages && messages.length > 0) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        const title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
        console.log('[Copilot Extractor] Using first user message as title:', title);
        return title;
      }
    }

    console.log('[Copilot Extractor] No title found, using default');
    return 'Untitled Conversation';
  }

  // Extract all messages from the conversation
  function getMessages() {
    const messages = [];

    // Copilot messages are in the main conversation area
    // Try to find message containers - look for data attributes or common patterns
    let messageContainers = document.querySelectorAll('[data-message-id]');

    if (!messageContainers || messageContainers.length === 0) {
      // Fallback: look for common chat message patterns
      messageContainers = document.querySelectorAll('[class*="message"]');
    }

    if (!messageContainers || messageContainers.length === 0) {
      // Another fallback: look in main conversation container
      const conversationContainer = document.querySelector('main') || document.body;
      messageContainers = conversationContainer.querySelectorAll('[role="article"], [role="region"] > div');
    }

    messageContainers.forEach(container => {
      try {
        const message = extractMessageFromContainer(container);
        if (message) {
          messages.push(message);
        }
      } catch (error) {
        console.warn('[Copilot Extractor] Error extracting message:', error);
      }
    });

    console.log('[Copilot Extractor] Found', messages.length, 'messages');
    return messages;
  }

  // Extract a single message from its container
  function extractMessageFromContainer(container) {
    // Determine role (user or assistant)
    let role = 'unknown';

    // Try data attribute first
    const roleAttr = container.getAttribute('data-message-role') ||
                    container.getAttribute('data-author') ||
                    container.getAttribute('data-sender') ||
                    container.getAttribute('role');

    if (roleAttr) {
      const roleLower = roleAttr.toLowerCase();
      if (roleLower.includes('user') || roleLower.includes('human')) {
        role = 'user';
      } else if (roleLower.includes('assistant') || roleLower.includes('bot') || roleLower.includes('copilot') || roleLower.includes('ai')) {
        role = 'assistant';
      }
    }

    // If role still unknown, try to detect based on classes or content
    if (role === 'unknown') {
      const classes = container.className.toLowerCase();
      const html = container.innerHTML.toLowerCase();

      if (classes.includes('user') || html.includes('user')) {
        role = 'user';
      } else if (classes.includes('assistant') || classes.includes('bot') || classes.includes('copilot') || html.includes('copilot')) {
        role = 'assistant';
      }
    }

    // Get message content - try multiple strategies
    let contentElement = container.querySelector('[class*="markdown"]') ||
                        container.querySelector('[class*="message-content"]') ||
                        container.querySelector('[data-content]') ||
                        container.querySelector('p, div[class*="text"]');

    // If no specific content element found, use the container itself
    if (!contentElement) {
      contentElement = container;
    }

    // Extract text content, preserving code blocks
    const content = extractContentWithFormatting(contentElement);

    if (!content || !content.trim()) return null;

    return {
      role: role !== 'unknown' ? role : 'assistant', // Default to assistant if unknown
      content: content.trim()
    };
  }

  // Extract content while preserving markdown formatting
  function extractContentWithFormatting(element) {
    // Clone the element so we don't modify the original DOM
    const clone = element.cloneNode(true);

    return extractMarkdownFromElement(clone);
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
        provider: 'Microsoft Copilot'
      };
    } catch (error) {
      console.error('[Copilot Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('[Copilot Extractor] Save button clicked');

    if (!saveButton) return;

    // Check if chrome API is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.error('[Copilot Extractor] Chrome extension API not available');
      showNotification('Extension API not available. Try reloading the page.', 'error');
      return;
    }

    // Disable button during save
    saveButton.disabled = true;
    const originalHTML = saveButton.innerHTML;
    saveButton.innerHTML = '<div class="flex items-center gap-2"><span>Saving...</span></div>';

    try {
      const conversation = extractConversation();
      console.log('[Copilot Extractor] Extracted conversation:', {
        title: conversation.title,
        messageCount: conversation.messages.length,
        contentLength: conversation.content.length,
        url: conversation.url,
        provider: conversation.provider
      });

      // Generate conversation ID for deduplication
      const conversationId = generateConversationId(conversation.url, conversation.title);
      conversation.conversationId = conversationId;

      console.log('[Copilot Extractor] Generated conversation ID:', conversationId);

      // Check for duplicates
      const duplicateCheck = await checkForDuplicate(conversationId);
      console.log('[Copilot Extractor] Duplicate check result:', duplicateCheck);

      if (duplicateCheck.isDuplicate) {
        console.log('[Copilot Extractor] Duplicate found, comparing content...');

        // Compare content to decide whether to save
        const existingContent = (duplicateCheck.existingConversation.content || '').trim();
        const newContent = (conversation.content || '').trim();

        if (existingContent === newContent) {
          // Content identical - silently skip save
          console.log('[Copilot Extractor] Content identical, skipping save');
          saveButton.disabled = false;
          saveButton.innerHTML = originalHTML;
          return;
        }

        // Content changed - automatically overwrite with original timestamp
        console.log('[Copilot Extractor] Content changed, will overwrite with original timestamp');
        conversation.overwriteId = duplicateCheck.existingConversation.id;
        conversation.timestamp = duplicateCheck.existingConversation.timestamp;
      }

      // Send to background script
      chrome.runtime.sendMessage({
        action: 'saveConversationFromPage',
        payload: conversation
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Copilot Extractor] Chrome runtime error:', chrome.runtime.lastError);
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

        console.log('[Copilot Extractor] Response from background:', response);

        if (response && response.success) {
          console.log('[Copilot Extractor] Conversation saved successfully');
          // Success notification now shown in sidebar
        } else {
          console.error('[Copilot Extractor] Save failed. Response:', response);
          const errorMsg = response?.error || 'Unknown error';
          showNotification('Failed to save: ' + errorMsg, 'error');
        }

        // Re-enable button
        saveButton.disabled = false;
        saveButton.innerHTML = originalHTML;
      });
    } catch (error) {
      console.error('[Copilot Extractor] Error during extraction:', error);
      console.error('[Copilot Extractor] Error stack:', error.stack);
      showNotification('Failed to extract conversation: ' + error.message, 'error');

      // Re-enable button
      saveButton.disabled = false;
      saveButton.innerHTML = originalHTML;
    }
  }

  // Setup keyboard shortcut (Ctrl+Shift+S or Cmd+Shift+S)
  setupKeyboardShortcut(handleSaveClick, detectConversation);

})();
