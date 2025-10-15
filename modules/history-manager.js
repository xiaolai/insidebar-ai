// Chat History Manager with IndexedDB operations
// Handles CRUD operations for saved conversations

import { initPromptDB } from './prompt-manager.js';

const DB_NAME = 'SmarterPanelDB';
const CONVERSATIONS_STORE = 'conversations';

// Validation constants
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 100000;  // Longer for conversations
const MAX_NOTES_LENGTH = 5000;
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
  return new Error('Storage quota exceeded. Delete old conversations to free space.');
}

async function ensureDb() {
  if (db) {
    try {
      db.objectStoreNames;
      return;
    } catch (_) {
      db = null;
    }
  }
  db = await initPromptDB();
}

// Input sanitization helpers
function sanitizeString(str, maxLength) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

function validateConversationData(data) {
  const errors = [];

  if (!data.content || data.content.trim().length === 0) {
    errors.push('Conversation content is required');
  }

  if (data.content && data.content.length > MAX_CONTENT_LENGTH) {
    errors.push(`Content must be less than ${MAX_CONTENT_LENGTH} characters`);
  }

  if (data.title && data.title.length > MAX_TITLE_LENGTH) {
    errors.push(`Title must be less than ${MAX_TITLE_LENGTH} characters`);
  }

  if (data.notes && data.notes.length > MAX_NOTES_LENGTH) {
    errors.push(`Notes must be less than ${MAX_NOTES_LENGTH} characters`);
  }

  if (data.tags && data.tags.length > MAX_TAGS_COUNT) {
    errors.push(`Maximum ${MAX_TAGS_COUNT} tags allowed`);
  }

  return errors;
}

// Generate searchable text from conversation
function generateSearchText(conversation) {
  const parts = [
    conversation.title,
    conversation.content,
    conversation.provider,
    conversation.notes || '',
    ...conversation.tags
  ];
  return parts.join(' ').toLowerCase();
}

// Generate auto title from content (first line or truncated content)
export function generateAutoTitle(content, maxLength = 60) {
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length > maxLength) {
    return firstLine.slice(0, maxLength - 3) + '...';
  }
  return firstLine || 'Untitled Conversation';
}

// Save new conversation
export async function saveConversation(conversationData) {
  await ensureDb();

  // Validate input
  const validationErrors = validateConversationData(conversationData);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(', '));
  }

  // Check if we should overwrite an existing conversation
  if (conversationData.overwriteId) {
    // Update existing conversation instead of creating new one
    const existingConversation = await getConversation(conversationData.overwriteId);
    if (existingConversation) {
      return await updateConversation(conversationData.overwriteId, {
        title: sanitizeString(conversationData.title || generateAutoTitle(conversationData.content), MAX_TITLE_LENGTH),
        content: sanitizeString(conversationData.content, MAX_CONTENT_LENGTH),
        provider: sanitizeString(conversationData.provider || 'unknown', 20),
        timestamp: conversationData.timestamp || Date.now(),
        tags: Array.isArray(conversationData.tags)
          ? conversationData.tags.slice(0, MAX_TAGS_COUNT).map(tag => sanitizeString(tag, MAX_TAG_LENGTH)).filter(t => t)
          : [],
        notes: sanitizeString(conversationData.notes || '', MAX_NOTES_LENGTH),
        conversationId: sanitizeString(conversationData.conversationId || '', 200),
        url: sanitizeString(conversationData.url || '', 500)
      });
    }
  }

  // Sanitize and prepare conversation
  const conversation = {
    title: sanitizeString(conversationData.title || generateAutoTitle(conversationData.content), MAX_TITLE_LENGTH),
    content: sanitizeString(conversationData.content, MAX_CONTENT_LENGTH),
    provider: sanitizeString(conversationData.provider || 'unknown', 20),
    timestamp: conversationData.timestamp || Date.now(),
    tags: Array.isArray(conversationData.tags)
      ? conversationData.tags.slice(0, MAX_TAGS_COUNT).map(tag => sanitizeString(tag, MAX_TAG_LENGTH)).filter(t => t)
      : [],
    isFavorite: Boolean(conversationData.isFavorite),
    notes: sanitizeString(conversationData.notes || '', MAX_NOTES_LENGTH),
    conversationId: sanitizeString(conversationData.conversationId || '', 200),
    url: sanitizeString(conversationData.url || '', 500),
    searchText: ''  // Will be set below
  };

  // Generate search text
  conversation.searchText = generateSearchText(conversation);

  return runWithRetry(() => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.add(conversation);

    return wrapRequest(request, resolveValue => ({ ...conversation, id: resolveValue }));
  });
}

// Get conversation by ID
export async function getConversation(id) {
  await ensureDb();

  return runWithRetry(() => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.get(id);
    return wrapRequest(request, value => value);
  });
}

// Get all conversations
export async function getAllConversations() {
  await ensureDb();

  return runWithRetry(() => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.getAll();
    return wrapRequest(request, value => value || []);
  });
}

