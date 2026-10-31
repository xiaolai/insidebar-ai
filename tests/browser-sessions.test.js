import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { BrowserSessions } from '../modules/browser-sessions.js';
import { TabSessions, scopeKey, safeProviderUrl, pageQuestion, MAX_PAGE_LENGTH, isAttachablePageUrl } from '../modules/tab-sessions.js';

const html = readFileSync('sidebar/sidebar.html', 'utf8');
const provider = { id: 'chatgpt', url: 'https://chatgpt.com' };
const page = id => ({ success: true, title: `Article ${id}`, url: `https://example.com/${id}`, content: `Source ${id}` });
let controller;
let memory;
let handlers;
let ui;

beforeEach(async () => {
  document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');
  vi.clearAllMocks();
  memory = {};
  handlers = {};
  ui = { provider: 'chatgpt', workspace: '', workspaceProvider: 'chatgpt', view: 'providers' };
  chrome.storage.session = {
    get: vi.fn(async key => ({ [key]: memory[key] })),
    set: vi.fn(async data => Object.assign(memory, structuredClone(data)))
  };
  chrome.windows = { getCurrent: vi.fn(async () => ({ id: 1 })) };
  chrome.tabs = {
    query: vi.fn(async () => [{ id: 11, windowId: 1, active: true }, { id: 12, windowId: 1 }]),
    sendMessage: vi.fn(async id => page(id)),
    onActivated: { addListener: vi.fn(fn => { handlers.activated = fn; }) },
    onUpdated: { addListener: vi.fn(fn => { handlers.updated = fn; }) },
    onRemoved: { addListener: vi.fn(fn => { handlers.removed = fn; }) }
  };
  controller = new BrowserSessions({
    snapshot: () => ({ ...ui }),
    restore: async session => {
      ui = { provider: session.provider || 'chatgpt', workspace: session.workspace,
        workspaceProvider: session.workspaceProvider, view: session.view };
      session.provider = ui.provider;
    }
  });
  await controller.start();
  controller.session.provider = 'chatgpt';
  await controller.refreshPage();
});

afterEach(() => controller.destroy());

it('restores independent tab questions, workspaces, views, provider chats and drafts', async () => {
  controller.session.question = 'Question A';
  ui.workspace = 'Workspace A';
  ui.view = 'prompt-library';
  const iframe = document.createElement('iframe');
  controller.session.providers.chatgpt = { url: 'https://chatgpt.com/c/chat-a', draft: 'Native draft A' };
  expect(controller.register(provider, iframe)).toBe('https://chatgpt.com/c/chat-a');
  controller.frameSet().iframes.set('chatgpt', iframe);
  await controller.follow(12);
  expect(controller.session.question).toBe('');
  expect(ui.workspace).toBe('');
  expect(controller.session.providers).toEqual({});
  controller.session.question = 'Question B';
  ui.workspace = 'Workspace B';
  await controller.follow(11);
  expect(controller.session.question).toBe('Question A');
  expect(ui.workspace).toBe('Workspace A');
  expect(ui.view).toBe('prompt-library');
  expect(controller.frameSet().iframes.get('chatgpt')).toBe(iframe);
  expect(controller.session.providers.chatgpt.draft).toBe('Native draft A');
  await controller.follow(12);
  expect(controller.session.question).toBe('Question B');
});

it('shares research across tabs, then returns to each independent tab draft', async () => {
  controller.session.question = 'Tab A';
  await controller.follow(11, true);
  controller.session.question = 'Shared draft';
  await controller.follow(12);
  expect(controller.scope).toBe('shared:1');
  expect(controller.session.question).toBe('Shared draft');
  expect(controller.attachment().title).toBe('Article 12');
  await controller.follow(12, false);
  expect(controller.session.question).toBe('');
  await controller.follow(11);
  expect(controller.session.question).toBe('Tab A');
});

