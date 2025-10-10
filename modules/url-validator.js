/**
 * Validates and sanitizes URLs for security
 */

/**
 * Checks if a URL string is valid and safe to use in iframes
 * @param {string} urlString - The URL to validate
 * @returns {boolean} - True if URL is valid and safe
 */
export function isValidUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return false;
  }

  try {
    const url = new URL(urlString);

    // Only allow http and https protocols (prevent javascript:, data:, file:, etc.)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    // Ensure hostname is present
    if (!url.hostname) {
      return false;
    }

    return true;
  } catch (error) {
    // Invalid URL format
    return false;
  }
}

/**
 * Sanitizes a URL for safe use
 * @param {string} urlString - The URL to sanitize
 * @returns {string|null} - Sanitized URL or null if invalid
 */
export function sanitizeUrl(urlString) {
  if (!isValidUrl(urlString)) {
    return null;
  }

  try {
    const url = new URL(urlString.trim());
    // Reconstruct URL to ensure it's clean
    return url.href;
  } catch {
    return null;
  }
}
