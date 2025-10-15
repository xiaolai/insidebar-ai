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
  getAllCategories,
  getRecentlyUsedPrompts,
  getTopFavorites
} from '../modules/prompt-manager.js';
import {
  saveConversation,
  getConversation,
  getAllConversations,
  updateConversation,
  deleteConversation,
  searchConversations,
  getConversationsByProvider,
  getFavoriteConversations,
  toggleConversationFavorite,
  getAllConversationTags,
  generateAutoTitle
} from '../modules/history-manager.js';

let currentProvider = null;
const loadedIframes = new Map();  // providerId -> iframe element
const loadedIframesState = new Map();  // providerId -> 'loading' | 'ready'
let currentView = 'providers';  // 'providers', 'prompt-library', or 'chat-history'
let currentEditingPromptId = null;
let currentInsertPromptId = null;  // T071: For insert prompt modal
let isShowingFavorites = false;
let currentSortOrder = 'recent';  // T071: Current sort order
let isSwitchingProvider = false;
let pendingProviderId = null;
const EDGE_SHORTCUT_STORAGE_KEY = 'edgeShortcutReminderDismissed';

// Chat History state
let isShowingHistoryFavorites = false;
let currentEditingConversationId = null;
let currentViewingConversationId = null;

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
  setupChatHistory();     // Initialize chat history

  // Re-render tabs when theme changes
  setupThemeChangeListener();

  // Show shortcut reminder for Edge users once
  await checkEdgeShortcutReminder();

  // T070: Notify background when sidebar closes
  window.addEventListener('beforeunload', () => {
    try {
      chrome.runtime.sendMessage({ action: 'sidePanelClosed', payload: {} });
    } catch (error) {
      // Ignore errors during unload
    }
  });
}

