// T028: Prompt Manager with IndexedDB operations
// Handles CRUD operations for prompts in the Prompt Library

const DB_NAME = 'SmarterPanelDB';
const DB_VERSION = 1;
const PROMPTS_STORE = 'prompts';

// T069: Input validation constants
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 50000;
const MAX_CATEGORY_LENGTH = 50;
const MAX_TAG_LENGTH = 30;
const MAX_TAGS_COUNT = 20;

let db = null;

// T069: Input sanitization helpers
function sanitizeString(str, maxLength) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

function validatePromptData(promptData) {
  const errors = [];

  if (!promptData.content || promptData.content.trim().length === 0) {
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
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create prompts object store
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
    };
  });
}

// T030 & T069: Save new prompt with validation
export async function savePrompt(promptData) {
  if (!db) await initPromptDB();

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
    isFavorite: Boolean(promptData.isFavorite),
    createdAt: Date.now(),
    lastUsed: null,
    useCount: 0
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROMPTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROMPTS_STORE);
    const request = store.add(prompt);

    request.onsuccess = () => resolve({ ...prompt, id: request.result });
    request.onerror = () => reject(request.error);
  });
}

// T031: Get prompt by ID
export async function getPrompt(id) {
  if (!db) await initPromptDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROMPTS_STORE], 'readonly');
    const store = transaction.objectStore(PROMPTS_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// T032: Get all prompts
export async function getAllPrompts() {
  if (!db) await initPromptDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROMPTS_STORE], 'readonly');
    const store = transaction.objectStore(PROMPTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// T033: Update existing prompt
export async function updatePrompt(id, updates) {
  if (!db) await initPromptDB();

  return new Promise(async (resolve, reject) => {
    const transaction = db.transaction([PROMPTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROMPTS_STORE);

    // Get existing prompt first
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const prompt = getRequest.result;
      if (!prompt) {
        reject(new Error(`Prompt with id ${id} not found`));
        return;
      }

      // Merge updates
      const updatedPrompt = { ...prompt, ...updates, id };
      const putRequest = store.put(updatedPrompt);

      putRequest.onsuccess = () => resolve(updatedPrompt);
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// T034: Delete prompt
export async function deletePrompt(id) {
  if (!db) await initPromptDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROMPTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROMPTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// T035: Search prompts by text (title or content)
export async function searchPrompts(searchText) {
  if (!db) await initPromptDB();

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
  if (!db) await initPromptDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROMPTS_STORE], 'readonly');
    const store = transaction.objectStore(PROMPTS_STORE);
    const index = store.index('category');
    const request = index.getAll(category);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// T037: Get favorite prompts
export async function getFavoritePrompts() {
  if (!db) await initPromptDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROMPTS_STORE], 'readonly');
    const store = transaction.objectStore(PROMPTS_STORE);
    const index = store.index('isFavorite');
    const request = index.getAll(true);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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
  if (!db) await initPromptDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROMPTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROMPTS_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Initialize DB on module load
initPromptDB().catch(console.error);
