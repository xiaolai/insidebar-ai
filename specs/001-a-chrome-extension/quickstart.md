# Quickstart Guide: Multi-AI Sidebar Extension

**Feature**: Multi-AI Sidebar Extension
**Date**: 2025-10-10
**Purpose**: Step-by-step guide for developers to understand, build, and test the extension

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Browser**: Microsoft Edge 114+ or Google Chrome 114+
- ✅ **AI Provider Accounts**: Accounts with ChatGPT, Claude, Gemini, Grok, DeepSeek (optional: Ollama setup)
- ✅ **Git**: For version control
- ✅ **Code Editor**: VS Code, Sublime Text, or any editor you prefer

**No build tools required!** This extension uses pure JavaScript ES6+ and loads directly from source.

---

## Project Structure Overview

```
smarter-panel/
├── manifest.json              # Extension manifest (MV3)
├── sidebar/
│   ├── sidebar.html          # Main sidebar UI
│   ├── sidebar.css           # Sidebar styles
│   └── sidebar.js            # Sidebar logic
├── modules/
│   ├── providers.js          # AI provider configurations
│   ├── prompt-manager.js     # IndexedDB prompt storage
│   ├── settings.js           # Settings management (chrome.storage)
│   └── theme-manager.js      # Theme detection and application
├── background/
│   └── service-worker.js     # Background service worker (MV3)
├── options/
│   ├── options.html          # Full options page
│   ├── options.css           # Options page styles
│   └── options.js            # Options page logic
├── rules/
│   └── bypass-headers.json   # declarativeNetRequest rules
└── icons/
    ├── icon-16.png           # Extension icons (16x16)
    ├── icon-32.png           # (32x32)
    ├── icon-48.png           # (48x48)
    ├── icon-128.png          # (128x128)
    └── providers/            # Provider-specific icons
        ├── chatgpt.png
        ├── claude.png
        ├── gemini.png
        ├── grok.png
        ├── deepseek.png
        └── ollama.png
```

---

## Step 1: Create manifest.json

The manifest defines extension metadata, permissions, and configuration.

**File**: `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Smarter Panel",
  "version": "1.0.0",
  "description": "Multi-AI sidebar extension for quick access to ChatGPT, Claude, Gemini, and more",

  "permissions": [
    "sidePanel",
    "storage",
    "contextMenus",
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess"
  ],

  "host_permissions": [
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://grok.com/*",
    "https://chat.deepseek.com/*",
    "http://localhost:3000/*"
  ],

  "background": {
    "service_worker": "background/service-worker.js"
  },

  "side_panel": {
    "default_path": "sidebar/sidebar.html"
  },

  "options_page": "options/options.html",

  "action": {
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    },
    "default_title": "Open Smarter Panel"
  },

  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },

  "commands": {
    "open-sidebar": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Open Smarter Panel sidebar"
    },
    "open-prompt-library": {
      "suggested_key": {
        "default": "Ctrl+Shift+P",
        "mac": "Command+Shift+P"
      },
      "description": "Open Prompt Library"
    }
  },

  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "bypass_headers",
        "enabled": true,
        "path": "rules/bypass-headers.json"
      }
    ]
  },

  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

**Key Points**:
- `manifest_version: 3` - Uses MV3 (required for modern browsers)
- `sidePanel` permission - Enables sidebar API
- `declarativeNetRequest` - Allows header bypass for iframe embedding
- `host_permissions` - Grants access to AI provider domains

---

## Step 2: Create Header Bypass Rules

AI providers block iframe embedding with X-Frame-Options headers. We use declarativeNetRequest to bypass these.

**File**: `rules/bypass-headers.json`

```json
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
  },
  {
    "id": 2,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        { "header": "X-Frame-Options", "operation": "remove" },
        { "header": "Content-Security-Policy", "operation": "remove" }
      ]
    },
    "condition": {
      "urlFilter": "https://claude.ai/*",
      "resourceTypes": ["sub_frame"]
    }
  },
  {
    "id": 3,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        { "header": "X-Frame-Options", "operation": "remove" },
        { "header": "Content-Security-Policy", "operation": "remove" }
      ]
    },
    "condition": {
      "urlFilter": "https://gemini.google.com/*",
      "resourceTypes": ["sub_frame"]
    }
  },
  {
    "id": 4,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        { "header": "X-Frame-Options", "operation": "remove" },
        { "header": "Content-Security-Policy", "operation": "remove" }
      ]
    },
    "condition": {
      "urlFilter": "https://grok.com/*",
      "resourceTypes": ["sub_frame"]
    }
  },
  {
    "id": 5,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        { "header": "X-Frame-Options", "operation": "remove" },
        { "header": "Content-Security-Policy", "operation": "remove" }
      ]
    },
    "condition": {
      "urlFilter": "https://chat.deepseek.com/*",
      "resourceTypes": ["sub_frame"]
    }
  },
  {
    "id": 6,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        { "header": "X-Frame-Options", "operation": "remove" }
      ]
    },
    "condition": {
      "urlFilter": "http://localhost:3000/*",
      "resourceTypes": ["sub_frame"]
    }
  }
]
```

---

## Step 3: Create Provider Configuration Module

Define all AI providers in a modular, extensible way.

**File**: `modules/providers.js`

```javascript
export const PROVIDERS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chat.openai.com',
    icon: 'icons/providers/chatgpt.png',
    enabled: true
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai',
    icon: 'icons/providers/claude.png',
    enabled: true
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com',
    icon: 'icons/providers/gemini.png',
    enabled: true
  },
  {
    id: 'grok',
    name: 'Grok',
    url: 'https://grok.com',
    icon: 'icons/providers/grok.png',
    enabled: true
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    icon: 'icons/providers/deepseek.png',
    enabled: true
  },
  {
    id: 'ollama',
    name: 'Ollama',
    url: 'http://localhost:3000',
    icon: 'icons/providers/ollama.png',
    enabled: false  // Disabled by default (requires local setup)
  }
];