// Update existing conversation
export async function updateConversation(id, updates) {
  await ensureDb();

  return runWithRetry(() => new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);

    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const conversation = getRequest.result;
      if (!conversation) {
        reject(new Error(`Conversation with id ${id} not found`));
        return;
      }

      const updatedConversation = { ...conversation, ...updates, id };

      // Regenerate search text if content changed
      if (updates.title || updates.content || updates.tags || updates.notes || updates.provider) {
        updatedConversation.searchText = generateSearchText(updatedConversation);
      }

      const putRequest = store.put(updatedConversation);
      wrapRequest(putRequest, () => updatedConversation).then(resolve).catch(reject);
    };

    getRequest.onerror = () => reject(getRequest.error);
  }));
}

// Delete conversation
export async function deleteConversation(id) {
  await ensureDb();

  return runWithRetry(() => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.delete(id);
    return wrapRequest(request, () => true);
  });
}

// Search conversations
export async function searchConversations(searchText) {
  await ensureDb();

  const allConversations = await getAllConversations();
  const lowerSearch = searchText.toLowerCase();

  return allConversations.filter(conv =>
    conv.searchText.includes(lowerSearch)
  );
}

// Filter by provider
export async function getConversationsByProvider(provider) {
  await ensureDb();

  if (!provider || typeof provider !== 'string') {
    return getAllConversations();
  }

  return runWithRetry(() => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const index = store.index('provider');
    const request = index.getAll(provider);
    return wrapRequest(request, value => value || []);
  });
}

// Get favorite conversations
export async function getFavoriteConversations() {
  await ensureDb();

  const allConversations = await getAllConversations();
  return allConversations.filter(c => c.isFavorite === true);
}

// Toggle favorite status
export async function toggleConversationFavorite(id) {
  const conversation = await getConversation(id);
  if (!conversation) throw new Error(`Conversation ${id} not found`);

  return await updateConversation(id, { isFavorite: !conversation.isFavorite });
}

// Get conversations by date range
export async function getConversationsByDateRange(startDate, endDate) {
  await ensureDb();

  const allConversations = await getAllConversations();
  return allConversations.filter(conv =>
    conv.timestamp >= startDate && conv.timestamp <= endDate
  );
}

// Get all tags used in conversations
export async function getAllConversationTags() {
  const conversations = await getAllConversations();
  const tags = new Set();
  conversations.forEach(c => c.tags.forEach(tag => tags.add(tag)));
  return Array.from(tags).sort();
}

// Check for duplicate conversation by conversationId
export async function findConversationByConversationId(conversationId) {
  if (!conversationId) {
    return null;
  }

  await ensureDb();

  return runWithRetry(() => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const index = store.index('conversationId');
    const request = index.get(conversationId);
    return wrapRequest(request, value => value || null);
  });
}

// Export conversations as JSON
export async function exportConversations() {
  const conversations = await getAllConversations();
  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    conversations: conversations
  };
}

// Import conversations from JSON
export async function importConversations(data, mergeStrategy = 'skip') {
  if (!data || !data.conversations || !Array.isArray(data.conversations)) {
    throw new Error('Invalid import data format');
  }

  const results = {
    imported: 0,
    skipped: 0,
    errors: []
  };

  for (const conversationData of data.conversations) {
    try {
      // Remove id to let IndexedDB assign new ones
      const { id, ...conversationWithoutId } = conversationData;

      if (mergeStrategy === 'overwrite') {
        await saveConversation(conversationWithoutId);
        results.imported++;
      } else if (mergeStrategy === 'skip') {
        // Check if similar conversation exists (same title and timestamp within 1 minute)
        const existing = await getAllConversations();
        const isDuplicate = existing.some(c =>
          c.title === conversationData.title &&
          Math.abs(c.timestamp - conversationData.timestamp) < 60000
        );

        if (!isDuplicate) {
          await saveConversation(conversationWithoutId);
          results.imported++;
        } else {
          results.skipped++;
        }
      }
    } catch (error) {
      results.errors.push({ conversation: conversationData.title, error: error.message });
    }
  }

  return results;
}

// Clear all conversations
export async function clearAllConversations() {
  await ensureDb();

  return runWithRetry(() => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.clear();
    return wrapRequest(request, () => true);
  });
}

// Get statistics
export async function getConversationStats() {
  const conversations = await getAllConversations();

  const stats = {
    total: conversations.length,
    favorites: conversations.filter(c => c.isFavorite).length,
    byProvider: {},
    oldestTimestamp: conversations.length > 0 ? Math.min(...conversations.map(c => c.timestamp)) : null,
    newestTimestamp: conversations.length > 0 ? Math.max(...conversations.map(c => c.timestamp)) : null
  };

  // Count by provider
  conversations.forEach(c => {
    stats.byProvider[c.provider] = (stats.byProvider[c.provider] || 0) + 1;
  });

  return stats;
}

// Helper functions for IndexedDB operations
function runWithRetry(operation, attempt = 1) {
  return new Promise((resolve, reject) => {
    try {
      const result = operation();
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
