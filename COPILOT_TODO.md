# Microsoft Copilot Integration - TODO for DOM Inspection

This document lists all the placeholder selectors that need to be updated after manually inspecting Microsoft Copilot's DOM structure at `copilot.microsoft.com` and `bing.com/chat`.

## Files Requiring Updates

### 1. `content-scripts/copilot-history-extractor.js`

**Line 30:** Share button selector for language detection and button placement
```javascript
const SHARE_BUTTON_SELECTOR = '[data-testid="share-button"]'; // PLACEHOLDER - NEEDS UPDATE
```

**Lines 48-51:** Conversation URL pattern check
```javascript
const isCopilotConversation = window.location.href.includes('copilot.microsoft.com') ||
                               window.location.href.includes('bing.com/chat');
```
- Verify the exact URL pattern for Copilot conversations
- Check if there's a conversation ID in the URL (e.g., `/c/[id]`)

**Lines 74-76:** Button classes to match Copilot's UI
```javascript
button.className = 'copilot-save-btn'; // PLACEHOLDER - NEEDS UPDATE
```
- Inspect the share button's classes and styling
- Update to match native Copilot button appearance

**Lines 183-191:** Title selectors
```javascript
const titleSelectors = [
  'h1',
  '[data-testid="conversation-title"]',
  '.conversation-title',
  'header h1',
  '[role="heading"]'
];
```
- Find the actual selector for conversation title

**Lines 217-221:** Message container selectors
```javascript
const messageContainers = document.querySelectorAll('[data-message-role]') ||
                          document.querySelectorAll('[class*="message"]') ||
                          document.querySelectorAll('[class*="chat-turn"]') ||
                          document.querySelectorAll('main [class*="conversation"] > div');
```
- Find the actual selector for message containers
- Determine how messages are structured

**Lines 229-236:** Role detection attributes
```javascript
const roleAttr = container.getAttribute('data-message-role') ||
                container.getAttribute('data-author') ||
                container.getAttribute('role');
```
- Determine how user vs assistant messages are differentiated
- Check for data attributes or class names

**Lines 250-254:** Content element selectors
```javascript
const contentElement = container.querySelector('[class*="markdown"]') ||
                      container.querySelector('[class*="message-content"]') ||
                      container.querySelector('[class*="text"]') ||
                      container;
```
- Find the actual selector for message content
- Check for markdown rendering elements

### 2. `content-scripts/copilot-save-button.css`

**Lines 6-25:** Button styling
```css
.copilot-save-btn {
  /* Update all styles to match Copilot's native buttons */
}
```
- Inspect Copilot's share button styling
- Match colors, fonts, borders, padding, etc.

### 3. `content-scripts/enter-behavior-copilot.js`

**Lines 23-29:** Send button selectors
```javascript
const byTestId = document.querySelector('button[data-testid="send-button"]') ||
                 document.querySelector('button[aria-label*="Send"]') ||
                 document.querySelector('button[aria-label*="send"]');
```
- Find the actual selector for the send button

**Lines 55-62:** Text input area selectors
```javascript
const isTextarea = activeElement &&
                   activeElement.tagName === "TEXTAREA" &&
                   activeElement.offsetParent !== null;

const isContentEditable = activeElement &&
                         activeElement.contentEditable === "true" &&
                         activeElement.offsetParent !== null;
```
- Determine if Copilot uses `<textarea>` or `contenteditable` div
- Find specific class names or IDs if available

### 4. `content-scripts/text-injection-all-providers.js`

**Line 21:** Text input selectors
```javascript
copilot: ['textarea', 'div[contenteditable="true"]', '[role="textbox"]']
```
- Find the exact selector for Copilot's text input area
- Test that text injection works correctly

## How to Inspect

1. **Open Copilot:**
   - Visit `https://copilot.microsoft.com`
   - Visit `https://bing.com/chat` (if different)

2. **Start a conversation:**
   - Type a message and send it
   - Get a response to see the full conversation structure

3. **Open Chrome DevTools:**
   - Press `F12` or `Cmd+Opt+I` (Mac)
   - Use the Elements inspector (arrow icon) to inspect elements

4. **Find selectors:**
   - **Share button:** Right-click share button → Inspect
   - **Message containers:** Inspect user and assistant messages
   - **Text input:** Inspect the textarea/input where you type
   - **Send button:** Inspect the send button
   - **Conversation title:** Look for where the title is displayed

5. **Record selectors:**
   - Copy exact class names, data attributes, and IDs
   - Test selectors in Console: `document.querySelector('your-selector')`

6. **Update files:**
   - Replace all `// PLACEHOLDER - NEEDS UPDATE` comments
   - Update the TODO comments with actual selectors

## Testing Checklist

After updating selectors:

- [ ] Save button appears next to share button
- [ ] Save button has correct styling (matches Copilot UI)
- [ ] Clicking save button extracts conversation correctly
- [ ] Conversation title is extracted properly
- [ ] All messages (user and assistant) are captured
- [ ] Message formatting (code blocks, markdown) is preserved
- [ ] Enter key behavior works (Enter vs Shift+Enter swap)
- [ ] Text injection from sidebar works
- [ ] Works on both `copilot.microsoft.com` and `bing.com/chat`
- [ ] Language detection works (save button text in correct language)

## Additional Notes

- Copilot may use different DOM structures on different URLs
- There may be differences between logged-in and logged-out states
- The UI may change over time, so selectors may need periodic updates
- Consider using more resilient selectors (data attributes > classes > tags)
