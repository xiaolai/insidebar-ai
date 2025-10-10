import { PROVIDERS, getProviderById, getEnabledProviders } from '../modules/providers.js';
import { applyTheme } from '../modules/theme-manager.js';
import {
  getAllPrompts,
  savePrompt,
  updatePrompt,
  deletePrompt,
  searchPrompts,
  getPromptsByCategory,
  getFavoritePrompts,
  toggleFavorite,
  recordPromptUsage,
  getAllCategories
} from '../modules/prompt-manager.js';

let currentProvider = null;
const loadedIframes = new Map();  // providerId -> iframe element
let currentView = 'providers';  // 'providers' or 'prompt-library'
let currentEditingPromptId = null;
let isShowingFavorites = false;

// Helper function to detect if dark theme is currently active
function isDarkTheme() {
  const theme = document.body.getAttribute('data-theme');
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  // Auto mode: check system preference
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// T013: Initialize sidebar
async function init() {
  await applyTheme();
  await renderProviderTabs();
  await loadDefaultProvider();
  setupMessageListener();
  setupPromptLibrary();  // T045: Initialize prompt library

  // Re-render tabs when theme changes
  setupThemeChangeListener();
}

// Listen for theme changes and re-render tabs with appropriate icons
function setupThemeChangeListener() {
  // Watch for data-theme attribute changes on body
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        renderProviderTabs();
      }
    });
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  // Also listen for system theme changes when in auto mode
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const theme = document.body.getAttribute('data-theme');
      if (theme === 'auto') {
        renderProviderTabs();
      }
    });
  }
}

// T014: Render provider tabs with icons
async function renderProviderTabs() {
  const enabledProviders = await getEnabledProviders();
  const tabsContainer = document.getElementById('provider-tabs');
  const useDarkIcons = isDarkTheme();

  tabsContainer.innerHTML = '';

  // Add provider tabs
  enabledProviders.forEach(provider => {
    const button = document.createElement('button');
    button.dataset.providerId = provider.id;
    button.title = provider.name; // Tooltip shows name on hover

    // Create icon element - use dark icon if available and theme is dark
    const icon = document.createElement('img');
    icon.src = useDarkIcons && provider.iconDark ? provider.iconDark : provider.icon;
    icon.alt = provider.name;
    icon.className = 'provider-icon';

    button.appendChild(icon);
    button.addEventListener('click', () => switchProvider(provider.id));
    tabsContainer.appendChild(button);
  });

  // Add separator between providers and UI tabs
  const separator = document.createElement('div');
  separator.className = 'tab-separator';
  tabsContainer.appendChild(separator);

  // Add prompt library tab at the end (right side)
  const promptLibraryTab = document.createElement('button');
  promptLibraryTab.id = 'prompt-library-tab';
  promptLibraryTab.dataset.view = 'prompt-library';
  promptLibraryTab.title = 'Prompt Library';

  const promptIcon = document.createElement('img');
  promptIcon.src = useDarkIcons ? '/icons/ui/dark/prompts.png' : '/icons/ui/prompts.png';
  promptIcon.alt = 'Prompts';
  promptIcon.className = 'provider-icon';

  promptLibraryTab.appendChild(promptIcon);
  promptLibraryTab.addEventListener('click', () => switchToView('prompt-library'));
  tabsContainer.appendChild(promptLibraryTab);

  // Add settings tab at the very end (right side)
  const settingsTab = document.createElement('button');
  settingsTab.id = 'settings-tab';
  settingsTab.dataset.view = 'settings';
  settingsTab.title = 'Settings';

  const settingsIcon = document.createElement('img');
  settingsIcon.src = useDarkIcons ? '/icons/ui/dark/settings.png' : '/icons/ui/settings.png';
  settingsIcon.alt = 'Settings';
  settingsIcon.className = 'provider-icon';

  settingsTab.appendChild(settingsIcon);
  settingsTab.addEventListener('click', () => switchToView('settings'));
  tabsContainer.appendChild(settingsTab);
}

