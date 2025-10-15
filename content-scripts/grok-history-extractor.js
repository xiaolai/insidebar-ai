// Grok Conversation History Extractor
// Extracts current conversation from Grok DOM and saves to extension

(function() {
  'use strict';

  console.log('[Grok Extractor] Script loaded');

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
    const button = document.createElement('button');
    button.id = 'insidebar-save-conversation';
    button.className = 'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-100 [&_svg]:shrink-0 select-none border border-border-l2 text-fg-primary hover:bg-button-ghost-hover [&_svg]:hover:text-fg-primary disabled:hover:bg-transparent h-10 px-3.5 py-1.5 text-sm rounded-full';
    button.type = 'button';
    button.setAttribute('aria-label', 'Save conversation');
    button.setAttribute('data-state', 'closed');
    button.title = 'Save this conversation to insidebar.ai';

    // Create button structure with SVG icon + text
    button.innerHTML = `
      <span style="opacity: 1; transform: none;">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="stroke-[2]" stroke-width="2">
          <path d="M2.66820931,12.6663 L2.66820931,12.5003 C2.66820931,12.1331 2.96598,11.8353 3.33325,11.8353 C3.70052,11.8353 3.99829,12.1331 3.99829,12.5003 L3.99829,12.6663 C3.99829,13.3772 3.9992,13.8707 4.03052,14.2542 C4.0612,14.6298 4.11803,14.8413 4.19849,14.9993 L4.2688,15.1263 C4.44511,15.4137 4.69813,15.6481 5.00024,15.8021 L5.13013,15.8577 C5.2739,15.9092 5.46341,15.947 5.74536,15.97 C6.12888,16.0014 6.62221,16.0013 7.33325,16.0013 L12.6663,16.0013 C13.3771,16.0013 13.8707,16.0014 14.2542,15.97 C14.6295,15.9394 14.8413,15.8825 14.9993,15.8021 L15.1262,15.7308 C15.4136,15.5545 15.6481,15.3014 15.802,14.9993 L15.8577,14.8695 C15.9091,14.7257 15.9469,14.536 15.97,14.2542 C16.0013,13.8707 16.0012,13.3772 16.0012,12.6663 L16.0012,12.5003 C16.0012,12.1332 16.2991,11.8355 16.6663,11.8353 C17.0335,11.8353 17.3313006,12.1331 17.3313006,12.5003 L17.3313006,12.6663 C17.3313006,13.3553 17.3319,13.9124 17.2952,14.3626 C17.2624,14.7636 17.1974,15.1247 17.053,15.4613 L16.9866,15.6038 C16.7211,16.1248 16.3172,16.5605 15.8215,16.8646 L15.6038,16.9866 C15.227,17.1786 14.8206,17.2578 14.3625,17.2952 C13.9123,17.332 13.3553,17.3314006 12.6663,17.3314006 L7.33325,17.3314006 C6.64416,17.3314006 6.0872,17.332 5.63696,17.2952 C5.23642,17.2625 4.87552,17.1982 4.53931,17.054 L4.39673,16.9866 C3.87561,16.7211 3.43911,16.3174 3.13501,15.8216 L3.01294,15.6038 C2.82097,15.2271 2.74177,14.8206 2.70435,14.3626 C2.66758,13.9124 2.66820931,13.3553 2.66820931,12.6663 Z M9.33521,3.33339 L9.33521,10.89489 L7.13696,8.69665 C6.87732,8.43701 6.45625,8.43712 6.19653,8.69665 C5.93684,8.95635 5.93684,9.37738 6.19653,9.63708 L9.52954,12.97106 L9.6311,13.05407 C9.73949,13.12627 9.86809,13.1654 10.0002,13.1654 C10.1763,13.1654 10.3454,13.0955 10.47,12.97106 L13.804,9.63708 C14.0633,9.37741 14.0634,8.95625 13.804,8.69665 C13.5443,8.43695 13.1222,8.43695 12.8625,8.69665 L10.6653,10.89392 L10.6653,3.33339 C10.6651,2.96639 10.3673,2.66849 10.0002,2.66829 C9.63308,2.66829 9.33538,2.96629 9.33521,3.33339 Z" fill="currentColor" fill-rule="nonzero"></path>
        </svg>
      </span>
      <span class="font-semibold" data-test-id="save-label">Save</span>
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

    // Find share button (button with aria-label "Create share link")
    const shareButton = document.querySelector('button[aria-label="Create share link"]');

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

  // Extract conversation title from active chat in sidebar
  function getConversationTitle() {
    // Find the active/current chat link with text-primary class
    const activeChat = document.querySelector('a[href^="/c/"].text-primary');

    if (activeChat) {
      const titleSpan = activeChat.querySelector('span.flex-1');
      if (titleSpan) {
        const title = titleSpan.textContent.trim();
        if (title && title.length > 0) {
          console.log('[Grok Extractor] Found title from active chat:', title);
          return title;
        }
      }
    }

    // Fallback: Try to extract from URL
    const urlMatch = window.location.pathname.match(/\/c\/([^\/]+)/);
    if (urlMatch) {
      return `Grok Conversation ${urlMatch[1].substring(0, 8)}`;
    }

    // Ultimate fallback
    console.log('[Grok Extractor] No title found, using default');
    return 'Untitled Grok Conversation';
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

  // Recursively extract markdown from DOM elements
  function extractMarkdownFromElement(node) {
    if (!node) return '';

    // Text node - return text content
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    // Element node - convert to markdown based on tag type
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      // Code blocks (highest priority)
      if (tagName === 'pre') {
        const codeElement = node.querySelector('code');
        if (codeElement) {
          const language = codeElement.className.match(/language-(\w+)/)?.[1] || '';
          const codeContent = codeElement.textContent;
          return language
            ? `\n\`\`\`${language}\n${codeContent}\n\`\`\`\n\n`
            : `\n\`\`\`\n${codeContent}\n\`\`\`\n\n`;
        }
        return `\n\`\`\`\n${node.textContent}\n\`\`\`\n\n`;
      }

      // Inline code
      if (tagName === 'code') {
        return `\`${node.textContent}\``;
      }

      // Headings
      if (tagName.match(/^h[1-6]$/)) {
        const level = tagName.charAt(1);
        const hashes = '#'.repeat(parseInt(level));
        return `\n${hashes} ${getChildrenText(node)}\n\n`;
      }

      // Bold/Strong
      if (tagName === 'strong' || tagName === 'b') {
        return `**${getChildrenText(node)}**`;
      }

      // Italic/Emphasis
      if (tagName === 'em' || tagName === 'i') {
        return `*${getChildrenText(node)}*`;
      }

      // Links
      if (tagName === 'a') {
        const href = node.getAttribute('href') || '';
        const text = getChildrenText(node);
        return `[${text}](${href})`;
      }

      // Lists
      if (tagName === 'ul') {
        let listText = '\n';
        Array.from(node.children).forEach(li => {
          if (li.tagName.toLowerCase() === 'li') {
            listText += `- ${extractMarkdownFromElement(li).trim()}\n`;
          }
        });
        return listText + '\n';
      }

      if (tagName === 'ol') {
        let listText = '\n';
        Array.from(node.children).forEach((li, index) => {
          if (li.tagName.toLowerCase() === 'li') {
            listText += `${index + 1}. ${extractMarkdownFromElement(li).trim()}\n`;
          }
        });
        return listText + '\n';
      }

      // Blockquotes
      if (tagName === 'blockquote') {
        const text = getChildrenText(node);
        return `\n> ${text}\n\n`;
      }

      // Line breaks
      if (tagName === 'br') {
        return '\n';
      }

      // Paragraphs
      if (tagName === 'p') {
        return `${getChildrenMarkdown(node)}\n\n`;
      }

      // Divs - just process children
      if (tagName === 'div') {
        return getChildrenMarkdown(node);
      }

      // Default: process children
      return getChildrenMarkdown(node);
    }

    return '';
  }

  // Helper to get text from all children (for simple formatting)
  function getChildrenText(node) {
    return Array.from(node.childNodes)
      .map(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          return child.textContent;
        }
        return child.textContent || '';
      })
      .join('');
  }

  // Helper to get markdown from all children (for complex formatting)
  function getChildrenMarkdown(node) {
    return Array.from(node.childNodes)
      .map(child => extractMarkdownFromElement(child))
      .join('');
  }

  // Format messages as text
  function formatMessagesAsText(messages) {
    return messages.map(msg => {
      const roleLabel = msg.role === 'user' ? 'User' :
                       msg.role === 'assistant' ? 'Assistant' :
                       msg.role.charAt(0).toUpperCase() + msg.role.slice(1);

      return `${roleLabel}:\n${msg.content}`;
    }).join('\n\n---\n\n');
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
        provider: 'Grok'
      };
    } catch (error) {
      console.error('[Grok Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log('[Grok Extractor] Save button clicked');
    console.log('[Grok Extractor] chrome object exists?', typeof chrome !== 'undefined');
    console.log('[Grok Extractor] chrome.runtime exists?', typeof chrome?.runtime !== 'undefined');

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

      // Send to background script
      chrome.runtime.sendMessage({
        action: 'saveConversationFromPage',
        payload: conversation
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Grok Extractor] Chrome runtime error:', chrome.runtime.lastError);
          showNotification('Failed to save: ' + chrome.runtime.lastError.message, 'error');
          saveButton.disabled = false;
          labelSpan.textContent = originalText;
          return;
        }

        console.log('[Grok Extractor] Response from background:', response);

        if (response && response.success) {
          console.log('[Grok Extractor] Conversation saved successfully');
          showNotification('Conversation saved to insidebar.ai!', 'success');
        } else {
          console.error('[Grok Extractor] Save failed. Response:', response);
          const errorMsg = response?.error || 'Unknown error';
          showNotification('Failed to save: ' + errorMsg, 'error');
        }

        // Re-enable button
        saveButton.disabled = false;
        labelSpan.textContent = originalText;
      });
    } catch (error) {
      console.error('[Grok Extractor] Error during extraction:', error);
      console.error('[Grok Extractor] Error stack:', error.stack);
      showNotification('Failed to extract conversation: ' + error.message, 'error');

      // Re-enable button
      saveButton.disabled = false;
      labelSpan.textContent = originalText;
    }
  }

  // Show notification to user
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `insidebar-notification insidebar-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
      ${type === 'success' ? 'background: #10b981; color: white;' : ''}
      ${type === 'error' ? 'background: #ef4444; color: white;' : ''}
      ${type === 'info' ? 'background: #3b82f6; color: white;' : ''}
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  // Listen for keyboard shortcut (Ctrl+Shift+S or Cmd+Shift+S)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      if (detectConversation() && window.location.href.includes('https://grok.com/c/')) {
        handleSaveClick(e);
      }
    }
  });

  // Listen for URL changes (Grok is a SPA)
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[Grok Extractor] URL changed to:', currentUrl);

      // Remove button if leaving conversation page
      if (!currentUrl.includes('https://grok.com/c/')) {
        const existingButton = document.getElementById('insidebar-save-conversation');
        if (existingButton) {
          existingButton.remove();
          saveButton = null;
        }
      } else {
        // Try to insert button on conversation page
        setTimeout(() => insertSaveButton(), 1000);
      }
    }
  }).observe(document, { subtree: true, childList: true });

})();
