// T028: Prompt Manager with IndexedDB operations
// Handles CRUD operations for prompts in the Prompt Library

const DB_NAME = 'SmarterPanelDB';
const DB_VERSION = 4;  // Upgraded to add modifiedAt field for conversations
const PROMPTS_STORE = 'prompts';
const CONVERSATIONS_STORE = 'conversations';

// T069: Input validation constants
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 50000;
const MAX_CATEGORY_LENGTH = 50;
const MAX_TAG_LENGTH = 30;
const MAX_TAGS_COUNT = 20;

let db = null;

const MAX_IDB_ATTEMPTS = 3;
const RETRY_DELAY_BASE_MS = 100;

function isQuotaExceeded(error) {
  if (!error) return false;
  return error.name === 'QuotaExceededError' || error.code === 22;
}

function buildQuotaError() {
  return new Error('Storage quota exceeded. Delete unused prompts to free space.');
}

async function ensureDb() {
  if (db) {
    try {
      // Accessing objectStoreNames will throw if connection is closing/closed
      db.objectStoreNames;
      return;
    } catch (_) {
      db = null;
    }
  }
  await initPromptDB();
}

// T069: Input sanitization helpers
function sanitizeString(str, maxLength) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

function validatePromptData(promptData) {
  const errors = [];

  if (typeof promptData.content !== 'string' || promptData.content.trim().length === 0) {
    errors.push('Prompt content is required');
  }

  if (promptData.content && promptData.content.length > MAX_CONTENT_LENGTH) {
    errors.push(`Prompt content must be less than ${MAX_CONTENT_LENGTH} characters`);
  }

  if (promptData.title && promptData.title.length > MAX_TITLE_LENGTH) {
    errors.push(`Title must be less than ${MAX_TITLE_LENGTH} characters`);
  }

  if (promptData.category && promptData.category.length > MAX_CATEGORY_LENGTH) {
    errors.push(`Category must be less than ${MAX_CATEGORY_LENGTH} characters`);
  }

  if (promptData.tags && promptData.tags.length > MAX_TAGS_COUNT) {
    errors.push(`Maximum ${MAX_TAGS_COUNT} tags allowed`);
  }

  return errors;
}

// T029: Initialize IndexedDB
export async function initPromptDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      db.onclose = () => {
        db = null;
      };
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // Create prompts object store (version 1)
      if (oldVersion < 1) {
        const promptsStore = db.createObjectStore(PROMPTS_STORE, {
          keyPath: 'id',
          autoIncrement: true
        });

        // Create indexes for efficient querying
        promptsStore.createIndex('title', 'title', { unique: false });
        promptsStore.createIndex('category', 'category', { unique: false });
        promptsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        promptsStore.createIndex('createdAt', 'createdAt', { unique: false });
        promptsStore.createIndex('lastUsed', 'lastUsed', { unique: false });
        promptsStore.createIndex('isFavorite', 'isFavorite', { unique: false });
      }

      // Create conversations object store (version 2)
      if (oldVersion < 2) {
        const conversationsStore = db.createObjectStore(CONVERSATIONS_STORE, {
          keyPath: 'id',
          autoIncrement: true
        });

        // Create indexes for efficient querying
        conversationsStore.createIndex('provider', 'provider', { unique: false });
        conversationsStore.createIndex('timestamp', 'timestamp', { unique: false });
        conversationsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        conversationsStore.createIndex('isFavorite', 'isFavorite', { unique: false });
        conversationsStore.createIndex('searchText', 'searchText', { unique: false });
      }

      // Add conversationId index (version 3)
      if (oldVersion < 3) {
        const transaction = event.target.transaction;
        const conversationsStore = transaction.objectStore(CONVERSATIONS_STORE);

        // Add index for conversationId to enable efficient duplicate checking
        conversationsStore.createIndex('conversationId', 'conversationId', { unique: false });
      }
    };
  });
}

