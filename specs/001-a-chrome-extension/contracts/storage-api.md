# Storage API Contract

**Feature**: Multi-AI Sidebar Extension
**Date**: 2025-10-10
**Purpose**: Define storage interfaces for prompt management, settings, and data operations

---

## Overview

The extension uses two storage systems:
1. **IndexedDB**: For prompts (structured data with indexing)
2. **chrome.storage**: For settings (key-value configuration)

This contract defines the interface for all storage operations to ensure consistent behavior across the extension.

---

## Prompt Storage Interface (IndexedDB)

### Database: `SmarterPanelDB`

**Version**: 1
**Object Store**: `prompts`

---

### Method: `savePrompt(prompt)`

Create a new prompt or update an existing one.

**Parameters**:
```typescript
interface PromptInput {
  id?: number;              // Optional for new prompts, required for updates
  title: string;            // Max 200 characters
  content: string;          // Max 10,000 characters
  category: string;         // One of: 'Coding', 'Writing', 'Analysis', 'Custom'
  tags?: string[];          // Optional, max 10 tags, each max 50 characters
}
```

**Returns**:
```typescript
interface SavePromptResult {
  success: boolean;
  prompt?: Prompt;          // Full prompt object with id and timestamps
  error?: string;
}
```

**Example**:
```javascript
const result = await promptManager.savePrompt({
  title: 'Code Review Checklist',
  content: 'Review for security, performance, tests...',
  category: 'Coding',
  tags: ['review', 'quality']
});

// Result:
{
  success: true,
  prompt: {
    id: 42,
    title: 'Code Review Checklist',
    content: 'Review for security, performance, tests...',
    category: 'Coding',
    tags: ['review', 'quality'],
    createdAt: '2025-10-10T14:30:00.000Z',
    updatedAt: '2025-10-10T14:30:00.000Z'
  }
}
```

**Errors**:
- `VALIDATION_ERROR`: Title or content empty, category invalid, tags exceed limits
- `INDEXEDDB_ERROR`: Database operation failed
- `QUOTA_EXCEEDED`: Storage quota exceeded

---

### Method: `getPrompt(id)`

Retrieve a single prompt by ID.

**Parameters**:
```typescript
id: number  // Prompt ID
```

**Returns**:
```typescript
interface GetPromptResult {
  success: boolean;
  prompt?: Prompt;
  error?: string;
}
```

**Example**:
```javascript
const result = await promptManager.getPrompt(42);

// Result:
{
  success: true,
  prompt: { id: 42, title: 'Code Review Checklist', ... }
}
```

**Errors**:
- `NOT_FOUND`: Prompt with given ID does not exist
- `INDEXEDDB_ERROR`: Database operation failed

---

### Method: `getAllPrompts(options?)`

Retrieve all prompts with optional filtering and sorting.

**Parameters**:
```typescript
interface GetPromptsOptions {
  category?: string;        // Filter by category
  tags?: string[];          // Filter by tags (OR logic: match any tag)
  sortBy?: string;          // 'title' | 'createdAt' | 'updatedAt'
  sortOrder?: string;       // 'asc' | 'desc'
  limit?: number;           // Max results (for pagination)
  offset?: number;          // Skip N results (for pagination)
}
```

**Returns**:
```typescript
interface GetAllPromptsResult {
  success: boolean;
  prompts?: Prompt[];
  total?: number;           // Total prompts (before pagination)
  error?: string;
}
```

**Example**:
```javascript
const result = await promptManager.getAllPrompts({
  category: 'Coding',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  limit: 20
});

// Result:
{
  success: true,
  prompts: [ ... ],
  total: 42
}
```

**Errors**:
- `INDEXEDDB_ERROR`: Database operation failed

---

### Method: `searchPrompts(query)`

Full-text search across prompt titles, content, and tags.

**Parameters**:
```typescript
query: string  // Search query (case-insensitive)
```

**Returns**:
```typescript
interface SearchPromptsResult {
  success: boolean;
  prompts?: Prompt[];
  error?: string;
}
```

**Example**:
```javascript
const result = await promptManager.searchPrompts('code review');

// Result:
{
  success: true,
  prompts: [
    { id: 42, title: 'Code Review Checklist', ... },
    { id: 43, title: 'Code Review Best Practices', ... }
  ]
}
```