// T015: Switch to a provider
async function switchProvider(providerId) {
  const provider = getProviderById(providerId);
  if (!provider) {
    showError(`Provider ${providerId} not found`);
    return;
  }

  // Hide non-provider views if currently active
  currentView = 'providers';
  document.getElementById('prompt-library').style.display = 'none';
  const settingsView = document.getElementById('settings-view');
  if (settingsView) settingsView.style.display = 'none';

  // Show provider container
  document.getElementById('provider-container').style.display = 'flex';

  // Update active tab - deactivate all tabs first
  document.querySelectorAll('#provider-tabs button').forEach(btn => {
    btn.classList.remove('active');
  });

  // Deactivate prompt library and settings tabs
  const promptLibraryTab = document.getElementById('prompt-library-tab');
  const settingsTab = document.getElementById('settings-tab');
  if (promptLibraryTab) promptLibraryTab.classList.remove('active');
  if (settingsTab) settingsTab.classList.remove('active');

  // Activate the selected provider tab
  const activeProviderTab = document.querySelector(`#provider-tabs button[data-provider-id="${providerId}"]`);
  if (activeProviderTab) activeProviderTab.classList.add('active');

  // Hide current provider iframe
  if (currentProvider && loadedIframes.has(currentProvider)) {
    loadedIframes.get(currentProvider).style.display = 'none';
  }

  // Load or show provider iframe
  if (!loadedIframes.has(providerId)) {
    const iframe = createProviderIframe(provider);
    loadedIframes.set(providerId, iframe);
  } else {
    loadedIframes.get(providerId).style.display = 'block';
  }

  currentProvider = providerId;

  // Save last selected provider
  await chrome.storage.sync.set({ lastSelectedProvider: providerId });

  hideLoading();
  hideError();
}

// T016: Create iframe for provider
function createProviderIframe(provider) {
  const container = document.getElementById('provider-container');
  const iframe = document.createElement('iframe');

  iframe.src = provider.url;
  iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox';
  iframe.allow = 'clipboard-read; clipboard-write';

  iframe.addEventListener('load', () => {
    console.log(`${provider.name} loaded`);
    hideLoading();
  });

  iframe.addEventListener('error', () => {
    showError(`Failed to load ${provider.name}. Please try again or check your internet connection.`);
  });

  container.appendChild(iframe);
  return iframe;
}

// T017: Load default or last selected provider
async function loadDefaultProvider() {
  const settings = await chrome.storage.sync.get({
    lastSelectedProvider: 'chatgpt',
    defaultProvider: 'chatgpt'
  });
  const providerId = settings.lastSelectedProvider || settings.defaultProvider;
  await switchProvider(providerId);
}

// T018: Setup message listener
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'switchProvider') {
      switchProvider(message.payload.providerId);
      sendResponse({ success: true });
    } else if (message.action === 'openPromptLibrary') {
      // T048: Switch to Prompt Genie tab
      switchToView('prompt-library');
      sendResponse({ success: true });
    }
    return true;
  });

  // T026: Listen for settings changes to re-render tabs
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.enabledProviders) {
      renderProviderTabs();
      // If current provider was disabled, switch to first enabled provider
      const newEnabledProviders = changes.enabledProviders.newValue;
      if (currentProvider && !newEnabledProviders.includes(currentProvider)) {
        switchProvider(newEnabledProviders[0]);
      }
    }
  });
}

// T019: Show/hide error message
function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = message;
  errorEl.style.display = 'flex';
  hideLoading();
}

function hideError() {
  document.getElementById('error').style.display = 'none';
}

// T020: Show/hide loading indicator
function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

// T045-T049: Prompt Library Implementation
function setupPromptLibrary() {
  // Note: Prompt library tab is now created in renderProviderTabs()
  // No need to add event listener here as it's done during creation

  // New prompt button
  document.getElementById('new-prompt-btn').addEventListener('click', () => openPromptEditor());

  // Search functionality
  const searchInput = document.getElementById('prompt-search');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (e.target.value.trim()) {
        filterPrompts('search', e.target.value);
      } else {
        renderPromptList();
      }
    }, 300);
  });

  // Category filter
  document.getElementById('category-filter').addEventListener('change', (e) => {
    if (e.target.value) {
      filterPrompts('category', e.target.value);
    } else {
      renderPromptList();
    }
  });

  // Favorites filter
  document.getElementById('show-favorites').addEventListener('click', (e) => {
    isShowingFavorites = !isShowingFavorites;
    e.target.classList.toggle('active', isShowingFavorites);
    if (isShowingFavorites) {
      filterPrompts('favorites');
    } else {
      renderPromptList();
    }
  });

  // Modal controls
  document.getElementById('close-editor').addEventListener('click', closePromptEditor);
  document.getElementById('cancel-edit-btn').addEventListener('click', closePromptEditor);
  document.getElementById('save-prompt-btn').addEventListener('click', savePromptFromEditor);

  // Close modal on outside click
  document.getElementById('prompt-editor-modal').addEventListener('click', (e) => {
    if (e.target.id === 'prompt-editor-modal') {
      closePromptEditor();
    }
  });
}