it('disposes removed tab frames without touching another conversation', async () => {
  const first = document.createElement('iframe');
  const second = document.createElement('iframe');
  controller.frameSet().iframes.set('chatgpt', first);
  await controller.follow(12);
  controller.frameSet().iframes.set('chatgpt', second);
  controller.disposeFrame = vi.fn();
  handlers.removed(11);
  expect(controller.disposeFrame).toHaveBeenCalledExactlyOnceWith(first);
  expect(controller.frameSet().iframes.get('chatgpt')).toBe(second);
});

it('disposes every retained conversation frame when the controller is destroyed', async () => {
  const first = document.createElement('iframe');
  const second = document.createElement('iframe');
  controller.frameSet().iframes.set('chatgpt', first);
  await controller.follow(12);
  controller.frameSet().iframes.set('chatgpt', second);
  controller.disposeFrame = vi.fn();
  controller.destroy();
  expect(controller.disposeFrame).toHaveBeenCalledTimes(2);
  expect(controller.disposeFrame).toHaveBeenCalledWith(first);
  expect(controller.disposeFrame).toHaveBeenCalledWith(second);
  controller.disposeFrame = () => {};
});

it('keeps removing a page effective across switches but attaches new navigation', async () => {
  document.getElementById('page-remove').click();
  expect(controller.attachment()).toBeNull();
  await controller.follow(12);
  await controller.follow(11);
  expect(controller.attachment()).toBeNull();
  chrome.tabs.sendMessage.mockResolvedValueOnce({ ...page(11), url: 'https://example.com/new' });
  await controller.refreshPage();
  expect(controller.attachment().url).toBe('https://example.com/new');
});

it('discards a slow extraction after switching to a different tab', async () => {
  let finish;
  chrome.tabs.sendMessage.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const slow = controller.refreshPage();
  await controller.follow(12);
  finish(page(11));
  await slow;
  expect(controller.attachment().title).toBe('Article 12');
});

it('reports restricted and unavailable pages without carrying over the old content', async () => {
  chrome.tabs.sendMessage.mockRejectedValueOnce(new Error('Cannot access chrome://'));
  await controller.refreshPage();
  expect(controller.attachment()).toBeNull();
  expect(document.getElementById('page-status').textContent).toContain('unavailable');
});

it('sends page context to the captured chat and clears only a successfully submitted question', async () => {
  controller.frameSet().iframes.set('chatgpt', { style: {} });
  controller.session.question = 'Explain this article';
  controller.request = vi.fn(async () => ({ ok: true, submitted: true }));
  await controller.sendQuestion();
  expect(controller.request.mock.calls[0][2].text).toContain('Source 11');
  expect(controller.request.mock.calls[0][2].text).toContain('Explain this article');
  expect(controller.session.question).toBe('');
});

it('excludes removed pages and preserves drafts when a provider fails', async () => {
  controller.frameSet().iframes.set('chatgpt', { style: {} });
  document.getElementById('page-remove').click();
  controller.session.question = 'Plain question';
  controller.request = vi.fn(async () => ({ ok: false, error: 'Sign in first' }));
  await controller.sendQuestion();
  expect(controller.request.mock.calls[0][2].text).toBe('Plain question');
  expect(controller.session.question).toBe('Plain question');
  expect(document.getElementById('question-status').textContent).toBe('Sign in first');
});

it('does not send to another chat if the user switches tabs during extraction', async () => {
  controller.frameSet().iframes.set('chatgpt', { style: {} });
  controller.session.question = 'Keep me on A';
  controller.request = vi.fn();
  let finish;
  chrome.tabs.sendMessage.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const sending = controller.sendQuestion();
  await controller.follow(12);
  finish(page(11));
  await sending;
  expect(controller.request).not.toHaveBeenCalled();
  expect(controller.store.get('tab:11').question).toBe('Keep me on A');
});

