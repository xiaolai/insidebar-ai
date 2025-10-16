import { notifyMessage } from '../modules/messaging.js';
import {
  saveConversation,
  findConversationByConversationId
} from '../modules/history-manager.js';

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
    enabledProviders: ['chatgpt', 'claude', 'gemini', 'google', 'grok', 'deepseek']
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
    deepseek: 'DeepSeek',
    google: 'Google'
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

      // Check if text is selected
      if (info.selectionText) {
        // Send selection with source
        const contentToSend = `${info.selectionText}\n\nSource: ${info.pageUrl}`;

        // Wait for sidebar to load, then send message to switch provider
        setTimeout(() => {
          notifyMessage({
            action: 'switchProvider',
            payload: { providerId, selectedText: contentToSend }
          }).catch(() => {
            // Sidebar may not be ready yet, silently ignore
          });
        }, 100);
      } else {
        // No text selected - extract page content
        try {
          const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'extractPageContent'
          });

          if (response && response.success) {
            // Send extracted content to sidebar
            setTimeout(() => {
              notifyMessage({
                action: 'switchProvider',
                payload: { providerId, selectedText: response.content }
              }).catch(() => {
                // Sidebar may not be ready yet, silently ignore
              });
            }, 100);
          } else {
            // Extraction failed - send empty to provider
            setTimeout(() => {
              notifyMessage({
                action: 'switchProvider',
                payload: { providerId, selectedText: '' }
              }).catch(() => {});
            }, 100);
          }
        } catch (error) {
          // Content script not ready or extraction failed
          // Send empty to provider
          setTimeout(() => {
            notifyMessage({
              action: 'switchProvider',
              payload: { providerId, selectedText: '' }
            }).catch(() => {});
          }, 100);
        }
      }
    } else if (info.menuItemId === 'open-prompt-library') {
      // Open side panel with prompt library and track state
      await chrome.sidePanel.open({ windowId: tab.windowId });
      sidePanelState.set(tab.windowId, true);

      // Check if text is selected
      if (info.selectionText) {
        // Send selection with source
        const contentToSend = `${info.selectionText}\n\nSource: ${info.pageUrl}`;

        // Wait for sidebar to load, then switch to prompt library
        setTimeout(() => {
          notifyMessage({
            action: 'openPromptLibrary',
            payload: { selectedText: contentToSend }
          }).catch(() => {
            // Sidebar may not be ready yet, ignore error
          });
        }, 100);
      } else {
        // No text selected - extract page content
        try {
          const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'extractPageContent'
          });

          if (response && response.success) {
            // Send extracted content to sidebar
            setTimeout(() => {
              notifyMessage({
                action: 'openPromptLibrary',
                payload: { selectedText: response.content }
              }).catch(() => {
                // Sidebar may not be ready yet, ignore error
              });
            }, 100);
          } else {
            // Extraction failed - send empty
            setTimeout(() => {
              notifyMessage({
                action: 'openPromptLibrary',
                payload: { selectedText: '' }
              }).catch(() => {});
            }, 100);
          }
        } catch (error) {
          // Content script not ready or extraction failed
          // Send empty
          setTimeout(() => {
            notifyMessage({
              action: 'openPromptLibrary',
              payload: { selectedText: '' }
            }).catch(() => {});
          }, 100);
        }
      }
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

// Handle duplicate conversation check - now with direct database access
async function handleCheckDuplicate(payload) {
  try {
    const { conversationId } = payload;

    if (!conversationId) {
      return { isDuplicate: false };
    }

    // Query IndexedDB directly without requiring sidebar
    const existingConversation = await findConversationByConversationId(conversationId);

    if (existingConversation) {
      return {
        isDuplicate: true,
        existingConversation: existingConversation
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('[Background] Error checking duplicate:', error);
    // Propagate error instead of silently returning false
    throw error;
  }
}

// Handle saving conversation - now with direct database access
async function handleSaveConversation(conversationData, sender) {
  try {
    // Save directly to IndexedDB without requiring sidebar
    const savedConversation = await saveConversation(conversationData);

    // Notify sidebar to refresh chat history if it's open
    try {
      await notifyMessage({
        action: 'refreshChatHistory',
        payload: { conversationId: savedConversation.id }
      });
    } catch (error) {
      // Sidebar may not be open, that's okay
    }

    // Get user setting for auto-opening sidebar
    const settings = await chrome.storage.sync.get({
      autoOpenSidebarOnSave: false
    });

    // Optionally open sidebar and switch to chat history
    if (settings.autoOpenSidebarOnSave && sender.tab) {
      const windowId = sender.tab.windowId;
      const isOpen = sidePanelState.get(windowId) || false;

      if (!isOpen && windowId) {
        try {
          // This will work because it's within the user gesture flow
          await chrome.sidePanel.open({ windowId });
          sidePanelState.set(windowId, true);

          // Wait for sidebar to load, then switch to chat history
          setTimeout(() => {
            notifyMessage({
              action: 'switchToChatHistory',
              payload: { conversationId: savedConversation.id }
            }).catch(() => {
              // Sidebar may not be ready, ignore
            });
          }, 300);
        } catch (error) {
          // If sidebar opening fails, it's okay - the save already succeeded
          console.warn('[Background] Could not open sidebar after save:', error.message);
        }
      }
    }

    return { success: true, data: savedConversation };
  } catch (error) {
    console.error('[Background] Error saving conversation:', error);
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