export function getProviderById(id) {
  return PROVIDERS.find(p => p.id === id);
}

export async function getEnabledProviders() {
  const settings = await chrome.storage.sync.get({ enabledProviders: ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek'] });
  return PROVIDERS.filter(p => settings.enabledProviders.includes(p.id));
}
```

---

## Step 4: Create Background Service Worker

Handle extension lifecycle events, context menus, and keyboard shortcuts.

**File**: `background/service-worker.js`

```javascript
// Install event - setup context menus
chrome.runtime.onInstalled.addListener(() => {
  console.log('Smarter Panel installed');

  // Create main context menu item
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

  // Configure side panel to open on action click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith('provider-')) {
    const providerId = info.menuItemId.replace('provider-', '');

    // Open side panel
    chrome.sidePanel.open({ windowId: tab.windowId });

    // Send message to sidebar to switch provider
    chrome.runtime.sendMessage({ action: 'switchProvider', payload: { providerId } });
  }
});

// Keyboard shortcut handler
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-sidebar') {
    chrome.sidePanel.open();
  } else if (command === 'open-prompt-library') {
    chrome.sidePanel.open();
    chrome.runtime.sendMessage({ action: 'openPromptLibrary' });
  }
});
```

---

## Step 5: Create Sidebar UI

Build the main sidebar interface with provider tabs and iframe container.

**File**: `sidebar/sidebar.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smarter Panel</title>
  <link rel="stylesheet" href="sidebar.css">
</head>
<body data-theme="auto">
  <div id="app">
    <!-- Provider iframe container -->
    <div id="provider-container">
      <div id="loading">Loading...</div>
      <div id="error" style="display: none;"></div>
      <!-- Iframes will be dynamically inserted here -->
    </div>

    <!-- Provider tabs (bottom navigation) -->
    <nav id="provider-tabs">
      <!-- Tabs will be dynamically generated -->
    </nav>
  </div>

  <script type="module" src="sidebar.js"></script>
</body>
</html>
```

**File**: `sidebar/sidebar.css`

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

#provider-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

#provider-container iframe {
  width: 100%;
  height: 100%;
  border: none;
}

#loading, #error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  text-align: center;
}

#provider-tabs {
  display: flex;
  border-top: 1px solid #ddd;
  background: #f5f5f5;
  overflow-x: auto;
}

#provider-tabs button {
  flex: 1;
  min-width: 60px;
  padding: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s;
}

#provider-tabs button:hover {
  background: #e0e0e0;
}

#provider-tabs button.active {
  background: #fff;
  border-top: 2px solid #1a73e8;
}

/* Dark theme */
[data-theme="dark"] {
  background: #1e1e1e;
  color: #e0e0e0;
}

[data-theme="dark"] #provider-tabs {
  background: #2d2d2d;
  border-top-color: #444;
}

[data-theme="dark"] #provider-tabs button:hover {
  background: #3a3a3a;
}

[data-theme="dark"] #provider-tabs button.active {
  background: #1e1e1e;
  border-top-color: #4285f4;
}
```

**File**: `sidebar/sidebar.js`

