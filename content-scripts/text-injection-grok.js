// Text injection handler for Grok
import { setupTextInjectionListener } from './text-injection-handler.js';

// Grok can use textarea, .tiptap, or .ProseMirror
setupTextInjectionListener(['textarea', '.tiptap', '.ProseMirror'], 'Grok');
