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
 * Validates Ollama URL specifically
 * @param {string} urlString - The Ollama URL to validate
 * @returns {{ valid: boolean, error?: string }} - Validation result
 */
export function validateOllamaUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = urlString.trim();

  if (!trimmed) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  if (!isValidUrl(trimmed)) {
    return { valid: false, error: 'Invalid URL format. Must be http:// or https://' };
  }

  try {
    const url = new URL(trimmed);

    // Ollama typically runs on localhost or local network
    // Allow localhost, 127.0.0.1, and private IP ranges
    const hostname = url.hostname.toLowerCase();

    // Allow localhost and 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return { valid: true };
    }

    // Allow private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipRegex);

    if (match) {
      const [, a, b, c, d] = match.map(Number);

      // Validate IP address range
      if (a > 255 || b > 255 || c > 255 || d > 255) {
        return { valid: false, error: 'Invalid IP address' };
      }

      // Check for private IP ranges
      const isPrivate =
        a === 10 || // 10.0.0.0/8
        (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
        (a === 192 && b === 168); // 192.168.0.0/16

      if (isPrivate) {
        return { valid: true };
      }

      return { valid: false, error: 'Ollama should run on localhost or private network' };
    }

    // Allow any other hostnames (for custom domains)
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
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