// Listen for theme changes and re-render tabs with appropriate icons
function setupThemeChangeListener() {
  // Watch for data-theme attribute changes on body
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        renderProviderTabs();
        updateWorkspaceProviderSelector();
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
        updateWorkspaceProviderSelector();
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

  // Add chat history tab
  const historyTab = document.createElement('button');
  historyTab.id = 'chat-history-tab';
  historyTab.dataset.view = 'chat-history';
  historyTab.title = 'Chat History';

  const historyIcon = document.createElement('img');
  historyIcon.src = useDarkIcons ? '/icons/ui/dark/chat-history.png' : '/icons/ui/chat-history.png';
  historyIcon.alt = 'History';
  historyIcon.className = 'provider-icon';

  historyTab.appendChild(historyIcon);
  historyTab.addEventListener('click', () => switchToView('chat-history'));
  tabsContainer.appendChild(historyTab);

  // Add prompt library tab
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
  document.getElementById('chat-history').style.display = 'none';

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

  // Set initial state as loading
  loadedIframesState.set(provider.id, 'loading');

  iframe.addEventListener('load', () => {
    hideLoading();
    // Mark iframe as ready
    loadedIframesState.set(provider.id, 'ready');
  });

  iframe.addEventListener('error', () => {
    showError(`Failed to load ${provider.name}. Please try again or check your internet connection.`);
    // Mark as ready even on error to prevent infinite waiting
    loadedIframesState.set(provider.id, 'ready');
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
    // Handle async operations properly
    (async () => {
      try {
        if (message.action === 'switchProvider') {
          await switchProvider(message.payload.providerId);

          // If there's selected text, inject it into the provider iframe
          if (message.payload.selectedText) {
            await injectTextIntoProvider(message.payload.providerId, message.payload.selectedText);
          }

          sendResponse({ success: true });
        } else if (message.action === 'openPromptLibrary') {
          // T048: Switch to Prompt Genie tab
          switchToView('prompt-library');

          // If there's selected text, show it in the workspace
          if (message.payload?.selectedText) {
            showWorkspaceWithText(message.payload.selectedText);
          } else {
            // T069: Check if auto-paste is enabled
            const settings = await chrome.storage.sync.get({ autoPasteClipboard: false });
            if (settings.autoPasteClipboard) {
              try {
                const clipboardText = await navigator.clipboard.readText();
                if (clipboardText && clipboardText.trim()) {
                  showWorkspaceWithText(clipboardText);
                }
              } catch (error) {
                console.warn('Could not read clipboard:', error);
                // Silently fail - user may not have granted clipboard permission
              }
            }
          }

          sendResponse({ success: true });
        } else if (message.action === 'closeSidePanel') {
          // T070: Close side panel when requested
          window.close();
          sendResponse({ success: true });
        } else if (message.action === 'saveExtractedConversation') {
          // Handle extracted conversation from ChatGPT page
          await handleExtractedConversation(message.payload);
          sendResponse({ success: true });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Keep channel open for async response
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

// Wait for iframe to be fully loaded and ready
async function waitForIframeReady(providerId) {
  const iframe = loadedIframes.get(providerId);
  if (!iframe) {
    throw new Error(`Iframe for provider ${providerId} not found`);
  }

  const state = loadedIframesState.get(providerId);

  // If already ready, return immediately
  if (state === 'ready') {
    return;
  }

  // If loading, wait for load event
  return new Promise((resolve) => {
    const checkReady = () => {
      if (loadedIframesState.get(providerId) === 'ready') {
        resolve();
      } else {
        // Check again after a short delay
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  });
}

// Inject selected text into provider iframe
async function injectTextIntoProvider(providerId, text) {
  if (!text || !providerId) {
    return;
  }

  try {
    // Wait for iframe to be ready (event-driven, no fixed delay)
    await waitForIframeReady(providerId);

    const iframe = loadedIframes.get(providerId);
    if (!iframe || !iframe.contentWindow) {
      console.warn('Provider iframe not found or not ready:', providerId);
      return;
    }

    // Send message to content script inside the iframe
    iframe.contentWindow.postMessage(
      {
        type: 'INJECT_TEXT',
        text: text
      },
      '*' // We're posting to same-origin AI provider domains
    );
  } catch (error) {
    console.error('Error sending text injection message:', error);
  }
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

  // Category filter button
  const categoryBtn = document.getElementById('category-filter-btn');
  const categoryPopup = document.getElementById('category-popup');

  categoryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = categoryPopup.style.display === 'block';
    categoryPopup.style.display = isVisible ? 'none' : 'block';
    categoryBtn.classList.toggle('active', !isVisible);
  });

  // Close popup when clicking outside
  document.addEventListener('click', (e) => {
    if (!categoryBtn.contains(e.target) && !categoryPopup.contains(e.target)) {
      categoryPopup.style.display = 'none';
      categoryBtn.classList.remove('active');
    }
  });

  // Handle category selection from popup
  categoryPopup.addEventListener('click', (e) => {
    if (e.target.classList.contains('category-popup-item')) {
      const value = e.target.dataset.value;

      // Update selected state
      categoryPopup.querySelectorAll('.category-popup-item').forEach(item => {
        item.classList.remove('selected');
      });
      e.target.classList.add('selected');

      // Filter prompts
      if (value) {
        filterPrompts('category', value);
      } else {
        renderPromptList();
      }

      // Close popup
      categoryPopup.style.display = 'none';
      categoryBtn.classList.remove('active');
    }
  });

  // T071: Sort buttons with toggle groups
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Check if this is a toggle button
      if (btn.classList.contains('sort-toggle')) {
        const currentSort = btn.dataset.sort;
        const altSort = btn.dataset.altSort;

        // Define icon and title mappings (Material Symbols)
        const sortConfig = {
          'alphabetical': { icon: 'sort_by_alpha', title: 'A-Z' },
          'reverse-alphabetical': { icon: 'sort_by_alpha', title: 'Z-A' },
          'newest': { icon: 'new_releases', title: 'Newest First' },
          'oldest': { icon: 'history', title: 'Oldest First' }
        };

        // If button is already active, toggle it
        if (btn.classList.contains('active')) {
          // Swap the sort orders
          btn.dataset.sort = altSort;
          btn.dataset.altSort = currentSort;

          // Update icon and title
          const iconSpan = btn.querySelector('.material-symbols-outlined');
          if (iconSpan) {
            iconSpan.textContent = sortConfig[altSort].icon;
          }
          btn.title = sortConfig[altSort].title;

          // Update current sort order
          currentSortOrder = altSort;
        } else {
          // Activate this button
          document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentSortOrder = currentSort;
        }
      } else {
        // For non-toggle buttons (recent, most-used), behave normally
        const sortOrder = btn.dataset.sort;
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSortOrder = sortOrder;
      }

      renderPromptList();
    });
  });

  // Favorites filter
  const favoritesBtn = document.getElementById('show-favorites');
  if (favoritesBtn) {
    favoritesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isShowingFavorites = !isShowingFavorites;

      // Toggle icon between filled and unfilled star (Material Symbols)
      const iconSpan = favoritesBtn.querySelector('.material-symbols-outlined');
      if (iconSpan) {
        if (isShowingFavorites) {
          iconSpan.classList.add('filled');
        } else {
          iconSpan.classList.remove('filled');
        }
      }
      favoritesBtn.title = isShowingFavorites ? 'Show all prompts' : 'Show favorites only';
      favoritesBtn.classList.toggle('active', isShowingFavorites);

      if (isShowingFavorites) {
        filterPrompts('favorites');
      } else {
        renderPromptList();
      }
    });
  }

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

  // T071: Insert Prompt Modal listeners
  document.getElementById('close-insert-modal').addEventListener('click', closeInsertPromptModal);
  document.getElementById('insert-beginning-btn').addEventListener('click', () => insertPromptToWorkspace('beginning'));
  document.getElementById('insert-end-btn').addEventListener('click', () => insertPromptToWorkspace('end'));
  document.getElementById('replace-workspace-btn').addEventListener('click', () => insertPromptToWorkspace('replace'));

  // Close insert modal on outside click
  document.getElementById('insert-prompt-modal').addEventListener('click', (e) => {
    if (e.target.id === 'insert-prompt-modal') {
      closeInsertPromptModal();
    }
  });

  // Workspace button listeners
  document.getElementById('workspace-send-btn').addEventListener('click', sendWorkspaceToProvider);
  document.getElementById('workspace-copy-btn').addEventListener('click', copyWorkspaceText);
  document.getElementById('workspace-save-btn').addEventListener('click', saveWorkspaceAsPrompt);
  document.getElementById('workspace-clear-btn').addEventListener('click', clearWorkspace);

  // Workspace provider selector
  const workspaceProviderBtn = document.getElementById('workspace-provider-btn');
  const workspaceProviderPopup = document.getElementById('workspace-provider-popup');

  workspaceProviderBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = workspaceProviderPopup.style.display === 'block';
    workspaceProviderPopup.style.display = isVisible ? 'none' : 'block';
    workspaceProviderBtn.classList.toggle('active', !isVisible);
  });

  // Close popup when clicking outside
  document.addEventListener('click', (e) => {
    if (!workspaceProviderBtn.contains(e.target) && !workspaceProviderPopup.contains(e.target)) {
      workspaceProviderPopup.style.display = 'none';
      workspaceProviderBtn.classList.remove('active');
    }
  });

  // Handle provider selection from popup - delegate to dynamically added items
  workspaceProviderPopup.addEventListener('click', async (e) => {
    const item = e.target.closest('.workspace-provider-popup-item');
    if (item) {
      const providerId = item.dataset.providerId;

      // Update selected provider
      selectedWorkspaceProvider = providerId;

      // Update selected state in popup
      workspaceProviderPopup.querySelectorAll('.workspace-provider-popup-item').forEach(popupItem => {
        popupItem.classList.remove('selected');
      });
      item.classList.add('selected');

      // Update button icon
      const icon = workspaceProviderBtn.querySelector('.provider-icon-small');
      const selectedIcon = item.querySelector('.provider-icon-small');
      if (icon && selectedIcon) {
        icon.src = selectedIcon.src;
        icon.alt = selectedIcon.alt;
      }

      // Close popup
      workspaceProviderPopup.style.display = 'none';
      workspaceProviderBtn.classList.remove('active');
    }
  });

  // T071: Quick Access Panel toggle listeners
  document.getElementById('toggle-recent').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleQuickAccessSection('recent');
  });

  document.getElementById('toggle-favorites').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleQuickAccessSection('favorites');
  });
}

