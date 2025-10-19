// Grok Conversation History Extractor
// Extracts current conversation from Grok DOM and saves to extension
//
// IMPORTANT: Requires conversation-extractor-utils.js and language-detector.js to be loaded first

(function() {
  'use strict';

  console.log('[Grok Extractor] Script loaded');

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

  // Helper function to find Share button by its text content (language-agnostic)
  function findShareButton() {
    const buttons = document.querySelectorAll('button.rounded-full');

    for (const button of buttons) {
      const text = button.textContent?.trim();
      // Check if button text matches any known Share text variation
      // Note: Order matters - check longer strings first to avoid partial matches
      const shareTexts = [
        '共有する',      // Japanese (verb form)
        'Поделиться',  // Russian
        'Compartir',   // Spanish
        'Partager',    // French
        'Condividi',   // Italian
        'Teilen',      // German
        'Share',       // English
        '共享',        // Chinese
        '分享',        // Chinese
        '共有',        // Japanese (noun)
        '공유'         // Korean
      ];

      if (text && shareTexts.some(shareText => text.includes(shareText))) {
        return button;
      }
    }

    return null;
  }

  let saveButton = null;

  // Initialize after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[Grok Extractor] Initializing...');
    console.log('[Grok Extractor] In iframe?', window !== window.top);
    console.log('[Grok Extractor] URL:', window.location.href);

    // Only run on conversation pages (not homepage)
    if (!window.location.href.includes('https://grok.com/c/')) {
      console.log('[Grok Extractor] Not on conversation page, skipping');
      return;
    }

    // Wait a bit for Grok to fully render
    setTimeout(() => {
      console.log('[Grok Extractor] Attempting to insert save button...');
      insertSaveButton();
      observeForShareButton();
    }, 2000);
  }

  // Create save button matching Grok's UI with SVG icon
  function createSaveButton() {
    // Find Share button to detect language
    const shareButton = findShareButton();
    let lang = 'en'; // default

    if (shareButton) {
      const shareText = shareButton.textContent?.trim();
      // Detect language from Share button text
      // Note: Order matters - check longer strings first to avoid partial matches
      const langMap = {
        '共有する': 'ja',      // Japanese (verb form) - check before noun form
        'Поделиться': 'ru',
        'Compartir': 'es',
        'Partager': 'fr',
        'Condividi': 'it',
        'Teilen': 'de',
        'Share': 'en',
        '共享': 'zh_CN',
        '分享': 'zh_CN',
        '共有': 'ja',         // Japanese (noun form)
        '공유': 'ko'
      };

      for (const [text, detectedLang] of Object.entries(langMap)) {
        if (shareText && shareText.includes(text)) {
          lang = detectedLang;
          break;
        }
      }
    }

    // Get Save button text for detected language
    const saveTexts = {
      'en': 'Save',
      'zh_CN': '保存',
      'zh_TW': '保存',
      'ja': '保存',
      'ko': '저장',
      'ru': 'Сохранить',
      'es': 'Guardar',
      'fr': 'Enregistrer',
      'de': 'Speichern',
      'it': 'Salva'
    };

    const tooltips = {
      'en': 'Save this conversation to insidebar.ai',
      'zh_CN': '保存此对话到 insidebar.ai',
      'zh_TW': '保存此對話到 insidebar.ai',
      'ja': 'この会話を insidebar.ai に保存',
      'ko': '이 대화를 insidebar.ai에 저장',
      'ru': 'Сохранить этот разговор в insidebar.ai',
      'es': 'Guardar esta conversación en insidebar.ai',
      'fr': 'Enregistrer cette conversation dans insidebar.ai',
      'de': 'Dieses Gespräch in insidebar.ai speichern',
      'it': 'Salva questa conversazione su insidebar.ai'
    };

    const text = saveTexts[lang] || saveTexts['en'];
    const tooltip = tooltips[lang] || tooltips['en'];

    console.log('[Grok Extractor] Creating Save button in language:', lang);

    const button = document.createElement('button');
    button.id = 'insidebar-save-conversation';
    button.className = 'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-100 [&_svg]:shrink-0 select-none border border-border-l2 text-fg-primary hover:bg-button-ghost-hover [&_svg]:hover:text-fg-primary disabled:hover:bg-transparent h-10 px-3.5 py-1.5 text-sm rounded-full';
    button.type = 'button';
    button.setAttribute('aria-label', text);
    button.setAttribute('data-state', 'closed');
    button.title = tooltip;

    // Create button structure with SVG icon + text
    button.innerHTML = `
      <span style="opacity: 1; transform: none;">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="stroke-[2]" stroke-width="2">
          <path d="M2.66820931,12.6663 L2.66820931,12.5003 C2.66820931,12.1331 2.96598,11.8353 3.33325,11.8353 C3.70052,11.8353 3.99829,12.1331 3.99829,12.5003 L3.99829,12.6663 C3.99829,13.3772 3.9992,13.8707 4.03052,14.2542 C4.0612,14.6298 4.11803,14.8413 4.19849,14.9993 L4.2688,15.1263 C4.44511,15.4137 4.69813,15.6481 5.00024,15.8021 L5.13013,15.8577 C5.2739,15.9092 5.46341,15.947 5.74536,15.97 C6.12888,16.0014 6.62221,16.0013 7.33325,16.0013 L12.6663,16.0013 C13.3771,16.0013 13.8707,16.0014 14.2542,15.97 C14.6295,15.9394 14.8413,15.8825 14.9993,15.8021 L15.1262,15.7308 C15.4136,15.5545 15.6481,15.3014 15.802,14.9993 L15.8577,14.8695 C15.9091,14.7257 15.9469,14.536 15.97,14.2542 C16.0013,13.8707 16.0012,13.3772 16.0012,12.6663 L16.0012,12.5003 C16.0012,12.1332 16.2991,11.8355 16.6663,11.8353 C17.0335,11.8353 17.3313006,12.1331 17.3313006,12.5003 L17.3313006,12.6663 C17.3313006,13.3553 17.3319,13.9124 17.2952,14.3626 C17.2624,14.7636 17.1974,15.1247 17.053,15.4613 L16.9866,15.6038 C16.7211,16.1248 16.3172,16.5605 15.8215,16.8646 L15.6038,16.9866 C15.227,17.1786 14.8206,17.2578 14.3625,17.2952 C13.9123,17.332 13.3553,17.3314006 12.6663,17.3314006 L7.33325,17.3314006 C6.64416,17.3314006 6.0872,17.332 5.63696,17.2952 C5.23642,17.2625 4.87552,17.1982 4.53931,17.054 L4.39673,16.9866 C3.87561,16.7211 3.43911,16.3174 3.13501,15.8216 L3.01294,15.6038 C2.82097,15.2271 2.74177,14.8206 2.70435,14.3626 C2.66758,13.9124 2.66820931,13.3553 2.66820931,12.6663 Z M9.33521,3.33339 L9.33521,10.89489 L7.13696,8.69665 C6.87732,8.43701 6.45625,8.43712 6.19653,8.69665 C5.93684,8.95635 5.93684,9.37738 6.19653,9.63708 L9.52954,12.97106 L9.6311,13.05407 C9.73949,13.12627 9.86809,13.1654 10.0002,13.1654 C10.1763,13.1654 10.3454,13.0955 10.47,12.97106 L13.804,9.63708 C14.0633,9.37741 14.0634,8.95625 13.804,8.69665 C13.5443,8.43695 13.1222,8.43695 12.8625,8.69665 L10.6653,10.89392 L10.6653,3.33339 C10.6651,2.96639 10.3673,2.66849 10.0002,2.66829 C9.63308,2.66829 9.33538,2.96629 9.33521,3.33339 Z" fill="currentColor" fill-rule="nonzero"></path>
        </svg>
      </span>
      <span class="font-semibold" data-test-id="save-label">${text}</span>
    `;

    button.addEventListener('click', handleSaveClick);
    return button;
  }

  // Insert save button after share button
  function insertSaveButton() {
    // Check if button already exists
    if (document.getElementById('insidebar-save-conversation')) {
      console.log('[Grok Extractor] Save button already exists');
      return;
    }

    // Only insert on conversation pages
    if (!window.location.href.includes('https://grok.com/c/')) {
      console.log('[Grok Extractor] Not on conversation page');
      return;
    }

    // Find share button using language-agnostic helper
    const shareButton = findShareButton();

    console.log('[Grok Extractor] Looking for share button...');
    console.log('[Grok Extractor] Share button found?', !!shareButton);

    if (!shareButton) {
      console.log('[Grok Extractor] Share button not found yet, will retry');
      return;
    }

    // Check if conversation exists
    const hasConversation = detectConversation();
    console.log('[Grok Extractor] Has conversation?', hasConversation);

    // If share button exists, assume there's a conversation
    // (message detection might fail on first load)
    if (!hasConversation) {
      console.log('[Grok Extractor] No conversation detected via messages, but share button exists');
      console.log('[Grok Extractor] Inserting button anyway - messages may load later');
      // Don't return - continue with button insertion
    }

    // Create and insert save button after share button
    saveButton = createSaveButton();
    shareButton.parentElement.insertBefore(saveButton, shareButton.nextSibling);

    console.log('[Grok Extractor] Save button inserted after share button');
  }

  // Detect if there's a conversation on the page
  function detectConversation() {
    // Look for messages in Grok's structure
    const messages = getMessages();
    return messages && messages.length > 0;
  }

  // Observe DOM for share button appearance and conversation changes
  function observeForShareButton() {
    const observer = new MutationObserver(() => {
      // Try to insert button if it doesn't exist
      insertSaveButton();

      // Remove button if conversation no longer exists or not on conversation page
      const existingButton = document.getElementById('insidebar-save-conversation');
      if (existingButton) {
        if (!detectConversation() || !window.location.href.includes('https://grok.com/c/')) {
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

  // Extract conversation title from first user message
  function getConversationTitle() {
    // Extract conversation ID from URL for fallback
    const urlMatch = window.location.pathname.match(/\/c\/([^\/]+)/);
    const conversationId = urlMatch ? urlMatch[1] : 'unknown';

    // Use first user message as title
    try {
      const messages = getMessages();
      if (messages && messages.length > 0) {
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage && firstUserMessage.content) {
          let content = firstUserMessage.content;

          // Filter out "User: " prefix if present
          content = content.replace(/^User:\s*/i, '');

          // Truncate to first 50 chars, remove newlines
          const truncated = content
            .replace(/\n+/g, ' ')
            .substring(0, 50)
            .trim();

          if (truncated.length > 0) {
            const title = truncated.length === 50 ? truncated + '...' : truncated;
            console.log('[Grok Extractor] Using first user message as title:', title);
            return title;
          }
        }
      }
    } catch (error) {
      console.warn('[Grok Extractor] Error extracting title from first message:', error);
    }

    // Fallback: Use URL-based title (only if message extraction failed)
    console.log('[Grok Extractor] Falling back to URL-based title');
    return `Grok Conversation ${conversationId.substring(0, 8)}`;
  }

  // Extract all messages from the conversation
  function getMessages() {
    const messages = [];

    // Try multiple selectors to find message containers
    let messageContainers = document.querySelectorAll('[data-testid^="conversation-turn-"]');

    // If not found, try alternative selectors
    if (messageContainers.length === 0) {
      messageContainers = document.querySelectorAll('[class*="conversation-turn"], [class*="message-"], article[class*="group"]');
    }

    // If still not found, look for any article tags in main content
    if (messageContainers.length === 0) {
      const mainContent = document.querySelector('main, [role="main"], .chat-container');
      if (mainContent) {
        messageContainers = mainContent.querySelectorAll('article, [class*="turn"], [data-message]');
      }
    }

    console.log('[Grok Extractor] Found message containers:', messageContainers.length);
    console.log('[Grok Extractor] Sample container classes:', messageContainers[0]?.className);

    messageContainers.forEach(container => {
      try {
        const message = extractMessageFromContainer(container);
        if (message) {
          messages.push(message);
        }
      } catch (error) {
        console.warn('[Grok Extractor] Error extracting message:', error);
      }
    });

    return messages;
  }

  // Extract a single message from its container
  function extractMessageFromContainer(container) {
    // Determine role based on multiple indicators
    let role = 'unknown';

    // Try data-testid
    const testId = container.getAttribute('data-testid');
    if (testId) {
      if (testId.includes('user')) {
        role = 'user';
      } else if (testId.includes('assistant') || testId.includes('grok')) {
        role = 'assistant';
      }
    }

    // Try data-message-author-role attribute
    if (role === 'unknown') {
      const authorRole = container.getAttribute('data-message-author-role');
      if (authorRole) {
        role = authorRole;
      }
    }

    // Try to detect from content structure
    if (role === 'unknown') {
      const hasUserIndicator = container.querySelector('[data-message-author-role="user"], [class*="user-message"]');
      const hasAssistantIndicator = container.querySelector('[data-message-author-role="assistant"], [class*="assistant-message"], [class*="grok-message"]');

      if (hasUserIndicator) {
        role = 'user';
      } else if (hasAssistantIndicator) {
        role = 'assistant';
      }
    }

    // Try class-based detection
    if (role === 'unknown') {
      const className = container.className || '';
      if (className.includes('user')) {
        role = 'user';
      } else if (className.includes('assistant') || className.includes('grok')) {
        role = 'assistant';
      }
    }

    // Try to detect based on position (alternating pattern: user, assistant, user, assistant)
    if (role === 'unknown') {
      // Get all message containers
      const allMessages = Array.from(container.parentElement?.children || []);
      const index = allMessages.indexOf(container);
      // Assume odd indices are user, even are assistant (or vice versa)
      role = index % 2 === 0 ? 'user' : 'assistant';
    }

    // Get message content
    const contentElement = container.querySelector('[data-message-content], .markdown, [class*="message-content"], [class*="prose"]') || container;

    if (!contentElement) return null;

    // Extract markdown from the content
    const content = extractMarkdownFromElement(contentElement);

    if (!content.trim()) return null;

    console.log('[Grok Extractor] Extracted message:', { role, contentLength: content.length });

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
        provider: 'Grok'
      };
    } catch (error) {
      console.error('[Grok Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('[Grok Extractor] Save button clicked');

    if (!saveButton) return;

    // Check if chrome API is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.error('[Grok Extractor] Chrome extension API not available');
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
      console.log('[Grok Extractor] Extracted conversation:', {
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
          console.error('[Grok Extractor] Chrome runtime error:', chrome.runtime.lastError);
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
          console.log('[Grok Extractor] Conversation saved successfully');
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
      console.error('[Grok Extractor] Error during extraction:', error);
      showNotification('Failed to extract conversation: ' + error.message, 'error');
      saveButton.disabled = false;
      labelSpan.textContent = originalText;
    }
  }

  // Setup keyboard shortcut (Ctrl+Shift+S or Cmd+Shift+S)
  setupKeyboardShortcut(() => {
    if (window.location.href.includes('https://grok.com/c/')) {
      handleSaveClick();
    }
  }, detectConversation);

  // Listen for URL changes (Grok is a SPA)
  observeUrlChanges((url) => {
    console.log('[Grok Extractor] URL changed to:', url);

    // Remove button if leaving conversation page
    if (!url.includes('https://grok.com/c/')) {
      const existingButton = document.getElementById('insidebar-save-conversation');
      if (existingButton) {
        existingButton.remove();
        saveButton = null;
      }
    } else {
      // Try to insert button on conversation page
      setTimeout(() => insertSaveButton(), 1000);
    }
  });

})();
