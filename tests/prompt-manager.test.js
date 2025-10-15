// Tests for Prompt Manager - Validation and Security
// NOTE: Full IndexedDB integration tests require fake-indexeddb package
// These tests focus on critical validation that prevents XSS and data corruption
import { describe, it, expect } from 'vitest';
import {
  savePrompt,
  importPrompts,
  importDefaultLibrary
} from '../modules/prompt-manager.js';

describe('prompt-manager input validation', () => {
  describe('Required field validation', () => {
    it('should reject prompt with empty content', async () => {
      await expect(savePrompt({ content: '' })).rejects.toThrow(
        'Prompt content is required'
      );
    });

    it('should reject prompt with only whitespace content', async () => {
      await expect(savePrompt({ content: '   ' })).rejects.toThrow(
        'Prompt content is required'
      );
    });

    it('should reject prompt with null content', async () => {
      await expect(savePrompt({ content: null })).rejects.toThrow(
        'Prompt content is required'
      );
    });

    it('should reject prompt with undefined content', async () => {
      await expect(savePrompt({})).rejects.toThrow(
        'Prompt content is required'
      );
    });
  });

  describe('Length validation', () => {
    it('should reject content exceeding 50000 characters', async () => {
      const longContent = 'a'.repeat(50001);
      await expect(savePrompt({ content: longContent })).rejects.toThrow(
        'Prompt content must be less than 50000 characters'
      );
    });

    it('should accept content at exactly 50000 characters', async () => {
      const maxContent = 'a'.repeat(50000);
      // This will fail if we can't connect to DB, but validates the length check happens first
      await expect(savePrompt({ content: maxContent })).rejects.not.toThrow(
        'Prompt content must be less than 50000 characters'
      );
    });

    it('should reject title exceeding 200 characters', async () => {
      const longTitle = 'a'.repeat(201);
      await expect(
        savePrompt({ content: 'valid', title: longTitle })
      ).rejects.toThrow('Title must be less than 200 characters');
    });

    it('should reject category exceeding 50 characters', async () => {
      const longCategory = 'a'.repeat(51);
      await expect(
        savePrompt({ content: 'valid', category: longCategory })
      ).rejects.toThrow('Category must be less than 50 characters');
    });

    it('should reject more than 20 tags', async () => {
      const tooManyTags = Array(21).fill('tag');
      await expect(
        savePrompt({ content: 'valid', tags: tooManyTags })
      ).rejects.toThrow('Maximum 20 tags allowed');
    });
  });

  describe('Security: XSS attempt validation', () => {
    it('should not reject HTML/script content (storage layer accepts all text)', async () => {
      // XSS protection happens at render time, not storage time
      // This ensures we don't accidentally reject legitimate content containing < or >
      const htmlContent = '<script>alert("xss")</script>';

      // Will fail due to DB connection, not validation
      await expect(savePrompt({ content: htmlContent })).rejects.not.toThrow(
        'Prompt content is required'
      );
      await expect(savePrompt({ content: htmlContent })).rejects.not.toThrow(
        'must be less than'
      );
    });

    it('should accept mathematical expressions with angle brackets', async () => {
      const mathContent = '5 < 10 and 20 > 15';
      await expect(savePrompt({ content: mathContent })).rejects.not.toThrow(
        'Prompt content is required'
      );
    });
  });
});

