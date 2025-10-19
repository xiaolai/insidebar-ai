// T050-T064: Settings Page Implementation
import { PROVIDERS } from '../modules/providers.js';
import { getSettings, getSetting, saveSettings, saveSetting, resetSettings, exportSettings, importSettings } from '../modules/settings.js';
import { applyTheme } from '../modules/theme-manager.js';
import {
  getAllPrompts,
  exportPrompts,
  importPrompts,
  clearAllPrompts,
  importDefaultLibrary
} from '../modules/prompt-manager.js';
import {
  getAllConversations,
  exportConversations,
  importConversations,
  clearAllConversations
} from '../modules/history-manager.js';
import {
  loadVersionInfo,
  checkForUpdates
} from '../modules/version-checker.js';
import { t, translatePage, getCurrentLanguage, initializeLanguage } from '../modules/i18n.js';
const DEFAULT_ENABLED_PROVIDERS = ['chatgpt', 'claude', 'gemini', 'google', 'grok', 'deepseek'];

// Helper function to get browser's current language in our supported format
function getCurrentBrowserLanguage() {
  const browserLang = getCurrentLanguage();
  // Map browser language codes to our supported locales
  if (browserLang.startsWith('zh')) {
    if (browserLang.includes('TW') || browserLang.includes('HK') || browserLang.includes('Hant')) {
      return 'zh_TW';
    }
    return 'zh_CN';
  }
  return 'en';
}

function getEnabledProvidersOrDefault(settings) {
  if (settings.enabledProviders && Array.isArray(settings.enabledProviders)) {
    return [...settings.enabledProviders];
  }
  return [...DEFAULT_ENABLED_PROVIDERS];
}

function isEdgeBrowser() {
  const uaData = navigator.userAgentData;
  if (uaData && Array.isArray(uaData.brands)) {
    return uaData.brands.some(brand => /Edge/i.test(brand.brand));
  }
  return navigator.userAgent.includes('Edg/');
}