**Implementation**:
```javascript
async searchPrompts(query) {
  const allPrompts = await this.getAllPrompts();
  const lowerQuery = query.toLowerCase();

  const filtered = allPrompts.prompts.filter(prompt => {
    return (
      prompt.title.toLowerCase().includes(lowerQuery) ||
      prompt.content.toLowerCase().includes(lowerQuery) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  });

  return { success: true, prompts: filtered };
}
```

---

### Method: `deletePrompt(id)`

Delete a prompt by ID.

**Parameters**:
```typescript
id: number  // Prompt ID
```

**Returns**:
```typescript
interface DeletePromptResult {
  success: boolean;
  error?: string;
}
```

**Example**:
```javascript
const result = await promptManager.deletePrompt(42);

// Result:
{
  success: true
}
```

**Errors**:
- `NOT_FOUND`: Prompt with given ID does not exist
- `INDEXEDDB_ERROR`: Database operation failed

---

### Method: `exportPrompts()`

Export all prompts as JSON-serializable array.

**Returns**:
```typescript
interface ExportPromptsResult {
  success: boolean;
  prompts?: Prompt[];
  error?: string;
}
```

**Example**:
```javascript
const result = await promptManager.exportPrompts();

// Result:
{
  success: true,
  prompts: [
    { id: 1, title: '...', ... },
    { id: 2, title: '...', ... }
  ]
}
```

---

### Method: `importPrompts(prompts, options?)`

Import prompts from JSON array.

**Parameters**:
```typescript
interface ImportPromptsOptions {
  overwrite?: boolean;      // Overwrite existing prompts with same ID (default: false)
  validateOnly?: boolean;   // Only validate, don't import (default: false)
}

prompts: Prompt[]           // Array of prompt objects
options?: ImportPromptsOptions
```

**Returns**:
```typescript
interface ImportPromptsResult {
  success: boolean;
  imported?: number;        // Number of prompts imported
  skipped?: number;         // Number of prompts skipped (validation failed)
  errors?: string[];        // Validation errors
}
```

**Example**:
```javascript
const result = await promptManager.importPrompts(importedPrompts, { overwrite: false });

// Result:
{
  success: true,
  imported: 15,
  skipped: 2,
  errors: [
    'Prompt 5: title is required',
    'Prompt 8: invalid category "InvalidCategory"'
  ]
}
```

**Validation Rules**:
- Title must not be empty, max 200 characters
- Content must not be empty, max 10,000 characters
- Category must be one of: 'Coding', 'Writing', 'Analysis', 'Custom'
- Tags (if present) max 10 tags, each max 50 characters

---

### Method: `clearAllPrompts()`

Delete all prompts (used for data reset).

**Returns**:
```typescript
interface ClearPromptsResult {
  success: boolean;
  deleted?: number;         // Number of prompts deleted
  error?: string;
}
```

**Example**:
```javascript
const result = await promptManager.clearAllPrompts();

// Result:
{
  success: true,
  deleted: 42
}
```

---

## Settings Storage Interface (chrome.storage)

### Method: `getSettings()`

Retrieve all user settings.

**Returns**:
```typescript
interface Settings {
  enabledProviders: string[];      // Array of enabled provider IDs
  defaultProvider: string;         // Default provider ID
  lastSelectedProvider: string;    // Last selected provider ID
  theme: string;                   // 'light' | 'dark' | 'auto'
}
```

**Example**:
```javascript
const settings = await getSettings();

// Result:
{
  enabledProviders: ['chatgpt', 'claude', 'gemini'],
  defaultProvider: 'chatgpt',
  lastSelectedProvider: 'claude',
  theme: 'dark'
}
```

**Fallback**: If chrome.storage.sync fails, fallback to chrome.storage.local

---

### Method: `getSetting(key)`

Retrieve a specific setting value.

**Parameters**:
```typescript
key: string  // Setting key
```

**Returns**:
```typescript
any  // Setting value (type depends on key)
```

**Example**:
```javascript
const theme = await getSetting('theme');
// Result: 'dark'
```

---

