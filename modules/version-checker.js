// T073: Version Check Module
// Checks for updates by comparing commit hash with GitHub

import { t } from './i18n.js';

const VERSION_INFO_PATH = '/data/version-info.json';

/**
 * Load bundled version info
 * @returns {Promise<Object>} Version info object {version, commitHash, buildDate}
 */
export async function loadVersionInfo() {
  try {
    const response = await fetch(chrome.runtime.getURL(VERSION_INFO_PATH));
    if (!response.ok) {
      throw new Error('Failed to load version info');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading version info:', error);
    return null;
  }
}

/**
 * Fetch latest commit from GitHub via background service worker
 * @returns {Promise<Object|null>} Latest commit info {sha, date, message} or null on error
 */
export async function fetchLatestCommit() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'fetchLatestCommit'
    });

    if (response && response.success) {
      return response.data;
    } else {
      console.error('Error fetching latest commit:', response?.error || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('Error fetching latest commit:', error);
    return null;
  }
}

/**
 * Check if an update is available
 * @returns {Promise<Object>} Update status {updateAvailable, currentHash, latestHash, latestDate, error}
 */
export async function checkForUpdates() {
  const versionInfo = await loadVersionInfo();
  if (!versionInfo) {
    return {
      updateAvailable: false,
      error: t('errVersionInfoFailed')
    };
  }

  const latestCommit = await fetchLatestCommit();
  if (!latestCommit) {
    return {
      updateAvailable: false,
      currentHash: versionInfo.commitHash,
      error: t('errGitHubFetchFailed')
    };
  }

  const updateAvailable = versionInfo.commitHash !== latestCommit.shortSha;

  return {
    updateAvailable,
    currentVersion: versionInfo.version,
    currentHash: versionInfo.commitHash,
    currentBuildDate: versionInfo.buildDate,
    latestHash: latestCommit.shortSha,
    latestDate: latestCommit.date,
    latestMessage: latestCommit.message,
    error: null
  };
}

/**
 * Get the download URL for the latest version
 * @returns {string} GitHub zip download URL
 */
export function getDownloadUrl() {
  return 'https://github.com/xiaolai/insidebar-ai/archive/refs/heads/main.zip';
}

/**
 * Get the GitHub repository URL
 * @returns {string} GitHub repository URL
 */
export function getRepositoryUrl() {
  return 'https://github.com/xiaolai/insidebar-ai';
}
