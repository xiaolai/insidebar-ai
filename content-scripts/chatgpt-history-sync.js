const CHATGPT_HISTORY_PAGE_SIZE = 20;
const CHATGPT_HISTORY_THROTTLE_MS = 500;
let chatgptHistoryFrameReadySent = false;

function notifyFrameReady() {
  if (chatgptHistoryFrameReadySent) return;
  chatgptHistoryFrameReadySent = true;
  chrome.runtime.sendMessage({ action: 'chatgptHistoryFrameReady' }).catch(() => {});
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  notifyFrameReady();
} else {
  window.addEventListener('DOMContentLoaded', notifyFrameReady, { once: true });
  window.addEventListener('load', notifyFrameReady, { once: true });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'chatgptHistorySyncStart') {
    return;
  }

  (async () => {
    try {
      await syncChatgptHistory();
      sendResponse({ success: true });
    } catch (error) {
      chrome.runtime.sendMessage({
        action: 'chatgptHistorySyncError',
        payload: { message: error.message }
      }).catch(() => {});
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
});

async function syncChatgptHistory() {
  let offset = 0;
  let totalFetched = 0;

  while (true) {
    const page = await fetchHistoryPage(offset, CHATGPT_HISTORY_PAGE_SIZE);
    const items = page.items || [];
    if (!items.length) {
      break;
    }

    const detailedConversations = [];
    for (const item of items) {
      try {
        const detail = await fetchConversationDetail(item.id);
        detailedConversations.push({ summary: item, detail });
      } catch (error) {
        detailedConversations.push({ summary: item, detail: null, error: error.message });
      }
      await delay(150);
    }

    totalFetched += detailedConversations.length;

    chrome.runtime.sendMessage({
      action: 'chatgptHistorySyncBatch',
      payload: {
        offset,
        conversations: detailedConversations
      }
    }).catch(() => {});

    if (!page.has_more && items.length < CHATGPT_HISTORY_PAGE_SIZE) {
      break;
    }

    offset += CHATGPT_HISTORY_PAGE_SIZE;
    await delay(CHATGPT_HISTORY_THROTTLE_MS);
  }

  chrome.runtime.sendMessage({
    action: 'chatgptHistorySyncFinished',
    payload: { totalFetched }
  }).catch(() => {});
}

async function fetchHistoryPage(offset, limit) {
  const response = await fetch(`/backend-api/conversations?offset=${offset}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`History request failed with status ${response.status}`);
  }

  return response.json();
}

async function fetchConversationDetail(id) {
  const response = await fetch(`/backend-api/conversation/${id}?limit=100`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Conversation ${id} failed with status ${response.status}`);
  }

  return response.json();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