function openShortcutSettings(browserOverride) {
  const isEdge = browserOverride === 'edge' || (browserOverride !== 'chrome' && isEdgeBrowser());
  const url = isEdge ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts';

  try {
    chrome.tabs.create({ url });
  } catch (error) {
    // Fallback to window.open if chrome.tabs unavailable
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

// Helper to detect if extension is installed from Chrome Web Store
async function isWebStoreInstall() {
  try {
    const info = await chrome.management.getSelf();
    // installType: 'normal' = Chrome Web Store, 'development' = loaded unpacked
    return info.installType === 'normal';
  } catch (error) {
    console.error('Error detecting install type:', error);
    // Default to false (show update checking) if detection fails
    return false;
  }
}

// Hide update checking UI for web store installations
async function hideUpdateCheckingIfNeeded() {
  const isFromStore = await isWebStoreInstall();

  if (isFromStore) {
    // Hide "Check for Updates" button
    const checkUpdatesBtn = document.getElementById('check-updates-btn');
    if (checkUpdatesBtn) {
      checkUpdatesBtn.style.display = 'none';
    }

    // Hide update status message area
    const updateStatus = document.getElementById('update-status');
    if (updateStatus) {
      updateStatus.style.display = 'none';
    }

    // Hide "Download Latest Version" link
    const downloadLink = document.getElementById('download-latest-link');
    if (downloadLink) {
      const downloadContainer = downloadLink.closest('.version-download');
      if (downloadContainer) {
        downloadContainer.style.display = 'none';
      }
    }
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


// T050: Initialize settings page
async function init() {
  await applyTheme();  // Apply theme first
  await initializeLanguage();  // Initialize language from user settings
  translatePage();  // Translate all static text
  await loadSettings();
  await loadDataStats();
  await loadLibraryCount();  // Load default library count
  await loadVersionDisplay();  // T073: Load and display version info
  await hideUpdateCheckingIfNeeded();  // Hide update checking for web store installations
  await renderProviderList();
  setupEventListeners();
  setupShortcutHelpers();
}

// T051: Load and display current settings
async function loadSettings() {
  const settings = await getSettings();

  // Theme
  document.getElementById('theme-select').value = settings.theme || 'auto';

  // Language
  const currentLanguage = settings.language || getCurrentBrowserLanguage();
  document.getElementById('language-select').value = currentLanguage;

  // Default provider - now dynamically populated
  await updateDefaultProviderDropdown();

  const keyboardShortcutEnabled = settings.keyboardShortcutEnabled !== false;
  const shortcutToggle = document.getElementById('keyboard-shortcut-toggle');
  if (shortcutToggle) {
    shortcutToggle.checked = keyboardShortcutEnabled;
  }
  updateShortcutHelperVisibility(keyboardShortcutEnabled);

  // Auto-paste clipboard setting
  const autoPasteToggle = document.getElementById('auto-paste-toggle');
  if (autoPasteToggle) {
    autoPasteToggle.checked = settings.autoPasteClipboard === true;
  }

  // Auto-open sidebar after save setting
  const autoOpenSidebarToggle = document.getElementById('auto-open-sidebar-toggle');
  if (autoOpenSidebarToggle) {
    autoOpenSidebarToggle.checked = settings.autoOpenSidebarOnSave === true;
  }

  // Remember last provider setting
  const rememberLastProviderToggle = document.getElementById('remember-last-provider-toggle');
  if (rememberLastProviderToggle) {
    rememberLastProviderToggle.checked = settings.rememberLastProvider !== false;
  }

  // Source URL placement setting
  const sourceUrlPlacementSelect = document.getElementById('source-url-placement-select');
  if (sourceUrlPlacementSelect) {
    sourceUrlPlacementSelect.value = settings.sourceUrlPlacement || 'end';
  }

  // Enter key behavior settings
  const enterBehavior = settings.enterKeyBehavior || {
    enabled: true,
    preset: 'swapped',
    newlineModifiers: { shift: false, ctrl: false, alt: false, meta: false },
    sendModifiers: { shift: true, ctrl: false, alt: false, meta: false }
  };

  const enterBehaviorToggle = document.getElementById('enter-behavior-toggle');
  if (enterBehaviorToggle) {
    enterBehaviorToggle.checked = enterBehavior.enabled;
    updateEnterBehaviorVisibility(enterBehavior.enabled);
  }

  const enterPresetSelect = document.getElementById('enter-preset-select');
  if (enterPresetSelect) {
    enterPresetSelect.value = enterBehavior.preset || 'swapped';
    updateCustomEnterSettingsVisibility(enterBehavior.preset);
  }

  // Load custom settings
  loadCustomEnterSettings(enterBehavior);
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
}

// Update the default provider dropdown to show only enabled providers
async function updateDefaultProviderDropdown() {
  const settings = await getSettings();
  const enabledProviders = getEnabledProvidersOrDefault(settings);
  const dropdown = document.getElementById('default-provider-select');
  const currentDefault = settings.defaultProvider || 'chatgpt';

  // Clear existing options
  dropdown.innerHTML = '';

  // Populate with enabled providers only
  enabledProviders.forEach(providerId => {
    const provider = PROVIDERS.find(p => p.id === providerId);
    if (provider) {
      const option = document.createElement('option');
      option.value = provider.id;
      option.textContent = provider.name;
      dropdown.appendChild(option);
    }
  });

  // Set the selected value
  // If current default is still enabled, keep it; otherwise use first enabled provider
  if (enabledProviders.includes(currentDefault)) {
    dropdown.value = currentDefault;
  } else {
    // Current default was disabled, switch to first enabled provider
    const newDefault = enabledProviders[0];
    dropdown.value = newDefault;
    await saveSetting('defaultProvider', newDefault);
  }
}

async function toggleProvider(providerId) {
  const settings = await getSettings();
  let enabledProviders = getEnabledProvidersOrDefault(settings);

  if (enabledProviders.includes(providerId)) {
    // Disable - but ensure at least one provider remains enabled
    if (enabledProviders.length === 1) {
      showStatus('error', t('msgOneProviderRequired'));
      return;
    }
    enabledProviders = enabledProviders.filter(id => id !== providerId);

    // If disabling the last selected provider, clear it so sidebar uses the new default
    const lastSelected = await chrome.storage.sync.get({ lastSelectedProvider: null });
    if (lastSelected.lastSelectedProvider === providerId) {
      await chrome.storage.sync.set({ lastSelectedProvider: null });
    }
  } else {
    // Enable
    enabledProviders.push(providerId);
  }

  await saveSetting('enabledProviders', enabledProviders);
  await renderProviderList();
  await updateDefaultProviderDropdown();  // Update dropdown when providers change
  showStatus('success', t('msgProviderSettingsUpdated'));
}

// T056: Load and display data statistics
async function loadDataStats() {
  try {
    const prompts = await getAllPrompts();
    const conversations = await getAllConversations();

    document.getElementById('stat-prompts').textContent = prompts.length;
    document.getElementById('stat-conversations').textContent = conversations.length;

    // Estimate storage size (include both prompts and conversations)
    const promptsSize = JSON.stringify(prompts).length;
    const conversationsSize = JSON.stringify(conversations).length;
    const totalSize = promptsSize + conversationsSize;
    const sizeKB = Math.round(totalSize / 1024);
    document.getElementById('stat-storage').textContent = `~${sizeKB} KB`;
  } catch (error) {
    // Silently handle data stats errors
    document.getElementById('stat-prompts').textContent = '0';
    document.getElementById('stat-conversations').textContent = '0';
    document.getElementById('stat-storage').textContent = '0 KB';
  }
}

// Load default library count
async function loadLibraryCount() {
  const countElement = document.getElementById('library-count');
  if (!countElement) return;

  try {
    const response = await fetch(chrome.runtime.getURL('data/prompt-libraries/default-prompts.json'));
    const promptsArray = await response.json();
    const count = Array.isArray(promptsArray) ? promptsArray.length : 0;
    countElement.textContent = t('msgPromptsCount', count.toString());
  } catch (error) {
    console.error('Failed to load library count:', error);
    countElement.textContent = t('msgUnknownCount');
  }
}

// T057-T064: Setup event listeners
function setupEventListeners() {
  // Theme change
  document.getElementById('theme-select').addEventListener('change', async (e) => {
    await saveSetting('theme', e.target.value);
    await applyTheme();  // Re-apply theme immediately
    showStatus('success', t('msgThemeUpdated'));
  });

  // Language change
  document.getElementById('language-select').addEventListener('change', async (e) => {
    const newLanguage = e.target.value;
    await saveSetting('language', newLanguage);

    // Reload translations with new language
    await initializeLanguage(newLanguage);

    // Re-translate the entire page
    translatePage();

    // Show success message (now in the new language)
    showStatus('success', t('msgLanguageUpdated'));
  });

  // Default provider change
  document.getElementById('default-provider-select').addEventListener('change', async (e) => {
    await saveSetting('defaultProvider', e.target.value);
    showStatus('success', t('msgDefaultProviderUpdated'));
  });

  // Keyboard shortcut toggle
  const shortcutToggle = document.getElementById('keyboard-shortcut-toggle');
  if (shortcutToggle) {
    shortcutToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await saveSetting('keyboardShortcutEnabled', enabled);
      updateShortcutHelperVisibility(enabled);
      showStatus('success', enabled ? t('msgShortcutEnabled') : t('msgShortcutDisabled'));
    });
  }

  // Auto-paste clipboard toggle
  const autoPasteToggle = document.getElementById('auto-paste-toggle');
  if (autoPasteToggle) {
    autoPasteToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await saveSetting('autoPasteClipboard', enabled);
      showStatus('success', enabled ? t('msgAutoPasteEnabled') : t('msgAutoPasteDisabled'));
    });
  }

  // Auto-open sidebar after save toggle
  const autoOpenSidebarToggle = document.getElementById('auto-open-sidebar-toggle');
  if (autoOpenSidebarToggle) {
    autoOpenSidebarToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await saveSetting('autoOpenSidebarOnSave', enabled);
      showStatus('success', enabled ? t('msgAutoOpenEnabled') : t('msgAutoOpenDisabled'));
    });
  }

  // Source URL placement change
  const sourceUrlPlacementSelect = document.getElementById('source-url-placement-select');
  if (sourceUrlPlacementSelect) {
    sourceUrlPlacementSelect.addEventListener('change', async (e) => {
      await saveSetting('sourceUrlPlacement', e.target.value);
      showStatus('success', t('msgSourceUrlPlacementUpdated'));
    });
  }

  // Remember last provider toggle
  const rememberLastProviderToggle = document.getElementById('remember-last-provider-toggle');
  if (rememberLastProviderToggle) {
    rememberLastProviderToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await saveSetting('rememberLastProvider', enabled);

      // If disabling, clear lastSelectedProvider so sidebar uses default provider next time
      if (!enabled) {
        await chrome.storage.sync.set({ lastSelectedProvider: null });
      }

      showStatus('success', enabled ? t('msgRememberLastProviderEnabled') : t('msgRememberLastProviderDisabled'));
    });
  }

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

  // Danger Zone - Clear buttons
  document.getElementById('clear-prompts-btn').addEventListener('click', clearPrompts);
  document.getElementById('clear-conversations-btn').addEventListener('click', clearConversations);
  document.getElementById('reset-settings-btn').addEventListener('click', resetSettingsOnly);

  // Default library import button
  document.getElementById('import-default-library')?.addEventListener('click', importDefaultLibraryHandler);

  // Custom library import button
  document.getElementById('import-custom-library')?.addEventListener('click', () => {
    document.getElementById('import-custom-library-file').click();
  });

  document.getElementById('import-custom-library-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      await importCustomLibraryHandler(file);
      e.target.value = ''; // Reset file input
    }
  });

  // Enter key behavior toggle
  const enterBehaviorToggle = document.getElementById('enter-behavior-toggle');
  if (enterBehaviorToggle) {
    enterBehaviorToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      const settings = await getSettings();
      const enterBehavior = settings.enterKeyBehavior || {};
      enterBehavior.enabled = enabled;
      await saveSetting('enterKeyBehavior', enterBehavior);
      updateEnterBehaviorVisibility(enabled);
      showStatus('success', enabled ? t('msgEnterCustomEnabled') : t('msgEnterCustomDisabled'));
    });
  }

  // Preset selection
  const enterPresetSelect = document.getElementById('enter-preset-select');
  if (enterPresetSelect) {
    enterPresetSelect.addEventListener('change', async (e) => {
      await applyEnterKeyPreset(e.target.value);
      updateCustomEnterSettingsVisibility(e.target.value);
    });
  }

  // Custom modifier checkboxes
  ['newline-shift', 'newline-ctrl', 'newline-alt', 'newline-meta',
   'send-shift', 'send-ctrl', 'send-alt', 'send-meta'].forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', saveCustomEnterSettings);
    }
  });

  // T073: Version check button
  const checkUpdatesBtn = document.getElementById('check-updates-btn');
  if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener('click', performVersionCheck);
  }
}