it('restores drafts from session storage after reopening the panel', async () => {
  controller.session.question = 'Saved for later';
  controller.capture();
  await controller.store.writeQueue;
  const reloaded = new TabSessions(chrome.storage.session, controller.store.key);
  await reloaded.load();
  expect(reloaded.get('tab:11').question).toBe('Saved for later');
  expect(chrome.storage.sync.set).not.toHaveBeenCalled();
});

it('accepts chat state only from a registered provider frame and its exact origin', () => {
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  vi.spyOn(iframe.contentWindow, 'postMessage').mockImplementation(() => {});
  controller.register(provider, iframe);
  controller.frameSet().iframes.set('chatgpt', iframe);
  controller.receive({ source: iframe.contentWindow, origin: 'https://evil.example', data: { type: 'INSIDEBAR_SESSION', kind: 'ready' } });
  expect(controller.frameInfo.get(iframe).restored).toBe(false);
  controller.receive({ source: iframe.contentWindow, origin: 'https://chatgpt.com', data: { type: 'INSIDEBAR_SESSION', kind: 'ready' } });
  controller.receive({ source: iframe.contentWindow, origin: 'https://chatgpt.com', data: { type: 'INSIDEBAR_SESSION', kind: 'state', state: { url: 'https://chatgpt.com/c/a', draft: 'Native draft' } } });
  expect(controller.session.providers.chatgpt).toEqual({ url: 'https://chatgpt.com/c/a', draft: 'Native draft' });
});

it('cleans up closed-tab sessions without deleting shared research', () => {
  controller.store.get('shared:1').question = 'Research';
  handlers.removed(11);
  expect(controller.store.sessions['tab:11']).toBeUndefined();
  expect(controller.store.sessions['shared:1'].question).toBe('Research');
});

describe('context and URL boundaries', () => {
  it('bounds large page excerpts and separates source content from the question', () => {
    const result = pageQuestion('Why?', { title: 'A', url: 'https://example.com', content: 'x'.repeat(MAX_PAGE_LENGTH + 1) });
    expect(result).toContain('limited to 40,000');
    expect(result.endsWith('My question:\nWhy?')).toBe(true);
    expect(pageQuestion('Why?', null)).toBe('Why?');
  });
  it('rejects foreign, unsafe and credential-bearing provider URLs', () => {
    for (const url of ['javascript:alert(1)', 'https://evil.com/c/x', 'https://u:p@chatgpt.com/c/x']) {
      expect(safeProviderUrl(url, provider.url)).toBe(provider.url);
    }
    expect(scopeKey(1, 11)).toBe('tab:11');
    expect(scopeKey(1, 12, true)).toBe('shared:1');
    expect(scopeKey(2, 12, true)).toBe('shared:2');
  });
});

it('attaches an extracted local HTML document through the real content-script response', async () => {
  const localUrl = 'file:///Users/test/Reports/Daily%20report.html';
  const doc = document.implementation.createHTMLDocument();
  doc.title = 'Daily report';
  doc.body.innerHTML = '<main><h1>Daily report</h1><p>Local report content for a regression test.</p></main>';
  let extract;
  runInNewContext(readFileSync('content-scripts/page-content-extractor.js', 'utf8'), {
    window: { location: { href: localUrl } }, document: doc, console: { warn() {}, error() {} },
    chrome: {
      runtime: { onMessage: { addListener: fn => { extract = fn; } } },
      storage: { sync: { get: (defaults, callback) => callback(defaults) } }
    }
  });
  const response = await new Promise(resolve => extract({ action: 'extractPageContent' }, {}, resolve));
  expect(response.success).toBe(true);
  expect(response.rawContent).toContain('Local report content');
  chrome.tabs.sendMessage.mockResolvedValueOnce(response);
  await controller.refreshPage();
  expect(controller.attachment()).toMatchObject({ title: 'Daily report', url: localUrl });
  const question = pageQuestion('Summarize this report', controller.attachment());
  expect(question).toContain('Local report content');
  expect(question).toContain('Local file: Daily report.html');
  expect(question).not.toContain('/Users/test');
  expect(document.getElementById('page-title').textContent).toBe('Daily report');
});

