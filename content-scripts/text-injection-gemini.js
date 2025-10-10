// Text injection handler for Gemini
import { setupTextInjectionListener } from './text-injection-handler.js';

// Gemini uses Quill editor with .ql-editor class
setupTextInjectionListener('.ql-editor', 'Gemini');
