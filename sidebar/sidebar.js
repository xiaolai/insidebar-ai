import { PROVIDERS, getProviderById, getProviderByIdWithSettings, getEnabledProviders } from '../modules/providers.js';
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
let isSwitchingProvider = false;
let pendingProviderId = null;
const EDGE_SHORTCUT_STORAGE_KEY = 'edgeShortcutReminderDismissed';

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

  // Show shortcut reminder for Edge users once
  await checkEdgeShortcutReminder();
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
  settingsTab.title = 'Settings';

  const settingsIcon = document.createElement('img');
  settingsIcon.src = useDarkIcons ? '/icons/ui/dark/settings.png' : '/icons/ui/settings.png';
  settingsIcon.alt = 'Settings';
  settingsIcon.className = 'provider-icon';

  settingsTab.appendChild(settingsIcon);
  settingsTab.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  tabsContainer.appendChild(settingsTab);
}

// T015: Switch to a provider
async function switchProvider(providerId) {
  if (isSwitchingProvider) {
    pendingProviderId = providerId;
    return;
  }

  isSwitchingProvider = true;
  const provider = await getProviderByIdWithSettings(providerId);
  if (!provider) {
    showError(`Provider ${providerId} not found`);
    isSwitchingProvider = false;
    // Process any pending switch request
    if (pendingProviderId && pendingProviderId !== providerId) {
      const next = pendingProviderId;
      pendingProviderId = null;
      switchProvider(next);
    }
    return;
  }

  // Hide non-provider views if currently active
  currentView = 'providers';
  document.getElementById('prompt-library').style.display = 'none';

  // Show provider container
  document.getElementById('provider-container').style.display = 'flex';

  // Update active tab - deactivate all tabs first
  document.querySelectorAll('#provider-tabs button').forEach(btn => {
    btn.classList.remove('active');
  });

  // Deactivate prompt library tab
  const promptLibraryTab = document.getElementById('prompt-library-tab');
  if (promptLibraryTab) promptLibraryTab.classList.remove('active');

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

  hideError();

  isSwitchingProvider = false;
  if (pendingProviderId && pendingProviderId !== providerId) {
    const next = pendingProviderId;
    pendingProviderId = null;
    switchProvider(next);
  } else {
    pendingProviderId = null;
  }
}

// T016: Create iframe for provider
function createProviderIframe(provider) {
  const container = document.getElementById('provider-container');
  const iframe = document.createElement('iframe');

  iframe.src = provider.url;
  // Sandbox must allow same-origin + scripts so provider UIs can function; popups are
  // permitted to support OAuth flows within embedded sites. See README "Permissions"
  // for the full security rationale.
  iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox';
  iframe.allow = 'clipboard-read; clipboard-write';
  iframe.loading = 'eager';  // Hint to browser to load immediately

  iframe.addEventListener('load', () => {
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
function showLoading(message = 'Loading AI provider...') {
  const loadingEl = document.getElementById('loading');
  loadingEl.textContent = message;
  loadingEl.style.display = 'flex';
}

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

  // Deactivate all tabs
  document.querySelectorAll('#provider-tabs button').forEach(btn => {
    btn.classList.remove('active');
  });

  if (view === 'prompt-library') {
    document.getElementById('prompt-library').style.display = 'flex';
    document.getElementById('prompt-library-tab').classList.add('active');
    renderPromptList();
    updateCategoryFilter();
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

function isEdgeBrowser() {
  const uaData = navigator.userAgentData;
  if (uaData && Array.isArray(uaData.brands)) {
    return uaData.brands.some(brand => /Edge/i.test(brand.brand));
  }
  return navigator.userAgent.includes('Edg/');
}

async function checkEdgeShortcutReminder() {
  if (!isEdgeBrowser()) return;

  try {
    const settings = await chrome.storage.sync.get({
      [EDGE_SHORTCUT_STORAGE_KEY]: false,
      keyboardShortcutEnabled: true
    });

    if (settings.keyboardShortcutEnabled === false) {
      return;
    }

    if (!settings[EDGE_SHORTCUT_STORAGE_KEY]) {
      showEdgeShortcutReminder();
    }
  } catch (error) {
    console.warn('Unable to read shortcut reminder state:', error);
  }
}

function showEdgeShortcutReminder() {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(22, 22, 22, 0.92);
    color: #fff;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    max-width: 420px;
    font-size: 14px;
  `;

  const message = document.createElement('div');
  message.textContent = 'Enable the Smarter Panel shortcut: confirm it in edge://extensions/shortcuts';

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';

  const openButton = document.createElement('button');
  openButton.textContent = 'Open settings';
  openButton.style.cssText = `
    background: #4c8bf5;
    border: none;
    color: #fff;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
  `;
  openButton.addEventListener('click', async () => {
    openBrowserShortcutSettings('edge');
    await dismissEdgeShortcutReminder();
    banner.remove();
  });

  const dismissButton = document.createElement('button');
  dismissButton.textContent = 'Dismiss';
  dismissButton.style.cssText = `
    background: transparent;
    border: 1px solid rgba(255,255,255,0.6);
    color: #fff;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
  `;
  dismissButton.addEventListener('click', async () => {
    await dismissEdgeShortcutReminder();
    banner.remove();
  });

  actions.appendChild(openButton);
  actions.appendChild(dismissButton);
  banner.appendChild(message);
  banner.appendChild(actions);

  document.body.appendChild(banner);
}

async function dismissEdgeShortcutReminder() {
  try {
    await chrome.storage.sync.set({ [EDGE_SHORTCUT_STORAGE_KEY]: true });
  } catch (error) {
    console.warn('Unable to persist shortcut reminder state:', error);
  }
}

function openBrowserShortcutSettings(browser) {
  const url = browser === 'edge'
    ? 'edge://extensions/shortcuts'
    : 'chrome://extensions/shortcuts';

  try {
    chrome.tabs.create({ url });
  } catch (error) {
    console.warn('Unable to open shortcut settings via chrome.tabs, falling back to window.open', error);
    window.open(url, '_blank');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on load
init();
