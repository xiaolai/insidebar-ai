// T050-T064: Settings Page Implementation
import { PROVIDERS } from '../modules/providers.js';
import { getSettings, getSetting, saveSettings, saveSetting, resetSettings, exportSettings, importSettings } from '../modules/settings.js';
import {
  getAllPrompts,
  getFavoritePrompts,
  getAllCategories,
  exportPrompts,
  importPrompts,
  clearAllPrompts
} from '../modules/prompt-manager.js';

const DEFAULT_ENABLED_PROVIDERS = ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek'];

function getEnabledProvidersOrDefault(settings) {
  if (settings.enabledProviders && Array.isArray(settings.enabledProviders)) {
    return [...settings.enabledProviders];
  }
  return [...DEFAULT_ENABLED_PROVIDERS];
}

function setOllamaUrlVisibility(isEnabled) {
  const container = document.getElementById('ollama-url-setting');
  if (!container) return;
  container.style.display = isEnabled ? 'flex' : 'none';
}

function isEdgeBrowser() {
  const uaData = navigator.userAgentData;
  if (uaData && Array.isArray(uaData.brands)) {
    return uaData.brands.some(brand => /Edge/i.test(brand.brand));
  }
  return navigator.userAgent.includes('Edg/');
}

function getChatgptHistoryElements() {
  return {
    button: document.getElementById('sync-chatgpt-history-btn'),
    status: document.getElementById('chatgpt-history-status'),
    spinner: document.getElementById('chatgpt-history-spinner'),
    progress: document.getElementById('chatgpt-history-progress')
  };
}

function updateChatgptHistoryStatus(message) {
  const { status } = getChatgptHistoryElements();
  if (!status) return;
  status.textContent = message;
}

function resetChatgptHistoryStatus() {
  const { status } = getChatgptHistoryElements();
  if (!status) return;
  const defaultStatus = status.dataset.defaultStatus;
  if (defaultStatus) {
    status.textContent = defaultStatus;
  }
  setChatgptHistoryLoadingState(false);
}

function setChatgptHistoryButtonState(isSyncing) {
  const { button } = getChatgptHistoryElements();
  if (!button) return;
  button.disabled = isSyncing;
  button.textContent = isSyncing ? 'Downloading…' : 'Download';
}

function setChatgptHistoryLoadingState(isLoading) {
  const { spinner, progress } = getChatgptHistoryElements();
  if (spinner) {
    spinner.style.display = isLoading ? 'inline-block' : 'none';
  }
  if (progress) {
    progress.style.display = isLoading ? 'block' : 'none';
  }
}

function formatChatgptHistoryStatus(lastSync, count) {
  if (!lastSync) {
    const { status } = getChatgptHistoryElements();
    return status?.dataset.defaultStatus || "Import your ChatGPT conversations into Smarter Panel's local database for unified search.";
  }

  const date = new Date(lastSync);
  const conversations = count === 1 ? '1 conversation' : `${count} conversations`;
  return `Last synced ${date.toLocaleString()} · ${conversations} stored locally.`;
}

function openShortcutSettings(browserOverride) {
  const isEdge = browserOverride === 'edge' || (browserOverride !== 'chrome' && isEdgeBrowser());
  const url = isEdge ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts';

  try {
    chrome.tabs.create({ url });
  } catch (error) {
    console.warn('Unable to open shortcuts via chrome.tabs, falling back to window.open', error);
    window.open(url, '_blank');
  }
}

function setupShortcutHelpers() {
  const openShortcutsBtn = document.getElementById('open-shortcuts-btn');
  if (openShortcutsBtn) {
    openShortcutsBtn.addEventListener('click', () => openShortcutSettings());
  }

  const edgeHelper = document.getElementById('edge-shortcut-helper');
  const edgeButton = document.getElementById('open-edge-shortcuts-btn');

  if (edgeHelper && edgeButton) {
    edgeButton.addEventListener('click', () => openShortcutSettings('edge'));
  }
}

