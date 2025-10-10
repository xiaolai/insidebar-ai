# Messaging API Contract

**Feature**: Multi-AI Sidebar Extension
**Date**: 2025-10-10
**Purpose**: Define internal message passing contracts between extension components (background service worker ↔ sidebar ↔ options page)

---

## Overview

Chrome extensions use message passing for communication between contexts:
- **Background service worker** (background/service-worker.js)
- **Sidebar UI** (sidebar/sidebar.html + sidebar.js)
- **Options page** (options/options.html + options.js)

Messages use `chrome.runtime.sendMessage()` and `chrome.runtime.onMessage` listeners.

---

## Message Structure

All messages follow this structure:

```typescript
interface Message {
  action: string;           // Message type/action identifier
  payload?: any;            // Optional data payload
  requestId?: string;       // Optional ID for request-response pattern
}

interface Response {
  success: boolean;         // Whether action succeeded
  data?: any;               // Optional response data
  error?: string;           // Optional error message
}
```

---

## Messages: Background → Sidebar

### 1. Switch Provider

**Purpose**: Instruct sidebar to switch to a specific AI provider (triggered by context menu selection)

**Message**:
```json
{
  "action": "switchProvider",
  "payload": {
    "providerId": "claude"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "providerId": "claude",
    "providerName": "Claude"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Provider 'invalid-id' not found"
}
```

---

### 2. Open Prompt Library

**Purpose**: Instruct sidebar to navigate to Prompt Genie tab (triggered by keyboard shortcut)

**Message**:
```json
{
  "action": "openPromptLibrary"
}
```

**Response**:
```json
{
  "success": true
}
```

---

## Messages: Sidebar → Background

### 3. Get Settings

**Purpose**: Request current user settings from chrome.storage

**Message**:
```json
{
  "action": "getSettings"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "enabledProviders": ["chatgpt", "claude", "gemini"],
    "defaultProvider": "chatgpt",
    "lastSelectedProvider": "claude",
    "theme": "dark"
  }
}
```

---

### 4. Update Setting

**Purpose**: Update a specific setting value

**Message**:
```json
{
  "action": "updateSetting",
  "payload": {
    "key": "theme",
    "value": "dark"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "key": "theme",
    "value": "dark"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Invalid setting key: 'invalidKey'"
}
```

---

### 5. Provider Load Error

**Purpose**: Report provider iframe load failure to background for logging/telemetry

**Message**:
```json
{
  "action": "providerLoadError",
  "payload": {
    "providerId": "chatgpt",
    "error": "Failed to load iframe",
    "errorCode": "IFRAME_LOAD_FAILED"
  }
}
```

**Response**:
```json
{
  "success": true
}
```

---

## Messages: Options Page ↔ Background

### 6. Export Data

**Purpose**: Request full data export (settings + prompts)