// T030 & T069: Save new prompt with validation
export async function savePrompt(promptData) {
  await ensureDb();

  // Validate input
  const validationErrors = validatePromptData(promptData);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(', '));
  }

  // Sanitize input
  const prompt = {
    title: sanitizeString(promptData.title || 'Untitled Prompt', MAX_TITLE_LENGTH),
    content: sanitizeString(promptData.content, MAX_CONTENT_LENGTH),
    category: sanitizeString(promptData.category || 'General', MAX_CATEGORY_LENGTH),
    tags: Array.isArray(promptData.tags)
      ? promptData.tags.slice(0, MAX_TAGS_COUNT).map(tag => sanitizeString(tag, MAX_TAG_LENGTH)).filter(t => t)
      : [],
    variables: Array.isArray(promptData.variables) ? promptData.variables : [],
    isFavorite: Boolean(promptData.isFavorite),
    createdAt: promptData.createdAt || Date.now(),
    lastUsed: promptData.lastUsed || null,
    useCount: promptData.useCount || 0
  };

  return runWithRetry(() => {
    const transaction = db.transaction([PROMPTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROMPTS_STORE);
    const request = store.add(prompt);

    return wrapRequest(request, resolveValue => ({ ...prompt, id: resolveValue }));
  });
}

// T031: Get prompt by ID
export async function getPrompt(id) {
  await ensureDb();

  return runWithRetry(() => {
    const transaction = db.transaction([PROMPTS_STORE], 'readonly');
    const store = transaction.objectStore(PROMPTS_STORE);
    const request = store.get(id);
    return wrapRequest(request, value => value);
  });
}

// T032: Get all prompts
export async function getAllPrompts() {
  await ensureDb();

  return runWithRetry(() => {
    const transaction = db.transaction([PROMPTS_STORE], 'readonly');
    const store = transaction.objectStore(PROMPTS_STORE);
    const request = store.getAll();
    return wrapRequest(request, value => value || []);
  });
}

// T033: Update existing prompt
export async function updatePrompt(id, updates) {
  await ensureDb();

  return runWithRetry(() => new Promise((resolve, reject) => {
    const transaction = db.transaction([PROMPTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROMPTS_STORE);

    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const prompt = getRequest.result;
      if (!prompt) {
        reject(new Error(`Prompt with id ${id} not found`));
        return;
      }

      const updatedPrompt = { ...prompt, ...updates, id };
      const putRequest = store.put(updatedPrompt);
      wrapRequest(putRequest, () => updatedPrompt).then(resolve).catch(reject);
    };

    getRequest.onerror = () => reject(getRequest.error);
  }));
}

// T034: Delete prompt
export async function deletePrompt(id) {
  await ensureDb();

  return runWithRetry(() => {
    const transaction = db.transaction([PROMPTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROMPTS_STORE);
    const request = store.delete(id);
    return wrapRequest(request, () => true);
  });
}

function runWithRetry(operation, attempt = 1) {
  return new Promise((resolve, reject) => {
    try {
      const result = operation();
      // Operation may return a wrapped promise already
      Promise.resolve(result).then(resolve).catch((error) => {
        handleIdbError(error, operation, attempt, resolve, reject);
      });
    } catch (error) {
      handleIdbError(error, operation, attempt, resolve, reject);
    }
  });
}

function handleIdbError(error, operation, attempt, resolve, reject) {
  if (isQuotaExceeded(error)) {
    reject(buildQuotaError());
    return;
  }

  if (attempt < MAX_IDB_ATTEMPTS) {
    const delay = RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
    setTimeout(() => {
      runWithRetry(operation, attempt + 1).then(resolve).catch(reject);
    }, delay);
  } else {
    reject(error);
  }
}

function wrapRequest(request, mapper) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const value = typeof mapper === 'function' ? mapper(request.result) : request.result;
      resolve(value);
    };
    request.onerror = () => {
      if (isQuotaExceeded(request.error)) {
        reject(buildQuotaError());
      } else {
        reject(request.error);
      }
    };
  });
}

// T035: Search prompts by text (title or content)
export async function searchPrompts(searchText) {
  await ensureDb();

  const allPrompts = await getAllPrompts();
  const lowerSearch = searchText.toLowerCase();

  return allPrompts.filter(prompt =>
    prompt.title.toLowerCase().includes(lowerSearch) ||
    prompt.content.toLowerCase().includes(lowerSearch) ||
    prompt.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
  );
}

// T036: Filter prompts by category
export async function getPromptsByCategory(category) {
  await ensureDb();

  // If category is not provided or invalid, return all prompts
  if (!category || typeof category !== 'string') {
    return getAllPrompts();
  }

  return runWithRetry(() => {
    const transaction = db.transaction([PROMPTS_STORE], 'readonly');
    const store = transaction.objectStore(PROMPTS_STORE);
    const index = store.index('category');
    const request = index.getAll(category);
    return wrapRequest(request, value => value || []);
  });
}