function updateShortcutHelperVisibility(isEnabled) {
  const edgeHelper = document.getElementById('edge-shortcut-helper');
  if (!edgeHelper) return;

  if (isEdgeBrowser() && isEnabled) {
    edgeHelper.style.display = 'flex';
  } else {
    edgeHelper.style.display = 'none';
  }
}

let chatgptHistoryListenerRegistered = false;

function setupChatgptHistoryControls() {
  const { button, status } = getChatgptHistoryElements();
  if (!button || !status) return;

  if (!chatgptHistoryListenerRegistered) {
    chrome.runtime.onMessage.addListener(chatgptHistoryMessageHandler);
    chatgptHistoryListenerRegistered = true;
  }

  if (button.dataset.syncListenerAttached === 'true') {
    return;
  }

  button.dataset.syncListenerAttached = 'true';

  button.addEventListener('click', () => {
    setChatgptHistoryButtonState(true);
    setChatgptHistoryLoadingState(true);
    updateChatgptHistoryStatus('Starting download…');

    chrome.runtime.sendMessage({ action: 'startChatgptHistorySync' }, (response) => {
      if (chrome.runtime.lastError) {
        setChatgptHistoryButtonState(false);
        setChatgptHistoryLoadingState(false);
        updateChatgptHistoryStatus(`Unable to start download: ${chrome.runtime.lastError.message}`);
        return;
      }

      if (!response || response.success === false) {
        const errorMessage = response?.error ? `Unable to start download: ${response.error}` : 'Unable to start download.';
        setChatgptHistoryButtonState(false);
        setChatgptHistoryLoadingState(false);
        updateChatgptHistoryStatus(errorMessage);
      }
    });
  });
}

function chatgptHistoryMessageHandler(message) {
  switch (message.action) {
    case 'chatgptHistorySyncStarted':
      setChatgptHistoryButtonState(true);
      setChatgptHistoryLoadingState(true);
      updateChatgptHistoryStatus('Downloading history…');
      break;
    case 'chatgptHistorySyncProgress': {
      const total = message.payload?.totalSaved ?? 0;
      const countLabel = total === 1 ? 'conversation' : 'conversations';
      setChatgptHistoryButtonState(true);
      setChatgptHistoryLoadingState(true);
      updateChatgptHistoryStatus(`Downloaded ${total} ${countLabel}…`);
      break;
    }
    case 'chatgptHistorySyncComplete': {
      const lastSync = message.payload?.lastSync ?? Date.now();
      const total = message.payload?.totalSaved ?? 0;
      setChatgptHistoryButtonState(false);
      setChatgptHistoryLoadingState(false);
      updateChatgptHistoryStatus(formatChatgptHistoryStatus(lastSync, total));
      break;
    }
    case 'chatgptHistorySyncError': {
      const errorMessage = message.payload?.message || 'Unknown error while downloading history.';
      setChatgptHistoryButtonState(false);
      setChatgptHistoryLoadingState(false);
      updateChatgptHistoryStatus(`Error: ${errorMessage}`);
      break;
    }
    default:
      break;
  }
}

async function loadChatgptHistoryMeta() {
  try {
    const { chatgptHistoryLastSync, chatgptHistoryCount } = await chrome.storage.local.get({
      chatgptHistoryLastSync: null,
      chatgptHistoryCount: 0
    });
    updateChatgptHistoryStatus(formatChatgptHistoryStatus(chatgptHistoryLastSync, chatgptHistoryCount));
    setChatgptHistoryLoadingState(false);
  } catch (error) {
    console.warn('Unable to load ChatGPT history metadata', error);
    resetChatgptHistoryStatus();
  }
}

// T050: Initialize settings page
async function init() {
  await loadSettings();
  await loadDataStats();
  await renderProviderList();
  setupEventListeners();
  setupShortcutHelpers();
  setupChatgptHistoryControls();
  await loadChatgptHistoryMeta();
}

