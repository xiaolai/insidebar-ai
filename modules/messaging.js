const DEFAULT_MESSAGE_TIMEOUT_MS = 2000;

export function sendMessageWithTimeout(message, options = {}) {
  const { timeout = DEFAULT_MESSAGE_TIMEOUT_MS, expectResponse = true } = options;

  return new Promise((resolve, reject) => {
    let completed = false;

    const timer = expectResponse
      ? setTimeout(() => {
          if (!completed) {
            completed = true;
            reject(new Error(`Message timeout${message?.action ? `: ${message.action}` : ''}`));
          }
        }, timeout)
      : null;

    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (!expectResponse) {
          resolve(undefined);
          return;
        }

        if (completed) {
          return;
        }
        completed = true;
        if (timer) clearTimeout(timer);

        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }

        resolve(response);
      });

      if (!expectResponse) {
        completed = true;
        if (timer) clearTimeout(timer);
        resolve(undefined);
      }
    } catch (error) {
      if (!completed) {
        if (timer) clearTimeout(timer);
        reject(error);
      }
    }
  });
}

export function notifyMessage(message) {
  return sendMessageWithTimeout(message, { expectResponse: false });
}