function switchToView(view) {
  currentView = view;

  // Hide all views first
  document.getElementById('provider-container').style.display = 'none';
  document.getElementById('prompt-library').style.display = 'none';
  document.getElementById('chat-history').style.display = 'none';

  // Deactivate all tabs
  document.querySelectorAll('#provider-tabs button').forEach(btn => {
    btn.classList.remove('active');
  });

  if (view === 'chat-history') {
    document.getElementById('chat-history').style.display = 'flex';
    document.getElementById('chat-history-tab').classList.add('active');
    renderConversationList();
    updateProviderFilter();
  } else if (view === 'prompt-library') {
    document.getElementById('prompt-library').style.display = 'flex';
    document.getElementById('prompt-library-tab').classList.add('active');
    renderPromptList();
    renderQuickAccessPanel();  // T071: Render quick access panel
    updateCategoryFilter();
    updateWorkspaceProviderSelector();  // Initialize provider selector with icons
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

  // T071: Sort based on currentSortOrder
  prompts.sort((a, b) => {
    switch (currentSortOrder) {
      case 'most-used':
        return (b.useCount || 0) - (a.useCount || 0);

      case 'alphabetical':
        return a.title.localeCompare(b.title);

      case 'reverse-alphabetical':
        return b.title.localeCompare(a.title);

      case 'newest':
        return b.createdAt - a.createdAt;

      case 'oldest':
        return a.createdAt - b.createdAt;

      case 'recent':
      default:
        // Recently used first, then by created date
        if (a.lastUsed && b.lastUsed) return b.lastUsed - a.lastUsed;
        if (a.lastUsed) return -1;
        if (b.lastUsed) return 1;
        return b.createdAt - a.createdAt;
    }
  });

  listContainer.innerHTML = prompts.map(prompt => `
    <div class="prompt-item" data-prompt-id="${prompt.id}">
      <div class="prompt-item-header">
        <h4 class="prompt-item-title">${escapeHtml(prompt.title)}</h4>
        <div class="prompt-item-actions">
          <button class="favorite-btn" data-id="${prompt.id}" title="Toggle favorite">
            <span class="material-symbols-outlined ${prompt.isFavorite ? 'filled' : ''}">star</span>
          </button>
          <button class="insert-btn" data-id="${prompt.id}" title="Insert to workspace"><span class="material-symbols-outlined">input_circle</span></button>
          <button class="copy-btn" data-id="${prompt.id}" title="Copy to clipboard"><span class="material-symbols-outlined">content_copy</span></button>
          <button class="edit-btn" data-id="${prompt.id}" title="Edit"><span class="material-symbols-outlined">edit</span></button>
          <button class="delete-btn" data-id="${prompt.id}" title="Delete"><span class="material-symbols-outlined">delete</span></button>
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

  listContainer.querySelectorAll('.insert-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openInsertPromptModal(parseInt(btn.dataset.id));
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
  const popup = document.getElementById('category-popup');

  popup.innerHTML = '<div class="category-popup-item selected" data-value="">All Categories</div>' +
    categories.map(cat => `<div class="category-popup-item" data-value="${escapeHtml(cat)}">${escapeHtml(cat)}</div>`).join('');
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
    renderQuickAccessPanel();  // T071: Update quick access panel
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

// T071: Insert Prompt Modal functions
async function openInsertPromptModal(promptId) {
  const prompts = await getAllPrompts();
  const prompt = prompts.find(p => p.id === promptId);

  if (!prompt) return;

  currentInsertPromptId = promptId;

  // Show prompt preview in modal
  const previewEl = document.getElementById('insert-prompt-preview');
  previewEl.textContent = prompt.content;

  // Update workspace provider selector (workspace is always visible now)
  await updateWorkspaceProviderSelector();

  // Show modal
  const modal = document.getElementById('insert-prompt-modal');
  modal.style.display = 'flex';
}

function closeInsertPromptModal() {
  document.getElementById('insert-prompt-modal').style.display = 'none';
  currentInsertPromptId = null;
}

async function insertPromptToWorkspace(position) {
  if (!currentInsertPromptId) return;

  const prompts = await getAllPrompts();
  const prompt = prompts.find(p => p.id === currentInsertPromptId);

  if (!prompt) return;

  const textarea = document.getElementById('prompt-workspace-text');
  const currentText = textarea.value.trim();
  const promptContent = prompt.content.trim();

  let newText;
  if (position === 'beginning') {
    newText = currentText
      ? `${promptContent}\n\n${currentText}`
      : promptContent;
  } else if (position === 'end') {
    newText = currentText
      ? `${currentText}\n\n${promptContent}`
      : promptContent;
  } else if (position === 'replace') {
    newText = promptContent;
  }

  // Update textarea
  textarea.value = newText;

  // Record usage
  await recordPromptUsage(currentInsertPromptId);

  // Close modal
  closeInsertPromptModal();

  // Show feedback
  showToast('Prompt inserted to workspace!');

  // Re-render prompt list to update use count
  renderPromptList();

  // Re-render quick access panel to update counts
  renderQuickAccessPanel();
}

// T071: Quick Access Panel functions
async function renderQuickAccessPanel() {
  const recentPrompts = await getRecentlyUsedPrompts(5);
  const topFavorites = await getTopFavorites(5);

  // Show panel only if there's content to display
  const panel = document.getElementById('quick-access-panel');
  if (recentPrompts.length === 0 && topFavorites.length === 0) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';

  // Render recently used
  renderQuickAccessSection('recent-prompts-list', recentPrompts, 'recently used');

  // Render top favorites
  renderQuickAccessSection('top-favorites-list', topFavorites, 'favorite');
}

function renderQuickAccessSection(containerId, prompts, emptyMessage) {
  const container = document.getElementById(containerId);

  if (prompts.length === 0) {
    container.innerHTML = `<div class="quick-access-empty">No ${emptyMessage} prompts yet</div>`;
    return;
  }

  container.innerHTML = prompts.map(prompt => {
    const lastUsedText = prompt.lastUsed
      ? formatRelativeTime(prompt.lastUsed)
      : '';

    return `
      <div class="quick-access-item" data-prompt-id="${prompt.id}">
        <div class="quick-access-item-title">${escapeHtml(prompt.title)}</div>
        <div class="quick-access-item-content">${escapeHtml(prompt.content)}</div>
        <div class="quick-access-item-meta">
          ${prompt.useCount > 0 ? `<span>Used ${prompt.useCount}×</span>` : ''}
          ${lastUsedText ? `<span>${lastUsedText}</span>` : ''}
          ${prompt.isFavorite ? '<span class="material-symbols-outlined filled" style="font-size: 14px;">star</span>' : ''}
        </div>
      </div>
    `;
  }).join('');

  // Add click listeners
  container.querySelectorAll('.quick-access-item').forEach(item => {
    const promptId = parseInt(item.dataset.promptId);
    item.addEventListener('click', () => {
      openInsertPromptModal(promptId);
    });
  });
}

function toggleQuickAccessSection(section) {
  const listId = section === 'recent' ? 'recent-prompts-list' : 'top-favorites-list';
  const toggleBtnId = section === 'recent' ? 'toggle-recent' : 'toggle-favorites';

  const list = document.getElementById(listId);
  const toggleBtn = document.getElementById(toggleBtnId);

  list.classList.toggle('collapsed');

  // Update Material Symbols icon
  const iconSpan = toggleBtn.querySelector('.material-symbols-outlined');
  if (iconSpan) {
    iconSpan.textContent = list.classList.contains('collapsed') ? 'add' : 'remove';
  }
}

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
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
  message.textContent = 'Enable the insidebar.ai shortcut: confirm it in edge://extensions/shortcuts';

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

// Workspace helper functions
let selectedWorkspaceProvider = null;

async function updateWorkspaceProviderSelector() {
  const btn = document.getElementById('workspace-provider-btn');
  const popup = document.getElementById('workspace-provider-popup');

  if (!btn || !popup) return;

  const enabledProviders = await getEnabledProviders();
  const useDarkIcons = isDarkTheme();

  // Set current provider as default if available
  selectedWorkspaceProvider = currentProvider || enabledProviders[0]?.id || '';

  // Update button icon
  const currentProviderData = enabledProviders.find(p => p.id === selectedWorkspaceProvider);
  if (currentProviderData) {
    const icon = btn.querySelector('.provider-icon-small');
    icon.src = useDarkIcons && currentProviderData.iconDark ? currentProviderData.iconDark : currentProviderData.icon;
    icon.alt = currentProviderData.name;
  }

  // Populate popup with providers
  popup.innerHTML = enabledProviders.map(provider => `
    <div class="workspace-provider-popup-item ${provider.id === selectedWorkspaceProvider ? 'selected' : ''}" data-provider-id="${provider.id}">
      <img class="provider-icon-small" src="${useDarkIcons && provider.iconDark ? provider.iconDark : provider.icon}" alt="${escapeHtml(provider.name)}">
      <span>${escapeHtml(provider.name)}</span>
    </div>
  `).join('');
}

function showWorkspaceWithText(text) {
  const textarea = document.getElementById('prompt-workspace-text');

  if (!textarea) return;

  textarea.value = text;

  // Update provider selector (workspace is always visible now)
  updateWorkspaceProviderSelector();
}

async function copyWorkspaceText() {
  const textarea = document.getElementById('prompt-workspace-text');
  const text = textarea.value.trim();

  if (!text) {
    showToast('Workspace is empty');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    showToast('Failed to copy');
  }
}

function saveWorkspaceAsPrompt() {
  const textarea = document.getElementById('prompt-workspace-text');
  const text = textarea.value.trim();

  if (!text) {
    showToast('Workspace is empty');
    return;
  }

  // Open prompt editor with the workspace text pre-filled
  openPromptEditor(null);

  // Pre-fill the content field with workspace text
  setTimeout(() => {
    document.getElementById('prompt-content-input').value = text;
  }, 50);
}

function clearWorkspace() {
  const textarea = document.getElementById('prompt-workspace-text');

  textarea.value = '';
  // Workspace stays visible - no longer hide it
}

async function sendWorkspaceToProvider() {
  const textarea = document.getElementById('prompt-workspace-text');

  const providerId = selectedWorkspaceProvider;
  const text = textarea.value.trim();

  if (!providerId) {
    showToast('Please select a provider');
    return;
  }

  if (!text) {
    showToast('Workspace is empty');
    return;
  }

  try {
    // Switch to the selected provider
    await switchProvider(providerId);

    // Inject the text into the provider (now waits for iframe to be ready)
    await injectTextIntoProvider(providerId, text);

    // Get provider name for toast
    const provider = await getProviderByIdWithSettings(providerId);
    showToast(`Text sent to ${provider.name}!`);

    // Optionally clear workspace after sending
    // clearWorkspace();
  } catch (error) {
    console.error('Error sending workspace text to provider:', error);
    showToast('Failed to send text');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Chat History Implementation
function setupChatHistory() {
  // Save conversation button
  const saveBtn = document.getElementById('save-conversation-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', openSaveConversationModal);
  }

  // Search functionality
  const searchInput = document.getElementById('history-search');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (e.target.value.trim()) {
        filterConversations('search', e.target.value);
      } else {
        renderConversationList();
      }
    }, 300);
  });

  // Provider filter button
  const providerBtn = document.getElementById('provider-filter-btn');
  const providerPopup = document.getElementById('provider-popup');

  providerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = providerPopup.style.display === 'block';
    providerPopup.style.display = isVisible ? 'none' : 'block';
    providerBtn.classList.toggle('active', !isVisible);
  });

  // Close popup when clicking outside
  document.addEventListener('click', (e) => {
    if (!providerBtn.contains(e.target) && !providerPopup.contains(e.target)) {
      providerPopup.style.display = 'none';
      providerBtn.classList.remove('active');
    }
  });

  // Handle provider selection from popup
  providerPopup.addEventListener('click', (e) => {
    if (e.target.classList.contains('provider-popup-item')) {
      const value = e.target.dataset.value;

      // Update selected state
      providerPopup.querySelectorAll('.provider-popup-item').forEach(item => {
        item.classList.remove('selected');
      });
      e.target.classList.add('selected');

      // Filter conversations
      if (value) {
        filterConversations('provider', value);
      } else {
        renderConversationList();
      }

      // Close popup
      providerPopup.style.display = 'none';
      providerBtn.classList.remove('active');
    }
  });

  // Favorites filter
  const favoritesBtn = document.getElementById('history-show-favorites');
  if (favoritesBtn) {
    favoritesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isShowingHistoryFavorites = !isShowingHistoryFavorites;

      const iconSpan = favoritesBtn.querySelector('.material-symbols-outlined');
      if (iconSpan) {
        if (isShowingHistoryFavorites) {
          iconSpan.classList.add('filled');
        } else {
          iconSpan.classList.remove('filled');
        }
      }
      favoritesBtn.title = isShowingHistoryFavorites ? 'Show all conversations' : 'Show favorites only';
      favoritesBtn.classList.toggle('active', isShowingHistoryFavorites);

      if (isShowingHistoryFavorites) {
        filterConversations('favorites');
      } else {
        renderConversationList();
      }
    });
  }

  // Save conversation modal controls
  document.getElementById('close-save-conversation').addEventListener('click', closeSaveConversationModal);
  document.getElementById('cancel-save-conversation-btn').addEventListener('click', closeSaveConversationModal);
  document.getElementById('save-conversation-submit-btn').addEventListener('click', saveConversationFromModal);

  // View conversation modal controls
  document.getElementById('close-view-conversation').addEventListener('click', closeViewConversationModal);
  document.getElementById('copy-conversation-btn').addEventListener('click', copyConversationContent);
  document.getElementById('edit-conversation-btn').addEventListener('click', editConversationFromView);
  document.getElementById('delete-conversation-from-view-btn').addEventListener('click', deleteConversationFromView);

  // Close modals on outside click
  document.getElementById('save-conversation-modal').addEventListener('click', (e) => {
    if (e.target.id === 'save-conversation-modal') {
      closeSaveConversationModal();
    }
  });

  document.getElementById('view-conversation-modal').addEventListener('click', (e) => {
    if (e.target.id === 'view-conversation-modal') {
      closeViewConversationModal();
    }
  });
}

async function renderConversationList(conversations = null) {
  const listContainer = document.getElementById('conversation-list');

  if (!conversations) {
    conversations = await getAllConversations();
  }

  if (conversations.length === 0) {
    listContainer.innerHTML = `
      <div class="conversation-list-empty">
        <p>💬 No conversations yet</p>
        <p>Click "+" to save a conversation</p>
      </div>
    `;
    return;
  }

  // Sort by timestamp (newest first)
  conversations.sort((a, b) => b.timestamp - a.timestamp);

  listContainer.innerHTML = conversations.map(conv => {
    const preview = conv.content.length > 150
      ? conv.content.substring(0, 150) + '...'
      : conv.content;
    const date = new Date(conv.timestamp).toLocaleDateString();
    const time = new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Extract URL from notes if available (format: "Extracted from: URL")
    let conversationUrl = null;
    if (conv.notes && conv.notes.startsWith('Extracted from: ')) {
      conversationUrl = conv.notes.substring('Extracted from: '.length).trim();
    }

    // Create date/time display - make it a link if URL is available
    const dateTimeDisplay = conversationUrl
      ? `<a href="${escapeHtml(conversationUrl)}" target="_blank" class="conversation-item-date conversation-item-link" title="Open original conversation">${date} ${time}</a>`
      : `<span class="conversation-item-date">${date} ${time}</span>`;

    return `
      <div class="conversation-item" data-conversation-id="${conv.id}">
        <div class="conversation-item-header">
          <h4 class="conversation-item-title">${escapeHtml(conv.title)}</h4>
          <div class="conversation-item-actions">
            <button class="favorite-btn" data-id="${conv.id}" title="Toggle favorite">
              <span class="material-symbols-outlined ${conv.isFavorite ? 'filled' : ''}">star</span>
            </button>
            <button class="delete-conversation-btn" data-id="${conv.id}" title="Delete"><span class="material-symbols-outlined">delete</span></button>
          </div>
        </div>
        <div class="conversation-item-preview">${escapeHtml(preview)}</div>
        <div class="conversation-item-meta">
          <span class="conversation-item-provider">${escapeHtml(conv.provider)}</span>
          ${dateTimeDisplay}
          ${conv.tags.length > 0 ? `
            <div class="conversation-item-tags">
              ${conv.tags.map(tag => `<span class="conversation-item-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners
  listContainer.querySelectorAll('.conversation-item').forEach(item => {
    const id = parseInt(item.dataset.conversationId);

    // Click on item to view full conversation
    item.addEventListener('click', async (e) => {
      // Don't trigger on button clicks or link clicks
      if (e.target.closest('button') || e.target.closest('a.conversation-item-link')) return;
      await viewConversation(id);
    });
  });

  listContainer.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleConversationFavoriteStatus(parseInt(btn.dataset.id));
    });
  });

  listContainer.querySelectorAll('.delete-conversation-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteConversationWithConfirm(parseInt(btn.dataset.id));
    });
  });
}

