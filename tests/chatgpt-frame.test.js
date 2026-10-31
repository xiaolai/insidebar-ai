import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
import { monitorChatGPTFrame } from '../modules/chatgpt-frame.js';

vi.mock('../modules/i18n.js', () => ({ t: key => key }));

// Exercise the actual sidebar wait function without bootstrapping unrelated UI.
describe('sidebar readiness waits', () => {
  const sidebar = readFileSync(resolve(ROOT, 'sidebar/sidebar.js'), 'utf8');
  const source = sidebar.slice(sidebar.indexOf('async function waitForIframeReady'),
    sidebar.indexOf('// Inject selected text into provider iframe'));
  let states, wait, context;
  beforeEach(() => {
    vi.useFakeTimers();
    states = new Map([['chatgpt', 'loading']]);
    context = {
      loadedIframes: new Map([['chatgpt', {}]]), loadedIframesState: states,
      Date, setTimeout
    };
    wait = vm.runInNewContext(`${source}\nwaitForIframeReady`, context);
  });
  afterEach(() => vi.useRealTimers());
  it('rejects a failed frame instead of reporting successful delivery', async () => {
    states.set('chatgpt', 'failed');
    await expect(wait('chatgpt')).rejects.toThrow('not ready');
  });
  it('bounds a wait even when the iframe never fires load or error', async () => {
    const pending = expect(wait('chatgpt')).rejects.toThrow('not ready');
    await vi.advanceTimersByTimeAsync(30000);
    await pending;
  });
  it('waits until the composer status reports readiness', async () => {
    const pending = wait('chatgpt');
    states.set('chatgpt', 'ready');
    await vi.advanceTimersByTimeAsync(100);
    await expect(pending).resolves.toBeUndefined();
  });
  it('keeps an outstanding wait tied to its conversation after a scope switch', async () => {
    const pending = expect(wait('chatgpt')).rejects.toThrow('not ready');
    context.loadedIframesState = new Map([['chatgpt', 'ready']]);
    states.set('chatgpt', 'failed');
    await vi.advanceTimersByTimeAsync(100);
    await pending;
  });
});

describe('sidebar ChatGPT frames across conversations', () => {
  const sidebar = readFileSync(resolve(ROOT, 'sidebar/sidebar.js'), 'utf8');
  const source = sidebar.slice(sidebar.indexOf('function createProviderIframe'),
    sidebar.indexOf('// T017: Load default or last selected provider'));
  let monitors, context, create;
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="provider-container"></div>';
    monitors = new Map();
    context = {
      document, browserSessions: null, loadedIframesState: new Map(),
      frameMonitors: monitors, monitorChatGPTFrame,
      hideLoading: vi.fn(), showError: vi.fn()
    };
    create = vm.runInNewContext(`${source}\ncreateProviderIframe`, context);
  });
  afterEach(() => {
    monitors.forEach(monitor => monitor.dispose());
    vi.useRealTimers();
  });
  it('isolates readiness and recovery between the old and current conversations', () => {
    const firstStates = context.loadedIframesState;
    const first = create({ id: 'chatgpt', url: 'https://chatgpt.com/' });
    Object.defineProperty(first, 'contentWindow', { value: { postMessage: vi.fn() } });
    const secondStates = new Map();
    context.loadedIframesState = secondStates;
    const second = create({ id: 'chatgpt', url: 'https://chatgpt.com/' });
    Object.defineProperty(second, 'contentWindow', { value: { postMessage: vi.fn() } });
    first.dispatchEvent(new Event('load'));
    expect(firstStates.get('chatgpt')).toBe('loading');
    expect(secondStates.get('chatgpt')).toBe('loading');
    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://chatgpt.com', source: first.contentWindow,
      data: { type: 'INSIDEBAR_CHATGPT_STATUS', ready: true }
    }));
    expect(firstStates.get('chatgpt')).toBe('ready');
    expect(secondStates.get('chatgpt')).toBe('loading');
    monitors.get(first).setActive(false);
    monitors.get(second).setActive(true);
    vi.advanceTimersByTime(20000);
    expect(firstStates.get('chatgpt')).toBe('ready');
    expect(secondStates.get('chatgpt')).toBe('failed');
    const notices = document.querySelectorAll('.provider-recovery');
    expect(notices[0].hidden).toBe(true);
    expect(notices[1].hidden).toBe(false);
  });
});

