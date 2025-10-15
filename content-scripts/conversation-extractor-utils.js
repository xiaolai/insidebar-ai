// Shared Utilities for Conversation Extractors
// Common functions used across all AI provider history extractors
// This module eliminates duplication across ChatGPT, Claude, Gemini, Grok, DeepSeek, and Perplexity extractors
//
// NOTE: This file must be loaded BEFORE any *-history-extractor.js files in manifest.json
// It exports functions to window.ConversationExtractorUtils

(function() {
  'use strict';

  // Create global namespace for shared utilities
  window.ConversationExtractorUtils = window.ConversationExtractorUtils || {};

  // ============================================================================
  // Markdown Extraction Functions
  // ============================================================================

  /**
   * Recursively extract markdown from DOM elements
   * Preserves formatting like code blocks, headings, lists, bold, italic, etc.
   * @param {Node} node - DOM node to extract from
   * @returns {string} Markdown-formatted text
   */
  window.ConversationExtractorUtils.extractMarkdownFromElement = function extractMarkdownFromElement(node) {
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
  };

  /**
   * Helper to get plain text from all children (for simple formatting like headings, bold)
   * @param {Node} node - DOM node
   * @returns {string} Plain text
   */
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

  /**
   * Helper to get markdown from all children (for complex formatting)
   * @param {Node} node - DOM node
   * @returns {string} Markdown-formatted text
   */
  function getChildrenMarkdown(node) {
    return Array.from(node.childNodes)
      .map(child => window.ConversationExtractorUtils.extractMarkdownFromElement(child))
      .join('');
  }

  // ============================================================================
  // Message Formatting Functions
  // ============================================================================

  /**
   * Format messages array as text with role labels
   * @param {Array} messages - Array of {role, content} objects
   * @returns {string} Formatted text
   */
  window.ConversationExtractorUtils.formatMessagesAsText = function(messages) {
    return messages.map(msg => {
      const roleLabel = msg.role === 'user' ? 'User' :
                       msg.role === 'assistant' ? 'Assistant' :
                       msg.role.charAt(0).toUpperCase() + msg.role.slice(1);

      return `${roleLabel}:\n${msg.content}`;
    }).join('\n\n---\n\n');
  };

  // ============================================================================
  // Conversation ID and Duplication Functions
  // ============================================================================

  /**
   * Generate a unique conversation ID from URL or title hash
   * @param {string} url - Conversation URL (if available)
   * @param {string} title - Conversation title
   * @returns {string} Unique conversation ID
   */
  window.ConversationExtractorUtils.generateConversationId = function(url, title) {
  // Prefer URL-based ID for uniqueness
  if (url) {
    // Extract conversation ID from URL if present
    // ChatGPT: https://chatgpt.com/c/abc123
    // Claude: https://claude.ai/chat/abc-123
    const urlMatch = url.match(/\/(c|chat)\/([a-zA-Z0-9-]+)/);
    if (urlMatch) {
      return urlMatch[2];
    }
    // Use full URL as fallback
    return url;
  }

  // Fallback: Create hash from title + timestamp (less ideal for deduplication)
  // This won't catch duplicates effectively, but better than nothing
  return `${title}_${Date.now()}`;
  };

  /**
   * Check if a conversation already exists with this ID
   * @param {string} conversationId - The conversation ID to check
   * @returns {Promise<Object>} {isDuplicate: boolean, existingConversation: Object|null}
   */
  window.ConversationExtractorUtils.checkForDuplicate = async function(conversationId) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkDuplicateConversation',
      payload: { conversationId }
    });

    return response;
  } catch (error) {
    console.error('[Extractor Utils] Error checking for duplicate:', error);
    // If check fails, assume not duplicate to allow saving
    return { isDuplicate: false, existingConversation: null };
  }
  };

  /**
   * Show duplicate warning modal and get user choice
   * @param {string} title - Conversation title
   * @param {Object} existingConversation - The existing conversation data
   * @returns {Promise<string>} User choice: 'skip', 'overwrite', or 'save-new'
   */
  window.ConversationExtractorUtils.showDuplicateWarning = function(title, existingConversation) {
  return new Promise((resolve) => {
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'insidebar-duplicate-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const existingDate = existingConversation?.timestamp
      ? new Date(existingConversation.timestamp).toLocaleString()
      : 'Unknown date';

    modal.innerHTML = `
      <div style="
        background: white;
        color: #333;
        border-radius: 12px;
        padding: 24px;
        max-width: 480px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      ">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
          Duplicate Conversation Detected
        </h3>
        <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5;">
          A conversation with this title already exists:
        </p>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #666; font-weight: 500;">
          "${title}"<br>
          <span style="font-size: 12px;">Saved: ${existingDate}</span>
        </p>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5;">
          What would you like to do?
        </p>
        <div style="display: flex; gap: 8px; flex-direction: column;">
          <button id="insidebar-dup-skip" style="
            padding: 10px 16px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: white;
            color: #333;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
          ">
            Skip (Don't Save)
          </button>
          <button id="insidebar-dup-overwrite" style="
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            background: #f59e0b;
            color: white;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
          ">
            Overwrite Existing
          </button>
          <button id="insidebar-dup-save-new" style="
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            background: #10b981;
            color: white;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
          ">
            Save as New Anyway
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    const cleanup = (choice) => {
      modal.remove();
      resolve(choice);
    };

    document.getElementById('insidebar-dup-skip').addEventListener('click', () => cleanup('skip'));
    document.getElementById('insidebar-dup-overwrite').addEventListener('click', () => cleanup('overwrite'));
    document.getElementById('insidebar-dup-save-new').addEventListener('click', () => cleanup('save-new'));

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cleanup('skip');
      }
    });
  });
  };

  // ============================================================================
  // Notification Functions
  // ============================================================================

  /**
   * Show notification to user on the provider page
   * NOTE: Success notifications are now shown in sidebar instead
   * This is primarily for error notifications
   * @param {string} message - Message to display
   * @param {string} type - 'info', 'success', or 'error'
   */
  window.ConversationExtractorUtils.showNotification = function(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `insidebar-notification insidebar-notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    max-width: 400px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 10);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
  };

  // ============================================================================
  // Keyboard Shortcut Function
  // ============================================================================

  /**
   * Setup keyboard shortcut for saving conversation
   * @param {Function} callback - Function to call when shortcut is pressed
   * @param {Function} shouldEnable - Optional function to check if shortcut should be enabled
   */
  window.ConversationExtractorUtils.setupKeyboardShortcut = function(callback, shouldEnable = null) {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault();

      // Check if shortcut should be enabled
      if (shouldEnable && !shouldEnable()) {
        return;
      }

      callback(e);
    }
  });
  };

  // ============================================================================
  // URL Change Observer (for SPAs)
  // ============================================================================

  /**
   * Observe URL changes for single-page applications
   * @param {Function} callback - Function to call when URL changes
   * @param {RegExp|string} urlPattern - Optional pattern to filter URLs
   */
  window.ConversationExtractorUtils.observeUrlChanges = function(callback, urlPattern = null) {
  let lastUrl = window.location.href;

  // Check URL periodically (SPAs often don't fire popstate)
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;

      // Check pattern if provided
      if (urlPattern) {
        if (typeof urlPattern === 'string') {
          if (currentUrl.includes(urlPattern)) {
            callback(currentUrl);
          }
        } else if (urlPattern instanceof RegExp) {
          if (urlPattern.test(currentUrl)) {
            callback(currentUrl);
          }
        }
      } else {
        callback(currentUrl);
      }
    }
  }, 1000);

  // Also listen for popstate (back/forward navigation)
  window.addEventListener('popstate', () => {
    callback(window.location.href);
  });
  };

})();