async function filterConversations(filterType, value) {
  let conversations;

  if (filterType === 'search') {
    conversations = await searchConversations(value);
  } else if (filterType === 'provider') {
    conversations = await getConversationsByProvider(value);
  } else if (filterType === 'favorites') {
    conversations = await getFavoriteConversations();
  }

  renderConversationList(conversations);
}

async function updateProviderFilter() {
  const enabledProviders = await getEnabledProviders();
  const popup = document.getElementById('provider-popup');

  popup.innerHTML = '<div class="provider-popup-item selected" data-value="">All Providers</div>' +
    enabledProviders.map(provider =>
      `<div class="provider-popup-item" data-value="${escapeHtml(provider.id)}">${escapeHtml(provider.name)}</div>`
    ).join('');
}

function openSaveConversationModal() {
  const modal = document.getElementById('save-conversation-modal');

  // Pre-fill provider with current provider
  const providerInput = document.getElementById('conversation-provider-input');
  if (currentProvider) {
    const provider = PROVIDERS.find(p => p.id === currentProvider);
    providerInput.value = provider ? provider.name : currentProvider;
  } else {
    providerInput.value = '';
  }

  // Clear other fields
  document.getElementById('conversation-title-input').value = '';
  document.getElementById('conversation-content-input').value = '';
  document.getElementById('conversation-tags-input').value = '';
  document.getElementById('conversation-notes-input').value = '';
  document.getElementById('conversation-favorite-input').checked = false;

  modal.style.display = 'flex';
}

