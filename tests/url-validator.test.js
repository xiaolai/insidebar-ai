import { describe, it, expect } from 'vitest';
import { isValidUrl, sanitizeUrl } from '../modules/url-validator.js';

describe('url-validator module', () => {
  describe('isValidUrl', () => {
    it('should accept valid HTTP URLs', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('http://127.0.0.1:8080')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should accept valid HTTPS URLs', () => {
      expect(isValidUrl('https://localhost:3000')).toBe(true);
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('should reject javascript: URLs', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject data: URLs', () => {
      expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should reject file: URLs', () => {
      expect(isValidUrl('file:///etc/passwd')).toBe(false);
    });

    it('should reject invalid URL formats', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
      expect(isValidUrl(undefined)).toBe(false);
    });

    it('should reject URLs without hostname', () => {
      expect(isValidUrl('http://')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('should return cleaned URL for valid inputs', () => {
      expect(sanitizeUrl('http://localhost:3000')).toBe('http://localhost:3000/');
      expect(sanitizeUrl('  http://example.com  ')).toBe('http://example.com/');
    });

    it('should return null for invalid URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe(null);
      expect(sanitizeUrl('not-a-url')).toBe(null);
      expect(sanitizeUrl('')).toBe(null);
    });

    it('should normalize URLs', () => {
      const result = sanitizeUrl('http://example.com:80');
      expect(result).toBeTruthy();
      expect(result.startsWith('http://')).toBe(true);
    });
  });
});