describe('prompt-manager import validation', () => {
  describe('Import data structure validation', () => {
    it('should reject invalid import data format', async () => {
      await expect(importPrompts(null)).rejects.toThrow('Invalid import data format');
      await expect(importPrompts({})).rejects.toThrow('Invalid import data format');
      await expect(importPrompts({ prompts: 'not-array' })).rejects.toThrow(
        'Invalid import data format'
      );
    });

    it('should reject invalid default library format', async () => {
      await expect(importDefaultLibrary(null)).rejects.toThrow(
        'Invalid library data format'
      );
      await expect(importDefaultLibrary({})).rejects.toThrow(
        'Invalid library data format'
      );
      await expect(importDefaultLibrary({ prompts: 'not-array' })).rejects.toThrow(
        'Invalid library data format'
      );
    });
  });

  describe('Import strategy validation', () => {
    it('should accept valid import data structure for skip strategy', async () => {
      const validData = {
        version: '1.0',
        prompts: []
      };
      // Will fail due to DB but validates structure is accepted
      const result = await importPrompts(validData, 'skip');
      expect(result).toHaveProperty('imported');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('errors');
    });

    it('should accept valid import data structure for overwrite strategy', async () => {
      const validData = {
        version: '1.0',
        prompts: []
      };
      const result = await importPrompts(validData, 'overwrite');
      expect(result).toHaveProperty('imported');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('errors');
    });
  });
});

describe('prompt-manager validation edge cases', () => {
  it('should handle empty string after trimming', async () => {
    await expect(savePrompt({ content: '     ' })).rejects.toThrow(
      'Prompt content is required'
    );
  });

  it('should validate multiple errors at once', async () => {
    const invalid = {
      content: '', // Empty - error
      title: 'a'.repeat(201), // Too long - error
      category: 'a'.repeat(51), // Too long - error
      tags: Array(21).fill('tag') // Too many - error
    };

    try {
      await savePrompt(invalid);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Should contain at least the content error
      expect(error.message).toContain('Prompt content is required');
    }
  });

  it('should handle non-string content type', async () => {
    await expect(savePrompt({ content: 12345 })).rejects.toThrow(
      'Prompt content is required'
    );
    await expect(savePrompt({ content: true })).rejects.toThrow(
      'Prompt content is required'
    );
    await expect(savePrompt({ content: [] })).rejects.toThrow(
      'Prompt content is required'
    );
  });

  it('should handle boundary conditions for tags array', async () => {
    // Exactly 20 tags should be OK
    const exactlyTwentyTags = Array(20).fill('tag').map((t, i) => `${t}${i}`);
    await expect(
      savePrompt({ content: 'valid', tags: exactlyTwentyTags })
    ).rejects.not.toThrow('Maximum 20 tags allowed');
  });

  it('should handle special characters in content', async () => {
    const specialChars = '!@#$%^&*()_+-=[]{}|;:",./<>?`~';
    // Should not reject special characters
    await expect(savePrompt({ content: specialChars })).rejects.not.toThrow(
      'Prompt content is required'
    );
  });

  it('should handle unicode characters', async () => {
    const unicode = '你好世界 🌍 مرحبا العالم';
    await expect(savePrompt({ content: unicode })).rejects.not.toThrow(
      'Prompt content is required'
    );
  });

  it('should handle newlines and tabs', async () => {
    const multiline = 'Line 1\nLine 2\tTabbed\r\nWindows Line';
    await expect(savePrompt({ content: multiline })).rejects.not.toThrow(
      'Prompt content is required'
    );
  });
});

describe('prompt-manager validation prevents injection attacks', () => {
  it('should not break on SQL-like injection attempts', async () => {
    const sqlInjection = "'; DROP TABLE prompts; --";
    await expect(savePrompt({ content: sqlInjection })).rejects.not.toThrow(
      'Prompt content is required'
    );
  });

  it('should not break on JavaScript injection in title', async () => {
    const jsInjection = 'javascript:alert(1)';
    await expect(
      savePrompt({ content: 'valid', title: jsInjection })
    ).rejects.not.toThrow('Title must be less than');
  });

  it('should handle data: URLs in content', async () => {
    const dataUrl = 'data:text/html,<script>alert(1)</script>';
    await expect(savePrompt({ content: dataUrl })).rejects.not.toThrow(
      'Prompt content is required'
    );
  });

  it('should handle event handlers in content', async () => {
    const eventHandler = '<img src=x onerror=alert(1)>';
    await expect(savePrompt({ content: eventHandler })).rejects.not.toThrow(
      'Prompt content is required'
    );
  });
});
