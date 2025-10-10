# Technical Research: Multi-AI Sidebar Extension

**Feature**: Multi-AI Sidebar Extension
**Date**: 2025-10-10
**Purpose**: Research technical decisions, best practices, and implementation patterns for Chrome MV3 extension with sidebar and local storage

---

## 1. Side Panel API (Chrome/Edge MV3)

### Decision
Use the `chrome.sidePanel` API (available in Chrome 114+, Edge 114+) for the sidebar interface.

### Rationale
- **Native API**: The sidePanel API is purpose-built for sidebar extensions in MV3
- **Better UX**: Integrates cleanly with browser UI, persists across tabs
- **Future-proof**: Official MV3 API with ongoing browser vendor support
- **Simple setup**: Requires `sidePanel` permission and `default_panel` in manifest

### Alternatives Considered
- **Popup with iframe**: Limited screen space, doesn't persist across tabs
- **Content script injection**: Would require injecting UI into every page, conflicts with page content, poor UX
- **Devtools panel**: Not appropriate for general user interaction, requires devtools open

### Implementation Pattern
```javascript
// manifest.json
{
  "manifest_version": 3,
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidebar/sidebar.html"
  }
}

// background/service-worker.js
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

### References
- Chrome Developers: Side Panel API - https://developer.chrome.com/docs/extensions/reference/sidePanel/
- MV3 Migration Guide - https://developer.chrome.com/docs/extensions/migrating/

---

## 2. Bypassing X-Frame-Options Headers

### Decision
Use `declarativeNetRequest` API with `removeHeaders` action to strip X-Frame-Options and CSP headers that block iframe embedding.

### Rationale
- **MV3 Requirement**: `webRequest` blocking is deprecated in MV3; `declarativeNetRequest` is the replacement
- **Performance**: Declarative rules are processed in browser's network stack (faster than JS callbacks)
- **Privacy**: Rules apply only to extension context, don't affect regular browsing
- **Store Compliance**: Properly documented header modifications pass store review

### Alternatives Considered
- **webRequest blocking**: Deprecated in MV3, will be removed
- **Proxy/MITM**: Violates privacy principle, requires external servers
- **Native messaging to local server**: Overly complex, breaks zero-build philosophy

### Implementation Pattern
```javascript
// manifest.json
{
  "permissions": ["declarativeNetRequest", "declarativeNetRequestWithHostAccess"],
  "host_permissions": [
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://grok.com/*",
    "https://chat.deepseek.com/*",
    "http://localhost:3000/*"
  ],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "bypass_headers",
      "enabled": true,
      "path": "rules/bypass-headers.json"
    }]
  }
}

// rules/bypass-headers.json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        { "header": "X-Frame-Options", "operation": "remove" },
        { "header": "Content-Security-Policy", "operation": "remove" }
      ]
    },
    "condition": {
      "urlFilter": "https://chat.openai.com/*",
      "resourceTypes": ["sub_frame"]
    }
  }
  // ... repeat for each AI provider
]
```

### References
- declarativeNetRequest API - https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/
- Header modification patterns - https://developer.chrome.com/docs/extensions/mv3/mv3-migration/#modifying-network-requests

---

## 3. IndexedDB for Prompt Storage

### Decision
Use IndexedDB as primary storage for prompts, with fallback to `chrome.storage.local` if IndexedDB fails.

### Rationale
- **Capacity**: IndexedDB supports 50MB+ per origin (vs 10MB for chrome.storage.local, 100KB for chrome.storage.sync)
- **Performance**: Indexed queries for search/filter operations on 1,000+ prompts
- **Structured Data**: Native object storage with indexes on title, category, tags
- **Offline-first**: Fully local, no network dependency

### Alternatives Considered
- **chrome.storage.local only**: 10MB limit insufficient for 1,000+ prompts with rich content
- **chrome.storage.sync**: 100KB total limit, too small; also syncs across devices (privacy concern)
- **localStorage**: 5-10MB limit, synchronous API blocks UI, no indexing

### Implementation Pattern
```javascript
// modules/prompt-manager.js
class PromptManager {
  constructor() {
    this.db = null;
    this.fallbackStorage = chrome.storage.local;
  }