function closeSaveConversationModal() {
  document.getElementById('save-conversation-modal').style.display = 'none';
  currentEditingConversationId = null;
}

async function saveConversationFromModal() {
  const title = document.getElementById('conversation-title-input').value.trim();
  const content = document.getElementById('conversation-content-input').value.trim();
  const provider = document.getElementById('conversation-provider-input').value.trim() || 'unknown';
  const tagsInput = document.getElementById('conversation-tags-input').value.trim();
  const notes = document.getElementById('conversation-notes-input').value.trim();
  const isFavorite = document.getElementById('conversation-favorite-input').checked;

  if (!content) {
    alert('Please enter conversation content');
    return;
  }

  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

  const conversationData = {
    title: title || generateAutoTitle(content),
    content,
    provider,
    tags,
    notes,
    isFavorite
  };

  try {
    if (currentEditingConversationId) {
      await updateConversation(currentEditingConversationId, conversationData);
      showToast('Conversation updated!');
    } else {
      await saveConversation(conversationData);
      showToast('Conversation saved!');
    }

    closeSaveConversationModal();
    renderConversationList();
  } catch (error) {
    console.error('Error saving conversation:', error);
    alert('Failed to save conversation. ' + error.message);
  }
}

// Handle extracted conversation from ChatGPT content script
async function handleExtractedConversation(conversationData) {
  try {
    console.log('[Sidebar] handleExtractedConversation called');
    console.log('[Sidebar] Received conversation data:', {
      title: conversationData?.title,
      provider: conversationData?.provider,
      contentLength: conversationData?.content?.length,
      messageCount: conversationData?.messages?.length,
      timestamp: conversationData?.timestamp,
      url: conversationData?.url
    });

    // Switch to chat history view
    console.log('[Sidebar] Switching to chat-history view...');
    switchToView('chat-history');

    console.log('[Sidebar] Preparing conversation data for save...');
    const conversationToSave = {
      title: conversationData.title || generateAutoTitle(conversationData.content),
      content: conversationData.content,
      provider: conversationData.provider || 'ChatGPT',
      timestamp: conversationData.timestamp || Date.now(),
      tags: [],
      notes: conversationData.url ? `Extracted from: ${conversationData.url}` : '',
      isFavorite: false
    };

    console.log('[Sidebar] Saving conversation to database...');
    // Save conversation directly to database
    await saveConversation(conversationToSave);

    console.log('[Sidebar] Conversation saved, refreshing list...');
    // Refresh conversation list and show success
    await renderConversationList();

    console.log('[Sidebar] Showing success toast...');
    showToast('Conversation saved successfully!');

    console.log('[Sidebar] handleExtractedConversation completed successfully');
  } catch (error) {
    console.error('[Sidebar] Error in handleExtractedConversation:', error);
    console.error('[Sidebar] Error stack:', error.stack);
    showToast('Failed to save conversation: ' + error.message);
    throw error;
  }
}