// T051: Load and display current settings
async function loadSettings() {
  const settings = await getSettings();

  // Theme
  document.getElementById('theme-select').value = settings.theme || 'auto';

  // Default provider
  document.getElementById('default-provider-select').value = settings.defaultProvider || 'chatgpt';

  // Ollama URL
  document.getElementById('ollama-url-input').value = settings.ollamaUrl || 'http://localhost:3000';

  const enabledProviders = getEnabledProvidersOrDefault(settings);
  setOllamaUrlVisibility(enabledProviders.includes('ollama'));

  const keyboardShortcutEnabled = settings.keyboardShortcutEnabled !== false;
  const shortcutToggle = document.getElementById('keyboard-shortcut-toggle');
  if (shortcutToggle) {
    shortcutToggle.checked = keyboardShortcutEnabled;
  }
  updateShortcutHelperVisibility(keyboardShortcutEnabled);
}

// T052-T053: Render provider enable/disable toggles
async function renderProviderList() {
  const settings = await getSettings();
  const enabledProviders = getEnabledProvidersOrDefault(settings);
  const listContainer = document.getElementById('provider-list');

  listContainer.innerHTML = PROVIDERS.map(provider => {
    const isEnabled = enabledProviders.includes(provider.id);
    return `
      <div class="provider-item">
        <div class="provider-info">
          <div class="provider-icon">
            <img src="${provider.icon}" alt="${provider.name}" width="24" height="24"
                 onerror="this.style.display='none'" />
          </div>
          <span class="provider-name">${provider.name}</span>
        </div>
        <div class="toggle-switch ${isEnabled ? 'active' : ''}" data-provider-id="${provider.id}"></div>
      </div>
    `;
  }).join('');

  // Add click listeners to toggles
  listContainer.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', async () => {
      await toggleProvider(toggle.dataset.providerId);
    });
  });

  setOllamaUrlVisibility(enabledProviders.includes('ollama'));
}

async function toggleProvider(providerId) {
  const settings = await getSettings();
  let enabledProviders = getEnabledProvidersOrDefault(settings);

  if (enabledProviders.includes(providerId)) {
    // Disable - but ensure at least one provider remains enabled
    if (enabledProviders.length === 1) {
      showStatus('error', 'At least one provider must be enabled');
      return;
    }
    enabledProviders = enabledProviders.filter(id => id !== providerId);
  } else {
    // Enable
    enabledProviders.push(providerId);
  }

  await saveSetting('enabledProviders', enabledProviders);
  await renderProviderList();
  showStatus('success', 'Provider settings updated');
}

// T056: Load and display data statistics
async function loadDataStats() {
  try {
    const prompts = await getAllPrompts();
    const favorites = await getFavoritePrompts();
    const categories = await getAllCategories();

    document.getElementById('stat-prompts').textContent = prompts.length;
    document.getElementById('stat-favorites').textContent = favorites.length;
    document.getElementById('stat-categories').textContent = categories.length;

    // Estimate storage size
    const dataSize = JSON.stringify(prompts).length;
    const sizeKB = Math.round(dataSize / 1024);
    document.getElementById('stat-storage').textContent = `~${sizeKB} KB`;
  } catch (error) {
    console.error('Error loading data stats:', error);
  }
}

