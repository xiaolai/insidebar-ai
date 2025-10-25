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
          <path d="M13.75,3.00011 C13.3358,3.00011 13.0001,3.33596 13,3.75011 C13,4.16432 13.3358,4.50011 13.75,4.50011 L17.25,4.50011 C18.49259,4.50011 19.49992,5.50753 19.5,6.75011 L19.5,17.2501 L19.48828,17.4806 C19.37286,18.6149 18.41483,19.50011 17.25,19.50011 L6.75,19.50011 C5.5074,19.50011 4.5,18.4927 4.5,17.2501 L4.5,15.2501 C4.4999,14.836 4.1642,14.50011 3.75,14.50011 C3.3358,14.50011 3,14.836 3,15.2501 L3,17.2501 C3,19.3212 4.6789,21.00011 6.75,21.00011 L17.25,21.00011 C19.25622,21.00011 20.89449,19.4247 20.99512,17.4435 L21,17.2501 L21,6.75011 C21,4.6791 19.32102,3.00011 17.25,3.00011 L13.75,3.00011 Z M17.18192,9.9365879 C17.30425,10.2026879 17.26016,10.5159879 17.06962,10.7383879 L11.06962,17.7383879 C10.93216,17.8986879 10.73283,17.9938879 10.52177,18.0000879 C10.31079,18.0060879 10.10678,17.9224879 9.96024004,17.7705879 L3.21029004,10.7705879 C3.00159004,10.5540879 2.94239004,10.2338879 3.05989004,9.9570879 C3.17749004,9.6802879 3.44939004,9.5000879 3.75029004,9.5000879 L6.72589004,9.5000879 C6.66229004,8.4857879 6.45309004,7.5295879 5.95729004,6.5605879 C5.37589004,5.4241879 4.37579004,4.2165079 2.65459004,2.8711779 L2.30009004,2.5996979 C2.04209004,2.4059679 1.93629004,2.0689179 2.03839004,1.7627879 C2.14049004,1.4565479 2.42749004,1.2500879 2.75029004,1.2500879 C5.60759004,1.2500879 8.33939004,1.9366779 10.37821,3.4180579 C12.27151,4.7938879 13.52485,6.8288879 13.72196,9.5000879 L16.50028,9.5000879 L16.60868,9.5078879 C16.85743,9.5441879 17.07486,9.7037879 17.18192,9.9365879 Z M12.587905,10.788175 C12.173695,10.788175 11.837905,10.452375 11.837905,10.038175 C11.837905,7.481475 10.767935,5.643175 9.084975,4.420015 C7.876815,3.542045 6.327815,2.966115 4.591815,2.703215 C5.639215,3.703515 6.376915,4.680155 6.880915,5.665175 C7.639715,7.148275 7.837915,8.589175 7.837915,10.038175 C7.837915,10.237075 7.758815,10.427775 7.618215,10.568475 C7.477515,10.709075 7.286815,10.788175 7.087915,10.788175 L5.103515,10.788175 L10.055685,15.922975 L14.458025,10.788175 L12.587905,10.788175 Z"></path>
        </svg>${text}
      `;
    } else {
      // Match /pages/ Share button style (default)
      button.className = 'relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-white/8 dark:active:bg-white/5 text-sm justify-center min-h-9 min-w-9 py-1 gap-x-1.5 rounded-xl after:rounded-xl after:absolute after:inset-0 after:pointer-events-none after:border after:border-transparent after:contrast-more:border-2 outline-2 outline-offset-1 focus-visible:z-[1] focus-visible:outline focus-visible:outline-stroke-900 shrink-0 px-1';
      button.setAttribute('aria-label', text);
      button.title = text;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="size-5">
          <path d="M13.75,3.00011 C13.3358,3.00011 13.0001,3.33596 13,3.75011 C13,4.16432 13.3358,4.50011 13.75,4.50011 L17.25,4.50011 C18.49259,4.50011 19.49992,5.50753 19.5,6.75011 L19.5,17.2501 L19.48828,17.4806 C19.37286,18.6149 18.41483,19.50011 17.25,19.50011 L6.75,19.50011 C5.5074,19.50011 4.5,18.4927 4.5,17.2501 L4.5,15.2501 C4.4999,14.836 4.1642,14.50011 3.75,14.50011 C3.3358,14.50011 3,14.836 3,15.2501 L3,17.2501 C3,19.3212 4.6789,21.00011 6.75,21.00011 L17.25,21.00011 C19.25622,21.00011 20.89449,19.4247 20.99512,17.4435 L21,17.2501 L21,6.75011 C21,4.6791 19.32102,3.00011 17.25,3.00011 L13.75,3.00011 Z M17.18192,9.9365879 C17.30425,10.2026879 17.26016,10.5159879 17.06962,10.7383879 L11.06962,17.7383879 C10.93216,17.8986879 10.73283,17.9938879 10.52177,18.0000879 C10.31079,18.0060879 10.10678,17.9224879 9.96024004,17.7705879 L3.21029004,10.7705879 C3.00159004,10.5540879 2.94239004,10.2338879 3.05989004,9.9570879 C3.17749004,9.6802879 3.44939004,9.5000879 3.75029004,9.5000879 L6.72589004,9.5000879 C6.66229004,8.4857879 6.45309004,7.5295879 5.95729004,6.5605879 C5.37589004,5.4241879 4.37579004,4.2165079 2.65459004,2.8711779 L2.30009004,2.5996979 C2.04209004,2.4059679 1.93629004,2.0689179 2.03839004,1.7627879 C2.14049004,1.4565479 2.42749004,1.2500879 2.75029004,1.2500879 C5.60759004,1.2500879 8.33939004,1.9366779 10.37821,3.4180579 C12.27151,4.7938879 13.52485,6.8288879 13.72196,9.5000879 L16.50028,9.5000879 L16.60868,9.5078879 C16.85743,9.5441879 17.07486,9.7037879 17.18192,9.9365879 Z M12.587905,10.788175 C12.173695,10.788175 11.837905,10.452375 11.837905,10.038175 C11.837905,7.481475 10.767935,5.643175 9.084975,4.420015 C7.876815,3.542045 6.327815,2.966115 4.591815,2.703215 C5.639215,3.703515 6.376915,4.680155 6.880915,5.665175 C7.639715,7.148275 7.837915,8.589175 7.837915,10.038175 C7.837915,10.237075 7.758815,10.427775 7.618215,10.568475 C7.477515,10.709075 7.286815,10.788175 7.087915,10.788175 L5.103515,10.788175 L10.055685,15.922975 L14.458025,10.788175 L12.587905,10.788175 Z"></path>
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
    console.log('[Copilot Extractor] URL:', window.location.href);
    console.log('[Copilot Extractor] Is /pages/?', window.location.href.includes('/pages/'));
    console.log('[Copilot Extractor] Is /chats/?', window.location.href.includes('/chats/'));

    if (!hasConversation) {
      console.log('[Copilot Extractor] No conversation detected, skipping button insertion');
      return;
    }

    // Create and insert save button after share button
    console.log('[Copilot Extractor] Creating save button...');
    saveButton = createSaveButton(shareButton);
    console.log('[Copilot Extractor] Save button created:', saveButton);
    console.log('[Copilot Extractor] Share button parent:', shareButton.parentElement);
    console.log('[Copilot Extractor] Inserting save button...');
    shareButton.parentElement.insertBefore(saveButton, shareButton.nextSibling);

    console.log('[Copilot Extractor] Save button inserted! ID:', saveButton.id);
  }

  // Detect if there's a conversation on the page
  function detectConversation() {
    // For /pages/, check if there's content in the page editor
    if (window.location.href.includes('/pages/')) {
      // Pages always have content, just check if we're on a page URL
      const contenteditable = document.querySelector('[contenteditable="true"]');
      const textbox = document.querySelector('[role="textbox"]');
      const textarea = document.querySelector('textarea');

      console.log('[Copilot Extractor] detectConversation() for /pages/:');
      console.log('  - contenteditable element:', contenteditable);
      console.log('  - textbox element:', textbox);
      console.log('  - textarea element:', textarea);

      const hasPageContent = contenteditable || textbox || textarea;
      console.log('  - hasPageContent:', !!hasPageContent);

      return !!hasPageContent;
    }

    // For /chats/, look for messages
    console.log('[Copilot Extractor] detectConversation() for /chats/');
    const messages = getMessages();
    console.log('  - messages found:', messages ? messages.length : 0);
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

      // For /pages/, extract the page content instead of messages
      if (window.location.href.includes('/pages/')) {
        const pageContent = extractPageContent();
        if (!pageContent || !pageContent.trim()) {
          throw new Error('No content found on page');
        }

        return {
          title,
          content: pageContent,
          messages: [{
            role: 'assistant',
            content: pageContent
          }],
          timestamp: Date.now(),
          url: window.location.href,
          provider: 'Microsoft Copilot'
        };
      }

      // For /chats/, extract messages
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

  // Extract content from /pages/ (document editor)
  function extractPageContent() {
    // Look for the main content area in Pages
    const contentArea = document.querySelector('[contenteditable="true"]') ||
                       document.querySelector('[role="textbox"]') ||
                       document.querySelector('main');

    if (!contentArea) {
      console.warn('[Copilot Extractor] No content area found on page');
      return '';
    }

    // Extract and format the content
    const clone = contentArea.cloneNode(true);
    return extractMarkdownFromElement(clone);
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