it('accepts file and web pages but rejects internal, executable and malformed addresses', () => {
  for (const url of ['file:///Users/test/report.html', 'http://example.com', 'https://example.com']) {
    expect(isAttachablePageUrl(url)).toBe(true);
  }
  for (const url of ['chrome://settings', 'chrome-extension://other/private', 'javascript:alert(1)', 'data:text/html,private', 'invalid']) {
    expect(isAttachablePageUrl(url)).toBe(false);
  }
});

it('explains unsupported page types and empty documents without asking for another reload', async () => {
  chrome.tabs.sendMessage.mockResolvedValueOnce({ ...page(11), url: 'chrome://settings' });
  await controller.refreshPage();
  expect(document.getElementById('page-status').textContent).toContain('This type of page cannot be attached');
  chrome.tabs.sendMessage.mockResolvedValueOnce({ ...page(11), content: '', rawContent: '' });
  await controller.refreshPage();
  expect(document.getElementById('page-status').textContent).toContain('no readable text');
});

it('saves independent panels without overwriting other tabs or newer shared research', async () => {
  const data = {};
  const storage = {
    get: async () => structuredClone(data),
    set: async patch => Object.assign(data, structuredClone(patch)),
    remove: async key => { delete data[key]; }
  };
  const create = () => { const store = new TabSessions(storage, 'window:1'); store.splitWrites = true; return store; };
  const first = create();
  first.get('shared:1').question = 'Initial shared draft';
  first.sharedWindows[1] = false;
  await first.save();
  const second = create();
  await second.load();
  first.get('tab:11').question = 'Draft A';
  first.get('shared:1').question = 'Newer shared draft';
  first.sharedWindows[1] = true;
  await first.save();
  second.get('tab:12').question = 'Draft B';
  await second.save();
  const restored = create();
  await restored.load();
  expect(restored.get('tab:11').question).toBe('Draft A');
  expect(restored.get('tab:12').question).toBe('Draft B');
  expect(restored.get('shared:1').question).toBe('Newer shared draft');
  expect(restored.sharedWindows[1]).toBe(true);
});

it('binds a native tab panel to its own tab rather than following other activated tabs', async () => {
  controller.destroy();
  const originalUrl = window.location.href;
  window.history.replaceState({}, '', '?tabId=12');
  chrome.tabs.get = vi.fn(async () => ({ id: 12, windowId: 1 }));
  chrome.storage.session.get.mockImplementation(async keys => keys === null ? structuredClone(memory) : ({ [keys]: memory[keys] }));
  chrome.storage.session.remove = vi.fn(async key => { delete memory[key]; });
  try {
    controller = new BrowserSessions({ snapshot: () => ({ ...ui }), restore: vi.fn(async () => {}) });
    await controller.start();
    expect(controller.tabId).toBe(12);
    expect(controller.scope).toBe('tab:12');
    handlers.activated({ tabId: 11, windowId: 1 });
    await controller.transition;
    expect(controller.tabId).toBe(12);
    controller.session.question = 'Draft in B';
    await controller.store.save();
    const peer = new TabSessions(chrome.storage.session, controller.store.key);
    peer.splitWrites = true;
    await peer.load();
    peer.get('shared:1').question = 'Research from another tab';
    peer.sharedWindows[1] = true;
    await peer.save();
    await controller.resume();
    expect(controller.scope).toBe('shared:1');
    expect(document.getElementById('page-question').value).toBe('Research from another tab');
    const iframe = document.createElement('iframe');
    const oldUrl = 'https://chatgpt.com/c/old-shared';
    controller.session.providers.chatgpt = { url: oldUrl, draft: '' };
    controller.register(provider, iframe);
    controller.disposeFrame = vi.fn();
    controller.frameInfo.get(iframe).lastState = { url: oldUrl, draft: '' };
    controller.frameSet().iframes.set('chatgpt', iframe);
    await controller.store.save();
    await peer.load();
    peer.get('shared:1').providers.chatgpt = { url: 'https://chatgpt.com/c/new-shared', draft: 'New draft' };
    await peer.save();
    await controller.resume();
    expect(controller.session.providers.chatgpt.url).toBe('https://chatgpt.com/c/new-shared');
    expect(controller.frameSet().iframes.has('chatgpt')).toBe(false);
    expect(controller.disposeFrame).toHaveBeenCalledExactlyOnceWith(iframe);
  } finally {
    window.history.replaceState({}, '', originalUrl);
  }
});

