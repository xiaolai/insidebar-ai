export const PROVIDERS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    icon: '/icons/providers/chatgpt.png',
    iconDark: '/icons/providers/dark/chatgpt.png',
    enabled: true
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai',
    icon: '/icons/providers/claude.png',
    iconDark: '/icons/providers/dark/claude.png',
    enabled: true
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com',
    icon: '/icons/providers/gemini.png',
    iconDark: '/icons/providers/dark/gemini.png',
    enabled: true
  },
  {
    id: 'grok',
    name: 'Grok',
    url: 'https://grok.com',
    icon: '/icons/providers/grok.png',
    iconDark: '/icons/providers/dark/grok.png',
    enabled: true
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    icon: '/icons/providers/deepseek.png',
    iconDark: '/icons/providers/dark/deepseek.png',
    enabled: true
  },
  {
    id: 'ollama',
    name: 'Ollama',
    url: 'http://localhost:3000',
    icon: '/icons/providers/ollama.png',
    iconDark: '/icons/providers/dark/ollama.png',
    enabled: false  // Disabled by default (requires local setup)
  }
];

export function getProviderById(id) {
  return PROVIDERS.find(p => p.id === id);
}

export async function getProviderByIdWithSettings(id) {
  const provider = PROVIDERS.find(p => p.id === id);
  if (!provider) return null;

  // For Ollama, use custom URL from settings
  if (id === 'ollama') {
    const settings = await chrome.storage.sync.get({ ollamaUrl: 'http://localhost:3000' });
    return {
      ...provider,
      url: settings.ollamaUrl
    };
  }

  return provider;
}

export async function getEnabledProviders() {
  const settings = await chrome.storage.sync.get({
    enabledProviders: ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek'],
    ollamaUrl: 'http://localhost:3000'
  });

  return PROVIDERS
    .filter(p => settings.enabledProviders.includes(p.id))
    .map(p => {
      // For Ollama, use custom URL from settings
      if (p.id === 'ollama') {
        return { ...p, url: settings.ollamaUrl };
      }
      return p;
    });
}
