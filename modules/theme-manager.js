import { getSettings } from './settings.js';

export function detectTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export async function applyTheme() {
  const settings = await getSettings();
  let theme;

  if (settings.theme === 'auto') {
    theme = detectTheme();
  } else {
    theme = settings.theme; // 'light' or 'dark'
  }

  document.documentElement.setAttribute('data-theme', theme);
  return theme;
}

// Listen for system theme changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async (e) => {
    const settings = await getSettings();
    if (settings.theme === 'auto') {
      applyTheme();
    }
  });
}
