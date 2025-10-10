// T008 & T065: Install event - setup context menus and configure side panel
const DEFAULT_SHORTCUT_SETTING = { keyboardShortcutEnabled: true };
let keyboardShortcutEnabled = true;

async function loadShortcutSetting() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_SHORTCUT_SETTING);
    keyboardShortcutEnabled = result.keyboardShortcutEnabled;
  } catch (error) {
    console.warn('Unable to load shortcut setting, defaulting to enabled.', error);
    keyboardShortcutEnabled = true;
  }
}

async function configureActionBehavior() {
  // Always handle action clicks ourselves so we can respect the toggle state.
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  } catch (error) {
    console.error('Failed to configure side panel behavior:', error);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Smarter Panel installed');
  await createContextMenus();
  await loadShortcutSetting();
  await configureActionBehavior();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadShortcutSetting();
  await configureActionBehavior();
});

// T065-T068: Create/update context menus dynamically based on enabled providers
async function createContextMenus() {
  // Remove all existing menus
  await chrome.contextMenus.removeAll();

  // Get enabled providers from settings
  const settings = await chrome.storage.sync.get({
    enabledProviders: ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek']
  });

  const enabledProviders = settings.enabledProviders;

  // Create main context menu item
  chrome.contextMenus.create({
    id: 'open-smarter-panel',
    title: 'Open in Smarter Panel',
    contexts: ['page', 'selection', 'link']
  });

  // Create submenu for each enabled provider
  const providerNames = {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    gemini: 'Gemini',
    grok: 'Grok',
    deepseek: 'DeepSeek',
    ollama: 'Ollama'
  };

  enabledProviders.forEach(providerId => {
    chrome.contextMenus.create({
      id: `provider-${providerId}`,
      parentId: 'open-smarter-panel',
      title: providerNames[providerId] || providerId,
      contexts: ['page', 'selection', 'link']
    });
  });

  // Add Prompt Library option
  chrome.contextMenus.create({
    id: 'open-prompt-library',
    parentId: 'open-smarter-panel',
    title: 'Prompt Library',
    contexts: ['page', 'selection', 'link']
  });
}

// T066: Listen for settings changes and update context menus
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.enabledProviders) {
    createContextMenus();
  }
});

// T009 & T067-T068: Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (!tab || !tab.windowId) {
      console.error('No valid tab or window found');
      return;
    }

    if (info.menuItemId.startsWith('provider-')) {
      const providerId = info.menuItemId.replace('provider-', '');

      // Open side panel
      await chrome.sidePanel.open({ windowId: tab.windowId });

      // Wait for sidebar to load, then send message to switch provider
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'switchProvider',
          payload: { providerId }
        }).catch(() => {
          // Sidebar may not be ready yet, ignore error
        });
      }, 100);
    } else if (info.menuItemId === 'open-prompt-library') {
      // Open side panel with prompt library
      await chrome.sidePanel.open({ windowId: tab.windowId });

      // Wait for sidebar to load, then switch to prompt library
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'openPromptLibrary'
        }).catch(() => {
          // Sidebar may not be ready yet, ignore error
        });
      }, 100);
    }
  } catch (error) {
    console.error('Error in context menu handler:', error);
  }
});

// T010: Handle action clicks (toolbar or `_execute_action` command) so we can respect
// the keyboard shortcut setting while keeping side panel toggling responsive.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.windowId) {
    console.error('Action clicked without valid tab/window context.');
    return;
  }

  if (!keyboardShortcutEnabled) {
    return;
  }

  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error('Error opening side panel from action click:', error);
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync') return;

  if (changes.keyboardShortcutEnabled) {
    keyboardShortcutEnabled = changes.keyboardShortcutEnabled.newValue !== false;
  }
});

// ChatGPT history sync and storage
const HISTORY_DB_NAME = 'smarterPanelHistory';
const HISTORY_DB_VERSION = 1;
const HISTORY_STORE_NAME = 'conversations';

let historyDbPromise = null;

function openHistoryDb() {
  if (historyDbPromise) {
    return historyDbPromise;
  }

  historyDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(HISTORY_DB_NAME, HISTORY_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        const store = db.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'key' });
        store.createIndex('provider', 'provider', { unique: false });
        store.createIndex('updateTime', 'updateTime', { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        historyDbPromise = null;
      };
      db.onclose = () => {
        historyDbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      historyDbPromise = null;
      reject(request.error);
    };
  });

  return historyDbPromise;
}

function completeTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function saveConversations(records) {
  if (!records.length) {
    return 0;
  }

  const db = await openHistoryDb();
  const tx = db.transaction(HISTORY_STORE_NAME, 'readwrite');
  const store = tx.objectStore(HISTORY_STORE_NAME);

  for (const record of records) {
    store.put(record);
  }

  await completeTransaction(tx);
  return records.length;
}

function broadcastHistoryUpdate(action, payload) {
  chrome.runtime.sendMessage({ action, payload }).catch(() => {});
}

const chatgptHistoryState = {
  inProgress: false,
  waitingForFrame: false,
  totalSaved: 0,
  frameReadyTimeout: null,
  startTimestamp: null,
  pendingBatchPromise: Promise.resolve()
};

function resetChatgptHistoryState() {
  chatgptHistoryState.inProgress = false;
  chatgptHistoryState.waitingForFrame = false;
  chatgptHistoryState.totalSaved = 0;
  chatgptHistoryState.startTimestamp = null;
  chatgptHistoryState.pendingBatchPromise = Promise.resolve();
  if (chatgptHistoryState.frameReadyTimeout) {
    clearTimeout(chatgptHistoryState.frameReadyTimeout);
    chatgptHistoryState.frameReadyTimeout = null;
  }
}

