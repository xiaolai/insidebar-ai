import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessageWithTimeout, notifyMessage } from '../modules/messaging.js';

describe('messaging module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chrome.runtime.lastError = null;
  });

  describe('sendMessageWithTimeout', () => {
    it('should send message and resolve with response', async () => {
      const mockResponse = { success: true, data: 'test' };
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        callback(mockResponse);
      });

      const result = await sendMessageWithTimeout({ action: 'test' });

      expect(result).toEqual(mockResponse);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'test' },
        expect.any(Function)
      );
    });

    it('should reject on timeout', async () => {
      chrome.runtime.sendMessage.mockImplementation(() => {
        // Never call callback - simulate timeout
      });

      await expect(
        sendMessageWithTimeout({ action: 'test' }, { timeout: 100 })
      ).rejects.toThrow('Message timeout: test');
    });

    it('should reject on chrome.runtime.lastError', async () => {
      chrome.runtime.lastError = { message: 'Extension context invalidated' };
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        callback(null);
      });

      await expect(
        sendMessageWithTimeout({ action: 'test' })
      ).rejects.toThrow('Extension context invalidated');
    });

    it('should resolve immediately when expectResponse is false', async () => {
      const result = await sendMessageWithTimeout(
        { action: 'notify' },
        { expectResponse: false }
      );

      expect(result).toBeUndefined();
    });

    it('should use custom timeout value', async () => {
      vi.useFakeTimers();

      chrome.runtime.sendMessage.mockImplementation(() => {
        // Never respond
      });

      const promise = sendMessageWithTimeout(
        { action: 'test' },
        { timeout: 5000 }
      );

      vi.advanceTimersByTime(4999);
      await Promise.resolve(); // Let promises flush

      // Should not have timed out yet
      vi.advanceTimersByTime(1);

      await expect(promise).rejects.toThrow('Message timeout');

      vi.useRealTimers();
    });
  });

  describe('notifyMessage', () => {
    it('should send message without expecting response', async () => {
      await notifyMessage({ action: 'notify', data: 'test' });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'notify', data: 'test' },
        expect.any(Function)
      );
    });

    it('should resolve immediately', async () => {
      const result = await notifyMessage({ action: 'notify' });
      expect(result).toBeUndefined();
    });
  });
});