async function viewConversation(id) {
  const conversation = await getConversation(id);
  if (!conversation) return;

  currentViewingConversationId = id;

  // Update modal content
  document.getElementById('view-conversation-title').textContent = conversation.title;

  const contentEl = document.getElementById('view-conversation-content');
  contentEl.textContent = conversation.content;

  const providerEl = document.getElementById('view-conversation-provider');
  providerEl.innerHTML = `<strong>Provider:</strong> ${escapeHtml(conversation.provider)}`;

  // Extract URL from notes if available (format: "Extracted from: URL")
  let conversationUrl = null;
  if (conversation.notes && conversation.notes.startsWith('Extracted from: ')) {
    conversationUrl = conversation.notes.substring('Extracted from: '.length).trim();
  }

  // Create timestamp display - make it a link if URL is available
  const timestampEl = document.getElementById('view-conversation-timestamp');
  const date = new Date(conversation.timestamp).toLocaleString();
  if (conversationUrl) {
    timestampEl.innerHTML = `<strong>Date:</strong> <a href="${escapeHtml(conversationUrl)}" target="_blank" class="conversation-link" title="Open original conversation">${date}</a>`;
  } else {
    timestampEl.innerHTML = `<strong>Date:</strong> ${date}`;
  }

  const tagsEl = document.getElementById('view-conversation-tags');
  if (conversation.tags.length > 0) {
    tagsEl.innerHTML = `<strong>Tags:</strong> ${conversation.tags.map(tag => `<span class="conversation-tag">${escapeHtml(tag)}</span>`).join(' ')}`;
  } else {
    tagsEl.innerHTML = '';
  }

  // Hide notes section if it only contains the "Extracted from:" URL
  const notesEl = document.getElementById('view-conversation-notes');
  if (conversation.notes && !conversation.notes.startsWith('Extracted from: ')) {
    notesEl.innerHTML = `<strong>Notes:</strong> ${escapeHtml(conversation.notes)}`;
    notesEl.style.display = 'block';
  } else {
    notesEl.innerHTML = '';
    notesEl.style.display = 'none';
  }

  // Show modal
  document.getElementById('view-conversation-modal').style.display = 'flex';
}

