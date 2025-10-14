# Manual Testing Procedures

This document outlines manual testing procedures for insidebar.ai extension before production release.

## Pre-Release Checklist

### 1. Installation & Setup

- [ ] **Fresh Install on Chrome**
  - Load unpacked extension in `chrome://extensions/`
  - Extension icon appears in toolbar
  - No console errors on installation

- [ ] **Fresh Install on Edge**
  - Load unpacked extension in `edge://extensions/`
  - Extension icon appears in toolbar
  - No console errors on installation

### 2. First Run Experience

- [ ] **Initial Sidebar Open**
  - Click extension icon - sidebar opens
  - Default provider (ChatGPT) loads correctly
  - Provider iframe displays without errors
  - No console errors in sidebar DevTools

- [ ] **Keyboard Shortcut Setup**
  - Edge users see one-time shortcut reminder banner
  - Banner can be dismissed
  - Banner opens edge://extensions/shortcuts when clicked

### 3. Provider Switching

- [ ] **Tab Navigation**
  - All enabled provider tabs appear at bottom
  - Clicking each provider tab loads correct AI site
  - Provider iframes load without X-Frame-Options errors
  - Active tab highlighted correctly

- [ ] **Provider URLs Load**
  - ChatGPT: https://chatgpt.com or https://chat.openai.com
  - Claude: https://claude.ai
  - Gemini: https://gemini.google.com
  - Grok: https://grok.com
  - DeepSeek: https://chat.deepseek.com

- [ ] **Session Persistence**
  - Close and reopen sidebar
  - Last selected provider remembered
  - No need to reload provider pages

### 4. Keyboard Shortcuts

- [ ] **Toggle Sidebar** (`Cmd+Shift+E` / `Ctrl+Shift+E`)
  - Opens sidebar when closed
  - Closes sidebar when open (if enabled in settings)
  - Works across different browser windows

- [ ] **Open Prompt Library** (`Cmd+Shift+P` / `Ctrl+Shift+P`)
  - Opens sidebar to Prompt Library view
  - Toggles sidebar if already open

### 5. Context Menu

- [ ] **Right-Click Menu**
  - Right-click on page shows "Send to insidebar.ai" option
  - Submenu shows all enabled providers
  - Submenu includes "Prompt Library" option

- [ ] **Text Selection**
  - Select text on page → right-click → choose provider
  - Sidebar opens to selected provider
  - Selected text injected into provider's input (where supported)

### 6. Prompt Library

#### Basic Operations

- [ ] **Create New Prompt**
  - Click "+ New" button
  - Fill in title, content, category, tags
  - Save prompt successfully
  - Prompt appears in list

- [ ] **Edit Prompt**
  - Click edit icon on any prompt
  - Modify fields
  - Save changes
  - Changes reflected in list

- [ ] **Delete Prompt**
  - Click delete icon
  - Confirmation dialog appears
  - Prompt removed from list

- [ ] **Use Prompt**
  - Click on prompt card
  - Content copied to clipboard
  - Toast notification appears

#### Search & Filter

- [ ] **Text Search**
  - Type in search box
  - Results filter in real-time
  - Search matches title, content, and tags

- [ ] **Category Filter**
  - Click category dropdown
  - Select category
  - Only prompts in that category shown
  - "All Categories" shows all prompts

- [ ] **Favorites Filter**
  - Click star icon in filter bar
  - Only favorite prompts shown
  - Click again to show all prompts

#### Sorting

- [ ] **Sort Options**
  - Recent (default) - recently used first
  - Most Used - by use count
  - Alphabetical A-Z / Z-A toggle
  - Newest / Oldest toggle

- [ ] **Sort Persistence**
  - Selected sort order remembered during session

#### Favorites

- [ ] **Toggle Favorite**
  - Click star icon on prompt
  - Star fills/empties correctly
  - Favorite count updates

- [ ] **Quick Access Panel**
  - Shows recently used prompts (top 5)
  - Shows top favorites (top 5)
  - Sections collapsible
  - Click prompt opens insert modal

### 7. Prompt Workspace

- [ ] **Insert Prompt**
  - Click input icon on prompt
  - Insert modal opens with preview
  - Choose "Beginning" - text prepended
  - Choose "End" - text appended
  - Choose "Replace" - text replaced

- [ ] **Copy Workspace**
  - Add text to workspace
  - Click copy icon
  - Text copied to clipboard
  - Toast notification shown

- [ ] **Save as Prompt**
  - Add text to workspace
  - Click save icon
  - Editor opens with content pre-filled
  - Save successfully

- [ ] **Clear Workspace**
  - Add text to workspace
  - Click clear icon
  - Workspace empties

- [ ] **Send to Provider**
  - Add text to workspace
  - Select provider from dropdown
  - Click send button
  - Switches to provider view
  - Text injected into provider

### 8. Settings Page

- [ ] **Open Settings**
  - Click settings icon (gear) in sidebar
  - Options page opens in new tab
  - All sections load correctly

#### Theme Settings

- [ ] **Theme Selection**
  - Choose Auto - follows system theme
  - Choose Light - light theme applied
  - Choose Dark - dark theme applied
  - Theme changes immediately

#### Provider Settings

