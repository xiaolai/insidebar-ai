# Data Model: Multi-AI Sidebar Extension

**Feature**: Multi-AI Sidebar Extension
**Date**: 2025-10-10
**Purpose**: Define data entities, storage schemas, and relationships for extension data

---

## Storage Architecture Overview

The extension uses a two-tier storage approach:

1. **IndexedDB**: Primary storage for prompts (large, structured data with indexing needs)
2. **chrome.storage**: Settings and state (small key-value data, optionally synced across devices)

### Storage Allocation

| Data Type | Storage | Capacity | Sync | Rationale |
|-----------|---------|----------|------|-----------|
| Prompts | IndexedDB | 50MB+ | No | Large volume (1,000+ prompts), needs indexing for search |
| Settings | chrome.storage.sync | 100KB | Yes | Small key-value data, benefits from cross-device sync |
| Session state | chrome.storage.local | 10MB | No | Ephemeral data, no sync needed |

---

## Entity 1: Prompt

### Description
A reusable text template saved by the user for quick access across AI providers. Prompts are organized by categories and tags for easy discovery.

### Attributes

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | Integer | Auto | Unique identifier (auto-increment) | Primary key |
| `title` | String | Yes | User-friendly name for the prompt | Max 200 characters |
| `content` | String | Yes | The actual prompt text | Max 10,000 characters |
| `category` | String | Yes | Predefined category | One of: 'Coding', 'Writing', 'Analysis', 'Custom' |
| `tags` | Array<String> | No | Custom tags for organization | Max 10 tags, each max 50 characters |
| `createdAt` | Timestamp | Auto | Creation date/time | ISO 8601 format |
| `updatedAt` | Timestamp | Auto | Last modification date/time | ISO 8601 format |

### IndexedDB Schema

```javascript
const promptSchema = {
  keyPath: 'id',
  autoIncrement: true,
  indexes: [
    { name: 'category', keyPath: 'category', unique: false },
    { name: 'title', keyPath: 'title', unique: false },
    { name: 'tags', keyPath: 'tags', unique: false, multiEntry: true },
    { name: 'createdAt', keyPath: 'createdAt', unique: false }
  ]
};
```

### Example

```json
{
  "id": 42,
  "title": "Code Review Checklist",
  "content": "Please review this code for:\n1. Security vulnerabilities\n2. Performance issues\n3. Code style consistency\n4. Test coverage\n5. Documentation completeness",
  "category": "Coding",
  "tags": ["code-review", "best-practices", "quality"],
  "createdAt": "2025-10-10T14:30:00.000Z",
  "updatedAt": "2025-10-10T14:30:00.000Z"
}
```

### Validation Rules

- **Title**: Must not be empty, max 200 characters
- **Content**: Must not be empty, max 10,000 characters
- **Category**: Must be one of the predefined categories (enum)
- **Tags**: Optional; if provided, max 10 tags, each max 50 characters, alphanumeric + hyphens only
- **Timestamps**: Auto-managed by system, ISO 8601 format

### Operations

- **Create**: Insert new prompt with auto-generated ID and timestamps
- **Read**: Query by ID, category, title, or tags (using indexes)
- **Update**: Modify any field except ID, auto-update `updatedAt` timestamp
- **Delete**: Remove by ID with confirmation (soft delete not required)
- **Search**: Full-text search across title, content, and tags
- **Filter**: Filter by category or tags
- **Export**: Serialize all prompts to JSON file
- **Import**: Validate and bulk insert prompts from JSON file

---

## Entity 2: AI Provider Configuration

### Description
Configuration object for each AI provider (ChatGPT, Claude, etc.). Stored in code as JavaScript objects, not in database. User settings determine which providers are enabled.

### Attributes

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | String | Yes | Unique provider identifier | Lowercase, alphanumeric + hyphens |
| `name` | String | Yes | Display name | Human-friendly name |
| `url` | String | Yes | Base URL of the AI service | Valid HTTPS URL (or HTTP for localhost) |
| `icon` | String | Yes | Path to provider icon | Relative path to PNG/SVG |
| `enabled` | Boolean | Yes | Default enabled state | Can be overridden by user settings |
| `injectCSS` | String | No | Optional CSS to inject into iframe | For styling fixes |
| `iframeAttributes` | Object | Yes | Iframe sandbox and other attributes | Security configuration |

### Code Structure (modules/providers.js)

```javascript
export const PROVIDERS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chat.openai.com',
    icon: 'icons/providers/chatgpt.png',
    enabled: true,
    injectCSS: null,
    iframeAttributes: {
      sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox',
      allow: 'clipboard-read; clipboard-write'
    }
  },
  // ... other providers
];
```