### Method: `saveSetting(key, value)`

Update a specific setting value.

**Parameters**:
```typescript
key: string   // Setting key
value: any    // New value
```

**Returns**:
```typescript
interface SaveSettingResult {
  success: boolean;
  error?: string;
}
```

**Example**:
```javascript
const result = await saveSetting('theme', 'dark');

// Result:
{
  success: true
}
```

**Validation**:
- `enabledProviders`: Must be array, all IDs must be valid providers, at least 1 provider
- `defaultProvider`: Must be valid provider ID, must be in enabledProviders
- `lastSelectedProvider`: Must be valid provider ID
- `theme`: Must be one of: 'light', 'dark', 'auto'

**Errors**:
- `INVALID_SETTING_KEY`: Setting key not recognized
- `INVALID_SETTING_VALUE`: Value fails validation
- `STORAGE_ERROR`: chrome.storage operation failed

---

### Method: `saveSettings(settings)`

Batch update multiple settings.

**Parameters**:
```typescript
settings: Partial<Settings>  // Object with setting key-value pairs
```

**Returns**:
```typescript
interface SaveSettingsResult {
  success: boolean;
  errors?: { [key: string]: string };  // Validation errors per key
}
```

**Example**:
```javascript
const result = await saveSettings({
  theme: 'dark',
  defaultProvider: 'claude'
});

// Result:
{
  success: true
}
```

---

### Method: `resetSettings()`

Reset all settings to defaults.

**Returns**:
```typescript
interface ResetSettingsResult {
  success: boolean;
  error?: string;
}
```

**Example**:
```javascript
const result = await resetSettings();

// Result:
{
  success: true
}
```

---

### Method: `exportSettings()`

Export all settings as JSON-serializable object.

**Returns**:
```typescript
Settings  // Current settings object
```

**Example**:
```javascript
const settings = await exportSettings();

// Result:
{
  enabledProviders: ['chatgpt', 'claude'],
  defaultProvider: 'chatgpt',
  lastSelectedProvider: 'claude',
  theme: 'auto'
}
```

---

### Method: `importSettings(settings)`

Import settings from JSON object.

**Parameters**:
```typescript
settings: Partial<Settings>  // Settings object to import
```

**Returns**:
```typescript
interface ImportSettingsResult {
  success: boolean;
  imported?: string[];        // Keys that were imported
  skipped?: string[];         // Keys that were skipped (validation failed)
  errors?: { [key: string]: string };
}
```

**Example**:
```javascript
const result = await importSettings({
  theme: 'dark',
  enabledProviders: ['chatgpt', 'claude'],
  invalidKey: 'value'  // Will be skipped
});

// Result:
{
  success: true,
  imported: ['theme', 'enabledProviders'],
  skipped: ['invalidKey'],
  errors: {
    invalidKey: 'Setting key not recognized'
  }
}
```

---

## Combined Export/Import Interface

### Method: `exportAllData()`

Export both settings and prompts as a single JSON structure.

**Returns**:
```typescript
interface ExportData {
  version: number;             // Export format version (currently 1)
  exportDate: string;          // ISO 8601 timestamp
  settings: Settings;          // All settings
  prompts: Prompt[];           // All prompts
}
```

**Example**:
```javascript
const data = await exportAllData();

// Result:
{
  version: 1,
  exportDate: '2025-10-10T14:30:00.000Z',
  settings: { ... },
  prompts: [ ... ]
}
```

---

### Method: `importAllData(data, options?)`

Import settings and prompts from exported JSON.

**Parameters**:
```typescript
interface ImportOptions {
  overwriteSettings?: boolean;   // Overwrite existing settings (default: true)
  overwritePrompts?: boolean;    // Overwrite existing prompts (default: false)
}

data: ExportData
options?: ImportOptions
```

**Returns**:
```typescript
interface ImportAllDataResult {
  success: boolean;
  settingsImported?: boolean;
  promptsImported?: number;
  promptsSkipped?: number;
  errors?: string[];
}
```

**Example**:
```javascript
const result = await importAllData(importedData, {
  overwriteSettings: true,
  overwritePrompts: false
});

// Result:
{
  success: true,
  settingsImported: true,
  promptsImported: 15,
  promptsSkipped: 0,
  errors: []
}
```

