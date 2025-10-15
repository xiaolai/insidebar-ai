// Perplexity Conversation History Extractor
// Extracts current conversation from Perplexity DOM and saves to extension

(function() {
  'use strict';

  console.log('[Perplexity Extractor] Script loaded');

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
        provider: 'Perplexity'
      };
    } catch (error) {
      console.error('[Perplexity Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    e.preventDefault();
    e.stopPropagation();

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

        console.log('[Perplexity Extractor] Response from background:', response);

        if (response && response.success) {
          console.log('[Perplexity Extractor] Conversation saved successfully');
          showNotification('Conversation saved to insidebar.ai!', 'success');
        } else {
          console.error('[Perplexity Extractor] Save failed. Response:', response);
          const errorMsg = response?.error || 'Unknown error';
          showNotification('Failed to save: ' + errorMsg, 'error');
        }

        // Re-enable button
        saveButton.disabled = false;
        labelDiv.textContent = originalText;
      });
    } catch (error) {
      console.error('[Perplexity Extractor] Error during extraction:', error);
      console.error('[Perplexity Extractor] Error stack:', error.stack);
      showNotification('Failed to extract conversation: ' + error.message, 'error');

      // Re-enable button
      saveButton.disabled = false;
      labelDiv.textContent = originalText;
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
      if (detectConversation() && window.location.href.includes('https://www.perplexity.ai/search/')) {
        handleSaveClick(e);
      }
    }
  });

  // Listen for URL changes (Perplexity is a SPA)
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[Perplexity Extractor] URL changed to:', currentUrl);

      // Remove button if leaving search page
      if (!currentUrl.includes('https://www.perplexity.ai/search/')) {
        const existingButton = document.getElementById('insidebar-save-conversation');
        if (existingButton) {
          existingButton.parentElement?.remove(); // Remove wrapper span
          saveButton = null;
        }
      } else {
        // Try to insert button on search page
        setTimeout(() => insertSaveButton(), 1000);
      }
    }
  }).observe(document, { subtree: true, childList: true });

})();
