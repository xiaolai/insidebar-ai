// DeepSeek Conversation History Extractor
// Extracts current conversation from DeepSeek DOM and saves to extension

(function() {
  'use strict';

  console.log('[DeepSeek Extractor] Script loaded');

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
    if (!window.location.href.includes('https://chat.deepseek.com/a/chat/')) {
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
    const button = document.createElement('div');
    button.id = 'insidebar-save-conversation';
    button.className = 'ds-icon-button _57370c5 _5dedc1e';
    button.setAttribute('tabindex', '0');
    button.setAttribute('role', 'button');
    button.setAttribute('aria-disabled', 'false');
    button.setAttribute('aria-label', 'Save conversation');
    button.style.cssText = '--hover-size: 34px; width: 34px; height: 34px;';
    button.title = 'Save this conversation to insidebar.ai';

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
    // Check if button already exists
    if (document.getElementById('insidebar-save-conversation')) {
      console.log('[DeepSeek Extractor] Save button already exists');
      return;
    }

    // Only insert on conversation pages
    if (!window.location.href.includes('https://chat.deepseek.com/a/chat/')) {
      console.log('[DeepSeek Extractor] Not on conversation page');
      return;
    }

    // Find the share/upload button (has upload/share icon SVG)
    // Look for icon button with the upload icon path
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
    console.log('[DeepSeek Extractor] Parent container:', parentContainer?.tagName, parentContainer?.className);

    const shareStyle = window.getComputedStyle(shareButton);
    console.log('[DeepSeek Extractor] Share button position:', shareStyle.position);
    console.log('[DeepSeek Extractor] Share button right:', shareStyle.right);
    console.log('[DeepSeek Extractor] Share button top:', shareStyle.top);

    // Create save button with exact same positioning as share button
    saveButton = createSaveButton();

    // If share button is absolutely positioned, we need to position save button accordingly
    if (shareStyle.position === 'absolute' || shareStyle.position === 'fixed') {
      const shareRect = shareButton.getBoundingClientRect();
      saveButton.style.position = shareStyle.position;
      saveButton.style.top = shareStyle.top;

      // Calculate right position: share button's right + button width + gap
      const rightValue = parseFloat(shareStyle.right) || 0;
      saveButton.style.right = (rightValue + 34 + 8) + 'px'; // 34px button width + 8px gap

      console.log('[DeepSeek Extractor] Positioning save button at right:', saveButton.style.right);
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
    // Look for messages in DeepSeek's structure
    const messages = getMessages();
    return messages && messages.length > 0;
  }

  // Observe DOM for changes
  function observeForChanges() {
    const observer = new MutationObserver(() => {
      // Try to insert button if it doesn't exist
      insertSaveButton();

      // Remove button if conversation no longer exists or not on conversation page
      const existingButton = document.getElementById('insidebar-save-conversation');
      if (existingButton) {
        if (!window.location.href.includes('https://chat.deepseek.com/a/chat/')) {
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

  // Extract conversation title from current chat in sidebar
  function getConversationTitle() {
    // Find the current/active chat link
    const currentChat = document.querySelector('a._546d736.b64fb9ae');

    if (currentChat) {
      const titleDiv = currentChat.querySelector('.c08e6e93');
      if (titleDiv) {
        const title = titleDiv.textContent.trim();
        if (title && title.length > 0) {
          console.log('[DeepSeek Extractor] Found title from current chat:', title);
          return title;
        }
      }
    }

    // Fallback: Try to extract from URL
    const urlMatch = window.location.pathname.match(/\/a\/chat\/s\/([^\/]+)/);
    if (urlMatch) {
      return `DeepSeek Conversation ${urlMatch[1].substring(0, 8)}`;
    }

    // Ultimate fallback
    console.log('[DeepSeek Extractor] No title found, using default');
    return 'Untitled DeepSeek Conversation';
  }

  // Extract all messages from the conversation
  function getMessages() {
    const messages = [];

    // Try multiple approaches to find the chat area
    let mainContent = document.querySelector('main');
    console.log('[DeepSeek Extractor] Found main tag?', !!mainContent);

    if (!mainContent) {
      mainContent = document.querySelector('[role="main"]');
      console.log('[DeepSeek Extractor] Found role=main?', !!mainContent);
    }

    if (!mainContent) {
      // Just use body as fallback
      mainContent = document.body;
      console.log('[DeepSeek Extractor] Using body as fallback');
    }

    // Log the main content structure
    console.log('[DeepSeek Extractor] Main content:', mainContent?.tagName, mainContent?.className);

    // Try multiple selector strategies
    const selectorStrategies = [
      '[data-role="user"], [data-role="assistant"]',
      '[class*="message-"]',
      '[class*="chat-item"]',
      '[class*="turn"]',
      'article',
      // Very broad: any div that looks like it has message content
      'div[class]'
    ];

    let messageContainers = [];

    for (const selector of selectorStrategies) {
      messageContainers = Array.from(mainContent.querySelectorAll(selector));

      if (selector === 'div[class]') {
        // Filter to only divs that look like messages
        messageContainers = messageContainers.filter(div => {
          const text = div.textContent?.trim();
          const hasSubstantialText = text && text.length > 50;
          const hasButtons = div.querySelector('button');
          const hasInput = div.querySelector('input, textarea');
          const isLikelyMessage = hasSubstantialText && !hasInput;
          return isLikelyMessage;
        });
      }

      console.log(`[DeepSeek Extractor] Trying selector "${selector}": found ${messageContainers.length}`);

      if (messageContainers.length > 0) {
        console.log('[DeepSeek Extractor] Sample container:', {
          tag: messageContainers[0]?.tagName,
          classes: messageContainers[0]?.className,
          dataRole: messageContainers[0]?.getAttribute('data-role'),
          textPreview: messageContainers[0]?.textContent?.trim().substring(0, 100)
        });
        break;
      }
    }

    console.log('[DeepSeek Extractor] Final message containers count:', messageContainers.length);

    messageContainers.forEach((container, index) => {
      try {
        const message = extractMessageFromContainer(container, index);
        if (message) {
          messages.push(message);
          console.log(`[DeepSeek Extractor] Message ${index}:`, message.role, message.content.substring(0, 50));
        }
      } catch (error) {
        console.warn('[DeepSeek Extractor] Error extracting message:', error);
      }
    });

    console.log('[DeepSeek Extractor] Total messages extracted:', messages.length);
    return messages;
  }

  // Extract a single message from its container
  function extractMessageFromContainer(container, index) {
    // Determine role based on multiple indicators
    let role = 'unknown';

    // Try data attributes
    const messageRole = container.getAttribute('data-role') || container.getAttribute('data-message-role');
    if (messageRole) {
      role = messageRole;
    }

    // Try class-based detection
    if (role === 'unknown') {
      const className = container.className || '';
      if (className.includes('user')) {
        role = 'user';
      } else if (className.includes('assistant') || className.includes('deepseek')) {
        role = 'assistant';
      }
    }

    // Try to detect from content structure
    if (role === 'unknown') {
      const hasUserIndicator = container.querySelector('[data-role="user"], [class*="user-message"]');
      const hasAssistantIndicator = container.querySelector('[data-role="assistant"], [class*="assistant-message"]');

      if (hasUserIndicator) {
        role = 'user';
      } else if (hasAssistantIndicator) {
        role = 'assistant';
      }
    }

    // Try to detect based on position (alternating pattern)
    if (role === 'unknown') {
      const allMessages = Array.from(container.parentElement?.children || []);
      const index = allMessages.indexOf(container);
      role = index % 2 === 0 ? 'user' : 'assistant';
    }

    // Get message content
    const contentElement = container.querySelector('[data-message-content], .markdown, [class*="message-content"], [class*="prose"]') || container;

    if (!contentElement) return null;

    // Extract markdown from the content
    const content = extractMarkdownFromElement(contentElement);

    if (!content.trim()) return null;

    console.log('[DeepSeek Extractor] Extracted message:', { role, contentLength: content.length });

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
        provider: 'DeepSeek'
      };
    } catch (error) {
      console.error('[DeepSeek Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log('[DeepSeek Extractor] Save button clicked');
    console.log('[DeepSeek Extractor] chrome object exists?', typeof chrome !== 'undefined');
    console.log('[DeepSeek Extractor] chrome.runtime exists?', typeof chrome?.runtime !== 'undefined');

    if (!saveButton) return;

    // Check if chrome API is available
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
      console.log('[DeepSeek Extractor] Extracted conversation:', {
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
          console.error('[DeepSeek Extractor] Chrome runtime error:', chrome.runtime.lastError);
          showNotification('Failed to save: ' + chrome.runtime.lastError.message, 'error');
          saveButton.setAttribute('aria-disabled', 'false');
          saveButton.style.opacity = '1';
          saveButton.style.cursor = 'pointer';
          return;
        }

        console.log('[DeepSeek Extractor] Response from background:', response);

        if (response && response.success) {
          console.log('[DeepSeek Extractor] Conversation saved successfully');
          showNotification('Conversation saved to insidebar.ai!', 'success');
        } else {
          console.error('[DeepSeek Extractor] Save failed. Response:', response);
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
      console.error('[DeepSeek Extractor] Error stack:', error.stack);
      showNotification('Failed to extract conversation: ' + error.message, 'error');

      // Re-enable button
      saveButton.setAttribute('aria-disabled', 'false');
      saveButton.style.opacity = '1';
      saveButton.style.cursor = 'pointer';
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
      if (detectConversation() && window.location.href.includes('https://chat.deepseek.com/a/chat/')) {
        handleSaveClick(e);
      }
    }
  });

  // Listen for URL changes (DeepSeek is a SPA)
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[DeepSeek Extractor] URL changed to:', currentUrl);

      // Remove button if leaving conversation page
      if (!currentUrl.includes('https://chat.deepseek.com/a/chat/')) {
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
