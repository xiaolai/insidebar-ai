# 🧪 Smarter Panel - Comprehensive Testing Guide

## Overview

This document provides a complete testing checklist for all features of Smarter Panel. Use this guide to verify that all functionality works correctly across different scenarios.

---

## Phase 1-3: Core Functionality (MVP)

### ✅ Test 1: Extension Installation
- [ ] Load extension in Chrome/Edge without errors
- [ ] Extension icon appears in toolbar
- [ ] No console errors in extension background page
- [ ] All required files load successfully

### ✅ Test 2: Sidebar Opening
- [ ] Click toolbar icon → sidebar opens
- [ ] Press Ctrl+Shift+S (Cmd+Shift+S on Mac) → sidebar opens
- [ ] Sidebar appears on right side of browser window
- [ ] Default provider (ChatGPT) loads automatically

### ✅ Test 3: Provider Loading
- [ ] ChatGPT loads in iframe without errors
- [ ] Claude loads when tab clicked
- [ ] Gemini loads when tab clicked
- [ ] Grok loads when tab clicked
- [ ] DeepSeek loads when tab clicked
- [ ] Loading indicator shows while loading
- [ ] Error message displays if provider fails to load

### ✅ Test 4: Cookie-Based Authentication
- [ ] Log into ChatGPT in regular browser tab
- [ ] Open sidebar → ChatGPT session persists (no re-login required)
- [ ] Repeat for Claude, Gemini, etc.
- [ ] Sessions remain active after closing/reopening sidebar

### ✅ Test 5: Provider Switching
- [ ] Switch from ChatGPT to Claude → ChatGPT hides, Claude shows
- [ ] Switch back to ChatGPT → previous state preserved
- [ ] Conversations persist when switching between providers
- [ ] Active tab indicator updates correctly
- [ ] Can interact with AI in each provider

### ✅ Test 6: Sidebar Persistence
- [ ] Open sidebar on one webpage
- [ ] Navigate to different webpage → sidebar stays open
- [ ] Current provider remains loaded
- [ ] Sidebar maintains position and size

---

## Phase 4: Multi-Provider Optimization

### ✅ Test 7: Provider Tab Rendering
- [ ] Only enabled providers show in tabs
- [ ] Provider tabs render in correct order
- [ ] Tab labels are clear and readable
- [ ] Active tab has visual indicator

### ✅ Test 8: Dynamic Provider Updates
- [ ] Disable a provider in settings → tab disappears
- [ ] Enable a provider in settings → tab appears
- [ ] If current provider disabled → auto-switch to first enabled
- [ ] Context menu updates to match enabled providers

---

## Phase 5: Prompt Library

### ✅ Test 9: Prompt Library Access
- [ ] Click "📚 Prompts" tab → library view opens
- [ ] Press Ctrl+Shift+P → sidebar opens to library
- [ ] Right-click → "Open in Smarter Panel" → "Prompt Library" → opens library
- [ ] Library UI renders correctly

### ✅ Test 10: Create New Prompt
- [ ] Click "+ New" button → modal opens
- [ ] Enter title, content, category, tags
- [ ] Check "Mark as favorite"
- [ ] Click "Save" → prompt appears in list
- [ ] Modal closes after save

### ✅ Test 11: View Prompts
- [ ] All saved prompts display in list
- [ ] Prompt cards show title, content preview, category, tags
- [ ] Most recently used prompts appear first
- [ ] Use count displays correctly

### ✅ Test 12: Use Prompt
- [ ] Click on prompt card → content copies to clipboard
- [ ] Toast notification confirms copy
- [ ] Use count increments
- [ ] Prompt moves to top of list (most recent)

### ✅ Test 13: Edit Prompt
- [ ] Click edit (✏️) button → modal opens with current data
- [ ] Modify title, content, category, tags, favorite status
- [ ] Click "Save" → changes reflected in list
- [ ] Click "Cancel" → no changes applied

### ✅ Test 14: Delete Prompt
- [ ] Click delete (🗑️) button → confirmation dialog appears
- [ ] Click "OK" → prompt removed from list
- [ ] Click "Cancel" → prompt remains

### ✅ Test 15: Favorite Prompts
- [ ] Click star (☆) → becomes filled (★), prompt marked as favorite
- [ ] Click filled star (★) → becomes empty (☆), prompt unfavorited
- [ ] Click "Show favorites" filter → only favorites display
- [ ] Click again → all prompts display

### ✅ Test 16: Search Prompts
- [ ] Type in search box → results filter in real-time
- [ ] Search matches title, content, and tags
- [ ] Clear search box → all prompts display
- [ ] Search with no results → shows empty state

### ✅ Test 17: Category Filter
- [ ] Select category from dropdown → only matching prompts show
- [ ] Select "All Categories" → all prompts display
- [ ] Category dropdown populates with existing categories
- [ ] Empty categories don't appear in dropdown

