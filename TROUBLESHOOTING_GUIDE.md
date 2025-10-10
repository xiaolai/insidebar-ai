# 🔧 Smarter Panel - Troubleshooting Guide

Quick solutions for common issues.

---

## Extension Loading Issues

### ❌ Error: "sidePanel.open() may only be called in response to a user gesture"

**Cause**: The `chrome.sidePanel.open()` API requires a direct user interaction.

**Solution**: This error is now handled gracefully in the code. If you still see it:

1. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Click the reload icon on Smarter Panel
   - Verify you're running the latest version

2. **Check browser version**:
   - Requires Chrome 114+ or Edge 114+
   - Run: `chrome://version/` or `edge://version/`
   - Update if needed

3. **Test user interactions**:
   - ✅ Click extension icon (should work)
   - ✅ Press keyboard shortcut (should work)
   - ✅ Right-click context menu (should work)
   - ❌ Automatic opening on install (won't work - by design)

**Technical Note**: The extension uses `openPanelOnActionClick: true` behavior, which allows the sidebar to open when clicking the extension icon without explicit API calls.

---

## Provider Loading Issues

### 🔲 Provider shows blank screen

**Possible Causes**:
1. Not logged into the provider
2. Provider blocking iframe embedding
3. Network connectivity issues
4. Provider URL changed

**Solutions**:

1. **Log in first**:
   ```
   - Open new tab
   - Go to provider website (e.g., https://chat.openai.com)
   - Log in normally
   - Close tab
   - Open Smarter Panel sidebar
   - Provider should now work
   ```

2. **Check console for errors**:
   - Right-click sidebar → Inspect
   - Look at Console tab
   - Check for CSP or X-Frame-Options errors

3. **Verify provider is enabled**:
   - Right-click extension icon → Options
   - Check that provider is toggled ON
   - Try disabling and re-enabling

4. **Clear cache**:
   ```
   - Settings → Privacy → Clear browsing data
   - Select "Cached images and files"
   - Clear for "All time"
   - Reload extension
   ```

---

## Keyboard Shortcut Issues

### ⌨️ Shortcuts don't work

**Solutions**:

1. **Check shortcut configuration**:
   - Go to `chrome://extensions/shortcuts`
   - Find "Smarter Panel"
   - Verify shortcuts are set
   - Default: `Ctrl+Shift+S` and `Ctrl+Shift+P`

2. **Resolve conflicts**:
   - Another extension may use the same shortcut
   - Change conflicting shortcuts
   - Or change Smarter Panel shortcuts

3. **Re-assign shortcuts**:
   - Click the edit icon (✏️) next to each command
   - Press your desired key combination
   - Click OK

---

## Prompt Library Issues

### 📚 Prompts not saving

**Possible Causes**:
1. IndexedDB quota exceeded
2. Browser storage disabled
3. Incognito/Private mode

**Solutions**:

1. **Check storage**:
   - Open DevTools (F12)
   - Application tab → Storage
   - Look for "SmarterPanelDB" under IndexedDB
   - Should show prompts object store

2. **Clear old data** (if database corrupted):
   - Right-click extension icon → Options
   - Data Management → Reset All Data
   - ⚠️ Warning: This deletes everything!
   - Export first if you want to keep prompts

3. **Check quota**:
   ```javascript
   // Run in console:
   navigator.storage.estimate().then(estimate => {
     console.log(`Used: ${estimate.usage} / ${estimate.quota}`);
   });
   ```

4. **Incognito mode note**:
   - IndexedDB works in incognito but data is cleared on exit
   - Use export/import to preserve data

---

## Search/Filter Issues

### 🔍 Search not finding prompts

**Solutions**:

1. **Verify search scope**:
   - Search looks in: title, content, tags
   - Case-insensitive
   - Partial matches supported

2. **Clear filters**:
   - Remove category filter (select "All Categories")
   - Turn off favorites filter (⭐ button)
   - Clear search box

3. **Check if prompts exist**:
   - Click category dropdown
   - See if your category appears
   - If not, prompts may not be saved

---

## Context Menu Issues

### 🖱️ Context menu not appearing

**Solutions**:

1. **Reload extension**:
   ```
   chrome://extensions/ → Reload Smarter Panel
   ```

2. **Check permissions**:
   - Extension details → Permissions
   - Verify "contextMenus" permission is granted
   - Re-install if missing

3. **Test on different pages**:
   - Some pages (chrome://, edge://) block extensions
   - Try on regular websites (google.com, etc.)

---

## Theme Issues

### 🎨 Dark mode not working

**Solutions**:

1. **Check theme setting**:
   - Right-click icon → Options
   - Appearance → Theme
   - Try "Dark" instead of "Auto"

2. **System preferences**:
   - If using "Auto", check OS dark mode:
     - macOS: System Preferences → General → Appearance
     - Windows: Settings → Personalization → Colors

3. **Force refresh**:
   - Change theme to "Light"
   - Reload sidebar
   - Change back to "Dark"
   - Reload sidebar

---

## Import/Export Issues

### 💾 Export not downloading

**Solutions**:

1. **Check browser download settings**:
   - Ensure downloads are not blocked
   - Check download location is writable

2. **Try again**:
   - Right-click icon → Options
   - Data Management → Export
   - Check Downloads folder

3. **Manual export** (if button fails):
   ```javascript
   // Open console in options page (F12)
   // Run this code:
   getAllPrompts().then(prompts => {
     const data = JSON.stringify({prompts}, null, 2);
     console.log(data); // Copy this
   });
   ```

### 📥 Import fails

**Possible Causes**:
1. Invalid JSON format
2. Corrupted file
3. Wrong file version

**Solutions**:

1. **Validate JSON**:
   - Open file in text editor
   - Verify it's valid JSON (starts with `{`, ends with `}`)
   - Use online JSON validator if unsure

2. **Check file structure**:
   ```json
   {
     "version": "1.0",
     "exportDate": "...",
     "prompts": [...],
     "settings": {...}
   }
   ```

3. **Try importing just prompts**:
   - Extract just the "prompts" array
   - Create new file with that structure
   - Import again

---

## Performance Issues

### 🐌 Sidebar loading slowly

**Solutions**:

1. **Too many prompts**:
   - 1,000+ prompts may slow search
   - Export old prompts
   - Delete unused prompts
   - Keep library under 500 prompts for best performance

2. **Memory usage**:
   - Close unused provider tabs
   - Extension caches loaded iframes
   - Reload extension to clear cache

3. **Browser performance**:
   - Close unused tabs
   - Restart browser
   - Update to latest browser version

---

## Developer Issues

### 🛠️ Making code changes

**After editing code**:

1. **Reload extension**:
   ```
   chrome://extensions/ → Click reload icon
   ```

2. **Hard reload sidebar**:
   ```
   Right-click sidebar → Inspect → Console
   Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   ```

3. **Clear console**:
   ```
   Click 🚫 icon in DevTools console
   ```

### 🔍 Debugging

**Service Worker console**:
```
chrome://extensions/ → Smarter Panel → service worker link
```

**Sidebar console**:
```
Open sidebar → Right-click → Inspect
```

**Options page console**:
```
Right-click icon → Options → F12
```

---

## Still Having Issues?

1. **Check browser console** for errors
2. **Review [TESTING.md](TESTING.md)** for comprehensive test scenarios
3. **Read [INSTALLATION.md](INSTALLATION.md)** for setup instructions
4. **Check git commit history** for recent fixes
5. **Create an issue** with:
   - Browser version
   - Extension version
   - Console errors (screenshot or copy)
   - Steps to reproduce

---

## Quick Fixes Checklist

When something goes wrong, try these in order:

- [ ] Reload the extension (`chrome://extensions/`)
- [ ] Close and reopen the sidebar
- [ ] Restart the browser
- [ ] Check browser console for errors
- [ ] Verify browser version (114+)
- [ ] Check permissions in extension details
- [ ] Clear browser cache
- [ ] Re-install the extension (export data first!)

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "may only be called in response to a user gesture" | API called without user action | Now handled - reload extension |
| "X-Frame-Options deny" | Provider blocking iframe | Check declarativeNetRequest rules |
| "Failed to fetch" | Network/CORS issue | Check internet connection |
| "IndexedDB not available" | Storage disabled | Enable storage in browser settings |
| "Manifest not found" | Extension not loaded | Verify folder structure |

---

**Last Updated**: 2025-10-10
**Version**: 1.0.0
