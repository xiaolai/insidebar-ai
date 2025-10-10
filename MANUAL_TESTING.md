# Manual Testing Guide: Send Selection to Sidebar

## Feature Overview
Users can now select text on any webpage and send it directly to an AI provider's input area via the context menu.

## Prerequisites
1. Load the extension in Chrome/Edge:
   - Navigate to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `insidebar-ai` folder
   - **IMPORTANT: If extension was already loaded, click the reload button (↻) on the extension card**
   - This ensures the latest code is loaded

2. Ensure you're logged into at least one AI provider:
   - ChatGPT (https://chatgpt.com)
   - Claude (https://claude.ai)
   - Gemini (https://gemini.google.com)
   - Grok (https://grok.com)
   - DeepSeek (https://chat.deepseek.com)

## Test Scenarios

### Test 1: Basic Text Selection - ChatGPT
1. Navigate to any webpage (e.g., https://wikipedia.org)
2. Select some text (e.g., a paragraph)
3. Right-click on the selected text
4. Hover over "Open in insidebar.ai"
5. Click "ChatGPT"

**Expected Result:**
- Sidebar opens automatically
- ChatGPT loads in the sidebar
- Selected text appears in the ChatGPT textarea
- Cursor is at the end of the inserted text
- You can edit the text or send it immediately

### Test 2: Basic Text Selection - Claude
1. Navigate to any webpage
2. Select some text
3. Right-click → "Open in insidebar.ai" → "Claude"

**Expected Result:**
- Sidebar opens
- Claude loads
- Selected text appears in Claude's ProseMirror editor
- Text is ready to send or edit

### Test 3: Basic Text Selection - Gemini
1. Navigate to any webpage
2. Select some text
3. Right-click → "Open in insidebar.ai" → "Gemini"

**Expected Result:**
- Sidebar opens
- Gemini loads
- Selected text appears in Gemini's Quill editor
- Text is ready to send or edit

### Test 4: Basic Text Selection - Grok
1. Navigate to any webpage
2. Select some text
3. Right-click → "Open in insidebar.ai" → "Grok"

**Expected Result:**
- Sidebar opens
- Grok loads
- Selected text appears in Grok's input area
- Text is ready to send or edit

### Test 5: Basic Text Selection - DeepSeek
1. Navigate to any webpage
2. Select some text
3. Right-click → "Open in insidebar.ai" → "DeepSeek"

**Expected Result:**
- Sidebar opens
- DeepSeek loads
- Selected text appears in DeepSeek's textarea
- Text is ready to send or edit

### Test 6: Appending to Existing Text
1. Open sidebar and navigate to ChatGPT
2. Type some text manually in the textarea (e.g., "Summarize this: ")
3. Go back to the webpage tab
4. Select some text
5. Right-click → "Open in insidebar.ai" → "ChatGPT"

**Expected Result:**
- Sidebar switches to ChatGPT (or stays on ChatGPT)
- New text is appended to existing text
- Both old and new text are visible
- Cursor is at the end

### Test 7: Multi-line Text Selection
1. Select multiple paragraphs from a webpage (with line breaks)
2. Right-click → "Open in insidebar.ai" → "Claude"

**Expected Result:**
- All selected text including line breaks is inserted
- Formatting is preserved (newlines maintained)
- Text is readable and properly formatted

### Test 8: Special Characters
1. Select text containing special characters: quotes (""), apostrophes ('), emojis (😊), etc.
2. Right-click → "Open in insidebar.ai" → "Gemini"

**Expected Result:**
- All special characters are preserved
- No encoding issues
- Text displays correctly

### Test 9: Large Text Selection
1. Select a very long piece of text (e.g., entire Wikipedia article)
2. Right-click → "Open in insidebar.ai" → "ChatGPT"

**Expected Result:**
- Text is fully inserted (not truncated)
- Page remains responsive
- Textarea scrolls to show cursor position

### Test 10: No Text Selected
1. Don't select any text
2. Right-click anywhere → "Open in insidebar.ai" → "Claude"

**Expected Result:**
- Sidebar opens
- Claude loads
- No text is inserted (input area remains empty or keeps existing content)
- No errors in console

### Test 11: Switch Provider After Selection
1. Select text
2. Right-click → "Open in insidebar.ai" → "ChatGPT"
3. Wait for text to be inserted
4. Click the Claude tab in the sidebar
5. Go back and select different text
6. Right-click → "Open in insidebar.ai" → "Claude"

**Expected Result:**
- Sidebar switches to Claude
- New selected text appears in Claude's editor
- ChatGPT still has the old text (iframes maintain state)

### Test 12: Provider Page Not Fully Loaded
1. Select text
2. Right-click → "Open in insidebar.ai" → "Grok"
3. Immediately look at the Grok iframe

**Expected Result:**
- Even if page loads slowly, text injection should work
- If textarea isn't found immediately, retry mechanism kicks in after 1 second
- Text eventually appears once page is ready

## Debugging

### Check Console Logs

**Sidebar Console (for postMessage sending):**
- Right-click sidebar → "Inspect"
- Look for messages about sending text to iframe

**Provider iframe Console (for text injection):**
- Right-click inside the provider iframe → "Inspect" (this opens the iframe's console)
- Look for console messages:
  - "Text injection listener registered for {provider}" (initialization)
  - "Text injected into {Provider} editor" (success)
  - "{Provider} editor not found, will retry..." (waiting for page load)
  - "Failed to inject text into {Provider}" (error)
  - "Text injected into {Provider} editor (retry)" (retry success)

### Common Issues

**Issue 1: Text not appearing**
- Check if you're logged into the AI provider
- Check console for errors
- Verify the provider's UI hasn't changed (selector might be outdated)

**Issue 2: Sidebar doesn't open**
- Check if extension is enabled
- Check browser console for errors
- Try reloading the extension

**Issue 3: Text appears but formatting is wrong**
- Expected behavior: contenteditable elements may render differently
- Linebreaks should be preserved
- Special characters should work

**Issue 4: Delay before text appears**
- Expected: Up to 500ms initial delay + 1000ms retry if needed
- This ensures iframe is fully loaded

## Test Coverage
- ✅ All 5 providers (ChatGPT, Claude, Gemini, Grok, DeepSeek)
- ✅ Different textarea types (textarea, contenteditable, Quill, ProseMirror)
- ✅ Empty selection, single word, paragraph, multi-paragraph, large text
- ✅ Special characters, emojis, line breaks
- ✅ Appending to existing text
- ✅ Provider switching
- ✅ Retry logic for slow-loading pages

## Automated Tests
All automated tests pass:
```
npm test
```

- 47 tests total (35 existing + 12 new)
- text-injector.test.js: 12 tests for text injection module
- All provider, settings, messaging tests still passing