// T037: Get favorite prompts
export async function getFavoritePrompts() {
  await ensureDb();

  // Filter in memory since boolean index queries don't work reliably across browsers
  const allPrompts = await getAllPrompts();
  return allPrompts.filter(p => p.isFavorite === true);
}

// T038: Toggle favorite status
export async function toggleFavorite(id) {
  const prompt = await getPrompt(id);
  if (!prompt) throw new Error(`Prompt ${id} not found`);

  return await updatePrompt(id, { isFavorite: !prompt.isFavorite });
}

// T039: Record prompt usage
export async function recordPromptUsage(id) {
  const prompt = await getPrompt(id);
  if (!prompt) throw new Error(`Prompt ${id} not found`);

  return await updatePrompt(id, {
    lastUsed: Date.now(),
    useCount: (prompt.useCount || 0) + 1
  });
}

// T040: Get all categories
export async function getAllCategories() {
  const prompts = await getAllPrompts();
  const categories = new Set(prompts.map(p => p.category));
  return Array.from(categories).sort();
}

// T041: Get all tags
export async function getAllTags() {
  const prompts = await getAllPrompts();
  const tags = new Set();
  prompts.forEach(p => p.tags.forEach(tag => tags.add(tag)));
  return Array.from(tags).sort();
}

// T042: Export all prompts as JSON
export async function exportPrompts() {
  const prompts = await getAllPrompts();
  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    prompts: prompts
  };
}

// T043: Import prompts from JSON
export async function importPrompts(data, mergeStrategy = 'skip') {
  if (!data || !data.prompts || !Array.isArray(data.prompts)) {
    throw new Error('Invalid import data format');
  }

  const results = {
    imported: 0,
    skipped: 0,
    errors: []
  };

  for (const promptData of data.prompts) {
    try {
      // Remove id to let IndexedDB assign new ones
      const { id, ...promptWithoutId } = promptData;

      if (mergeStrategy === 'overwrite') {
        await savePrompt(promptWithoutId);
        results.imported++;
      } else if (mergeStrategy === 'skip') {
        // Check if similar prompt exists (same title)
        const existing = await searchPrompts(promptData.title);
        if (existing.length === 0) {
          await savePrompt(promptWithoutId);
          results.imported++;
        } else {
          results.skipped++;
        }
      }
    } catch (error) {
      results.errors.push({ prompt: promptData.title, error: error.message });
    }
  }

  return results;
}

// T044: Clear all prompts (with confirmation)
export async function clearAllPrompts() {
  await ensureDb();

  return runWithRetry(() => {
    const transaction = db.transaction([PROMPTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROMPTS_STORE);
    const request = store.clear();
    return wrapRequest(request, () => true);
  });
}

// T071: Get recently used prompts (ordered by lastUsed DESC)
export async function getRecentlyUsedPrompts(limit = 5) {
  const allPrompts = await getAllPrompts();
  return allPrompts
    .filter(p => p.lastUsed !== null && p.lastUsed !== undefined)
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, limit);
}

// T072: Get top favorites (ordered by useCount DESC, favorites only)
export async function getTopFavorites(limit = 5) {
  const favorites = await getFavoritePrompts();
  return favorites
    .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
    .slice(0, limit);
}

// Import default library with title-based deduplication
export async function importDefaultLibrary(libraryData) {
  if (!libraryData || !libraryData.prompts || !Array.isArray(libraryData.prompts)) {
    throw new Error('Invalid library data format');
  }

  const results = {
    imported: 0,
    skipped: 0,
    errors: []
  };

  // Get all existing prompts for deduplication check
  const allPrompts = await getAllPrompts();
  const existingTitles = new Set(
    allPrompts.map(p => p.title.toLowerCase().trim())
  );

  for (const promptData of libraryData.prompts) {
    try {
      // Check if already imported by title
      const titleKey = promptData.title.toLowerCase().trim();
      if (existingTitles.has(titleKey)) {
        results.skipped++;
        continue;
      }

      // Save the prompt
      await savePrompt(promptData);
      results.imported++;

      // Add to existing titles to avoid duplicates in same batch
      existingTitles.add(titleKey);
    } catch (error) {
      results.errors.push({
        prompt: promptData.title,
        error: error.message
      });
    }
  }

  return results;
}

// Initialize DB on module load
initPromptDB().catch(console.error);