**Message**:
```json
{
  "action": "exportData"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "version": 1,
    "exportDate": "2025-10-10T14:30:00.000Z",
    "settings": {
      "enabledProviders": ["chatgpt", "claude"],
      "defaultProvider": "chatgpt",
      "theme": "auto"
    },
    "prompts": [
      {
        "id": 1,
        "title": "Code Review",
        "content": "Review this code...",
        "category": "Coding",
        "tags": ["review"],
        "createdAt": "2025-10-01T10:00:00.000Z",
        "updatedAt": "2025-10-01T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 7. Import Data

**Purpose**: Import settings and prompts from exported JSON

**Message**:
```json
{
  "action": "importData",
  "payload": {
    "version": 1,
    "settings": { ... },
    "prompts": [ ... ]
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "settingsImported": true,
    "promptsImported": 15,
    "errors": []
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Invalid import data format",
  "data": {
    "errors": [
      "Prompt 3: title is required",
      "Setting 'invalidKey' is not recognized"
    ]
  }
}
```

---

### 8. Reset All Data

**Purpose**: Reset all settings to defaults and delete all prompts

**Message**:
```json
{
  "action": "resetAllData",
  "payload": {
    "confirmed": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "settingsReset": true,
    "promptsDeleted": 42
  }
}
```

---

## Broadcast Messages (Storage Changes)

These are automatically broadcasted by Chrome when storage changes occur. All contexts listen via `chrome.storage.onChanged`.

### 9. Settings Changed

**Event**: chrome.storage.onChanged

**Payload**:
```json
{
  "enabledProviders": {
    "oldValue": ["chatgpt", "claude", "gemini"],
    "newValue": ["chatgpt", "claude"]
  },
  "theme": {
    "oldValue": "light",
    "newValue": "dark"
  }
}
```

**Handler Behavior**:
- Sidebar: Update UI to reflect new settings (hide disabled provider tabs, apply theme)
- Options page: Update form controls to match new values

---

## Error Codes

Standardized error codes for message responses:

| Code | Description |
|------|-------------|
| `PROVIDER_NOT_FOUND` | Requested provider ID does not exist |
| `INVALID_SETTING_KEY` | Setting key is not recognized |
| `INVALID_SETTING_VALUE` | Setting value fails validation |
| `STORAGE_ERROR` | chrome.storage operation failed |
| `INDEXEDDB_ERROR` | IndexedDB operation failed |
| `QUOTA_EXCEEDED` | Storage quota exceeded |
| `IMPORT_VALIDATION_FAILED` | Import data validation failed |
| `IFRAME_LOAD_FAILED` | Provider iframe failed to load |
| `NETWORK_ERROR` | Network request failed |

---

## Usage Examples

### Example 1: Background Requests Sidebar to Switch Provider

```javascript
// background/service-worker.js
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith('provider-')) {
    const providerId = info.menuItemId.replace('provider-', '');

    chrome.runtime.sendMessage(
      { action: 'switchProvider', payload: { providerId } },
      (response) => {
        if (response.success) {
          console.log(`Switched to ${response.data.providerName}`);
        } else {
          console.error(`Failed to switch provider: ${response.error}`);
        }
      }
    );
  }
});
```

### Example 2: Sidebar Listens for Messages

```javascript
// sidebar/sidebar.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'switchProvider':
      const providerId = message.payload.providerId;
      const provider = getProviderById(providerId);

      if (provider) {
        switchToProvider(provider);
        sendResponse({
          success: true,
          data: { providerId: provider.id, providerName: provider.name }
        });
      } else {
        sendResponse({
          success: false,
          error: `Provider '${providerId}' not found`
        });
      }
      break;

    case 'openPromptLibrary':
      navigateToTab('prompt-genie');
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }

  return true; // Keep message channel open for async response
});
```

### Example 3: Options Page Exports Data

```javascript
// options/options.js
document.getElementById('export-btn').addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ action: 'exportData' });

  if (response.success) {
    const dataStr = JSON.stringify(response.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `smarter-panel-export-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  } else {
    alert(`Export failed: ${response.error}`);
  }
});
```

---

## Security Considerations

### Message Validation

All message handlers MUST validate:
1. **Action exists**: Check message.action is recognized
2. **Payload structure**: Validate payload matches expected schema
3. **Payload values**: Sanitize and validate all values before use

### Example Validation

```javascript
function validateMessage(message, expectedSchema) {
  if (!message.action) {
    throw new Error('Missing action');
  }

  if (expectedSchema.requiresPayload && !message.payload) {
    throw new Error('Missing payload');
  }

  if (expectedSchema.payloadSchema) {
    // Validate payload structure
    const errors = validateSchema(message.payload, expectedSchema.payloadSchema);
    if (errors.length > 0) {
      throw new Error(`Payload validation failed: ${errors.join(', ')}`);
    }
  }

  return true;
}
```

### Rate Limiting

For messages that trigger expensive operations (export, import, reset), implement rate limiting:

```javascript
const rateLimiter = new Map(); // action -> lastExecuted timestamp

function checkRateLimit(action, cooldownMs = 1000) {
  const now = Date.now();
  const lastExecuted = rateLimiter.get(action) || 0;

  if (now - lastExecuted < cooldownMs) {
    throw new Error('Rate limit exceeded. Please wait before retrying.');
  }

  rateLimiter.set(action, now);
  return true;
}
```

---

## Testing Contract Compliance

### Unit Tests (if implemented)

```javascript
describe('Messaging API', () => {
  test('switchProvider message returns success for valid provider', async () => {
    const response = await sendMessage({ action: 'switchProvider', payload: { providerId: 'claude' } });
    expect(response.success).toBe(true);
    expect(response.data.providerId).toBe('claude');
  });

  test('switchProvider message returns error for invalid provider', async () => {
    const response = await sendMessage({ action: 'switchProvider', payload: { providerId: 'invalid' } });
    expect(response.success).toBe(false);
    expect(response.error).toContain('not found');
  });

  test('updateSetting validates setting key', async () => {
    const response = await sendMessage({ action: 'updateSetting', payload: { key: 'invalidKey', value: 'test' } });
    expect(response.success).toBe(false);
    expect(response.error).toContain('Invalid setting key');
  });
});
```

### Manual Testing

1. **Open sidebar** → Verify settings are loaded
2. **Right-click context menu** → Select provider → Verify sidebar switches
3. **Press keyboard shortcut** → Verify prompt library opens
4. **Change setting in options page** → Verify sidebar reflects change
5. **Export data** → Verify JSON file contains settings and prompts
6. **Import data** → Verify settings and prompts are restored

---

## Summary

The messaging API provides:

- ✅ **Clear contracts** for all inter-component communication
- ✅ **Type-safe messages** with defined structure and payloads
- ✅ **Error handling** with standardized error codes
- ✅ **Security** through validation and rate limiting
- ✅ **Testability** with predictable request/response patterns

All messages align with functional requirements and support graceful degradation.