// T057-T064: Setup event listeners
function setupEventListeners() {
  // Theme change
  document.getElementById('theme-select').addEventListener('change', async (e) => {
    await saveSetting('theme', e.target.value);
    showStatus('success', 'Theme updated');
  });

  // Default provider change
  document.getElementById('default-provider-select').addEventListener('change', async (e) => {
    await saveSetting('defaultProvider', e.target.value);
    showStatus('success', 'Default provider updated');
  });

  // Keyboard shortcut toggle
  const shortcutToggle = document.getElementById('keyboard-shortcut-toggle');
  if (shortcutToggle) {
    shortcutToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await saveSetting('keyboardShortcutEnabled', enabled);
      updateShortcutHelperVisibility(enabled);
      showStatus('success', enabled ? 'Keyboard shortcut enabled' : 'Keyboard shortcut disabled');
    });
  }

  // Ollama URL change
  document.getElementById('ollama-url-input').addEventListener('change', async (e) => {
    const url = e.target.value.trim();

    // Basic URL validation
    if (url && !url.match(/^https?:\/\/.+/)) {
      showStatus('error', 'Invalid URL format. Must start with http:// or https://');
      e.target.value = await getSetting('ollamaUrl') || 'http://localhost:3000';
      return;
    }

    await saveSetting('ollamaUrl', url || 'http://localhost:3000');
    showStatus('success', 'Ollama URL updated. Reload sidebar to apply changes.');
  });

  // Export data
  document.getElementById('export-btn').addEventListener('click', exportData);

  // Import data
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      await importData(file);
      e.target.value = ''; // Reset file input
    }
  });

  // Reset data
  document.getElementById('reset-btn').addEventListener('click', resetData);
}

// T057: Export all data
async function exportData() {
  try {
    // Export prompts
    const promptsData = await exportPrompts();

    // Export settings
    const settingsData = await exportSettings();

    // Combine into single export file
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      prompts: promptsData.prompts,
      settings: settingsData
    };

    // Create download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smarter-panel-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showStatus('success', 'Data exported successfully');
  } catch (error) {
    console.error('Export error:', error);
    showStatus('error', 'Failed to export data');
  }
}

// T058-T062: Import data from file
async function importData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.version) {
      throw new Error('Invalid export file format');
    }

    // Confirm import
    const confirmMsg = `Import data from ${new Date(data.exportDate).toLocaleString()}?\n\n` +
      `This will add:\n` +
      `- ${data.prompts?.length || 0} prompts\n` +
      `- Settings configuration\n\n` +
      `Existing data will be preserved unless duplicates are found.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    // Import prompts
    if (data.prompts && Array.isArray(data.prompts)) {
      const result = await importPrompts({ prompts: data.prompts }, 'skip');
      console.log(`Import result: ${result.imported} imported, ${result.skipped} skipped`);
    }

    // Import settings (but preserve current enabled providers)
    if (data.settings) {
      const currentSettings = await getSettings();
      const settingsToImport = {
        ...data.settings,
        enabledProviders: currentSettings.enabledProviders // Don't overwrite provider settings
      };
      await importSettings(settingsToImport);
    }

    await loadSettings();
    await loadDataStats();
    showStatus('success', 'Data imported successfully');
  } catch (error) {
    console.error('Import error:', error);
    showStatus('error', 'Failed to import data. Please check the file format.');
  }
}

// T063-T064: Reset all data
async function resetData() {
  const confirmMsg = 'Are you sure you want to reset ALL data?\n\n' +
    'This will:\n' +
    '- Delete all prompts\n' +
    '- Reset all settings to defaults\n\n' +
    'This action CANNOT be undone!';

  if (!confirm(confirmMsg)) {
    return;
  }

  // Double confirmation for safety
  if (!confirm('Last chance! Are you absolutely sure?')) {
    return;
  }

  try {
    // Clear prompts
    await clearAllPrompts();

    // Reset settings
    await resetSettings();

    // Reload UI
    await loadSettings();
    await loadDataStats();
    await renderProviderList();

    showStatus('success', 'All data has been reset');
  } catch (error) {
    console.error('Reset error:', error);
    showStatus('error', 'Failed to reset data');
  }
}

// Status message helpers
function showStatus(type, message) {
  const elementId = type === 'error' ? 'status-error' : 'status-success';
  const element = document.getElementById(elementId);

  element.textContent = message;
  element.classList.add('show');

  setTimeout(() => {
    element.classList.remove('show');
  }, 3000);
}

// Initialize on load
init();
