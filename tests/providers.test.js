import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PROVIDERS,
  getProviderById,
  getProviderByIdWithSettings,
  getEnabledProviders,
} from '../modules/providers.js';

describe('providers module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PROVIDERS constant', () => {
    it('should contain all expected providers', () => {
      expect(PROVIDERS).toHaveLength(6);
      const providerIds = PROVIDERS.map((p) => p.id);
      expect(providerIds).toEqual([
        'chatgpt',
        'claude',
        'gemini',
        'google',
        'grok',
        'deepseek',
      ]);
    });

    it('should have required properties for each provider', () => {
      PROVIDERS.forEach((provider) => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('url');
        expect(provider).toHaveProperty('icon');
        expect(provider).toHaveProperty('iconDark');
        expect(provider).toHaveProperty('enabled');
      });
    });
  });

  describe('getProviderById', () => {
    it('should return provider by id', () => {
      const provider = getProviderById('chatgpt');

      expect(provider).toBeDefined();
      expect(provider.id).toBe('chatgpt');
      expect(provider.name).toBe('ChatGPT');
    });

    it('should return undefined for non-existent provider', () => {
      const provider = getProviderById('nonexistent');

      expect(provider).toBeUndefined();
    });
  });

  describe('getProviderByIdWithSettings', () => {
    it('should return provider with default URL', async () => {
      chrome.storage.sync.get.mockResolvedValue({});

      const provider = await getProviderByIdWithSettings('chatgpt');

      expect(provider).toBeDefined();
      expect(provider.url).toBe('https://chatgpt.com');
    });

    it('should return null for non-existent provider', async () => {
      const provider = await getProviderByIdWithSettings('nonexistent');

      expect(provider).toBeNull();
    });
  });

  describe('getEnabledProviders', () => {
    it('should return enabled providers from settings', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        enabledProviders: ['chatgpt', 'claude'],
      });

      const providers = await getEnabledProviders();

      expect(providers).toHaveLength(2);
      expect(providers[0].id).toBe('chatgpt');
      expect(providers[1].id).toBe('claude');
    });

    it('should use default settings when not provided', async () => {
      chrome.storage.sync.get.mockImplementation((defaults) =>
        Promise.resolve(defaults)
      );

      const providers = await getEnabledProviders();

      expect(providers.length).toBeGreaterThan(0);
    });
  });
});