### ✅ Test 18: Copy to Clipboard
- [ ] Click copy (📋) button → content copies to clipboard
- [ ] Toast notification confirms copy
- [ ] Can paste content into text field
- [ ] Use count does NOT increment (only tracks actual usage)

---

## Phase 6: Settings & Customization

### ✅ Test 19: Access Settings
- [ ] Right-click extension icon → "Options" → settings page opens
- [ ] Settings page renders correctly
- [ ] All sections display properly

### ✅ Test 20: Theme Settings
- [ ] Change theme to "Light" → sidebar updates to light theme
- [ ] Change theme to "Dark" → sidebar updates to dark theme
- [ ] Change theme to "Auto" → follows system preference
- [ ] Theme persists after closing/reopening sidebar

### ✅ Test 21: Default Provider
- [ ] Change default provider to Claude
- [ ] Close and reopen sidebar → Claude loads by default
- [ ] Change back to ChatGPT → setting updates

### ✅ Test 22: Enable/Disable Providers
- [ ] Toggle ChatGPT off → disappears from sidebar tabs and context menu
- [ ] Toggle back on → reappears
- [ ] Try to disable all providers → warning appears, at least one must remain
- [ ] Disabled provider doesn't appear in "Default Provider" dropdown

### ✅ Test 23: Data Statistics
- [ ] Stats show correct count of prompts
- [ ] Stats show correct count of favorites
- [ ] Stats show correct count of categories
- [ ] Storage size estimate appears reasonable

### ✅ Test 24: Export Data
- [ ] Click "Export" → JSON file downloads
- [ ] Open JSON file → contains prompts and settings
- [ ] File name includes timestamp
- [ ] File format is valid JSON

### ✅ Test 25: Import Data
- [ ] Click "Import" → file picker opens
- [ ] Select valid export file → confirmation dialog appears
- [ ] Confirm → data imports successfully
- [ ] Duplicate prompts are skipped
- [ ] Stats update to reflect new data

### ✅ Test 26: Reset Data
- [ ] Click "Reset" → first confirmation appears
- [ ] Confirm → second "Are you sure?" confirmation appears
- [ ] Confirm again → all prompts deleted, settings reset
- [ ] Stats show zeros
- [ ] Prompt library shows empty state

### ✅ Test 27: Keyboard Shortcuts Display
- [ ] Settings page shows current keyboard shortcuts
- [ ] Shortcuts match actual browser settings
- [ ] Link to chrome://extensions/shortcuts works

---

## Phase 7: Context Menu Enhancements

### ✅ Test 28: Context Menu Structure
- [ ] Right-click on webpage → "Open in Smarter Panel" appears
- [ ] Hover → submenu shows enabled providers + Prompt Library
- [ ] Only enabled providers appear in submenu
- [ ] Menu items have clear labels

### ✅ Test 29: Context Menu - Open Provider
- [ ] Right-click → select "ChatGPT" → sidebar opens with ChatGPT
- [ ] Right-click → select "Claude" → sidebar opens with Claude
- [ ] Context menu works from any webpage
- [ ] Works with selected text (future enhancement)

### ✅ Test 30: Context Menu - Open Library
- [ ] Right-click → select "Prompt Library" → sidebar opens to library
- [ ] Library view displays correctly
- [ ] Can create/use prompts immediately

### ✅ Test 31: Dynamic Context Menu Updates
- [ ] Disable a provider in settings → disappears from context menu
- [ ] Enable a provider → appears in context menu
- [ ] Updates happen automatically (no browser restart needed)

---

## Phase 8: Polish & Performance

### ✅ Test 32: Input Validation
- [ ] Try to save prompt with empty content → error message appears
- [ ] Try to save prompt with extremely long content (>50,000 chars) → error/truncation
- [ ] Enter special characters in title/content → handles correctly
- [ ] Enter HTML/script tags → properly sanitized

### ✅ Test 33: Performance - Large Prompt List
- [ ] Create 100+ prompts
- [ ] Library view loads without lag
- [ ] Search filters quickly
- [ ] Scrolling is smooth

### ✅ Test 34: Performance - Provider Switching
- [ ] Switch between 5 providers rapidly
- [ ] No memory leaks or slowdowns
- [ ] Each provider loads quickly
- [ ] Browser remains responsive

### ✅ Test 35: Accessibility - Keyboard Navigation
- [ ] Tab key navigates through all interactive elements
- [ ] Enter key activates buttons
- [ ] Escape key closes modals
- [ ] Focus indicators are visible

### ✅ Test 36: Accessibility - Screen Reader Support
- [ ] All buttons have aria-labels or meaningful text
- [ ] Form fields have proper labels
- [ ] Status messages are announced
- [ ] Modal dialogs are properly announced

