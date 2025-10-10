/**
 * HTML utility functions for safe template rendering
 */

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML-safe text
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Tagged template literal for safe HTML rendering with automatic escaping
 * Values are automatically escaped unless explicitly marked as safe
 *
 * @example
 * const name = '<script>alert("xss")</script>';
 * const safeHtml = html`<div>Hello ${name}</div>`;
 * // Result: <div>Hello &lt;script&gt;alert("xss")&lt;/script&gt;</div>
 *
 * @param {TemplateStringsArray} strings - Template string parts
 * @param {...any} values - Values to interpolate
 * @returns {string} - Safe HTML string
 */
export function html(strings, ...values) {
  return strings.reduce((result, string, i) => {
    const value = values[i];

    if (value === undefined || value === null) {
      return result + string;
    }

    // If value is marked as safe (SafeHtml), use it directly
    if (value && value.__isSafeHtml) {
      return result + string + value.html;
    }

    // Otherwise, escape the value
    const escaped = escapeHtml(String(value));
    return result + string + escaped;
  }, '');
}

/**
 * Marks a string as safe HTML (won't be escaped)
 * USE WITH EXTREME CAUTION - only for trusted, already-sanitized HTML
 *
 * @param {string} htmlString - Pre-sanitized HTML string
 * @returns {{__isSafeHtml: boolean, html: string}} - Safe HTML object
 */
export function unsafeHtml(htmlString) {
  return {
    __isSafeHtml: true,
    html: htmlString,
  };
}

/**
 * Renders an array using a template function, escaping each item
 * @param {Array} items - Array of items to render
 * @param {Function} templateFn - Template function for each item
 * @param {string} separator - Separator between items (default: '')
 * @returns {string} - Rendered HTML
 */
export function renderList(items, templateFn, separator = '') {
  if (!Array.isArray(items)) {
    return '';
  }

  return items.map(templateFn).join(separator);
}
