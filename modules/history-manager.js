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

  // Note: Content length is auto-truncated by sanitizeString(), no validation needed
  // Title, notes, and tags are also auto-truncated for consistency

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
        timestamp: conversationData.timestamp,  // Preserve original timestamp (no fallback)
        tags: Array.isArray(conversationData.tags)
          ? conversationData.tags.slice(0, MAX_TAGS_COUNT).map(tag => sanitizeString(tag, MAX_TAG_LENGTH)).filter(t => t)
          : [],
        notes: sanitizeString(conversationData.notes || '', MAX_NOTES_LENGTH),
        conversationId: sanitizeString(conversationData.conversationId || '', 200),
        url: sanitizeString(conversationData.url || '', 500),
        modifiedAt: Date.now()
      });
    }
  }

  // Sanitize and prepare conversation
  const now = Date.now();
  const conversation = {
    title: sanitizeString(conversationData.title || generateAutoTitle(conversationData.content), MAX_TITLE_LENGTH),
    content: sanitizeString(conversationData.content, MAX_CONTENT_LENGTH),
    provider: sanitizeString(conversationData.provider || 'unknown', 20),
    timestamp: conversationData.timestamp || now,
    tags: Array.isArray(conversationData.tags)
      ? conversationData.tags.slice(0, MAX_TAGS_COUNT).map(tag => sanitizeString(tag, MAX_TAG_LENGTH)).filter(t => t)
      : [],
    isFavorite: Boolean(conversationData.isFavorite),
    notes: sanitizeString(conversationData.notes || '', MAX_NOTES_LENGTH),
    conversationId: sanitizeString(conversationData.conversationId || '', 200),
    url: sanitizeString(conversationData.url || '', 500),
    modifiedAt: now,
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

      const updatedConversation = { ...conversation, ...updates, id, modifiedAt: Date.now() };

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

// Search conversations with enhanced features
export async function searchConversations(searchText) {
  await ensureDb();

  const allConversations = await getAllConversations();

  // Parse search query for operators and field-specific searches
  const searchOptions = parseSearchQuery(searchText);

  // Filter conversations based on search options
  let results = allConversations.filter(conv =>
    matchesSearchCriteria(conv, searchOptions)
  );

  // Apply relevance scoring and ranking
  if (results.length > 0) {
    results = results.map(conv => ({
      ...conv,
      _relevanceScore: calculateRelevanceScore(conv, searchOptions)
    }));

    // Sort by relevance score (highest first), then by timestamp
    results.sort((a, b) => {
      if (b._relevanceScore !== a._relevanceScore) {
        return b._relevanceScore - a._relevanceScore;
      }
      return b.timestamp - a.timestamp;
    });

    // Remove the temporary score field
    results = results.map(({ _relevanceScore, ...conv }) => conv);
  }

  return results;
}

// Parse search query to extract operators and field filters
function parseSearchQuery(searchText) {
  const options = {
    terms: [],
    exactPhrases: [],
    excludeTerms: [],
    fieldSearches: {
      title: [],
      content: [],
      tag: [],
      provider: []
    },
    operator: 'AND' // default operator
  };

  let remaining = searchText;

  // Extract exact phrases (quoted strings)
  const exactPhraseRegex = /"([^"]+)"/g;
  let match;
  while ((match = exactPhraseRegex.exec(searchText)) !== null) {
    options.exactPhrases.push(match[1].toLowerCase());
    remaining = remaining.replace(match[0], ' ');
  }

  // Split remaining text into tokens
  const tokens = remaining.split(/\s+/).filter(t => t.trim());

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // Check for field-specific search (field:value)
    if (lower.includes(':')) {
      const [field, value] = lower.split(':', 2);
      if (value && ['title', 'content', 'tag', 'provider'].includes(field)) {
        options.fieldSearches[field].push(value);
        continue;
      }
    }

    // Check for exclude operator
    if (lower.startsWith('-') || lower === 'not') {
      if (lower.startsWith('-') && lower.length > 1) {
        options.excludeTerms.push(lower.substring(1));
      }
      continue;
    }

    // Check for OR operator
    if (lower === 'or') {
      options.operator = 'OR';
      continue;
    }

    // Check for AND operator (explicit)
    if (lower === 'and') {
      options.operator = 'AND';
      continue;
    }

    // Regular search term
    if (lower) {
      options.terms.push(lower);
    }
  }

  return options;
}