  async init() {
    try {
      this.db = await this.openDB();
    } catch (error) {
      console.warn('IndexedDB unavailable, using chrome.storage.local fallback', error);
      this.db = null; // Will use fallback methods
    }
  }

  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SmarterPanelDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const store = db.createObjectStore('prompts', { keyPath: 'id', autoIncrement: true });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      };
    });
  }

  async savePrompt(prompt) {
    if (this.db) {
      return this.saveToIndexedDB(prompt);
    } else {
      return this.saveToChromeStorage(prompt);
    }
  }

  // ... other CRUD methods with dual implementation
}
```

### References
- IndexedDB API - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- chrome.storage API - https://developer.chrome.com/docs/extensions/reference/storage/
- Storage quota management - https://developer.chrome.com/docs/extensions/mv3/storage-and-cookies/

---

## 4. Provider Configuration Architecture

### Decision
Use a modular provider configuration system with each provider as a standalone object in `modules/providers.js`.

### Rationale
- **Extensibility**: Adding new AI providers requires only adding a config object
- **Maintainability**: Provider changes isolated to single file
- **No code changes**: Enable/disable providers via settings without touching code
- **Constitution compliance**: Satisfies Modular Provider Architecture principle

### Alternatives Considered
- **Hardcoded provider logic**: Requires code changes for each provider, violates modularity
- **External JSON config**: Overly complex for simple provider list, harder to maintain
- **Plugin system**: Over-engineered for current scope, violates zero-build philosophy

### Implementation Pattern
```javascript
// modules/providers.js
export const PROVIDERS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chat.openai.com',
    icon: 'icons/providers/chatgpt.png',
    enabled: true,
    injectCSS: null, // Optional: CSS to inject for better sidebar rendering
    iframeAttributes: {
      sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups'
    }
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai',
    icon: 'icons/providers/claude.png',
    enabled: true,
    injectCSS: null,
    iframeAttributes: {
      sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups'
    }
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com',
    icon: 'icons/providers/gemini.png',
    enabled: true,
    injectCSS: null,
    iframeAttributes: {
      sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups'
    }
  },
  {
    id: 'grok',
    name: 'Grok',
    url: 'https://grok.com',
    icon: 'icons/providers/grok.png',
    enabled: true,
    injectCSS: null,
    iframeAttributes: {
      sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups'
    }
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    icon: 'icons/providers/deepseek.png',
    enabled: true,
    injectCSS: null,
    iframeAttributes: {
      sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups'
    }
  },
  {
    id: 'ollama',
    name: 'Ollama',
    url: 'http://localhost:3000',
    icon: 'icons/providers/ollama.png',
    enabled: false, // Disabled by default (requires local setup)
    injectCSS: null,
    iframeAttributes: {
      sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups'
    }
  }
];

export function getEnabledProviders() {
  // Dynamically filter based on user settings
  return PROVIDERS.filter(p => p.enabled);
}

