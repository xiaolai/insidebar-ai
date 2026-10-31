import { beforeEach, expect, it, vi } from 'vitest';
let handlers;
const event = name => ({ addListener: vi.fn(fn => { handlers[name] = fn; }) });
beforeEach(async () => {
  vi.resetModules();
  handlers = {};
  chrome.runtime.onInstalled = event('installed');
  chrome.runtime.onStartup = event('startup');
  chrome.runtime.onMessage = event('message');
  chrome.runtime.getURL = path => `chrome-extension://test/${path}`;
  chrome.sidePanel = { open: vi.fn(async () => {}), setPanelBehavior: vi.fn(async () => {}), setOptions: vi.fn(async () => {}), close: vi.fn(async () => {}),
    onClosed: event('closed'), onOpened: event('opened') };
  chrome.action.onClicked = event('action');
  chrome.contextMenus.onClicked = event('context');
  chrome.commands = { onCommand: event('command') };
  chrome.windows = { onRemoved: event('windowRemoved') };
  chrome.tabs.onCreated = event('created');
  chrome.tabs.onRemoved = event('removed');
  chrome.tabs.query = vi.fn(async () => [{ id: 11, windowId: 1 }, { id: 12, windowId: 1 }]);
  await import('../background/service-worker.js');
});
it('reopens on the first toolbar click after Chrome closes the panel', async () => {
  await handlers.action({ id: 11, windowId: 1 });
  handlers.closed({ tabId: 11, windowId: 1 });
  await handlers.action({ id: 11, windowId: 1 });
  expect(chrome.sidePanel.open).toHaveBeenCalledTimes(2);
});
it('handles close notifications from the sidebar which has no sender.tab', async () => {
  await handlers.action({ id: 11, windowId: 1 });
  handlers.message({ action: 'sidePanelClosed', payload: { tabId: 11, windowId: 1 } },
    { url: chrome.runtime.getURL('sidebar/sidebar.html') }, vi.fn());
  await handlers.action({ id: 11, windowId: 1 });
  expect(chrome.sidePanel.open).toHaveBeenCalledTimes(2);
});

it('configures existing and new tabs without automatically opening them', async () => {
  await handlers.startup();
  expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({ enabled: false });
  expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({ tabId: 11, path: 'sidebar/sidebar.html?tabId=11', enabled: true });
  expect(chrome.sidePanel.open).not.toHaveBeenCalled();
  await handlers.created({ id: 13, windowId: 1 });
  expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({ tabId: 13, path: 'sidebar/sidebar.html?tabId=13', enabled: true });
  expect(chrome.sidePanel.open).not.toHaveBeenCalled();
});
it('opens and closes only the chosen tab, leaving other tabs unchanged', async () => {
  await handlers.action({ id: 11, windowId: 1 });
  await handlers.action({ id: 12, windowId: 1 });
  expect(chrome.sidePanel.open.mock.calls).toEqual([[{ tabId: 11 }], [{ tabId: 12 }]]);
  await handlers.action({ id: 11, windowId: 1 });
  expect(chrome.sidePanel.close).toHaveBeenCalledWith({ tabId: 11 });
  expect(chrome.sidePanel.close).toHaveBeenCalledTimes(1);
});

it('calls Chrome open before yielding so the toolbar user gesture is retained', async () => {
  const pending = handlers.action({ id: 11, windowId: 1 });
  expect(chrome.sidePanel.open).toHaveBeenCalledWith({ tabId: 11 });
  await pending;
});