function switchToView(view) {
  currentView = view;

  // Hide all views first
  document.getElementById('provider-container').style.display = 'none';
  document.getElementById('prompt-library').style.display = 'none';
  const settingsView = document.getElementById('settings-view');
  if (settingsView) settingsView.style.display = 'none';

  // Deactivate all tabs
  document.querySelectorAll('#provider-tabs button').forEach(btn => {
    btn.classList.remove('active');
  });

  if (view === 'prompt-library') {
    document.getElementById('prompt-library').style.display = 'flex';
    document.getElementById('prompt-library-tab').classList.add('active');
    renderPromptList();
    updateCategoryFilter();
  } else if (view === 'settings') {
    if (settingsView) settingsView.style.display = 'flex';
    const settingsTab = document.getElementById('settings-tab');
    if (settingsTab) settingsTab.classList.add('active');
    renderSettings();
  } else {
    // Switch back to providers view
    document.getElementById('provider-container').style.display = 'flex';
    if (currentProvider) {
      const providerTab = document.querySelector(`#provider-tabs button[data-provider-id="${currentProvider}"]`);
      if (providerTab) providerTab.classList.add('active');
    }
  }
}

async function renderPromptList(prompts = null) {
  const listContainer = document.getElementById('prompt-list');

  if (!prompts) {
    prompts = await getAllPrompts();
  }

  if (prompts.length === 0) {
    listContainer.innerHTML = `
      <div class="prompt-list-empty">
        <p>📝 No prompts yet</p>
        <p>Click "+ New" to create your first prompt</p>
      </div>
    `;
    return;
  }

  // Sort by most recently used, then by created date
  prompts.sort((a, b) => {
    if (a.lastUsed && b.lastUsed) return b.lastUsed - a.lastUsed;
    if (a.lastUsed) return -1;
    if (b.lastUsed) return 1;
    return b.createdAt - a.createdAt;
  });

  listContainer.innerHTML = prompts.map(prompt => `
    <div class="prompt-item" data-prompt-id="${prompt.id}">
      <div class="prompt-item-header">
        <h4 class="prompt-item-title">${escapeHtml(prompt.title)}</h4>
        <div class="prompt-item-actions">
          <button class="favorite-btn" data-id="${prompt.id}" title="Toggle favorite">
            ${prompt.isFavorite ? '★' : '☆'}
          </button>
          <button class="copy-btn" data-id="${prompt.id}" title="Copy to clipboard">📋</button>
          <button class="edit-btn" data-id="${prompt.id}" title="Edit">✏️</button>
          <button class="delete-btn" data-id="${prompt.id}" title="Delete">🗑️</button>
        </div>
      </div>
      <div class="prompt-item-content">${escapeHtml(prompt.content)}</div>
      <div class="prompt-item-meta">
        <span class="prompt-item-category">${escapeHtml(prompt.category)}</span>
        ${prompt.tags.length > 0 ? `
          <div class="prompt-item-tags">
            ${prompt.tags.map(tag => `<span class="prompt-item-tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
        ${prompt.useCount > 0 ? `<span>Used ${prompt.useCount}×</span>` : ''}
      </div>
    </div>
  `).join('');

  // Add event listeners
  listContainer.querySelectorAll('.prompt-item').forEach(item => {
    const id = parseInt(item.dataset.promptId);

    // Click on item to use prompt
    item.addEventListener('click', async (e) => {
      if (e.target.closest('button')) return; // Don't trigger on button clicks
      await usePrompt(id);
    });
  });

  listContainer.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await togglePromptFavorite(parseInt(btn.dataset.id));
    });
  });

  listContainer.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await copyPromptToClipboard(parseInt(btn.dataset.id));
    });
  });

  listContainer.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPromptEditor(parseInt(btn.dataset.id));
    });
  });

  listContainer.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deletePromptWithConfirm(parseInt(btn.dataset.id));
    });
  });
}

