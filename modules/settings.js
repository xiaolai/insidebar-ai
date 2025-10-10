const DEFAULT_SETTINGS = {
  enabledProviders: ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek'],
  defaultProvider: 'chatgpt',
  lastSelectedProvider: 'chatgpt',
  theme: 'auto'
};

export async function getSettings() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    return result;
  } catch (error) {
    console.warn('chrome.storage.sync unavailable, using local', error);
    return await chrome.storage.local.get(DEFAULT_SETTINGS);
  }
}

export async function getSetting(key) {
  const settings = await getSettings();
  return settings[key];
}

export async function saveSetting(key, value) {
  const update = { [key]: value };
  try {
    await chrome.storage.sync.set(update);
  } catch (error) {
    console.warn('chrome.storage.sync unavailable, using local', error);
    await chrome.storage.local.set(update);
  }
}

export async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set(settings);
  } catch (error) {
    console.warn('chrome.storage.sync unavailable, using local', error);
    await chrome.storage.local.set(settings);
  }
}

export async function resetSettings() {
  try {
    await chrome.storage.sync.clear();
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
  } catch (error) {
    console.warn('chrome.storage.sync unavailable, using local', error);
    await chrome.storage.local.clear();
    await chrome.storage.local.set(DEFAULT_SETTINGS);
  }
}

export async function exportSettings() {
  return await getSettings();
}

export async function importSettings(settings) {
  // Validate settings
  const validKeys = Object.keys(DEFAULT_SETTINGS);
  const imported = {};
  const skipped = [];
  const errors = {};

  for (const [key, value] of Object.entries(settings)) {
    if (validKeys.includes(key)) {
      imported[key] = value;
    } else {
      skipped.push(key);
      errors[key] = 'Setting key not recognized';
    }
  }

  await saveSettings(imported);

  return {
    success: true,
    imported: Object.keys(imported),
    skipped,
    errors
  };
}