// T057: Export all data
async function exportData() {
  try {
    // Export prompts
    const promptsData = await exportPrompts();

    // Export conversations (chat history)
    const conversationsData = await exportConversations();

    // Export settings
    const settingsData = await exportSettings();

    // Combine into single export file
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      prompts: promptsData.prompts,
      conversations: conversationsData.conversations,
      settings: settingsData
    };

    // Create download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insidebar-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showStatus('success', t('msgDataExported'));
  } catch (error) {
    showStatus('error', t('msgDataExportFailed'));
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
    const confirmMsg = t('msgImportConfirm', [
      new Date(data.exportDate).toLocaleString(),
      (data.prompts?.length || 0).toString(),
      (data.conversations?.length || 0).toString()
    ]);

    if (!confirm(confirmMsg)) {
      return;
    }

    // Import prompts
    let promptImportSummary = null;
    if (data.prompts && Array.isArray(data.prompts)) {
      promptImportSummary = await importPrompts({ prompts: data.prompts }, 'skip');
    }

    // Import conversations (chat history)
    let conversationImportSummary = null;
    if (data.conversations && Array.isArray(data.conversations)) {
      conversationImportSummary = await importConversations({ conversations: data.conversations }, 'skip');
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

    // Build success message
    const messages = [];
    if (promptImportSummary) {
      const { imported = 0, skipped = 0 } = promptImportSummary;
      messages.push(t('msgPromptsImported', [imported.toString(), skipped.toString()]));
    }
    if (conversationImportSummary) {
      const { imported = 0, skipped = 0 } = conversationImportSummary;
      messages.push(t('msgConversationsImported', [imported.toString(), skipped.toString()]));
    }

    if (messages.length > 0) {
      showStatus('success', t('msgDataImported') + ' — ' + messages.join('; ') + '.');
    } else {
      showStatus('success', t('msgDataImported'));
    }
  } catch (error) {
    showStatus('error', t('msgDataImportFailed'));
  }
}