```javascript
import { PROVIDERS, getProviderById, getEnabledProviders } from '../modules/providers.js';

let currentProvider = null;
const loadedIframes = new Map();  // providerId -> iframe element

// Initialize sidebar
async function init() {
  await applyTheme();
  await loadSettings();
  renderProviderTabs();
  await loadDefaultProvider();
  setupMessageListener();
}

// Apply theme based on settings
async function applyTheme() {
  const settings = await chrome.storage.sync.get({ theme: 'auto' });
  let theme = settings.theme;

  if (theme === 'auto') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  document.body.setAttribute('data-theme', theme);
}

// Render provider tabs
async function renderProviderTabs() {
  const enabledProviders = await getEnabledProviders();
  const tabsContainer = document.getElementById('provider-tabs');

  tabsContainer.innerHTML = '';

  enabledProviders.forEach(provider => {
    const button = document.createElement('button');
    button.textContent = provider.name;
    button.dataset.providerId = provider.id;
    button.addEventListener('click', () => switchProvider(provider.id));
    tabsContainer.appendChild(button);
  });
}

// Load default or last selected provider
async function loadDefaultProvider() {
  const settings = await chrome.storage.sync.get({ lastSelectedProvider: 'chatgpt', defaultProvider: 'chatgpt' });
  const providerId = settings.lastSelectedProvider || settings.defaultProvider;
  await switchProvider(providerId);
}

// Switch to a provider
async function switchProvider(providerId) {
  const provider = getProviderById(providerId);
  if (!provider) {
    showError(`Provider ${providerId} not found`);
    return;
  }

  // Update active tab
  document.querySelectorAll('#provider-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.providerId === providerId);
  });

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

// Create iframe for provider
function createProviderIframe(provider) {
  const container = document.getElementById('provider-container');
  const iframe = document.createElement('iframe');

  iframe.src = provider.url;
  iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox';
  iframe.allow = 'clipboard-read; clipboard-write';

  iframe.addEventListener('load', () => {
    console.log(`${provider.name} loaded`);
  });

  iframe.addEventListener('error', () => {
    showError(`Failed to load ${provider.name}. Please try again.`);
  });

  container.appendChild(iframe);
  return iframe;
}

// Show/hide loading indicator
function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

// Show/hide error message
function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = message;
  errorEl.style.display = 'flex';
}

function hideError() {
  document.getElementById('error').style.display = 'none';
}

// Listen for messages from background script
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'switchProvider') {
      switchProvider(message.payload.providerId);
      sendResponse({ success: true });
    } else if (message.action === 'openPromptLibrary') {
      // TODO: Switch to Prompt Genie tab
      sendResponse({ success: true });
    }
    return true;
  });
}

// Initialize on load
init();
```

---

## Step 6: Load the Extension

### For Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `smarter-panel` folder
5. Extension should now appear in your extensions list!

### For Edge:

1. Open Edge and navigate to `edge://extensions/`
2. Enable **Developer mode** (toggle in left sidebar)
3. Click **Load unpacked**
4. Select the `smarter-panel` folder
5. Extension should now appear in your extensions list!

---

## Step 7: Test the Extension

### Test Checklist:

- [ ] **Click extension icon** → Sidebar opens
- [ ] **Press Ctrl+Shift+S** → Sidebar opens (or Cmd+Shift+S on Mac)
- [ ] **Login to ChatGPT in a regular tab** → Open sidebar → ChatGPT loads without re-login
- [ ] **Click different provider tabs** → Each provider loads correctly
- [ ] **Switch back to first provider** → Conversation state is preserved
- [ ] **Right-click on any webpage** → "Open in Smarter Panel" appears
- [ ] **Select a provider from context menu** → Sidebar opens to that provider
- [ ] **Close and reopen sidebar** → Last selected provider is restored

---

## Next Steps

### Phase 2: Prompt Library

1. Create `modules/prompt-manager.js` for IndexedDB operations
2. Add Prompt Genie tab to sidebar UI
3. Implement prompt CRUD operations (create, read, update, delete)
4. Add search and filter functionality

### Phase 3: Settings & Configuration

1. Create `options/options.html` for full settings page
2. Implement enable/disable providers
3. Add theme selection (light/dark/auto)
4. Create export/import functionality

### Phase 4: Polish & Optimization

1. Add error handling and user feedback
2. Implement virtual scrolling for large prompt lists
3. Add keyboard shortcuts for prompt library
4. Performance optimization (lazy loading, debouncing)

---

## Troubleshooting

### Extension won't load

- **Check manifest.json syntax** - Use a JSON validator
- **Check browser version** - Must be Chrome 114+ or Edge 114+
- **Check console for errors** - Right-click extension icon → Inspect → Console

### Provider won't load in iframe

- **Check declarativeNetRequest rules** - Ensure bypass-headers.json is valid
- **Check host permissions** - Ensure provider domain is in manifest.json
- **Login to provider first** - Visit provider in regular tab and log in
- **Check browser console** - Look for CORS or X-Frame-Options errors

### Sidebar doesn't open

- **Check sidePanel permission** - Must be in manifest.json permissions
- **Check service worker** - Navigate to chrome://extensions → Service Worker → Inspect
- **Try reloading extension** - Click reload button on chrome://extensions

---

## Resources

- **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions/
- **Side Panel API**: https://developer.chrome.com/docs/extensions/reference/sidePanel/
- **declarativeNetRequest**: https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/
- **IndexedDB Guide**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **chrome.storage API**: https://developer.chrome.com/docs/extensions/reference/storage/

---

## Summary

You now have a working multi-AI sidebar extension! The core functionality includes:

✅ Sidebar panel with AI provider iframes
✅ Provider switching with state preservation
✅ Context menu and keyboard shortcuts
✅ Settings persistence
✅ Theme support (light/dark/auto)

Next, implement the prompt library and settings page to complete all user stories!
