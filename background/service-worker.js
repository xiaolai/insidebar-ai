// T008 & T065: Install event - setup context menus and configure side panel
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Smarter Panel installed');
  await createContextMenus();

  // Configure side panel to open on action click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
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

// T010: Keyboard shortcut handler
// Store pending command for action click handler
let pendingCommand = null;

chrome.commands.onCommand.addListener(async (command) => {
  console.log('[Shortcut] Command received:', command);

  try {
    if (command === 'open-sidebar' || command === 'open-prompt-library') {
      // Get current window
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.windowId) {
        console.error('[Shortcut] No active tab or window found');
        return;
      }

      console.log('[Shortcut] Attempting to open side panel for window:', tab.windowId);

      // Store the command for later if needed
      pendingCommand = command;

      // Try to open the panel directly with windowId
      // This should work since keyboard shortcuts count as user gestures
      await chrome.sidePanel.open({ windowId: tab.windowId });

      console.log('[Shortcut] Side panel opened successfully');

      // If opening prompt library, send message after sidebar loads
      if (command === 'open-prompt-library') {
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'openPromptLibrary' }).catch(() => {
            console.log('[Shortcut] Sidebar not ready yet for prompt library switch');
          });
        }, 150);
      }

      // Clear pending command after successful open
      pendingCommand = null;
    }
  } catch (error) {
    console.error('[Shortcut] Error in keyboard shortcut handler:', error);
    console.error('[Shortcut] Error details:', error.message);
  }
});