// Check if conversation matches search criteria
function matchesSearchCriteria(conv, options) {
  const { terms, exactPhrases, excludeTerms, fieldSearches, operator } = options;

  // Check excluded terms first (must not match any)
  for (const term of excludeTerms) {
    if (conv.searchText.includes(term)) {
      return false;
    }
  }

  // Check exact phrases (must match all)
  for (const phrase of exactPhrases) {
    if (!conv.searchText.includes(phrase)) {
      return false;
    }
  }

  // Check field-specific searches
  for (const [field, values] of Object.entries(fieldSearches)) {
    if (values.length > 0) {
      let fieldMatches = false;
      const fieldText = getFieldText(conv, field);

      for (const value of values) {
        if (fieldText.includes(value) || fuzzyMatch(fieldText, value)) {
          fieldMatches = true;
          break;
        }
      }

      if (!fieldMatches) {
        return false;
      }
    }
  }

  // Check general search terms
  if (terms.length > 0) {
    if (operator === 'OR') {
      // At least one term must match
      let hasMatch = false;
      for (const term of terms) {
        if (conv.searchText.includes(term) || fuzzyMatch(conv.searchText, term)) {
          hasMatch = true;
          break;
        }
      }
      if (!hasMatch) {
        return false;
      }
    } else {
      // All terms must match (AND)
      for (const term of terms) {
        if (!conv.searchText.includes(term) && !fuzzyMatch(conv.searchText, term)) {
          return false;
        }
      }
    }
  }

  return true;
}

// Get field-specific text for searching
function getFieldText(conv, field) {
  switch (field) {
    case 'title':
      return conv.title.toLowerCase();
    case 'content':
      return conv.content.toLowerCase();
    case 'tag':
      return conv.tags.join(' ').toLowerCase();
    case 'provider':
      return conv.provider.toLowerCase();
    default:
      return '';
  }
}

// Fuzzy matching for typo tolerance (Levenshtein distance ≤ 2)
function fuzzyMatch(text, term) {
  // Only apply fuzzy matching for terms longer than 4 characters
  if (term.length <= 4) {
    return false;
  }

  // Split text into words and check each word
  const words = text.split(/\s+/);
  for (const word of words) {
    if (levenshteinDistance(word, term) <= 2) {
      return true;
    }
  }

  return false;
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create distance matrix
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

// Calculate relevance score for ranking
function calculateRelevanceScore(conv, options) {
  let score = 0;

  const { terms, exactPhrases, fieldSearches } = options;
  const allTerms = [...terms, ...exactPhrases];

  // Score based on where matches appear
  for (const term of allTerms) {
    // Title matches are most valuable (weight: 10)
    if (conv.title.toLowerCase().includes(term)) {
      score += 10;
    }

    // Tag matches are second (weight: 5)
    const tagText = conv.tags.join(' ').toLowerCase();
    if (tagText.includes(term)) {
      score += 5;
    }

    // Notes matches are third (weight: 3)
    if (conv.notes && conv.notes.toLowerCase().includes(term)) {
      score += 3;
    }

    // Content matches are least (weight: 1)
    if (conv.content.toLowerCase().includes(term)) {
      score += 1;
    }
  }

  // Boost score for field-specific matches
  for (const [field, values] of Object.entries(fieldSearches)) {
    if (values.length > 0) {
      score += 5; // Bonus for using field-specific search
    }
  }

  // Boost score for exact phrase matches
  score += exactPhrases.length * 8;

  // Recency bonus (newer conversations get slight boost)
  const daysSinceCreation = (Date.now() - conv.timestamp) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation < 7) {
    score += 3;
  } else if (daysSinceCreation < 30) {
    score += 1;
  }

  return score;
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
