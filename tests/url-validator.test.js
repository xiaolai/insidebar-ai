import { describe, it, expect } from 'vitest';
import { isValidUrl, validateOllamaUrl, sanitizeUrl } from '../modules/url-validator.js';

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

  describe('validateOllamaUrl', () => {
    it('should accept localhost URLs', () => {
      const result = validateOllamaUrl('http://localhost:3000');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept 127.0.0.1 URLs', () => {
      const result = validateOllamaUrl('http://127.0.0.1:11434');
      expect(result.valid).toBe(true);
    });

    it('should accept private IP ranges', () => {
      // 10.x.x.x
      expect(validateOllamaUrl('http://10.0.0.1').valid).toBe(true);
      expect(validateOllamaUrl('http://10.255.255.255').valid).toBe(true);

      // 172.16-31.x.x
      expect(validateOllamaUrl('http://172.16.0.1').valid).toBe(true);
      expect(validateOllamaUrl('http://172.31.255.255').valid).toBe(true);

      // 192.168.x.x
      expect(validateOllamaUrl('http://192.168.1.1').valid).toBe(true);
      expect(validateOllamaUrl('http://192.168.255.255').valid).toBe(true);
    });

    it('should reject public IP addresses', () => {
      const result = validateOllamaUrl('http://8.8.8.8');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('private network');
    });

    it('should accept custom domain names', () => {
      const result = validateOllamaUrl('http://ollama.local');
      expect(result.valid).toBe(true);
    });

    it('should reject javascript: URLs', () => {
      const result = validateOllamaUrl('javascript:alert(1)');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('http');
    });

    it('should reject data: URLs', () => {
      const result = validateOllamaUrl('data:text/html,test');
      expect(result.valid).toBe(false);
    });

    it('should reject empty URLs', () => {
      const result = validateOllamaUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject null/undefined', () => {
      expect(validateOllamaUrl(null).valid).toBe(false);
      expect(validateOllamaUrl(undefined).valid).toBe(false);
    });

    it('should reject invalid IP addresses', () => {
      const result = validateOllamaUrl('http://256.256.256.256');
      expect(result.valid).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = validateOllamaUrl('  http://localhost:3000  ');
      expect(result.valid).toBe(true);
    });

    it('should accept HTTPS URLs', () => {
      const result = validateOllamaUrl('https://localhost:3000');
      expect(result.valid).toBe(true);
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
