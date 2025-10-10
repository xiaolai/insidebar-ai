// Text injection handler for Claude
import { setupTextInjectionListener } from './text-injection-handler.js';

// Claude uses .ProseMirror contenteditable with role="textbox"
setupTextInjectionListener('.ProseMirror[role="textbox"]', 'Claude');
