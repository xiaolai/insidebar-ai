// Claude Conversation History Extractor
// Extracts current conversation from Claude.ai DOM and saves to extension

(function() {
  'use strict';

  console.log('[Claude Extractor] Script loaded');

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
    button.style.marginRight = '8px';
    button.addEventListener('click', handleSaveClick);

    return button;
  }

  // Insert save button before share button
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

    // Create and insert save button before share button
    saveButton = createSaveButton();
    shareButton.parentElement.insertBefore(saveButton, shareButton);

    console.log('[Claude Extractor] Save button inserted before share button');
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
        provider: 'Claude'
      };
    } catch (error) {
      console.error('[Claude Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log('[Claude Extractor] Save button clicked');
    console.log('[Claude Extractor] chrome object exists?', typeof chrome !== 'undefined');
    console.log('[Claude Extractor] chrome.runtime exists?', typeof chrome?.runtime !== 'undefined');

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

        console.log('[Claude Extractor] Response from background:', response);

        if (response && response.success) {
          console.log('[Claude Extractor] Conversation saved successfully');
          showNotification('Conversation saved to insidebar.ai!', 'success');
        } else {
          console.error('[Claude Extractor] Save failed. Response:', response);
          const errorMsg = response?.error || 'Unknown error';
          showNotification('Failed to save: ' + errorMsg, 'error');
        }

        // Re-enable button
        saveButton.disabled = false;
        saveButton.textContent = originalText;
      });
    } catch (error) {
      console.error('[Claude Extractor] Error during extraction:', error);
      console.error('[Claude Extractor] Error stack:', error.stack);
      showNotification('Failed to extract conversation: ' + error.message, 'error');

      // Re-enable button
      saveButton.disabled = false;
      saveButton.textContent = originalText;
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
      if (detectConversation()) {
        handleSaveClick(e);
      }
    }
  });

})();