async function ensureSidePanelWithChatgpt() {
  try {
    const window = await chrome.windows.getLastFocused({ populate: false });
    if (window && typeof window.id === 'number') {
      await chrome.sidePanel.open({ windowId: window.id });
    }
  } catch (error) {
    console.warn('Unable to open side panel for ChatGPT history sync', error);
  }

  // Ask sidebar to switch to ChatGPT provider
  chrome.runtime.sendMessage({
    action: 'switchProvider',
    payload: { providerId: 'chatgpt' }
  }).catch(() => {});
}

function startChatgptHistoryInFrame() {
  chatgptHistoryState.waitingForFrame = false;
  broadcastHistoryUpdate('chatgptHistorySyncStarted', {});
  chrome.runtime.sendMessage({ action: 'chatgptHistorySyncStart' }).catch((error) => {
    broadcastHistoryUpdate('chatgptHistorySyncError', { message: error.message || 'Failed to message ChatGPT frame.' });
    resetChatgptHistoryState();
  });
}

function normalizeChatgptRecords(conversations) {
  const now = Date.now();
  return conversations
    .map((entry) => {
      const summary = entry?.summary || {};
      const detail = entry?.detail || null;
      const conversationId = summary.id || detail?.id || detail?.conversation_id;
      if (!conversationId) {
        return null;
      }

      const title = summary.title || detail?.title || 'Untitled conversation';
      const createTime = summary.create_time || detail?.create_time || null;
      const updateTime = summary.update_time || detail?.update_time || null;

      return {
        key: `chatgpt:${conversationId}`,
        provider: 'chatgpt',
        conversationId,
        title,
        createTime,
        updateTime,
        summary,
        detail,
        error: entry?.error || null,
        syncedAt: now
      };
    })
    .filter(Boolean);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startChatgptHistorySync': {
      (async () => {
        if (chatgptHistoryState.inProgress) {
          sendResponse({ success: false, error: 'A ChatGPT history download is already running.' });
          return;
        }

        chatgptHistoryState.inProgress = true;
        chatgptHistoryState.waitingForFrame = true;
        chatgptHistoryState.totalSaved = 0;
        chatgptHistoryState.startTimestamp = Date.now();
        chatgptHistoryState.pendingBatchPromise = Promise.resolve();

        await ensureSidePanelWithChatgpt();

        chatgptHistoryState.frameReadyTimeout = setTimeout(() => {
          if (chatgptHistoryState.waitingForFrame) {
            startChatgptHistoryInFrame();
          }
        }, 4000);

        sendResponse({ success: true });
      })().catch((error) => {
        resetChatgptHistoryState();
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
    case 'chatgptHistoryFrameReady': {
      if (!chatgptHistoryState.inProgress || !chatgptHistoryState.waitingForFrame) {
        return;
      }
      if (chatgptHistoryState.frameReadyTimeout) {
        clearTimeout(chatgptHistoryState.frameReadyTimeout);
        chatgptHistoryState.frameReadyTimeout = null;
      }
      setTimeout(() => startChatgptHistoryInFrame(), 300);
      break;
    }
    case 'chatgptHistorySyncBatch': {
      if (!chatgptHistoryState.inProgress) {
        return;
      }

      const conversations = normalizeChatgptRecords(message.payload?.conversations || []);

      chatgptHistoryState.pendingBatchPromise = chatgptHistoryState.pendingBatchPromise
        .then(async () => {
          if (!chatgptHistoryState.inProgress) {
            return;
          }

          const saved = await saveConversations(conversations);
          chatgptHistoryState.totalSaved += saved;
          broadcastHistoryUpdate('chatgptHistorySyncProgress', {
            totalSaved: chatgptHistoryState.totalSaved,
            batchSize: saved
          });
        })
        .catch((error) => {
          broadcastHistoryUpdate('chatgptHistorySyncError', { message: error.message });
          resetChatgptHistoryState();
        });

      break;
    }
    case 'chatgptHistorySyncCurrent': {
      if (!chatgptHistoryState.inProgress) {
        return;
      }

      broadcastHistoryUpdate('chatgptHistorySyncCurrent', {
        title: message.payload?.title || 'Untitled conversation',
        conversationId: message.payload?.conversationId || null
      });

      break;
    }
    case 'chatgptHistorySyncFinished': {
      chatgptHistoryState.pendingBatchPromise
        .then(() => {
          if (!chatgptHistoryState.inProgress) {
            return;
          }

          const total = chatgptHistoryState.totalSaved;
          const lastSync = Date.now();

          chrome.storage.local.set({
            chatgptHistoryLastSync: lastSync,
            chatgptHistoryCount: total
          }).catch(() => {});

          broadcastHistoryUpdate('chatgptHistorySyncComplete', {
            totalSaved: total,
            lastSync
          });

          resetChatgptHistoryState();
        })
        .catch(() => {
          // Errors are handled in the batch promise chain.
        });

      break;
    }
    case 'chatgptHistorySyncError': {
      broadcastHistoryUpdate('chatgptHistorySyncError', {
        message: message.payload?.message || 'Failed to download ChatGPT history.'
      });
      resetChatgptHistoryState();
      break;
    }
    default:
      break;
  }
});
