// Test setup file for Vitest
// Mock Chrome extension APIs

global.chrome = {
  runtime: {
    sendMessage: vi.fn((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: vi.fn(),
    },
    lastError: null,
  },
  storage: {
    sync: {
      get: vi.fn((keys) => Promise.resolve(typeof keys === 'object' ? keys : {})),
      set: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
    },
    local: {
      get: vi.fn((keys) => Promise.resolve(typeof keys === 'object' ? keys : {})),
      set: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
  sidePanel: {
    open: vi.fn(() => Promise.resolve()),
    setPanelBehavior: vi.fn(() => Promise.resolve()),
  },
  contextMenus: {
    create: vi.fn(),
    removeAll: vi.fn(() => Promise.resolve()),
    onClicked: {
      addListener: vi.fn(),
    },
  },
  action: {
    onClicked: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    create: vi.fn(() => Promise.resolve({ id: 1 })),
  },
};

// Helper to create mock IndexedDB request that triggers callbacks
const createMockRequest = (shouldSucceed = false, result = null, error = null) => {
  const request = {
    onsuccess: null,
    onerror: null,
    result: result,
    error: error || new Error('IndexedDB not available in test environment'),
  };

  // Trigger callbacks asynchronously to simulate real IndexedDB behavior
  setTimeout(() => {
    if (shouldSucceed && request.onsuccess) {
      request.onsuccess({ target: request });
    } else if (!shouldSucceed && request.onerror) {
      request.onerror({ target: request });
    }
  }, 0);

  return request;
};

// Mock indexedDB
global.indexedDB = {
  open: vi.fn(() => {
    const request = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        objectStoreNames: [],
        createObjectStore: vi.fn(() => ({
          createIndex: vi.fn(),
        })),
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            get: vi.fn(() => createMockRequest(false)),
            getAll: vi.fn(() => createMockRequest(false)),
            add: vi.fn(() => createMockRequest(false)),
            put: vi.fn(() => createMockRequest(false)),
            delete: vi.fn(() => createMockRequest(false)),
            clear: vi.fn(() => createMockRequest(false)),
            index: vi.fn(() => ({
              getAll: vi.fn(() => createMockRequest(false)),
            })),
          })),
        })),
        onclose: null,
      },
    };
    setTimeout(() => {
      if (request.onsuccess) request.onsuccess({ target: request });
    }, 0);
    return request;
  }),
};