function closeViewConversationModal() {
  document.getElementById('view-conversation-modal').style.display = 'none';
  currentViewingConversationId = null;
}

async function copyConversationContent() {
  if (!currentViewingConversationId) return;

  const conversation = await getConversation(currentViewingConversationId);
  if (!conversation) return;

  try {
    await navigator.clipboard.writeText(conversation.content);
    showToast('Copied to clipboard!');
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    showToast('Failed to copy');
  }
}

async function editConversationFromView() {
  if (!currentViewingConversationId) return;

  const conversation = await getConversation(currentViewingConversationId);
  if (!conversation) return;

  // Close view modal
  closeViewConversationModal();

  // Open save modal with conversation data
  currentEditingConversationId = currentViewingConversationId;

  document.getElementById('conversation-title-input').value = conversation.title;
  document.getElementById('conversation-content-input').value = conversation.content;
  document.getElementById('conversation-provider-input').value = conversation.provider;
  document.getElementById('conversation-tags-input').value = conversation.tags.join(', ');
  document.getElementById('conversation-notes-input').value = conversation.notes || '';
  document.getElementById('conversation-favorite-input').checked = conversation.isFavorite;

  document.getElementById('save-conversation-modal').style.display = 'flex';
}

async function deleteConversationFromView() {
  if (!currentViewingConversationId) return;

  const conversation = await getConversation(currentViewingConversationId);
  if (!conversation) return;

  if (confirm(`Delete conversation "${conversation.title}"?`)) {
    try {
      await deleteConversation(currentViewingConversationId);
      closeViewConversationModal();
      renderConversationList();
      showToast('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showToast('Failed to delete conversation');
    }
  }
}

async function toggleConversationFavoriteStatus(id) {
  try {
    await toggleConversationFavorite(id);

    // Re-render current view
    if (isShowingHistoryFavorites) {
      filterConversations('favorites');
    } else {
      renderConversationList();
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
}

async function deleteConversationWithConfirm(id) {
  const conversation = await getConversation(id);
  if (!conversation) return;

  if (confirm(`Delete conversation "${conversation.title}"?`)) {
    try {
      await deleteConversation(id);
      renderConversationList();
      showToast('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showToast('Failed to delete conversation');
    }
  }
}

// Initialize on load
init();