**Validation**:
1. Check `version` field (must be 1)
2. Validate `settings` object structure and values
3. Validate each prompt in `prompts` array
4. If validation fails, return errors without importing

---

## Error Handling

### Standard Error Codes

| Code | Description | Recovery Action |
|------|-------------|-----------------|
| `INDEXEDDB_ERROR` | IndexedDB operation failed | Retry or use chrome.storage fallback |
| `STORAGE_ERROR` | chrome.storage operation failed | Retry or inform user |
| `QUOTA_EXCEEDED` | Storage quota exceeded | Suggest user export and delete old prompts |
| `VALIDATION_ERROR` | Input validation failed | Show validation errors to user |
| `NOT_FOUND` | Requested item not found | Inform user item doesn't exist |
| `INVALID_SETTING_KEY` | Setting key not recognized | Check spelling or use valid key |
| `INVALID_SETTING_VALUE` | Setting value fails validation | Show validation requirements to user |
| `IMPORT_FORMAT_ERROR` | Import data format invalid | Check file format and version |

### Error Response Structure

```typescript
interface ErrorResponse {
  success: false;
  error: string;           // Error message
  errorCode?: string;      // Error code from table above
  details?: any;           // Additional error details
}
```

---

## Usage Examples

### Example 1: Create and Save a Prompt

```javascript
const result = await promptManager.savePrompt({
  title: 'API Documentation Template',
  content: 'Create API documentation for the following endpoint...',
  category: 'Coding',
  tags: ['api', 'documentation', 'template']
});

if (result.success) {
  console.log(`Prompt saved with ID ${result.prompt.id}`);
} else {
  console.error(`Failed to save prompt: ${result.error}`);
}
```

### Example 2: Search and Display Prompts

```javascript
const searchResults = await promptManager.searchPrompts('code review');

if (searchResults.success) {
  searchResults.prompts.forEach(prompt => {
    console.log(`${prompt.title} (${prompt.category})`);
  });
} else {
  console.error(`Search failed: ${searchResults.error}`);
}
```

### Example 3: Update a Setting

```javascript
const result = await saveSetting('theme', 'dark');

if (result.success) {
  applyTheme('dark');
} else {
  console.error(`Failed to update theme: ${result.error}`);
}
```

### Example 4: Export All Data

```javascript
const data = await exportAllData();
const json = JSON.stringify(data, null, 2);
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);

const a = document.createElement('a');
a.href = url;
a.download = `smarter-panel-backup-${Date.now()}.json`;
a.click();

URL.revokeObjectURL(url);
```

---

## Testing Contract Compliance

### Test Cases

```javascript
describe('Prompt Storage API', () => {
  test('savePrompt creates new prompt with auto-generated ID', async () => {
    const result = await promptManager.savePrompt({
      title: 'Test Prompt',
      content: 'Test content',
      category: 'Custom'
    });

    expect(result.success).toBe(true);
    expect(result.prompt.id).toBeDefined();
    expect(result.prompt.createdAt).toBeDefined();
  });

  test('savePrompt validates required fields', async () => {
    const result = await promptManager.savePrompt({
      title: '',  // Invalid: empty title
      content: 'Test',
      category: 'Custom'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('title');
  });

  test('searchPrompts returns matching prompts', async () => {
    await promptManager.savePrompt({ title: 'Code Review', content: '...', category: 'Coding' });
    await promptManager.savePrompt({ title: 'Writing Tips', content: '...', category: 'Writing' });

    const result = await promptManager.searchPrompts('code');

    expect(result.success).toBe(true);
    expect(result.prompts.length).toBe(1);
    expect(result.prompts[0].title).toBe('Code Review');
  });
});
```

---

## Summary

The storage API provides:

- ✅ **Clear interfaces** for all storage operations
- ✅ **Type safety** with defined input/output structures
- ✅ **Validation** for all data inputs
- ✅ **Error handling** with standardized error codes
- ✅ **Fallback behavior** (IndexedDB → chrome.storage)
- ✅ **Export/import** for data portability
- ✅ **Performance** with indexed queries and pagination

All interfaces align with functional requirements and data model specifications.
