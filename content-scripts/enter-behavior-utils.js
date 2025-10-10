// Shared utilities for Enter key behavior modification
// Allows Enter = newline, Shift+Enter = send

function enableEnterSwap() {
  document.addEventListener("keydown", handleEnterSwap, { capture: true });
  console.log('[Smarter Panel] Enter behavior swap enabled');
}

function disableEnterSwap() {
  document.removeEventListener("keydown", handleEnterSwap, { capture: true });
  console.log('[Smarter Panel] Enter behavior swap disabled');
}

function applyEnterSwapSetting() {
  chrome.storage.sync.get({ swapEnterBehavior: true }, (data) => {
    if (data.swapEnterBehavior) {
      enableEnterSwap();
    } else {
      disableEnterSwap();
    }
  });
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.swapEnterBehavior) {
    applyEnterSwapSetting();
  }
});