- [ ] **Enable/Disable Providers**
  - Toggle providers on/off
  - Cannot disable all providers (at least one required)
  - Sidebar tabs update immediately
  - Context menu updates

- [ ] **Default Provider**
  - Select default provider dropdown
  - Choice saved
  - Next sidebar open loads that provider

#### Keyboard Shortcuts

- [ ] **Toggle Shortcuts**
  - Disable shortcuts
  - Keyboard shortcuts stop working
  - Re-enable shortcuts
  - Keyboard shortcuts work again

- [ ] **Shortcut Setup Links**
  - Click "Configure Shortcuts" button
  - Opens browser://extensions/shortcuts
  - (Edge only) Edge-specific button works

#### Auto-Paste Clipboard

- [ ] **Auto-Paste Toggle**
  - Enable auto-paste
  - Open Prompt Library with `Cmd+Shift+P`
  - Clipboard content appears in workspace
  - Disable - clipboard not pasted

#### Enter Key Behavior

- [ ] **Enable/Disable**
  - Toggle Enter key customization
  - Settings show/hide correctly

- [ ] **Preset Selection**
  - Default: Shift+Enter = newline, Enter = send
  - Swapped: Enter = newline, Shift+Enter = send
  - Slack: Enter = send, Ctrl+Enter = newline
  - Discord: Ctrl+Enter = send, Enter = newline
  - Custom: Configure manually

- [ ] **Custom Configuration**
  - Select "Custom" preset
  - Configure modifier checkboxes
  - Settings saved correctly

#### Data Management

- [ ] **Import Default Library**
  - Click "Import Default Prompts"
  - ~50 prompts imported
  - Button shows "Imported" state
  - Stats update

- [ ] **Export Data**
  - Click "Export Data"
  - JSON file downloads
  - File contains prompts and settings
  - Filename includes timestamp

- [ ] **Import Data**
  - Export data first
  - Click "Import Data"
  - Select exported JSON file
  - Confirmation dialog shows counts
  - Data imported successfully
  - Duplicates skipped

- [ ] **Reset All Data**
  - Click "Reset All Data"
  - First confirmation dialog
  - Second confirmation dialog
  - All prompts deleted
  - Settings reset to defaults
  - Stats show zeros

- [ ] **Data Statistics**
  - Total prompts count correct
  - Favorites count correct
  - Categories count correct
  - Storage size approximate

### 9. Theme & Icons

- [ ] **Light Theme**
  - Background is light
  - Text is dark
  - Icons use light theme versions
  - Provider icons load correctly

- [ ] **Dark Theme**
  - Background is dark
  - Text is light
  - Icons use dark theme versions (where available)
  - Provider icons load correctly

- [ ] **Auto Theme**
  - System dark mode → extension dark
  - System light mode → extension light
  - Theme switches when system changes

- [ ] **Material Symbols**
  - All icons render correctly (no missing squares)
  - Icon sizes consistent (28px modals, 20px workspace, 18px filters)
  - Icon hover states work

### 10. Error Handling

- [ ] **Network Offline**
  - Disable network
  - Try loading provider
  - Appropriate error shown
  - Can retry when online

- [ ] **Invalid Data Import**
  - Try importing non-JSON file
  - Error message shown
  - No data corrupted

- [ ] **Provider Login Required**
  - Try using provider while logged out
  - Provider shows login page in iframe
  - Can log in and use normally

### 11. Performance

- [ ] **Quick Switching**
  - Switch between providers rapidly
  - No lag or freezing
  - Iframes cached correctly

- [ ] **Large Prompt Library**
  - Create 100+ prompts
  - Search/filter still responsive
  - No noticeable slowdown

- [ ] **Memory Usage**
  - Open sidebar for extended period
  - Check browser task manager
  - No memory leaks

### 12. Browser Compatibility

#### Chrome

- [ ] Chrome 114+ loads extension
- [ ] All features work correctly
- [ ] No console errors

#### Edge

- [ ] Edge 114+ loads extension
- [ ] All features work correctly
- [ ] No console errors
- [ ] Edge shortcut reminder appears

### 13. Clean Installation Test

- [ ] Remove extension completely
- [ ] Clear all extension data
- [ ] Reinstall extension
- [ ] All features work from scratch
- [ ] No leftover data

### 14. Production Checks

- [ ] **No Debug Logging**
  - Open browser console
  - Use all major features
  - No console.log statements appear
  - Only intentional error messages (if any)

- [ ] **Lint Passes**
  - Run `npm run lint`
  - No critical errors
  - Only expected warnings (Firefox compatibility)

- [ ] **Tests Pass**
  - Run `npm test`
  - All tests pass
  - No test failures

- [ ] **Files Present**
  - All required files in package
  - Icons present (16, 32, 48, 128px)
  - Provider icons present
  - Default prompt library present
  - LICENSE file present
  - README.md complete

---

## Sign-Off

**Tested By:** _______________
**Date:** _______________
**Browser:** _______________
**Version:** _______________
**Result:** ☐ PASS  ☐ FAIL
**Notes:** _______________

---

## Known Issues

_(Document any known issues that are acceptable for release)_

---

## Future Testing Needs

- Automated E2E testing setup
- Cross-browser testing automation
- Performance benchmarking
- Accessibility testing (WCAG compliance)