### Validation Rules

- **ID**: Must be unique across all providers, lowercase, no spaces
- **URL**: Must be valid HTTP/HTTPS URL
- **Icon**: Path must exist in extension package
- **Iframe attributes**: Must include necessary sandbox permissions for interactivity

### Operations

- **Get all providers**: Return all provider objects
- **Get enabled providers**: Filter by user settings (enabledProviders list)
- **Get provider by ID**: Lookup by ID
- **Add provider**: (Future) Append new provider object to array
- **Update provider config**: (Future) Modify provider attributes

---

## Entity 3: User Settings

### Description
User preferences and configuration options stored in chrome.storage.sync for cross-device synchronization.

### Attributes

| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `enabledProviders` | Array<String> | Yes | List of enabled provider IDs | `['chatgpt', 'claude', 'gemini', 'grok', 'deepseek']` |
| `defaultProvider` | String | Yes | Provider ID to open by default | `'chatgpt'` |
| `lastSelectedProvider` | String | Yes | Last used provider (restored on reopen) | `'chatgpt'` |
| `theme` | String | Yes | UI theme preference | `'auto'` (options: 'light', 'dark', 'auto') |

### chrome.storage.sync Schema

```javascript
const DEFAULT_SETTINGS = {
  enabledProviders: ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek'],
  defaultProvider: 'chatgpt',
  lastSelectedProvider: 'chatgpt',
  theme: 'auto'
};
```

### Validation Rules

- **enabledProviders**: Array must contain at least 1 provider ID; all IDs must be valid (exist in PROVIDERS)
- **defaultProvider**: Must be a valid provider ID and must be in enabledProviders list
- **lastSelectedProvider**: Must be a valid provider ID (or defaults to defaultProvider if invalid)
- **theme**: Must be one of: 'light', 'dark', 'auto'

### Operations

- **Get settings**: Read all settings with defaults fallback
- **Update setting**: Update individual setting key
- **Reset settings**: Restore all defaults
- **Export settings**: Serialize to JSON file
- **Import settings**: Validate and restore from JSON file

---

## Entity 4: Provider Session State

### Description
Ephemeral state for each AI provider iframe, maintained in memory during sidebar session. Not persisted across browser restarts.

### Attributes

| Field | Type | Description |
|-------|------|-------------|
| `providerId` | String | Provider identifier |
| `iframeElement` | HTMLIFrameElement | Reference to iframe DOM element |
| `currentUrl` | String | Current URL loaded in iframe (may differ from base URL due to navigation) |
| `lastActive` | Timestamp | Last time this provider was viewed |
| `loaded` | Boolean | Whether iframe has completed initial load |

### Storage Location

In-memory JavaScript Map structure, not persisted.

```javascript
const providerSessions = new Map(); // providerId -> sessionState

const sessionState = {
  providerId: 'chatgpt',
  iframeElement: iframeRef,
  currentUrl: 'https://chat.openai.com/c/abc123',
  lastActive: Date.now(),
  loaded: true
};
```

### Lifecycle

- **Created**: When user first switches to a provider (lazy loading)
- **Updated**: When provider is active and URL changes
- **Destroyed**: When sidebar is closed or provider is unloaded to free memory

---

## Data Relationships

### Diagram

```
┌─────────────────────┐
│  User Settings      │
│  (chrome.storage)   │
│                     │
│ - enabledProviders ─┼──> filters ──> PROVIDERS (code)
│ - defaultProvider   │                    │
│ - theme             │                    │
└─────────────────────┘                    │
                                           │
                                           ▼
                               ┌─────────────────────┐
                               │ Provider Sessions   │
                               │ (in-memory Map)     │
                               │                     │
                               │ - iframeElement     │
                               │ - currentUrl        │
                               └─────────────────────┘

┌─────────────────────┐
│  Prompts            │
│  (IndexedDB)        │
│                     │
│ - id (PK)           │
│ - title (indexed)   │
│ - content           │
│ - category (indexed)│
│ - tags (indexed)    │
│ - timestamps        │
└─────────────────────┘
   │
   │ No foreign keys (independent entity)
   │
   ▼
 User copies prompt → Uses with any AI provider
```

### Relationships

- **User Settings → Providers**: `enabledProviders` array filters the PROVIDERS list to determine visible tabs
- **User Settings → Provider Sessions**: `lastSelectedProvider` determines which provider to restore on sidebar open
- **Prompts → Providers**: No direct relationship; prompts are provider-agnostic and can be used with any provider
- **Provider Sessions → Providers**: Each session state references a provider by ID

