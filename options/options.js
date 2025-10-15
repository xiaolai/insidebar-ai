// T050-T064: Settings Page Implementation
import { PROVIDERS } from '../modules/providers.js';
import { getSettings, getSetting, saveSettings, saveSetting, resetSettings, exportSettings, importSettings } from '../modules/settings.js';
import { applyTheme } from '../modules/theme-manager.js';
import {
  getAllPrompts,
  getFavoritePrompts,
  getAllCategories,
  exportPrompts,
  importPrompts,
  clearAllPrompts,
  importDefaultLibrary
} from '../modules/prompt-manager.js';
const DEFAULT_ENABLED_PROVIDERS = ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek'];

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
  await loadSettings();
  await loadDataStats();
  await renderProviderList();
  setupEventListeners();
  setupShortcutHelpers();
}

// T051: Load and display current settings
async function loadSettings() {
  const settings = await getSettings();

  // Theme
  document.getElementById('theme-select').value = settings.theme || 'auto';

  // Default provider
  document.getElementById('default-provider-select').value = settings.defaultProvider || 'chatgpt';

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
    // Silently handle data stats errors
    document.getElementById('stat-prompts').textContent = '0';
    document.getElementById('stat-favorites').textContent = '0';
    document.getElementById('stat-categories').textContent = '0';
    document.getElementById('stat-storage').textContent = '0 KB';
  }
}

// T057-T064: Setup event listeners
function setupEventListeners() {
  // Theme change
  document.getElementById('theme-select').addEventListener('change', async (e) => {
    await saveSetting('theme', e.target.value);
    await applyTheme();  // Re-apply theme immediately
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

  // Auto-paste clipboard toggle
  const autoPasteToggle = document.getElementById('auto-paste-toggle');
  if (autoPasteToggle) {
    autoPasteToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await saveSetting('autoPasteClipboard', enabled);
      showStatus('success', enabled ? 'Auto-paste enabled' : 'Auto-paste disabled');
    });
  }

  // Auto-open sidebar after save toggle
  const autoOpenSidebarToggle = document.getElementById('auto-open-sidebar-toggle');
  if (autoOpenSidebarToggle) {
    autoOpenSidebarToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await saveSetting('autoOpenSidebarOnSave', enabled);
      showStatus('success', enabled ? 'Auto-open sidebar enabled' : 'Auto-open sidebar disabled');
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

  // Reset data
  document.getElementById('reset-btn').addEventListener('click', resetData);

  // Default library import button
  document.getElementById('import-default-library')?.addEventListener('click', importDefaultLibraryHandler);

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
      showStatus('success', enabled ? 'Enter key customization enabled' : 'Enter key customization disabled');
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
    let promptImportSummary = null;
    if (data.prompts && Array.isArray(data.prompts)) {
      promptImportSummary = await importPrompts({ prompts: data.prompts }, 'skip');
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

    if (promptImportSummary) {
      const { imported = 0, skipped = 0 } = promptImportSummary;
      showStatus('success', `Data imported successfully — prompts: ${imported} added, ${skipped} skipped.`);
    } else {
      showStatus('success', 'Data imported successfully.');
    }
  } catch (error) {
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

// Import Default Prompt Library
async function importDefaultLibraryHandler() {
  const button = document.getElementById('import-default-library');

  try {
    button.disabled = true;
    button.textContent = 'Importing...';

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
      button.textContent = '✓ Imported';
      button.style.background = '#4caf50';
      button.style.color = 'white';
      showStatus('success', `Successfully imported ${result.imported} prompts${result.skipped > 0 ? ` (${result.skipped} already existed)` : ''}`);
    } else {
      button.textContent = 'Already Imported';
      button.disabled = true;
      showStatus('success', 'All prompts already exist in your library');
    }

    // Refresh stats
    await loadDataStats();

  } catch (error) {
    showStatus('error', 'Failed to import default library');
    button.disabled = false;
    button.textContent = 'Import Default Prompts';
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
  showStatus('success', `Preset changed to: ${preset}`);
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

  showStatus('success', 'Custom key mapping saved');
}

// Initialize on load
init();
