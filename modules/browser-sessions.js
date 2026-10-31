import { SESSION_KEY, TabSessions, scopeKey, safeProviderUrl, pageQuestion, pageSource, isAttachablePageUrl } from './tab-sessions.js';

// One controller per side panel/window. Hidden frames preserve live provider chats.
export class BrowserSessions {
  constructor({ snapshot, restore, changed, disposeFrame = () => {} }) {
    this.snapshot = snapshot;
    this.restore = restore;
    this.changed = changed;
    this.disposeFrame = disposeFrame;
    this.store = new TabSessions(chrome.storage.session);
    this.frames = new Map();
    this.frameInfo = new WeakMap();
    this.pending = new Map();
    this.pages = new Map();
    this.sequence = 0;
    this.transition = Promise.resolve();
    this.readVersion = 0;
  }
  get session() { return this.store.get(this.scope); }
  async start() {
    const boundTab = new URLSearchParams(window.location.search).get('tabId');
    this.panelTabId = boundTab !== null && /^\d+$/.test(boundTab) ? Number(boundTab) : null;
    this.windowId = this.panelTabId !== null ? (await chrome.tabs.get(this.panelTabId)).windowId :
      (await chrome.windows.getCurrent()).id;
    this.store.splitWrites = this.panelTabId !== null;
    this.store.key = `${SESSION_KEY}:${this.windowId}`;
    await this.store.load();
    const tabs = await chrome.tabs.query({});
    const live = new Set(tabs.map(tab => `tab:${tab.id}`));
    for (const key of Object.keys(this.store.sessions)) {
      if (key.startsWith('tab:') && !live.has(key)) delete this.store.sessions[key];
    }
    const tab = tabs.find(tab => this.panelTabId !== null ? tab.id === this.panelTabId : tab.windowId === this.windowId && tab.active);
    this.tabId = tab?.id;
    this.scope = scopeKey(this.windowId, this.tabId, this.store.sharedWindows[this.windowId]);
    this.messageListener = event => this.receive(event);
    window.addEventListener('message', this.messageListener);
    chrome.tabs.onActivated.addListener(info => {
      if (this.panelTabId === null && info.windowId === this.windowId) this.follow(info.tabId);
    });
    chrome.tabs.onUpdated.addListener((id, info) => {
      if (id === this.tabId && (info.status === 'complete' || info.url)) this.refreshPage();
    });
    chrome.tabs.onRemoved.addListener(id => {
      this.store.removeTab(id);
      const frames = this.frames.get(`tab:${id}`);
      frames?.iframes.forEach(frame => {
        this.disposeFrame(frame);
        frame.remove();
      });
      this.frames.delete(`tab:${id}`);
      this.pages.delete(id);
      this.save();
    });
    document.getElementById('conversation-scope').addEventListener('change', event => {
      const shared = event.target.value === 'shared';
      this.follow(this.tabId, shared);
    });
    document.getElementById('page-remove').addEventListener('click', () => {
      const page = this.pages.get(this.tabId);
      if (page) this.session.excludedPages[`${this.tabId}:${page.url}`] = true;
      this.save();
      this.render();
    });
    document.getElementById('page-attach').addEventListener('click', async () => {
      const scope = this.scope;
      const tabId = this.tabId;
      await this.refreshPage();
      if (scope !== this.scope || tabId !== this.tabId) return;
      const page = this.pages.get(this.tabId);
      if (page) delete this.session.excludedPages[`${this.tabId}:${page.url}`];
      this.save();
      this.render();
    });
    document.getElementById('page-reload').addEventListener('click', () => this.reloadPage());
    document.getElementById('page-question').addEventListener('input', event => {
      this.session.question = event.target.value;
      this.save();
    });
    document.getElementById('page-question').addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey ||
          event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      // A held Enter key must not submit again after the first question clears.
      if (!event.repeat) document.getElementById('page-question-form').requestSubmit();
    });
    document.getElementById('page-question-form').addEventListener('submit', event => {
      event.preventDefault();
      this.sendQuestion();
    });
    document.getElementById('prompt-workspace-text').addEventListener('input', () => this.capture());
    // Programmatic prompt insertion also needs to be saved after its click handler.
    this.clickListener = () => queueMicrotask(() => { if (!this.destroyed) this.capture(); });
    this.hideListener = () => this.capture();
    this.visibilityListener = () => {
      if (this.panelTabId === null) return;
      if (document.visibilityState === 'hidden') this.capture();
      else this.resume().catch(error => this.status(`Could not restore this conversation: ${error.message}`));
    };
    document.addEventListener('visibilitychange', this.visibilityListener);
    document.addEventListener('click', this.clickListener);
    window.addEventListener('pagehide', this.hideListener);
    this.render();
    this.refreshPage();
    return this.frameSet();
  }
  destroy() {
    this.destroyed = true;
    window.removeEventListener('message', this.messageListener);
    document.removeEventListener('click', this.clickListener);
    document.removeEventListener('visibilitychange', this.visibilityListener);
    window.removeEventListener('pagehide', this.hideListener);
    for (const pending of this.pending.values()) clearTimeout(pending.timer);
    for (const frames of this.frames.values()) frames.iframes.forEach(frame => this.disposeFrame(frame));
  }
  frameSet() {
    if (!this.frames.has(this.scope)) this.frames.set(this.scope, { iframes: new Map(), states: new Map() });
    return this.frames.get(this.scope);
  }
  capture() {
    if (!this.scope) return;
    const snapshot = this.snapshot();
    if (Object.entries(snapshot).some(([key, value]) => this.session[key] !== value)) {
      Object.assign(this.session, snapshot);
      this.save();
    }
  }
  save() {
    this.store.save().catch(error => this.status(`Draft could not be saved: ${error.message}`));
  }
  follow(tabId, shared) {
    if (typeof shared === 'boolean') this.store.sharedWindows[this.windowId] = shared;
    this.transition = this.transition.catch(() => {}).then(async () => {
      this.capture();
      this.frameSet().iframes.forEach(frame => { frame.style.display = 'none'; });
      this.tabId = tabId;
      this.scope = scopeKey(this.windowId, tabId, this.store.sharedWindows[this.windowId]);
      this.status('');
      this.render();
      await this.restore(this.session, this.frameSet());
      this.save();
      await this.refreshPage();
    }).catch(error => this.status(`Could not switch conversation: ${error.message}`));
    return this.transition;
  }
  async resume() {
    await this.transition;
    await this.store.writeQueue;
    this.resuming = true;
    try {
      this.frameSet().iframes.forEach(frame => { frame.style.display = 'none'; });
      await this.store.load();
      this.scope = scopeKey(this.windowId, this.tabId, this.store.sharedWindows[this.windowId]);
      const frames = this.frameSet();
      // Shared research may have moved to another conversation in a different tab.
      for (const [id, frame] of frames.iframes) {
        const info = this.frameInfo.get(frame);
        const state = this.session.providers[id];
        const url = safeProviderUrl(state?.url, info.provider.url);
        if (url !== safeProviderUrl(info.lastState?.url, info.provider.url)) {
          this.disposeFrame(frame);
          frame.remove();
          frames.iframes.delete(id);
          frames.states.delete(id);
        } else {
          frame.contentWindow.postMessage({ type: 'INSIDEBAR_COMMAND', action: 'restore', draft: state?.draft || '', context: state?.context },
            new URL(info.provider.url).origin);
        }
      }
      this.status('');
      this.render();
      await this.restore(this.session, frames);
      await this.refreshPage();
    } finally { this.resuming = false; }
  }
  register(provider, frame) {
    const info = { provider, scope: this.scope, frame, restored: false };
    this.frameInfo.set(frame, info);
    return safeProviderUrl(this.session.providers[provider.id]?.url, provider.url);
  }
  receive(event) {
    const frame = [...this.frames.values()].flatMap(set => [...set.iframes.values()])
      .find(candidate => candidate.contentWindow === event.source);
    const info = frame && this.frameInfo.get(frame);
    if (!info || event.origin !== new URL(info.provider.url).origin) return;
    if (event.data?.type !== 'INSIDEBAR_SESSION') return;
    const { kind, requestId, state } = event.data;
    const session = this.store.get(info.scope);
    if (kind === 'ready' && !info.restored) {
      info.restored = true;
      frame.contentWindow.postMessage({ type: 'INSIDEBAR_COMMAND', action: 'restore',
        draft: session.providers[info.provider.id]?.draft || '',
        context: session.providers[info.provider.id]?.context }, event.origin);
    }
    const inactiveShared = info.scope.startsWith('shared:') && this.panelTabId !== null &&
      (document.visibilityState === 'hidden' || this.resuming);
    if (kind === 'state' && info.restored && state && !inactiveShared) {
      info.lastState = state;
      session.providers[info.provider.id] = {
        ...session.providers[info.provider.id],
        ...(state.context ? { context: state.context } : {}),
        url: safeProviderUrl(state.url, info.provider.url),
        draft: typeof state.draft === 'string' ? state.draft.slice(0, 100000) : ''
      };
      this.save();
      if (info.scope === this.scope) this.render();
    }
    const pending = this.pending.get(requestId);
    if (pending && pending.frame === frame) {
      clearTimeout(pending.timer);
      this.pending.delete(requestId);
      pending.resolve(event.data);
    }
  }
  request(frame, action, extra = {}) {
    const info = this.frameInfo.get(frame);
    const requestId = `sidebar-${++this.sequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('The AI chat is not ready. Sign in or wait for it to load, then try again.'));
      }, 12000);
      this.pending.set(requestId, { frame, resolve, reject, timer });
      frame.contentWindow.postMessage({ type: 'INSIDEBAR_COMMAND', action, requestId, ...extra },
        new URL(info.provider.url).origin);
    });
  }
  async reloadPage() {
    const tabId = this.tabId;
    this.capture();
    try {
      await this.store.save();
      this.reloading = true;
      this.status('Reloading the page…');
      await chrome.tabs.reload(tabId);
    } catch {
      this.reloading = false;
      this.status('Could not reload this tab. Use the browser’s Reload button.');
    }
  }
  async refreshPage() {
    const version = ++this.readVersion;
    const tabId = this.tabId;
    this.pageLoading = true;
    this.render();
    try {
      const result = await chrome.tabs.sendMessage(tabId, { action: 'extractPageContent' });
      if (!result?.success) throw new Error('Page extraction failed.');
      if (!isAttachablePageUrl(result.url)) throw new Error('This type of page cannot be attached. Use a webpage or local HTML file.');
      const content = result.rawContent ?? result.content;
      if (typeof content !== 'string' || !content.trim()) throw new Error('This page has no readable text to attach.');
      if (version !== this.readVersion || tabId !== this.tabId) return;
      this.pages.set(tabId, { title: result.title, url: result.url, content });
      this.pageError = '';
      this.reloadAvailable = false;
      if (this.reloading) { this.status(''); this.reloading = false; }
    } catch (error) {
      if (version !== this.readVersion || tabId !== this.tabId) return;
      this.pages.delete(tabId);
      this.reloadAvailable = /Receiving end does not exist|Could not establish connection|Extension context invalidated/i.test(error.message);
      this.pageError = this.reloadAvailable ? 'This tab needs a refresh before its content can be attached.' :
        /^(This type of page|This page has no readable text)/.test(error.message)
        ? error.message
        : 'Page unavailable. Reload it, or check the extension’s access to this site or local file.';
    } finally {
      if (version === this.readVersion) {
        this.pageLoading = false;
        this.render();
      }
    }
  }
  attachment() {
    const page = this.pages.get(this.tabId);
    return page && !this.session.excludedPages[`${this.tabId}:${page.url}`] ? page : null;
  }
  render() {
    if (!this.scope) return;
    document.getElementById('conversation-scope').value = this.scope.startsWith('shared:') ? 'shared' : 'tab';
    const question = document.getElementById('page-question');
    if (question.value !== this.session.question) question.value = this.session.question;
    const page = this.attachment();
    const chip = document.getElementById('page-chip');
    chip.hidden = !page;
    const title = document.getElementById('page-title');
    title.textContent = page?.title || page?.url || '';
    title.title = page?.url || '';
    const attach = document.getElementById('page-attach');
    attach.hidden = !!page;
    attach.disabled = !!this.pageLoading;
    const reload = document.getElementById('page-reload');
    reload.hidden = !!page || !this.reloadAvailable;
    reload.disabled = !!this.pageLoading;
    document.getElementById('page-status').textContent = this.pageLoading ? 'Reading current page…' :
      page ? (this.session.providers[this.session.provider]?.context?.pages?.includes(page.url)
        ? 'Already shared in this conversation. Follow-ups send only your question.'
        : 'Included with your next question, once per conversation.') : this.pageError || 'No page attached.';
    this.changed?.();
  }
  status(text) { document.getElementById('question-status').textContent = text; }
  async sendQuestion() {
    const session = this.session;
    const scope = this.scope;
    const tabId = this.tabId;
    const question = session.question.trim();
    if (!question || this.sending) return;
    const providerId = session.provider;
    const frame = this.frameSet().iframes.get(providerId);
    if (!frame) return this.status('Choose an AI provider first.');
    this.sending = true;
    document.getElementById('page-send').disabled = true;
    this.status('Preparing your question…');
    try {
      const hadAttachment = !!this.attachment();
      if (hadAttachment) await this.refreshPage();
      if (scope !== this.scope || tabId !== this.tabId) throw new Error('Tab changed. Your question is still saved.');
      if (hadAttachment && !this.attachment()) throw new Error('Could not read the attached page. Reattach it or remove it before sending.');
      const page = this.attachment();
      const result = await this.request(frame, 'send', {
        text: pageQuestion(question, page), question, pageKey: page?.url,
        sourceLabel: page ? pageSource(page.url) : undefined, pageExcerpt: page?.content.slice(0, 512)
      });
      if (!result.ok) throw new Error(result.error || 'Could not send the question.');
      if (result.submitted && result.context) {
        session.providers[providerId] = { ...session.providers[providerId], context: result.context };
      }
      if (result.submitted && session.question.trim() === question) session.question = '';
      if (scope === this.scope) {
        this.render();
        this.status(result.submitted ? 'Sent to the AI chat.' : 'Question prepared in the AI chat. Review it and press Send there.');
      }
      this.save();
    } catch (error) {
      if (scope === this.scope) this.status(error.message);
    } finally {
      this.sending = false;
      document.getElementById('page-send').disabled = false;
    }
  }
}