### ✅ Test 37: Dark Mode
- [ ] System dark mode → extension uses dark theme (when theme = auto)
- [ ] All text is readable in dark mode
- [ ] Contrast ratios meet accessibility standards
- [ ] No white flashes when switching

### ✅ Test 38: Error Handling
- [ ] Internet disconnected → appropriate error messages
- [ ] IndexedDB fails → graceful fallback or error message
- [ ] chrome.storage fails → falls back to local storage
- [ ] Invalid import file → clear error message

---

## Edge Cases & Stress Tests

### ✅ Test 39: Browser Compatibility
- [ ] Works in Chrome (latest version)
- [ ] Works in Edge (latest version)
- [ ] Works in Chrome Canary (if available)
- [ ] No browser-specific bugs

### ✅ Test 40: Data Persistence
- [ ] Close browser completely → reopen → data still present
- [ ] Disable extension → re-enable → data still present
- [ ] Update extension version → data migrates correctly

### ✅ Test 41: Multiple Windows/Tabs
- [ ] Open sidebar in window A
- [ ] Open sidebar in window B → separate sidebar instance
- [ ] Changes in window A settings → reflect in window B
- [ ] No data conflicts

### ✅ Test 42: Network Conditions
- [ ] Slow network → loading indicators work correctly
- [ ] Network drops → error messages appear
- [ ] Network reconnects → can retry loading

### ✅ Test 43: Storage Limits
- [ ] Create 1,000+ prompts → storage doesn't exceed limits
- [ ] Prompt content with 10,000+ characters → saves correctly
- [ ] Estimate storage usage accurately

### ✅ Test 44: Provider Authentication Edge Cases
- [ ] Logged out of ChatGPT → iframe shows login screen
- [ ] Session expires → can log in within sidebar
- [ ] Multiple accounts → each provider uses correct account

---

## Security & Privacy Tests

### ✅ Test 45: Data Privacy
- [ ] All data stored locally (IndexedDB + chrome.storage)
- [ ] No external API calls (except to AI provider domains)
- [ ] No telemetry or analytics
- [ ] Export file contains only user data

### ✅ Test 46: XSS Protection
- [ ] Enter `<script>alert('XSS')</script>` in prompt title → sanitized
- [ ] Enter malicious HTML in prompt content → renders safely
- [ ] Import file with malicious content → sanitized

### ✅ Test 47: Permissions
- [ ] Extension only requests necessary permissions
- [ ] No unnecessary host permissions
- [ ] declarativeNetRequest used only for X-Frame-Options bypass
- [ ] Clipboard access works as expected

---

## Final Verification

### ✅ Test 48: Clean Installation
- [ ] Remove extension completely
- [ ] Reinstall → installs without errors
- [ ] Default settings applied correctly
- [ ] Welcome experience (if any) works

### ✅ Test 49: Update Flow
- [ ] Simulate extension update
- [ ] Existing data preserved
- [ ] New features accessible
- [ ] No breaking changes

### ✅ Test 50: Uninstallation
- [ ] Uninstall extension
- [ ] All data cleaned up (or user notified about data retention)
- [ ] No console errors after uninstall

---

## Testing Checklist Summary

- **Total Tests**: 50
- **MVP Tests (Phase 1-3)**: 8 tests
- **Multi-Provider Tests (Phase 4)**: 2 tests
- **Prompt Library Tests (Phase 5)**: 10 tests
- **Settings Tests (Phase 6)**: 9 tests
- **Context Menu Tests (Phase 7)**: 4 tests
- **Polish Tests (Phase 8)**: 7 tests
- **Edge Cases**: 6 tests
- **Security Tests**: 3 tests
- **Final Verification**: 3 tests

---

## Reporting Issues

When reporting bugs, please include:

1. **Test number** that failed
2. **Expected behavior**
3. **Actual behavior**
4. **Steps to reproduce**
5. **Browser version**
6. **Console errors** (if any)
7. **Screenshots** (if applicable)

---

## Test Results Template

```
Test Date: YYYY-MM-DD
Tester: [Name]
Browser: [Chrome/Edge] [Version]
OS: [Windows/Mac/Linux] [Version]

Phase 1-3 (MVP): ✅ PASS / ❌ FAIL
Phase 4 (Multi-Provider): ✅ PASS / ❌ FAIL
Phase 5 (Prompt Library): ✅ PASS / ❌ FAIL
Phase 6 (Settings): ✅ PASS / ❌ FAIL
Phase 7 (Context Menu): ✅ PASS / ❌ FAIL
Phase 8 (Polish): ✅ PASS / ❌ FAIL
Edge Cases: ✅ PASS / ❌ FAIL
Security: ✅ PASS / ❌ FAIL
Final Verification: ✅ PASS / ❌ FAIL

Issues Found: [List any issues]
```

---

**Happy Testing! 🚀**