// Danger Zone: Clear Prompts
async function clearPrompts() {
  if (!confirm(t('msgConfirmClearPrompts'))) {
    return;
  }

  try {
    await clearAllPrompts();
    await loadDataStats();
    showStatus('success', t('msgPromptsCleared'));
  } catch (error) {
    showStatus('error', t('msgClearPromptsFailed'));
  }
}

// Danger Zone: Clear Chat History
async function clearConversations() {
  if (!confirm(t('msgConfirmClearHistory'))) {
    return;
  }

  try {
    await clearAllConversations();
    await loadDataStats();
    showStatus('success', t('msgHistoryCleared'));
  } catch (error) {
    showStatus('error', t('msgClearHistoryFailed'));
  }
}

// Danger Zone: Reset Settings
async function resetSettingsOnly() {
  if (!confirm(t('msgConfirmResetSettings'))) {
    return;
  }

  try {
    await resetSettings();
    await loadSettings();
    await renderProviderList();
    showStatus('success', t('msgSettingsReset'));
  } catch (error) {
    showStatus('error', t('msgResetSettingsFailed'));
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

// Validate prompt structure against expected format
function validatePromptStructure(prompt) {
  const errors = [];

  // Required fields
  if (!prompt.title || typeof prompt.title !== 'string') {
    errors.push('Missing or invalid "title" (string)');
  }
  if (!prompt.content || typeof prompt.content !== 'string') {
    errors.push('Missing or invalid "content" (string)');
  }
  if (!prompt.category || typeof prompt.category !== 'string') {
    errors.push('Missing or invalid "category" (string)');
  }

  // Tags should be array
  if (!Array.isArray(prompt.tags)) {
    errors.push('"tags" must be an array of strings');
  }

  // Variables should be array (can be empty)
  if (!Array.isArray(prompt.variables)) {
    errors.push('"variables" must be an array');
  }

  // Optional but typed fields
  if (prompt.isFavorite !== undefined && typeof prompt.isFavorite !== 'boolean') {
    errors.push('"isFavorite" should be boolean');
  }
  if (prompt.useCount !== undefined && typeof prompt.useCount !== 'number') {
    errors.push('"useCount" should be number');
  }
  if (prompt.lastUsed !== undefined && prompt.lastUsed !== null && typeof prompt.lastUsed !== 'number') {
    errors.push('"lastUsed" should be number or null');
  }

  return errors;
}

// Generate example prompt structure
function getPromptStructureExample() {
  return `Expected JSON structure (array of prompt objects):

[
  {
    "title": "Short descriptive title",
    "content": "Full prompt text. Use {variables} for placeholders.",
    "category": "Category name",
    "tags": ["tag1", "tag2"],
    "variables": ["variable1", "variable2"],
    "isFavorite": false,
    "useCount": 0,
    "lastUsed": null
  }
]

Required fields:
- title (string)
- content (string)
- category (string)
- tags (array of strings)
- variables (array of strings)

Optional fields:
- isFavorite (boolean, default: false)
- useCount (number, default: 0)
- lastUsed (number or null, default: null)

See: data/prompt-libraries/Generate_a_Basic_Prompt_Library.md`;
}

// Import Custom Prompt Library
async function importCustomLibraryHandler(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Check if it's an array
    if (!Array.isArray(data)) {
      showStatus('error', t('msgInvalidPromptFormat'));
      alert(`${t('msgInvalidFormat')}\n\n${getPromptStructureExample()}`);
      return;
    }

    // Validate first prompt as a sample
    if (data.length > 0) {
      const errors = validatePromptStructure(data[0]);
      if (errors.length > 0) {
        const errorMsg = `${t('msgInvalidPromptStructure')}:\n\n${errors.join('\n')}\n\n${getPromptStructureExample()}`;
        showStatus('error', t('msgInvalidPromptStructure'));
        alert(errorMsg);
        return;
      }
    }

    // Validate all prompts
    const validationErrors = [];
    data.forEach((prompt, index) => {
      const errors = validatePromptStructure(prompt);
      if (errors.length > 0) {
        validationErrors.push(`Prompt #${index + 1}: ${errors.join(', ')}`);
      }
    });

    if (validationErrors.length > 0) {
      const errorMsg = t('msgValidationErrors', validationErrors.length.toString()) + `:\n\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? '\n...' : ''}\n\n${getPromptStructureExample()}`;
      showStatus('error', t('msgValidationErrors', validationErrors.length.toString()));
      alert(errorMsg);
      return;
    }

    // Wrap in expected format
    const libraryData = { prompts: data };

    // Import using the prompt manager
    const result = await importDefaultLibrary(libraryData);

    // Show results
    if (result.imported > 0) {
      showStatus('success', t('msgCustomPromptsImported', [result.imported.toString(), result.skipped.toString()]));
    } else {
      showStatus('success', t('msgAllPromptsExist'));
    }

    // Refresh stats
    await loadDataStats();

  } catch (error) {
    if (error instanceof SyntaxError) {
      showStatus('error', t('msgInvalidJSON'));
      alert(`${t('msgJSONParseError')}\n\n${getPromptStructureExample()}`);
    } else {
      showStatus('error', t('msgCustomImportFailed'));
      console.error('Import error:', error);
    }
  }
}

// Import Default Prompt Library
async function importDefaultLibraryHandler() {
  const button = document.getElementById('import-default-library');

  try {
    button.disabled = true;
    button.textContent = t('msgImporting');

    // Fetch the default library data
    const response = await fetch(chrome.runtime.getURL('data/prompt-libraries/default-prompts.json'));
    const promptsArray = await response.json();

    // Wrap array in expected format { prompts: [...] }
    const libraryData = Array.isArray(promptsArray)
      ? { prompts: promptsArray }
      : promptsArray;

    // Import using the prompt manager
    const result = await importDefaultLibrary(libraryData);

    // Update UI
    if (result.imported > 0) {
      button.textContent = t('msgImported');
      button.style.background = '#4caf50';
      button.style.color = 'white';
      showStatus('success', t('msgDefaultPromptsImported', [result.imported.toString(), result.skipped.toString()]));
    } else {
      button.textContent = t('msgAlreadyImported');
      button.disabled = true;
      showStatus('success', t('msgAllPromptsExist'));
    }

    // Refresh stats
    await loadDataStats();

  } catch (error) {
    showStatus('error', t('msgDefaultImportFailed'));
    button.disabled = false;
    button.textContent = t('btnImportDefault');
  }
}

// Enter Key Behavior Helper Functions
function updateEnterBehaviorVisibility(enabled) {
  const settingsDiv = document.getElementById('enter-behavior-settings');
  if (settingsDiv) {
    settingsDiv.style.display = enabled ? 'block' : 'none';
  }
}

function updateCustomEnterSettingsVisibility(preset) {
  const customDiv = document.getElementById('custom-enter-settings');
  if (customDiv) {
    customDiv.style.display = preset === 'custom' ? 'block' : 'none';
  }
}

function loadCustomEnterSettings(enterBehavior) {
  // Load newline modifiers
  document.getElementById('newline-shift').checked = enterBehavior.newlineModifiers.shift || false;
  document.getElementById('newline-ctrl').checked = enterBehavior.newlineModifiers.ctrl || false;
  document.getElementById('newline-alt').checked = enterBehavior.newlineModifiers.alt || false;
  document.getElementById('newline-meta').checked = enterBehavior.newlineModifiers.meta || false;

  // Load send modifiers
  document.getElementById('send-shift').checked = enterBehavior.sendModifiers.shift || false;
  document.getElementById('send-ctrl').checked = enterBehavior.sendModifiers.ctrl || false;
  document.getElementById('send-alt').checked = enterBehavior.sendModifiers.alt || false;
  document.getElementById('send-meta').checked = enterBehavior.sendModifiers.meta || false;
}

async function applyEnterKeyPreset(preset) {
  const settings = await getSettings();
  const enterBehavior = settings.enterKeyBehavior || {};

  enterBehavior.preset = preset;

  // Define preset configurations
  const presets = {
    default: {
      newlineModifiers: { shift: true, ctrl: false, alt: false, meta: false },
      sendModifiers: { shift: false, ctrl: false, alt: false, meta: false }
    },
    swapped: {
      newlineModifiers: { shift: false, ctrl: false, alt: false, meta: false },
      sendModifiers: { shift: true, ctrl: false, alt: false, meta: false }
    },
    slack: {
      newlineModifiers: { shift: false, ctrl: true, alt: false, meta: false },
      sendModifiers: { shift: false, ctrl: false, alt: false, meta: false }
    },
    discord: {
      newlineModifiers: { shift: false, ctrl: false, alt: false, meta: false },
      sendModifiers: { shift: false, ctrl: true, alt: false, meta: false }
    }
  };

  if (preset !== 'custom' && presets[preset]) {
    enterBehavior.newlineModifiers = presets[preset].newlineModifiers;
    enterBehavior.sendModifiers = presets[preset].sendModifiers;
    loadCustomEnterSettings(enterBehavior);
  }

  await saveSetting('enterKeyBehavior', enterBehavior);
  showStatus('success', t('msgPresetChanged', preset));
}

async function saveCustomEnterSettings() {
  const settings = await getSettings();
  const enterBehavior = settings.enterKeyBehavior || {};

  enterBehavior.preset = 'custom';
  enterBehavior.newlineModifiers = {
    shift: document.getElementById('newline-shift').checked,
    ctrl: document.getElementById('newline-ctrl').checked,
    alt: document.getElementById('newline-alt').checked,
    meta: document.getElementById('newline-meta').checked
  };
  enterBehavior.sendModifiers = {
    shift: document.getElementById('send-shift').checked,
    ctrl: document.getElementById('send-ctrl').checked,
    alt: document.getElementById('send-alt').checked,
    meta: document.getElementById('send-meta').checked
  };

  await saveSetting('enterKeyBehavior', enterBehavior);

  // Update preset dropdown to show custom
  const presetSelect = document.getElementById('enter-preset-select');
  if (presetSelect) {
    presetSelect.value = 'custom';
  }

  showStatus('success', t('msgCustomMappingSaved'));
}

// T073: Version Check Functions
async function loadVersionDisplay() {
  const versionInfo = await loadVersionInfo();
  if (!versionInfo) {
    document.getElementById('version').textContent = t('msgVersionUnknown');
    document.getElementById('commit-hash').textContent = t('msgCommitHashUnavailable');
    return;
  }

  document.getElementById('version').textContent = t('labelVersion', versionInfo.version);
  document.getElementById('commit-hash').textContent = t('msgBuildInfo', [versionInfo.commitHash, versionInfo.buildDate]);

  // Automatically check for updates on page load
  await performVersionCheck();
}

async function performVersionCheck() {
  const button = document.getElementById('check-updates-btn');
  const statusDiv = document.getElementById('update-status');

  try {
    button.disabled = true;
    button.textContent = t('msgChecking');
    statusDiv.style.display = 'none';

    const result = await checkForUpdates();

    if (result.error) {
      statusDiv.textContent = result.error;
      statusDiv.className = 'update-status update-error';
      statusDiv.style.display = 'block';
      showStatus('error', result.error);
    } else if (result.updateAvailable) {
      const latest = result.latestHash;
      const date = new Date(result.latestDate).toLocaleDateString();
      const current = result.currentHash;
      const message = result.latestMessage.split('\n')[0];
      statusDiv.innerHTML = t('msgUpdateStatusAvailable', [latest, date, current, message]);
      statusDiv.className = 'update-status update-available';
      statusDiv.style.display = 'block';
      showStatus('success', t('msgUpdateAvailable'));
    } else {
      statusDiv.textContent = t('msgLatestVersion');
      statusDiv.className = 'update-status update-current';
      statusDiv.style.display = 'block';
      showStatus('success', t('msgUpToDate'));
    }
  } catch (error) {
    statusDiv.textContent = t('msgCheckUpdatesFailed');
    statusDiv.className = 'update-status update-error';
    statusDiv.style.display = 'block';
    showStatus('error', t('msgCheckUpdatesFailed'));
    console.error('Version check error:', error);
  } finally {
    button.disabled = false;
    button.textContent = t('btnCheckUpdates');
  }
}

// Initialize on load
init();