export function getProviderById(id) {
  return PROVIDERS.find(p => p.id === id);
}
```

### References
- Extension architecture patterns - https://developer.chrome.com/docs/extensions/mv3/architecture-overview/
- Modular JavaScript - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

---

## 5. Settings Management with chrome.storage

### Decision
Use `chrome.storage.sync` for user settings (enabled providers, default provider, theme) with fallback to `chrome.storage.local` if sync is unavailable.

### Rationale
- **Sync across devices**: Users' settings follow them across Chrome/Edge instances (optional benefit)
- **Built-in API**: No external dependencies, reliable
- **Async API**: Non-blocking, performant
- **Event-driven**: Listen to storage changes to keep UI in sync

### Alternatives Considered
- **localStorage**: Synchronous, blocks UI, doesn't sync across devices
- **IndexedDB for settings**: Overkill for small key-value settings data
- **File-based config**: Not possible in browser extension sandbox

### Implementation Pattern
```javascript
// modules/settings.js
const DEFAULT_SETTINGS = {
  enabledProviders: ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek'],
  defaultProvider: 'chatgpt',
  lastSelectedProvider: 'chatgpt',
  theme: 'auto', // 'light', 'dark', 'auto'
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

export async function saveSetting(key, value) {
  const update = { [key]: value };
  try {
    await chrome.storage.sync.set(update);
  } catch (error) {
    console.warn('chrome.storage.sync unavailable, using local', error);
    await chrome.storage.local.set(update);
  }
}

// Listen for settings changes to update UI
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`Setting changed: ${key} = ${newValue}`);
    // Trigger UI updates as needed
  }
});
```

### References
- chrome.storage API - https://developer.chrome.com/docs/extensions/reference/storage/
- Sync vs Local storage - https://developer.chrome.com/docs/extensions/mv3/storage-and-cookies/#choosing-between-sync-and-local

---

## 6. Service Worker for Background Tasks

### Decision
Use a lightweight service worker (`background/service-worker.js`) for extension lifecycle events, context menu creation, and keyboard shortcuts.

### Rationale
- **MV3 Requirement**: Service workers replace persistent background pages in MV3
- **Event-driven**: Service worker wakes on events (icon click, keyboard shortcut) and sleeps when idle
- **Resource efficient**: No persistent memory usage when not active
- **Required for APIs**: Some Chrome APIs (contextMenus, commands) require background script

### Alternatives Considered
- **No background script**: Some functionality (context menus, shortcuts) requires background context
- **Persistent background page**: Deprecated in MV3, not allowed

### Implementation Pattern
```javascript
// background/service-worker.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Smarter Panel installed');

  // Create context menu
  chrome.contextMenus.create({
    id: 'open-smarter-panel',
    title: 'Open in Smarter Panel',
    contexts: ['page', 'selection', 'link']
  });

  // Create submenu for each provider
  const providers = ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek', 'ollama'];
  providers.forEach(provider => {
    chrome.contextMenus.create({
      id: `provider-${provider}`,
      parentId: 'open-smarter-panel',
      title: provider.charAt(0).toUpperCase() + provider.slice(1),
      contexts: ['page', 'selection', 'link']
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith('provider-')) {
    const providerId = info.menuItemId.replace('provider-', '');
    chrome.sidePanel.open({ windowId: tab.windowId });
    // Send message to sidebar to switch to provider
    chrome.runtime.sendMessage({ action: 'switchProvider', provider: providerId });
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-sidebar') {
    chrome.sidePanel.open();
  } else if (command === 'open-prompt-library') {
    chrome.sidePanel.open();
    chrome.runtime.sendMessage({ action: 'openPromptLibrary' });
  }
});

// Configure side panel to open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

### References
- Service workers in extensions - https://developer.chrome.com/docs/extensions/mv3/service_workers/
- Background script migration - https://developer.chrome.com/docs/extensions/migrating/to-service-workers/

---

## 7. Clipboard API for Prompt Copy

### Decision
Use the modern Clipboard API (`navigator.clipboard.writeText()`) for copying prompts to clipboard.

### Rationale
- **Modern API**: Asynchronous, promise-based, clean interface
- **Permissions**: Works in extension context without additional permissions
- **User feedback**: Returns promise for success/failure handling
- **Cross-browser**: Supported in Chrome 66+, Edge 79+ (well before our 114+ requirement)

### Alternatives Considered
- **document.execCommand('copy')**: Deprecated, synchronous, requires DOM manipulation
- **Copy event simulation**: Overly complex, fragile

### Implementation Pattern
```javascript
// In prompt library UI
async function copyPromptToClipboard(promptText) {
  try {
    await navigator.clipboard.writeText(promptText);
    showToast('Prompt copied to clipboard!', 'success');
  } catch (error) {
    console.error('Failed to copy prompt:', error);
    showToast('Failed to copy prompt. Please try again.', 'error');
  }
}
```

### References
- Clipboard API - https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API
- Async clipboard access - https://web.dev/async-clipboard/

---

## 8. Theme Detection and Dark Mode

### Decision
Use `window.matchMedia('(prefers-color-scheme: dark)')` to detect system theme preference, with manual override saved in settings.

### Rationale
- **Auto-detection**: Matches browser/OS theme automatically
- **User override**: Settings can force light/dark mode regardless of system
- **Event-driven**: Listen for theme changes to update UI dynamically
- **Standard API**: No dependencies, works across browsers

### Alternatives Considered
- **Manual only**: Users must set theme explicitly (poor UX)
- **Chrome theme API**: Limited to detecting browser theme, doesn't cover OS-level dark mode

### Implementation Pattern
```javascript
// modules/theme-manager.js
export function detectTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export async function applyTheme() {
  const settings = await getSettings();
  let theme;

  if (settings.theme === 'auto') {
    theme = detectTheme();
  } else {
    theme = settings.theme; // 'light' or 'dark'
  }

  document.documentElement.setAttribute('data-theme', theme);
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async (e) => {
  const settings = await getSettings();
  if (settings.theme === 'auto') {
    applyTheme();
  }
});

// Apply theme on load
applyTheme();
```

### References
- prefers-color-scheme - https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
- Dark mode best practices - https://web.dev/prefers-color-scheme/

---

## 9. Error Handling Strategy

### Decision
Implement three-tier error handling: try/catch blocks for all async operations, user-friendly error messages with recovery suggestions, and graceful degradation when features fail.

### Rationale
- **Constitution compliance**: Graceful Degradation principle requires resilient error handling
- **User experience**: Clear error messages guide users to solutions
- **Debugging**: Console errors logged for developer troubleshooting
- **Isolation**: Errors in one provider/feature don't crash entire extension

### Implementation Pattern
```javascript
// Error handling utility
class ErrorHandler {
  static async handleProviderLoadError(providerId, error) {
    console.error(`Provider ${providerId} failed to load:`, error);

    const messages = {
      'ollama': 'Ollama is not running. Please start Ollama and Open WebUI on localhost:3000.',
      'network': 'Unable to connect to provider. Please check your internet connection.',
      'auth': 'Please log in to this provider in a regular browser tab first.',
      'default': 'This provider failed to load. Please try again or select a different provider.'
    };

    const errorType = this.classifyError(error);
    return messages[errorType] || messages.default;
  }

  static classifyError(error) {
    if (error.message.includes('localhost')) return 'ollama';
    if (error.message.includes('network') || error.message.includes('fetch')) return 'network';
    if (error.status === 401 || error.status === 403) return 'auth';
    return 'default';
  }

  static async handleStorageError(operation, error) {
    console.error(`Storage error during ${operation}:`, error);

    if (error.name === 'QuotaExceededError') {
      return 'Storage is full. Please export your prompts and delete old ones to free up space.';
    }

    return 'Unable to save data. Please try again or export your data as a backup.';
  }
}

// Usage in sidebar
async function loadProvider(providerId) {
  try {
    const provider = getProviderById(providerId);
    const iframe = createIframe(provider);
    // ... load provider
  } catch (error) {
    const errorMessage = await ErrorHandler.handleProviderLoadError(providerId, error);
    displayErrorMessage(errorMessage);
    // Fallback: keep current provider or switch to default
  }
}
```

### References
- Error handling patterns - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling
- User-facing error messages - https://web.dev/user-facing-error-messages/

---

## 10. Performance Optimization

### Decision
Implement lazy loading for provider iframes, debounced search for prompt library, and virtual scrolling for large prompt lists (if >100 prompts).

### Rationale
- **Constitution compliance**: Performance constraints require <1s init, <100ms UI latency
- **Memory efficiency**: Load only active provider iframe, unload inactive ones
- **Search performance**: Debounce prevents excessive filtering on every keystroke
- **Scalability**: Virtual scrolling handles 1,000+ prompts without DOM bloat

### Implementation Pattern
```javascript
// Lazy iframe loading
class ProviderManager {
  constructor() {
    this.loadedProviders = new Map(); // providerId -> iframe element
    this.currentProvider = null;
  }

  async switchProvider(providerId) {
    // Hide current provider
    if (this.currentProvider) {
      this.loadedProviders.get(this.currentProvider).style.display = 'none';
    }

    // Load or show target provider
    if (!this.loadedProviders.has(providerId)) {
      const iframe = await this.createProviderIframe(providerId);
      this.loadedProviders.set(providerId, iframe);
    }

    this.loadedProviders.get(providerId).style.display = 'block';
    this.currentProvider = providerId;
  }

  // Unload providers after inactivity to free memory
  unloadInactiveProviders() {
    for (let [id, iframe] of this.loadedProviders) {
      if (id !== this.currentProvider) {
        iframe.remove();
        this.loadedProviders.delete(id);
      }
    }
  }
}

// Debounced search
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const debouncedSearch = debounce((query) => {
  filterPrompts(query);
}, 300); // 300ms debounce

// Virtual scrolling (if needed for 1,000+ prompts)
// Use Intersection Observer to render only visible prompt cards
```

### References
- Lazy loading - https://web.dev/lazy-loading/
- Debouncing - https://davidwalsh.name/javascript-debounce-function
- Virtual scrolling - https://web.dev/virtualize-long-lists-react-window/

---

## Summary of Key Technical Decisions

| Area | Technology | Rationale |
|------|-----------|-----------|
| Sidebar UI | chrome.sidePanel API | Native MV3 API, best UX, persistent across tabs |
| Iframe embedding | declarativeNetRequest | MV3-compliant header bypass, performant |
| Prompt storage | IndexedDB (+ fallback) | 50MB+ capacity, indexed queries, offline-first |
| Settings storage | chrome.storage.sync | Cross-device sync, async API, 100KB sufficient |
| Provider config | Modular JS objects | Easy to extend, isolated changes, no code edits |
| Background script | Service worker | MV3 requirement, event-driven, resource-efficient |
| Clipboard | Clipboard API | Modern async API, clean interface |
| Theme detection | matchMedia API | Auto-detect OS theme, manual override support |
| Error handling | Three-tier strategy | User messages + console logs + graceful degradation |
| Performance | Lazy load + debounce | Memory efficient, responsive UI, scalable |

All decisions align with constitutional principles: privacy-first (local storage only), MV3 compliance (modern APIs), zero-build (pure JS), graceful degradation (error handling), modular architecture (provider configs), security (CSP, sanitization), performance (lazy loading), and compatibility (Chrome/Edge 114+).
