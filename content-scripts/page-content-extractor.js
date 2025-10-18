// Page Content Extractor
// Extracts clean page content using Mozilla Readability.js
// Used when context menu is invoked without text selection
//
// This content script runs on all pages and listens for extraction requests
// from the service worker (context menu handler)

(function() {
  'use strict';

  /**
   * Extract page content using Readability.js
   * @returns {Object} {title, content, url}
   */
  function extractPageContent() {
    const url = window.location.href;

    // Check if Readability is available
    if (typeof Readability === 'undefined') {
      console.warn('[Page Extractor] Readability.js not loaded, using fallback');
      return fallbackExtraction(url);
    }

    try {
      // Clone document for Readability (it modifies the DOM)
      const documentClone = document.cloneNode(true);

      // Create Readability instance
      const reader = new Readability(documentClone, {
        charThreshold: 500,
        classesToPreserve: []
      });

      // Parse article
      const article = reader.parse();

      if (!article) {
        console.warn('[Page Extractor] Readability failed to parse, using fallback');
        return fallbackExtraction(url);
      }

      // Convert HTML content to markdown-like format
      const markdownContent = htmlToMarkdown(article.content);

      return {
        title: article.title || document.title || 'Untitled Page',
        content: markdownContent,
        url: url
      };
    } catch (error) {
      console.error('[Page Extractor] Error using Readability:', error);
      return fallbackExtraction(url);
    }
  }

  /**
   * Fallback extraction method when Readability fails
   * @param {string} url - Page URL
   * @returns {Object} {title, content, url}
   */
  function fallbackExtraction(url) {
    // Get main content area (try common selectors)
    const selectors = [
      'main',
      'article',
      '[role="main"]',
      '.main-content',
      '.content',
      '#content',
      'body'
    ];

    let contentElement = null;
    for (const selector of selectors) {
      contentElement = document.querySelector(selector);
      if (contentElement) break;
    }

    const textContent = contentElement
      ? contentElement.innerText
      : document.body.innerText;

    return {
      title: document.title || 'Untitled Page',
      content: textContent.trim(),
      url: url
    };
  }

  /**
   * Convert HTML to markdown-like format
   * Basic conversion for common elements
   * @param {string} html - HTML content
   * @returns {string} Markdown-formatted text
   */
  function htmlToMarkdown(html) {
    // Create temporary element
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Process element recursively
    return processNode(temp).trim();
  }

  /**
   * Process DOM node recursively to extract markdown
   * @param {Node} node - DOM node
   * @returns {string} Markdown text
   */
  function processNode(node) {
    if (!node) return '';

    // Text node
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    // Element node
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      // Code blocks
      if (tagName === 'pre') {
        const code = node.querySelector('code');
        if (code) {
          const lang = code.className.match(/language-(\w+)/)?.[1] || '';
          return `\n\`\`\`${lang}\n${code.textContent}\n\`\`\`\n\n`;
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
        return `\n${hashes} ${getTextContent(node)}\n\n`;
      }

      // Bold
      if (tagName === 'strong' || tagName === 'b') {
        return `**${getTextContent(node)}**`;
      }

      // Italic
      if (tagName === 'em' || tagName === 'i') {
        return `*${getTextContent(node)}*`;
      }

      // Links
      if (tagName === 'a') {
        const href = node.getAttribute('href') || '';
        const text = getTextContent(node);
        return `[${text}](${href})`;
      }

      // Lists
      if (tagName === 'ul') {
        let list = '\n';
        Array.from(node.children).forEach(li => {
          if (li.tagName.toLowerCase() === 'li') {
            list += `- ${processNode(li).trim()}\n`;
          }
        });
        return list + '\n';
      }

      if (tagName === 'ol') {
        let list = '\n';
        Array.from(node.children).forEach((li, index) => {
          if (li.tagName.toLowerCase() === 'li') {
            list += `${index + 1}. ${processNode(li).trim()}\n`;
          }
        });
        return list + '\n';
      }

      // Blockquotes
      if (tagName === 'blockquote') {
        return `\n> ${getTextContent(node)}\n\n`;
      }

      // Line breaks
      if (tagName === 'br') {
        return '\n';
      }

      // Paragraphs
      if (tagName === 'p') {
        return `${processChildren(node)}\n\n`;
      }

      // Divs - just process children
      if (tagName === 'div') {
        return processChildren(node);
      }

      // Default: process children
      return processChildren(node);
    }

    return '';
  }

  /**
   * Get plain text content from node
   * @param {Node} node
   * @returns {string}
   */
  function getTextContent(node) {
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
   * Process all children of a node
   * @param {Node} node
   * @returns {string}
   */
  function processChildren(node) {
    return Array.from(node.childNodes)
      .map(child => processNode(child))
      .join('');
  }

  /**
   * Format extracted content with title and source based on user preference
   * @param {Object} extracted - {title, content, url}
   * @param {string} placement - 'beginning', 'end', or 'none'
   * @returns {string} Formatted content
   */
  function formatContent(extracted, placement = 'end') {
    const titleLine = `[${extracted.title}]`;
    const sourceLine = `Source: ${extracted.url}`;

    if (placement === 'none') {
      // No URL - just title and content
      return `${titleLine}\n\n${extracted.content}`;
    } else if (placement === 'beginning') {
      // URL at beginning (after title)
      return `${titleLine}\n${sourceLine}\n\n${extracted.content}`;
    } else {
      // Default: URL at end
      return `${titleLine}\n\n${extracted.content}\n\nSource: ${extracted.url}`;
    }
  }

  // Listen for extraction requests from service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractPageContent') {
      try {
        const extracted = extractPageContent();

        // Get user's source URL placement preference
        chrome.storage.sync.get({ sourceUrlPlacement: 'end' }, (settings) => {
          const formatted = formatContent(extracted, settings.sourceUrlPlacement);

          sendResponse({
            success: true,
            content: formatted,
            title: extracted.title,
            url: extracted.url
          });
        });
      } catch (error) {
        console.error('[Page Extractor] Error extracting content:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }

      return true; // Keep channel open for async response
    }
  });

})();