---

## Data Flow Examples

### 1. User Opens Sidebar

```
1. Read user settings (chrome.storage.sync)
2. Get lastSelectedProvider or defaultProvider
3. Create provider session state (in-memory)
4. Lazy-load iframe for selected provider
5. Render provider tabs based on enabledProviders
```

### 2. User Saves a Prompt

```
1. User fills prompt form (title, category, tags, content)
2. Validate input (title not empty, category valid, etc.)
3. Create prompt object with auto-generated ID and timestamps
4. Save to IndexedDB prompts object store
5. Update UI to show new prompt in library
```

### 3. User Searches Prompts

```
1. User types in search box (debounced)
2. Query IndexedDB indexes (title, content, tags)
3. Filter results by category if selected
4. Render matching prompts
```

### 4. User Exports Data

```
1. Read all prompts from IndexedDB
2. Read all settings from chrome.storage
3. Combine into single JSON object:
   {
     "settings": { ... },
     "prompts": [ ... ]
   }
4. Create Blob and trigger download
```

### 5. User Imports Data

```
1. User selects JSON file
2. Parse and validate JSON structure
3. Validate each prompt (schema, constraints)
4. Validate settings (valid provider IDs, theme, etc.)
5. Bulk insert prompts to IndexedDB
6. Update settings in chrome.storage
7. Reload UI to reflect imported data
```

---

## Storage Capacity Planning

### Prompt Storage Estimation

Assuming average prompt:
- Title: 50 characters = 100 bytes (UTF-16)
- Content: 500 characters = 1,000 bytes
- Category: 10 characters = 20 bytes
- Tags: 3 tags × 20 characters = 120 bytes
- Metadata (ID, timestamps): ~100 bytes

**Total per prompt**: ~1,340 bytes ≈ 1.3 KB

**For 1,000 prompts**: 1.3 MB (well within IndexedDB 50MB+ limit)

**For 10,000 prompts**: 13 MB (still within limits, though UI performance may need virtual scrolling)

### Settings Storage Estimation

All settings combined: <1 KB (well within chrome.storage.sync 100KB limit)

---

## Security Considerations

### Input Sanitization

- **Prompt content**: Sanitize HTML to prevent XSS when displaying prompts
- **Prompt title/tags**: Limit character sets to prevent injection attacks
- **Imported data**: Validate JSON schema and sanitize all fields before inserting

### Storage Security

- **IndexedDB**: Scoped to extension origin, not accessible to web pages
- **chrome.storage**: Scoped to extension, not shared with other extensions
- **No sensitive data**: No passwords, API keys, or tokens stored (cookie-based auth only)

### Example Sanitization

```javascript
function sanitizePromptInput(input) {
  // Remove HTML tags
  const withoutHTML = input.replace(/<[^>]*>/g, '');
  // Limit length
  const trimmed = withoutHTML.slice(0, 10000);
  // Escape special characters for display
  const escaped = escapeHTML(trimmed);
  return escaped;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

---

## Migration & Versioning

### IndexedDB Version Management

Current version: 1

Future migrations (if schema changes):

```javascript
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const oldVersion = event.oldVersion;

  if (oldVersion < 1) {
    // Initial schema (version 1)
    const store = db.createObjectStore('prompts', { keyPath: 'id', autoIncrement: true });
    store.createIndex('category', 'category', { unique: false });
    store.createIndex('title', 'title', { unique: false });
    store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
  }

  if (oldVersion < 2) {
    // Future: Add new index or field
    // const store = transaction.objectStore('prompts');
    // store.createIndex('newField', 'newField', { unique: false });
  }
};
```

### Settings Migration

If settings schema changes, use version key and migration function:

```javascript
const SETTINGS_VERSION = 1;

async function migrateSettings(settings) {
  if (settings.version === SETTINGS_VERSION) return settings;

  // Perform migration
  if (!settings.version || settings.version < 1) {
    // Add new defaults, transform old structure, etc.
    settings.version = 1;
  }

  return settings;
}
```

---

## Summary

The data model supports:

- ✅ **1,000+ prompts** with efficient indexing and search
- ✅ **Local-only storage** (privacy-first principle)
- ✅ **Cross-device settings sync** (optional via chrome.storage.sync)
- ✅ **Modular provider architecture** (code-based configs)
- ✅ **Graceful degradation** (fallbacks for storage failures)
- ✅ **Export/import** (data portability and backup)
- ✅ **Security** (input sanitization, origin-scoped storage)
- ✅ **Performance** (indexed queries, in-memory sessions)

All entities align with functional requirements and constitutional principles.
