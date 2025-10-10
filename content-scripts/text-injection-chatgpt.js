// Text injection handler for ChatGPT
import { setupTextInjectionListener } from './text-injection-handler.js';

// ChatGPT uses #prompt-textarea
setupTextInjectionListener('#prompt-textarea', 'ChatGPT');
