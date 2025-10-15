import { notifyMessage } from '../modules/messaging.js';

// T008 & T065: Install event - setup context menus and configure side panel
const DEFAULT_SHORTCUT_SETTING = { keyboardShortcutEnabled: true };
let keyboardShortcutEnabled = true;

// T070: Track side panel state per window
const sidePanelState = new Map(); // windowId -> boolean (true = open, false = closed)

async function loadShortcutSetting() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_SHORTCUT_SETTING);
    keyboardShortcutEnabled = result.keyboardShortcutEnabled;
  } catch (error) {
    // Fallback to default if storage unavailable
    keyboardShortcutEnabled = true;
  }
}

// T070: Helper to toggle side panel
async function toggleSidePanel(windowId, action = null) {
  if (!windowId) {
    return;
  }

  const isOpen = sidePanelState.get(windowId) || false;

  if (!isOpen) {
    // Open the side panel
    try {
      await chrome.sidePanel.open({ windowId });
      sidePanelState.set(windowId, true);
    } catch (error) {
      // Silently fail - side panel may not be available
    }
  } else {
    // Close the side panel by sending message to sidebar
    try {
      await notifyMessage({ action: 'closeSidePanel', payload: {} });
      sidePanelState.set(windowId, false);
    } catch (error) {
      // Even if message fails, assume it's closed
      sidePanelState.set(windowId, false);
    }
  }
}

async function configureActionBehavior() {
  // Always handle action clicks ourselves so we can respect the toggle state.
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  } catch (error) {
    // Silently fail if API not available
  }
}

chrome.runtime.onInstalled.addListener(async () => {
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
    title: 'Send to insidebar.ai',
    contexts: ['page', 'selection', 'link']
  });

  // Create submenu for each enabled provider
  const providerNames = {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    gemini: 'Gemini',
    grok: 'Grok',
    deepseek: 'DeepSeek'
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

// T009 & T067-T068 & T070: Context menu click handler with state tracking
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (!tab || !tab.windowId) {
      return;
    }

    if (info.menuItemId.startsWith('provider-')) {
      const providerId = info.menuItemId.replace('provider-', '');

      // Open side panel and track state
      await chrome.sidePanel.open({ windowId: tab.windowId });
      sidePanelState.set(tab.windowId, true);

      // Capture selected text if available
      const selectedText = info.selectionText || '';

      // Wait for sidebar to load, then send message to switch provider
      setTimeout(() => {
        notifyMessage({
          action: 'switchProvider',
          payload: { providerId, selectedText }
        }).catch(() => {
          // Sidebar may not be ready yet, silently ignore
        });
      }, 100);
    } else if (info.menuItemId === 'open-prompt-library') {
      // Open side panel with prompt library and track state
      await chrome.sidePanel.open({ windowId: tab.windowId });
      sidePanelState.set(tab.windowId, true);

      // Capture selected text if available
      const selectedText = info.selectionText || '';

      // Wait for sidebar to load, then switch to prompt library
      setTimeout(() => {
        notifyMessage({
          action: 'openPromptLibrary',
          payload: { selectedText }
        }).catch(() => {
          // Sidebar may not be ready yet, ignore error
        });
      }, 100);
    }
  } catch (error) {
    // Silently handle context menu errors
  }
});

// T010 & T070: Handle action clicks (toolbar or `_execute_action` command) with toggle
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.windowId) {
    return;
  }

  if (!keyboardShortcutEnabled) {
    return;
  }

  await toggleSidePanel(tab.windowId);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync') return;

  if (changes.keyboardShortcutEnabled) {
    keyboardShortcutEnabled = changes.keyboardShortcutEnabled.newValue !== false;
  }
});

// T070: Clean up state when windows are closed
chrome.windows.onRemoved.addListener((windowId) => {
  sidePanelState.delete(windowId);
});

// T070: Listen for sidebar close notifications, conversation saves, and duplicate checks
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sidePanelClosed') {
    // Get windowId from sender
    if (sender.tab && sender.tab.windowId) {
      sidePanelState.set(sender.tab.windowId, false);
    }
    sendResponse({ success: true });
  } else if (message.action === 'saveConversationFromPage') {
    // Handle conversation save from ChatGPT page
    handleSaveConversation(message.payload, sender).then(sendResponse);
    return true; // Keep channel open for async response
  } else if (message.action === 'checkDuplicateConversation') {
    // Handle duplicate check request
    handleCheckDuplicate(message.payload).then(sendResponse);
    return true; // Keep channel open for async response
  }
  return true;
});

