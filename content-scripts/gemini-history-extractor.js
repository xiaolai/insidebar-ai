// Gemini Conversation History Extractor
// Extracts current conversation from Gemini DOM and saves to extension

(function() {
  'use strict';

  console.log('[Gemini Extractor] Script loaded');

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
    const button = document.createElement('button');
    button.id = 'insidebar-save-conversation';
    button.className = 'mdc-button mat-mdc-button-base gds-referral-button mdc-button--unelevated mat-mdc-unelevated-button mat-unthemed';
    button.setAttribute('mat-flat-button', '');
    button.setAttribute('data-test-id', 'insidebar-save-button');
    button.type = 'button';
    button.title = 'Save this conversation to insidebar.ai';

    // Create button structure matching Gemini's referral button
    button.innerHTML = `
      <span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span>
      <span class="mdc-button__label">
        <span data-test-id="save-label" class="gds-label-m">Save</span>
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
    // Try to get title from selected conversation in sidebar
    const selectedConversation = document.querySelector('[data-test-id="conversation"].selected');
    if (selectedConversation) {
      const titleDiv = selectedConversation.querySelector('.conversation-title');
      if (titleDiv) {
        const title = titleDiv.textContent.trim();
        if (title && title.length > 0) {
          console.log('[Gemini Extractor] Found title from selected conversation:', title);
          return title;
        }
      }
    }

    // Fallback: Try to extract from URL
    const urlMatch = window.location.pathname.match(/\/app\/([^\/]+)/);
    if (urlMatch) {
      return `Gemini Conversation ${urlMatch[1].substring(0, 8)}`;
    }

    // Ultimate fallback
    console.log('[Gemini Extractor] No title found, using default');
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
        provider: 'Gemini'
      };
    } catch (error) {
      console.error('[Gemini Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  // Handle save button click
  async function handleSaveClick(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log('[Gemini Extractor] Save button clicked');
    console.log('[Gemini Extractor] chrome object exists?', typeof chrome !== 'undefined');
    console.log('[Gemini Extractor] chrome.runtime exists?', typeof chrome?.runtime !== 'undefined');

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

      // Send to background script
      chrome.runtime.sendMessage({
        action: 'saveConversationFromPage',
        payload: conversation
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Gemini Extractor] Chrome runtime error:', chrome.runtime.lastError);
          showNotification('Failed to save: ' + chrome.runtime.lastError.message, 'error');
          saveButton.disabled = false;
          labelSpan.textContent = originalText;
          return;
        }

        console.log('[Gemini Extractor] Response from background:', response);

        if (response && response.success) {
          console.log('[Gemini Extractor] Conversation saved successfully');
          showNotification('Conversation saved to insidebar.ai!', 'success');
        } else {
          console.error('[Gemini Extractor] Save failed. Response:', response);
          const errorMsg = response?.error || 'Unknown error';
          showNotification('Failed to save: ' + errorMsg, 'error');
        }

        // Re-enable button
        saveButton.disabled = false;
        labelSpan.textContent = originalText;
      });
    } catch (error) {
      console.error('[Gemini Extractor] Error during extraction:', error);
      console.error('[Gemini Extractor] Error stack:', error.stack);
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
      if (detectConversation() && window.location.href.includes('https://gemini.google.com/app/')) {
        handleSaveClick(e);
      }
    }
  });

  // Listen for URL changes (Gemini is a SPA)
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[Gemini Extractor] URL changed to:', currentUrl);

      // Remove button container if leaving conversation page
      if (!currentUrl.includes('https://gemini.google.com/app/')) {
        const existingContainer = document.querySelector('[data-test-id="insidebar-save-container"]');
        if (existingContainer) {
          existingContainer.remove();
          saveButton = null;
        }
      } else {
        // Try to insert button on conversation page
        setTimeout(() => insertSaveButton(), 1000);
      }
    }
  }).observe(document, { subtree: true, childList: true });

})();