describe('ChatGPT frame recovery (#16)', () => {
  let iframe, container, onState, monitor;
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="provider-container"><iframe></iframe></div>';
    container = document.querySelector('div');
    iframe = document.querySelector('iframe');
    Object.defineProperty(iframe, 'contentWindow', { value: { postMessage: vi.fn() } });
    Object.defineProperty(iframe, 'src', { value: '', writable: true });
    onState = vi.fn();
    monitor = monitorChatGPTFrame(iframe, container, onState);
  });
  afterEach(() => {
    monitor.dispose();
    vi.useRealTimers();
  });
  function status({ origin = 'https://chatgpt.com', source = iframe.contentWindow, ready = true } = {}) {
    window.dispatchEvent(new MessageEvent('message', {
      origin, source, data: { type: 'INSIDEBAR_CHATGPT_STATUS', ready }
    }));
  }
  it('does not treat iframe load as a usable composer', () => {
    iframe.dispatchEvent(new Event('load'));
    expect(onState).not.toHaveBeenCalledWith('ready');
    vi.advanceTimersByTime(20000);
    expect(onState).toHaveBeenLastCalledWith('failed');
    expect(container.querySelector('[role="status"]').hidden).toBe(false);
  });
  it('recovers when the composer appears after the timeout', () => {
    vi.advanceTimersByTime(20000);
    status();
    expect(onState).toHaveBeenLastCalledWith('ready');
    expect(container.querySelector('[role="status"]').hidden).toBe(true);
  });
  it('ignores messages from unrelated origins, windows, and nested frames', () => {
    status({ origin: 'https://example.com' });
    status({ source: window });
    status({ source: null });
    status({ ready: 'true' });
    expect(onState).not.toHaveBeenCalledWith('ready');
  });
  it('shows recovery immediately on a frame error', () => {
    iframe.dispatchEvent(new Event('error'));
    expect(onState).toHaveBeenLastCalledWith('failed');
  });
  it('keeps a failed ChatGPT frame from displaying recovery over another provider', () => {
    monitor.setActive(false);
    vi.advanceTimersByTime(20000);
    expect(container.querySelector('[role="status"]').hidden).toBe(true);
    monitor.setActive(true);
    expect(container.querySelector('[role="status"]').hidden).toBe(false);
  });
  it('retries ChatGPT and opens only its fixed URL in a normal tab', () => {
    vi.advanceTimersByTime(20000);
    const [retry, open] = container.querySelectorAll('button');
    open.click();
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://chatgpt.com/' });
    retry.click();
    expect(iframe.src).toBe('https://chatgpt.com/');
    expect(onState).toHaveBeenLastCalledWith('loading');
    expect(container.querySelector('[role="status"]').hidden).toBe(true);
    vi.advanceTimersByTime(20000);
    expect(onState).toHaveBeenLastCalledWith('failed');
  });
  it('starts a new readiness check on later document navigation', () => {
    status();
    iframe.dispatchEvent(new Event('load'));
    expect(onState).toHaveBeenLastCalledWith('loading');
    vi.advanceTimersByTime(20000);
    expect(onState).toHaveBeenLastCalledWith('failed');
  });
  it('checks readiness again if an SPA removes its composer', () => {
    status();
    status({ ready: false });
    expect(onState).toHaveBeenLastCalledWith('loading');
    vi.advanceTimersByTime(20000);
    expect(onState).toHaveBeenLastCalledWith('failed');
  });
  it('removes listeners, timers and UI on disposal', () => {
    monitor.dispose();
    onState.mockClear();
    iframe.dispatchEvent(new Event('load'));
    status();
    vi.advanceTimersByTime(20000);
    expect(onState).not.toHaveBeenCalled();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});

describe('ChatGPT status content script', () => {
  const manifest = JSON.parse(readFileSync(resolve(ROOT, 'manifest.json'), 'utf8'));
  const source = readFileSync(resolve(ROOT, 'content-scripts/chatgpt-frame-status.js'), 'utf8');
  let parent, listeners, observer;
  function run({ embedded = true, composer = null } = {}) {
    parent = { postMessage: vi.fn() };
    listeners = {};
    const child = {
      parent, top: embedded ? parent : null,
      addEventListener: (name, fn) => { listeners[name] = fn; }
    };
    if (!embedded) child.top = child;
    class Observer {
      constructor(fn) { observer = fn; }
      observe() {}
    }
    const doc = { querySelector: vi.fn(() => composer), documentElement: {} };
    vm.runInNewContext(source, {
      window: child, document: doc, MutationObserver: Observer,
      chrome: { runtime: { getURL: () => 'chrome-extension://extension-id/' } }
    });
    return doc;
  }
  it('runs at document_start only on the ChatGPT hosts', () => {
    const entries = manifest.content_scripts.filter(e => e.js.includes('content-scripts/chatgpt-frame-status.js'));
    expect(entries).toHaveLength(1);
    expect(entries[0].matches).toEqual(['https://chatgpt.com/*', 'https://chat.openai.com/*']);
    expect(entries[0].run_at).toBe('document_start');
    expect(entries[0].all_frames).toBe(true);
  });
  it('distinguishes challenge/login pages from a composer and notices later rendering', () => {
    const doc = run();
    expect(parent.postMessage).toHaveBeenLastCalledWith(
      { type: 'INSIDEBAR_CHATGPT_STATUS', ready: false }, 'chrome-extension://extension-id');
    doc.querySelector.mockReturnValue({});
    observer();
    expect(parent.postMessage).toHaveBeenLastCalledWith(
      { type: 'INSIDEBAR_CHATGPT_STATUS', ready: true }, 'chrome-extension://extension-id');
  });
  it('answers a probe only from its extension parent', () => {
    run({ composer: {} });
    parent.postMessage.mockClear();
    const probe = { data: { type: 'INSIDEBAR_CHATGPT_PROBE' }, source: parent, origin: 'chrome-extension://extension-id' };
    listeners.message({ ...probe, origin: 'https://example.com' });
    listeners.message({ ...probe, source: null });
    expect(parent.postMessage).not.toHaveBeenCalled();
    listeners.message(probe);
    expect(parent.postMessage).toHaveBeenCalledOnce();
  });
  it('leaves regular ChatGPT tabs alone', () => {
    run({ embedded: false, composer: {} });
    expect(parent.postMessage).not.toHaveBeenCalled();
    expect(listeners.message).toBeUndefined();
  });
});
