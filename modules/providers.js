export const PROVIDERS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    icon: 'icons/providers/chatgpt.png',
    enabled: true
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai',
    icon: 'icons/providers/claude.png',
    enabled: true
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com',
    icon: 'icons/providers/gemini.png',
    enabled: true
  },
  {
    id: 'grok',
    name: 'Grok',
    url: 'https://grok.com',
    icon: 'icons/providers/grok.png',
    enabled: true
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    icon: 'icons/providers/deepseek.png',
    enabled: true
  },
  {
    id: 'ollama',
    name: 'Ollama',
    url: 'http://localhost:3000',
    icon: 'icons/providers/ollama.png',
    enabled: false  // Disabled by default (requires local setup)
  }
];

export function getProviderById(id) {
  return PROVIDERS.find(p => p.id === id);
}

export async function getEnabledProviders() {
  const settings = await chrome.storage.sync.get({
    enabledProviders: ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek']
  });
  return PROVIDERS.filter(p => settings.enabledProviders.includes(p.id));
}