it('offers explicit reload recovery for a tab left open across an extension update', async () => {
  chrome.tabs.reload = vi.fn(async () => {});
  controller.session.question = 'Keep this unfinished question';
  chrome.tabs.sendMessage.mockRejectedValueOnce(new Error('Could not establish connection. Receiving end does not exist.'));
  await controller.refreshPage();
  expect(document.getElementById('page-status').textContent).toContain('needs a refresh');
  expect(document.getElementById('page-reload').hidden).toBe(false);
  expect(chrome.tabs.reload).not.toHaveBeenCalled();
  await controller.reloadPage();
  expect(chrome.tabs.reload).toHaveBeenCalledWith(11);
  expect(controller.session.question).toBe('Keep this unfinished question');
  await controller.refreshPage();
  expect(controller.attachment().title).toBe('Article 11');
  expect(document.getElementById('page-reload').hidden).toBe(true);
  expect(document.getElementById('question-status').textContent).toBe('');
});

it('preserves the question and provides an actionable message when reload fails', async () => {
  controller.session.question = 'Keep this draft';
  chrome.tabs.reload = vi.fn(async () => { throw new Error('Tab is unavailable'); });
  await controller.reloadPage();
  expect(controller.session.question).toBe('Keep this draft');
  expect(document.getElementById('question-status').textContent).toContain('browser’s Reload button');
});

it('submits the page question through the form on plain Enter', () => {
  controller.sendQuestion = vi.fn();
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  document.getElementById('page-question').dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(controller.sendQuestion).toHaveBeenCalledTimes(1);
});

it('leaves Shift+Enter available for a new line and ignores IME and modified Enter', () => {
  controller.sendQuestion = vi.fn();
  const field = document.getElementById('page-question');
  for (const options of [{ shiftKey: true }, { isComposing: true }, { keyCode: 229 },
    { ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...options });
    field.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  }
  expect(controller.sendQuestion).not.toHaveBeenCalled();
});

it('does not submit repeatedly when Enter is held down', () => {
  controller.sendQuestion = vi.fn();
  const event = new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true });
  document.getElementById('page-question').dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(controller.sendQuestion).not.toHaveBeenCalled();
});

it('persists confirmed shared-page metadata and explains that follow-ups omit the page', async () => {
  controller.frameSet().iframes.set('chatgpt', { style: {} });
  controller.session.question = 'First question';
  const context = { url: 'https://chatgpt.com/c/test', pages: ['https://example.com/11'], awaitingThread: false };
  controller.request = vi.fn(async () => ({ ok: true, submitted: true, context }));
  await controller.sendQuestion();
  expect(controller.request.mock.calls[0][2]).toMatchObject({ question: 'First question', pageKey: 'https://example.com/11' });
  expect(controller.session.providers.chatgpt.context).toEqual(context);
  expect(document.getElementById('page-status').textContent).toContain('Follow-ups send only your question');
  await controller.store.writeQueue;
  const restored = new TabSessions(chrome.storage.session, controller.store.key);
  await restored.load();
  expect(restored.get('tab:11').providers.chatgpt.context).toEqual(context);
});