// Handle duplicate conversation check
async function handleCheckDuplicate(payload) {
  try {
    const { conversationId } = payload;

    if (!conversationId) {
      return { isDuplicate: false };
    }

    // Query IndexedDB via sidebar
    const response = await notifyMessage({
      action: 'checkDuplicateConversation',
      payload: { conversationId }
    });

    return response || { isDuplicate: false };
  } catch (error) {
    console.error('[Background] Error checking duplicate:', error);
    // If check fails, assume no duplicate to allow save
    return { isDuplicate: false };
  }
}

// Handle saving conversation from ChatGPT page
async function handleSaveConversation(conversationData, sender) {
  try {
    console.log('[Background] handleSaveConversation called with data:', {
      title: conversationData?.title,
      provider: conversationData?.provider,
      messageCount: conversationData?.messages?.length,
      hasSender: !!sender,
      hasTab: !!sender?.tab,
      hasFrameId: sender?.frameId !== undefined,
      frameId: sender?.frameId,
      url: sender?.url
    });

    // Get the window ID
    // If sender is from an iframe (like sidebar), we need to get the window differently
    let windowId = null;

    if (sender.tab) {
      // Message from a regular tab
      windowId = sender.tab.windowId;
      console.log('[Background] Got window ID from tab:', windowId);
    } else {
      // Message from an iframe (likely sidebar)
      // In this case, we can get the current window
      console.log('[Background] No tab found, getting current window...');
      try {
        const currentWindow = await chrome.windows.getCurrent();
        windowId = currentWindow.id;
        console.log('[Background] Got current window ID:', windowId);
      } catch (error) {
        console.error('[Background] Error getting current window:', error);
      }
    }

    if (!windowId) {
      console.error('[Background] No window ID found after all attempts');
      // If we still don't have a window ID, try to send directly to sidebar
      // without opening it (it's probably already open if we got a message from iframe)
      console.log('[Background] Attempting direct message to sidebar...');
      try {
        const response = await notifyMessage({
          action: 'saveExtractedConversation',
          payload: conversationData
        });
        console.log('[Background] Direct response from sidebar:', response);
        return { success: true, data: response };
      } catch (directError) {
        console.error('[Background] Direct message failed:', directError);
        return { success: false, error: 'No window ID and direct message failed' };
      }
    }

    console.log('[Background] Window ID:', windowId);

    // Open side panel if not already open
    const isOpen = sidePanelState.get(windowId) || false;
    console.log('[Background] Side panel open:', isOpen);

    if (!isOpen) {
      console.log('[Background] Opening side panel...');
      await chrome.sidePanel.open({ windowId });
      sidePanelState.set(windowId, true);
      // Wait for sidebar to load
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[Background] Sending message to sidebar...');

    // Send conversation data to sidebar
    const response = await notifyMessage({
      action: 'saveExtractedConversation',
      payload: conversationData
    });

    console.log('[Background] Response from sidebar:', response);

    return { success: true, data: response };
  } catch (error) {
    console.error('[Background] Error saving conversation:', error);
    console.error('[Background] Error stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// T069 & T070: Listen for keyboard shortcuts with toggle support
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab || !tab.windowId) {
    return;
  }

  const windowId = tab.windowId;
  const isOpen = sidePanelState.get(windowId) || false;

  if (command === 'open-prompt-library') {
    if (!isOpen) {
      // Open and switch to Prompt Library
      try {
        await chrome.sidePanel.open({ windowId });
        sidePanelState.set(windowId, true);

        // Wait for sidebar to load, then switch to Prompt Library
        setTimeout(() => {
          notifyMessage({
            action: 'openPromptLibrary',
            payload: {}
          }).catch(() => {
            // Sidebar may not be ready yet, ignore error
          });
        }, 100);
      } catch (error) {
        // Silently handle errors
      }
    } else {
      // Close side panel (toggle off)
      try {
        await notifyMessage({ action: 'closeSidePanel', payload: {} });
        sidePanelState.set(windowId, false);
      } catch (error) {
        // Even if message fails, assume it's closed
        sidePanelState.set(windowId, false);
      }
    }
  }
});