async function filterPrompts(filterType, value) {
  let prompts;

  if (filterType === 'search') {
    prompts = await searchPrompts(value);
  } else if (filterType === 'category') {
    prompts = await getPromptsByCategory(value);
  } else if (filterType === 'favorites') {
    prompts = await getFavoritePrompts();
  }

  renderPromptList(prompts);
}

async function updateCategoryFilter() {
  const categories = await getAllCategories();
  const select = document.getElementById('category-filter');

  select.innerHTML = '<option value="">All Categories</option>' +
    categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
}

function openPromptEditor(promptId = null) {
  const modal = document.getElementById('prompt-editor-modal');
  const title = document.getElementById('editor-title');

  currentEditingPromptId = promptId;

  if (promptId) {
    // Edit existing prompt
    title.textContent = 'Edit Prompt';
    loadPromptIntoEditor(promptId);
  } else {
    // New prompt
    title.textContent = 'New Prompt';
    clearEditorFields();
  }

  modal.style.display = 'flex';
}

async function loadPromptIntoEditor(promptId) {
  const prompt = await getAllPrompts();
  const targetPrompt = prompt.find(p => p.id === promptId);

  if (!targetPrompt) return;

  document.getElementById('prompt-title-input').value = targetPrompt.title;
  document.getElementById('prompt-content-input').value = targetPrompt.content;
  document.getElementById('prompt-category-input').value = targetPrompt.category;
  document.getElementById('prompt-tags-input').value = targetPrompt.tags.join(', ');
  document.getElementById('prompt-favorite-input').checked = targetPrompt.isFavorite;
}

function clearEditorFields() {
  document.getElementById('prompt-title-input').value = '';
  document.getElementById('prompt-content-input').value = '';
  document.getElementById('prompt-category-input').value = 'General';
  document.getElementById('prompt-tags-input').value = '';
  document.getElementById('prompt-favorite-input').checked = false;
}

function closePromptEditor() {
  document.getElementById('prompt-editor-modal').style.display = 'none';
  currentEditingPromptId = null;
  clearEditorFields();
}

async function savePromptFromEditor() {
  const title = document.getElementById('prompt-title-input').value.trim();
  const content = document.getElementById('prompt-content-input').value.trim();
  const category = document.getElementById('prompt-category-input').value.trim() || 'General';
  const tagsInput = document.getElementById('prompt-tags-input').value.trim();
  const isFavorite = document.getElementById('prompt-favorite-input').checked;

  if (!content) {
    alert('Please enter prompt content');
    return;
  }

  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

  const promptData = {
    title: title || 'Untitled Prompt',
    content,
    category,
    tags,
    isFavorite
  };

  try {
    if (currentEditingPromptId) {
      await updatePrompt(currentEditingPromptId, promptData);
    } else {
      await savePrompt(promptData);
    }

    closePromptEditor();
    renderPromptList();
    updateCategoryFilter();
  } catch (error) {
    console.error('Error saving prompt:', error);
    alert('Failed to save prompt. Please try again.');
  }
}

async function usePrompt(promptId) {
  try {
    const prompts = await getAllPrompts();
    const prompt = prompts.find(p => p.id === promptId);

    if (!prompt) return;

    // Copy to clipboard
    await navigator.clipboard.writeText(prompt.content);

    // Record usage
    await recordPromptUsage(promptId);

    // Show feedback
    showToast('Prompt copied to clipboard!');

    // Re-render to update use count
    renderPromptList();
  } catch (error) {
    console.error('Error using prompt:', error);
    showToast('Failed to copy prompt');
  }
}

async function togglePromptFavorite(promptId) {
  try {
    await toggleFavorite(promptId);

    // Re-render current view
    if (isShowingFavorites) {
      filterPrompts('favorites');
    } else {
      renderPromptList();
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
}

async function copyPromptToClipboard(promptId) {
  try {
    const prompts = await getAllPrompts();
    const prompt = prompts.find(p => p.id === promptId);

    if (!prompt) return;

    await navigator.clipboard.writeText(prompt.content);
    showToast('Copied to clipboard!');
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    showToast('Failed to copy');
  }
}

async function deletePromptWithConfirm(promptId) {
  const prompts = await getAllPrompts();
  const prompt = prompts.find(p => p.id === promptId);

  if (!prompt) return;

  if (confirm(`Delete prompt "${prompt.title}"?`)) {
    try {
      await deletePrompt(promptId);
      renderPromptList();
      updateCategoryFilter();
      showToast('Prompt deleted');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      showToast('Failed to delete prompt');
    }
  }
}

function showToast(message) {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 12px 24px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Settings Page Implementation
async function renderSettings() {
  const settingsContainer = document.getElementById('settings-content');
  if (!settingsContainer) return;

  // Get current settings
  const settings = await chrome.storage.sync.get({
    theme: 'auto',
    defaultProvider: 'chatgpt',
    enabledProviders: PROVIDERS.map(p => p.id)
  });

  settingsContainer.innerHTML = `
    <div class="settings-section">
      <h3>Appearance</h3>
      <div class="setting-item">
        <label for="theme-select">Theme</label>
        <select id="theme-select">
          <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>Auto (System)</option>
          <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
          <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
        </select>
      </div>
    </div>

    <div class="settings-section">
      <h3>Default Provider</h3>
      <div class="setting-item">
        <label for="default-provider-select">Default AI Provider</label>
        <select id="default-provider-select">
          ${PROVIDERS.map(p => `
            <option value="${p.id}" ${settings.defaultProvider === p.id ? 'selected' : ''}>
              ${p.name}
            </option>
          `).join('')}
        </select>
      </div>
    </div>

    <div class="settings-section">
      <h3>Enabled Providers</h3>
      <div class="setting-item">
        <p class="setting-description">Select which AI providers appear in your sidebar</p>
        ${PROVIDERS.map(p => `
          <label class="checkbox-label">
            <input type="checkbox"
                   class="provider-checkbox"
                   data-provider-id="${p.id}"
                   ${settings.enabledProviders.includes(p.id) ? 'checked' : ''}>
            ${p.name}
          </label>
        `).join('')}
      </div>
    </div>

    <div class="settings-section">
      <h3>About</h3>
      <div class="setting-item">
        <p><strong>Smarter Panel</strong></p>
        <p>Version 1.0.0</p>
        <p class="setting-description">
          A unified sidebar for accessing multiple AI providers with built-in prompt management.
        </p>
      </div>
    </div>

    <div class="settings-actions">
      <button id="save-settings-btn" class="primary">Save Settings</button>
      <button id="reset-settings-btn" class="secondary">Reset to Defaults</button>
    </div>
  `;

  // Add event listeners
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.getElementById('reset-settings-btn').addEventListener('click', resetSettings);
}

async function saveSettings() {
  const theme = document.getElementById('theme-select').value;
  const defaultProvider = document.getElementById('default-provider-select').value;

  const enabledProviders = [];
  document.querySelectorAll('.provider-checkbox:checked').forEach(checkbox => {
    enabledProviders.push(checkbox.dataset.providerId);
  });

  if (enabledProviders.length === 0) {
    alert('Please enable at least one provider');
    return;
  }

  try {
    await chrome.storage.sync.set({
      theme,
      defaultProvider,
      enabledProviders
    });

    // Apply theme immediately
    await applyTheme();

    showToast('Settings saved successfully!');

    // Re-render tabs if providers changed
    await renderProviderTabs();
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Failed to save settings');
  }
}

async function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) return;

  try {
    await chrome.storage.sync.set({
      theme: 'auto',
      defaultProvider: 'chatgpt',
      enabledProviders: PROVIDERS.map(p => p.id)
    });

    await applyTheme();
    showToast('Settings reset successfully!');
    renderSettings();
    await renderProviderTabs();
  } catch (error) {
    console.error('Error resetting settings:', error);
    showToast('Failed to reset settings');
  }
}

// Initialize on load
init();
